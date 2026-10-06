import { expect, type Page, test } from '@playwright/test';

const id = (n: number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`;
const classId = id(2),
  orderId = id(3),
  mentorId = id(4);
const expiry = '2099-11-01T00:00:00Z';
const qrPayload =
  '00020101021238570010A00000072701270006970422011312345678901230208QRIBFTTA5303704540450005802VN6304A1B2';
const baseOrder = {
  id: orderId,
  orderCode: 'MD-CASH-TEST',
  paymentType: 'CASH',
  status: 'PENDING',
  totalAmount: 5000,
  expiresAt: expiry,
  paidAt: null,
  mentorId,
  createdAt: '2026-10-05T00:00:00Z',
  details: [
    {
      id: id(5),
      classId,
      courseTitle: 'Lập trình Web',
      className: 'Web buổi tối',
      priceAmount: 5000,
      quantity: 1,
      totalAmount: 5000,
    },
  ],
};
const payment = {
  paymentId: id(6),
  orderId,
  providerOrderCode: 123456,
  status: 'PENDING',
  checkoutUrl: 'https://pay.payos.vn/web/fixture',
  qrCode: qrPayload,
  expiresAt: expiry,
  amount: 5000,
};
const classData = {
  id: classId,
  courseId: id(7),
  code: 'WEB101-A',
  name: 'Web buổi tối',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 10,
  mentor: { id: mentorId, displayName: 'Mentor Minh' },
  meetingUrl: 'https://private.invalid/should-not-render',
  units: [
    {
      id: id(8),
      position: 1,
      title: 'Nền tảng Web',
      sessions: [
        {
          id: id(9),
          sessionNumber: 1,
          title: 'Làm quen HTML',
          startsAt: '2026-11-01T12:00:00Z',
          endsAt: '2026-11-01T14:00:00Z',
          roomName: 'Phòng A',
          status: 'SCHEDULED',
          meetingUrl: 'https://private.invalid/session',
        },
      ],
    },
  ],
};
async function mock(page: Page, role = 'STUDENT') {
  let current = { ...baseOrder };
  let paymentType = 'CASH';
  let denied = false;
  let lost = false;
  let readsFail = false;
  let creates = 0,
    previews = 0,
    results = 0,
    confirmations = 0;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          id: role === 'MENTOR' ? mentorId : id(1),
          role,
          displayName: 'Nguyễn Minh Anh',
          email: 'qa@example.com',
          status: 'ACTIVE',
          phone: null,
          lastLoginAt: null,
          createdAt: '2026-10-01T00:00:00Z',
        },
      });
    if (path === '/me/orders/payment-result') {
      results++;
      expect([...url.searchParams.keys()]).toEqual(['orderCode']);
      expect(url.searchParams.get('orderCode')).toBe('123456');
      return denied
        ? route.fulfill({
            status: 403,
            json: { code: 'ORDER_ACCESS_DENIED', message: 'Không có quyền xem đơn.' },
          })
        : route.fulfill({
            json: {
              ...current,
              paymentType: 'PAYOS',
              mentorId: null,
              orderCode: 'MD-PAYOS-TEST',
              payment,
            },
          });
    }
    if (path === `/me/orders/${orderId}`)
      return readsFail
        ? route.fulfill({ status: 503, json: { message: 'Không thể đọc trạng thái.' } })
        : route.fulfill({
            json: {
              ...current,
              paymentType,
              mentorId: paymentType === 'PAYOS' ? null : mentorId,
              orderCode: paymentType === 'PAYOS' ? 'MD-PAYOS-TEST' : current.orderCode,
              payment: paymentType === 'PAYOS' ? payment : null,
            },
          });
    if (path === `/me/orders/${orderId}/payments/payos`) {
      creates++;
      return route.fulfill({ status: 201, json: payment });
    }
    if (path === '/mentor/cash-orders')
      return readsFail
        ? route.fulfill({ status: 503, json: { message: 'Chưa đọc được danh sách.' } })
        : route.fulfill({
            json: {
              items: [current],
              total: 1,
              page: Number(url.searchParams.get('page')),
              pageSize: 20,
            },
          });
    if (path === `/mentor/cash-orders/${orderId}/confirm`) {
      confirmations++;
      expect(request.postDataJSON()).toEqual({ receivedAmount: 5000 });
      current = { ...current, status: 'PAID' };
      if (lost) return route.abort('timedout');
      return route.fulfill({ json: current });
    }
    if (path === `/me/classes/${classId}/preview`) {
      previews++;
      return denied
        ? route.fulfill({
            status: 403,
            json: { code: 'CLASS_PREVIEW_DENIED', message: 'Expired hold' },
          })
        : route.fulfill({ json: classData });
    }
    return route.fulfill({ status: 404, json: { message: 'Unavailable' } });
  });
  return {
    payos: () => {
      paymentType = 'PAYOS';
    },
    paid: () => {
      current = { ...current, status: 'PAID' };
    },
    deny: () => {
      denied = true;
    },
    lose: () => {
      lost = true;
    },
    failReads: () => {
      readsFail = true;
    },
    clearReads: () => {
      readsFail = false;
    },
    counts: () => ({ creates, previews, results, confirmations }),
  };
}
test('PayOS result maps only orderCode and never trusts redirect success or cancel', async ({
  page,
}) => {
  const api = await mock(page);
  api.payos();
  await page.goto('/payment/result?orderCode=123456&status=PAID&cancel=false&code=00');
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
  await expect(page.getByText('Đơn đang chờ thanh toán.', { exact: true })).toBeVisible();
  expect(api.counts().creates).toBe(0);
  await page.goto('/payment/result?orderCode=123456&orderCode=654321');
  await expect(page.getByText('Thiếu hoặc sai mã thanh toán PayOS.')).toBeVisible();
  expect(api.counts().results).toBe(1);
  api.deny();
  await page.goto('/payment/result?orderCode=123456');
  await expect(page.getByText('Bạn không có quyền xem đơn đăng ký này.')).toBeVisible();
  await expect(page).toHaveURL(/payment\/result/);
});
test('mentor confirms only full amount and recovery reads before retrying unknown outcomes', async ({
  page,
}) => {
  const api = await mock(page, 'MENTOR');
  await page.goto('/mentor/cash-orders');
  await page.getByRole('button', { name: 'Ghi nhận thu tiền' }).click();
  await page.getByLabel('Số tiền đã nhận (VND)').fill('4999');
  const confirm = page.getByRole('button', { name: 'Xác nhận đã thu đủ' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Số tiền đã nhận (VND)').fill('5000');
  await page.screenshot({
    path: 'docs/ui-redesign/screenshots/mentor-cash-desktop.png',
    fullPage: true,
  });
  api.lose();
  await confirm.click();
  await expect(page.getByRole('status')).toContainText('Hãy cập nhật danh sách');
  await expect(page.getByRole('button', { name: 'Ghi nhận thu tiền' })).toBeDisabled();
  expect(api.counts().confirmations).toBe(1);
  await page.getByRole('button', { name: 'Cập nhật danh sách' }).click();
  await expect(page.getByText('Đã ghi nhận thanh toán.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ghi nhận thu tiền' })).toHaveCount(0);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('cash preview shows timetable without private links and denies other roles before fetching', async ({
  page,
}) => {
  const api = await mock(page);
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('link', { name: 'Xem trước lớp Web buổi tối' }).click();
  await expect(page.getByRole('heading', { name: 'Làm quen HTML', exact: false })).toBeVisible();
  await expect(page.getByText(/Phòng: Phòng A/)).toBeVisible();
  await expect(page.locator('a[href*="private.invalid"]')).toHaveCount(0);
  await page.screenshot({
    path: 'docs/ui-redesign/screenshots/cash-preview-desktop.png',
    fullPage: true,
  });
  await page.goto(`/learning/classes/${classId}/preview?unitId=${id(99)}`);
  await expect(page.getByText('Học phần không thuộc lớp này.')).toBeVisible();
  api.deny();
  await page.reload();
  await expect(page.getByText(/Không còn quyền xem trước/)).toBeVisible();
  await mock(page, 'ADMIN');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Khu vực dành cho học viên' })).toBeVisible();
});
test('QR renders payload inside Mindy, hides when stale/paid and profile dropdown works with keyboard', async ({
  page,
}) => {
  const api = await mock(page);
  api.payos();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/orders/${orderId}`);
  const qr = page.getByRole('img', { name: 'QR thanh toán PayOS' });
  await expect(qr).toBeVisible();
  await page.screenshot({
    path: 'docs/ui-redesign/screenshots/payment-qr-desktop.png',
    fullPage: true,
  });
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toHaveAttribute(
    'href',
    payment.checkoutUrl,
  );
  const profile = page.getByRole('button', { name: 'Mở menu tài khoản' });
  await profile.focus();
  await page.keyboard.press('Enter');
  await expect(profile).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#profile-dropdown')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'docs/ui-redesign/screenshots/profile-dropdown-desktop.png' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Tài khoản của tôi', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(profile).toBeFocused();
  await expect(profile).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Mở menu', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/ui-redesign/screenshots/payment-qr-mobile.png',
    fullPage: true,
  });
  api.failReads();
  await page.getByRole('button', { name: 'Cập nhật trạng thái từ hệ thống' }).click();
  await expect(qr).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toHaveCount(0);
  api.clearReads();
  api.paid();
  await page.getByRole('button', { name: 'Cập nhật trạng thái từ hệ thống' }).click();
  await expect(page.getByText('Các lớp trong đơn đã thanh toán')).toBeVisible();
  await expect(qr).toHaveCount(0);
});
