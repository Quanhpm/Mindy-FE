import { expect, type Page, test } from '@playwright/test';
import type { Payment } from '../../src/features/payments/schemas/payment.schema';

const id = (n: number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`;
const orderId = id(1),
  classId = id(2),
  unitId = id(3),
  paymentId = id(4),
  courseId = id(5);
const student = {
  id: id(6),
  email: 'student@example.com',
  displayName: 'Học viên Payment',
  role: 'STUDENT',
  status: 'ACTIVE',
  phone: null,
  lastLoginAt: null,
  createdAt: '2026-10-05T00:00:00Z',
};
const payment: Payment = {
  paymentId,
  orderId,
  providerOrderCode: 123456,
  status: 'PENDING',
  checkoutUrl: 'https://pay.payos.vn/web/fixture',
  qrCode: null,
  amount: 5000,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
};
const classData = {
  id: classId,
  courseId,
  code: 'WEB-A',
  name: 'Lớp đã thanh toán',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 5,
  mentor: { id: id(7), displayName: 'Mentor Test' },
  meetingUrl: 'https://meet.example.com/class-private',
  units: [
    {
      id: unitId,
      position: 1,
      title: 'Học phần riêng',
      sessions: [
        {
          id: id(8),
          sessionNumber: 1,
          title: 'Buổi học riêng',
          startsAt: '2026-11-01T01:00:00Z',
          endsAt: '2026-11-01T02:00:00Z',
          roomName: 'Phòng A',
          status: 'SCHEDULED',
          meetingUrl: 'https://meet.example.com/session-private',
        },
      ],
    },
    { id: id(9), position: 2, title: 'Học phần tiếp theo', sessions: [] },
  ],
};
async function mock(
  page: Page,
  options: {
    role?: string;
    initialPayment?: (Omit<typeof payment, 'checkoutUrl'> & { checkoutUrl: string | null }) | null;
    status?: string;
    mode?: string;
    classDenied?: boolean;
  } = {},
) {
  let user = { ...student, role: options.role ?? 'STUDENT' };
  let currentPayment = options.initialPayment ?? null;
  let status = options.status ?? 'PENDING';
  let mode = options.mode ?? 'success';
  let readFails = false;
  let signedIn = true;
  let classDenied = options.classDenied ?? false;
  let release: (() => void) | undefined;
  const counts = { create: 0, read: 0, learning: 0, reconcile: 0, review: 0 };
  const receipt = () => ({
    id: orderId,
    orderCode: 'MD-PAYMENT-TEST',
    paymentType: 'PAYOS',
    status,
    totalAmount: 5000,
    expiresAt: status === 'EXPIRED' ? new Date(Date.now() - 1000).toISOString() : payment.expiresAt,
    paidAt: status === 'PAID' ? '2026-10-05T01:00:00Z' : null,
    mentorId: null,
    createdAt: '2026-10-05T00:00:00Z',
    details: [
      {
        id: id(10),
        classId,
        courseTitle: 'Khóa Web',
        className: classData.name,
        priceAmount: 5000,
        totalAmount: 5000,
        quantity: 1,
      },
    ],
    payment: currentPayment,
  });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path.startsWith('/auth/logout')) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (!signedIn)
      return route.fulfill({
        status: 401,
        json: { code: 'INVALID_REFRESH_TOKEN', message: 'Unauthorized' },
      });
    if (path === '/auth/me') return route.fulfill({ json: user });
    if (path === `/me/orders/${orderId}/payments/payos`) {
      counts.create++;
      expect(route.request().postDataJSON()).toEqual({});
      if (mode === 'blocked')
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (mode === 'unavailable')
        return route.fulfill({
          status: 503,
          json: { code: 'PAYMENT_UNAVAILABLE', message: 'Unavailable' },
        });
      currentPayment = {
        ...payment,
        status: mode === 'creating' ? 'CREATING' : 'PENDING',
        checkoutUrl: mode === 'creating' ? null : payment.checkoutUrl,
      };
      if (mode === 'lost') {
        readFails = true;
        return route.abort('timedout');
      }
      return route.fulfill({ status: 201, json: currentPayment });
    }
    if (path === `/me/orders/${orderId}`) {
      counts.read++;
      if (user.id !== student.id)
        return route.fulfill({
          status: 403,
          json: { code: 'ORDER_ACCESS_DENIED', message: 'Denied' },
        });
      if (readFails)
        return route.fulfill({
          status: 503,
          json: { code: 'API_UNAVAILABLE', message: 'Read unavailable' },
        });
      return route.fulfill({ json: receipt() });
    }
    if (path === `/me/classes/${classId}`) {
      counts.learning++;
      if (classDenied)
        return route.fulfill({
          status: 403,
          json: { code: 'CLASS_ACCESS_DENIED', message: 'Denied' },
        });
      return route.fulfill({ json: classData });
    }
    if (path === '/admin/payments/reconciliation') {
      counts.review++;
      if (readFails)
        return route.fulfill({
          status: 503,
          json: { code: 'API_UNAVAILABLE', message: 'Read unavailable' },
        });
      return route.fulfill({
        json: {
          page: 1,
          pageSize: 20,
          total: 2,
          items: [paymentId, null].map((value, index) => ({
            id: id(20 + index),
            paymentId: value,
            providerOrderCode: 100 + index,
            referenceCode: `reference-${index}`,
            amount: 5000,
            currency: 'VND',
            reason: 'LATE_PAYMENT',
            source: 'WEBHOOK',
            actorId: null,
            createdAt: '2026-10-05T00:00:00Z',
          })),
        },
      });
    }
    if (path === `/admin/payments/${paymentId}/reconcile`) {
      counts.reconcile++;
      expect(route.request().postDataJSON()).toEqual({});
      if (mode === 'blocked')
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (mode === 'unavailable')
        return route.fulfill({
          status: 503,
          json: { code: 'PAYMENT_UNAVAILABLE', message: 'Unavailable' },
        });
      return route.fulfill({ json: { status: 'REQUIRES_REVIEW' } });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Not found' } });
  });
  return {
    counts,
    allowReads: () => {
      readFails = false;
    },
    failReads: () => {
      readFails = true;
    },
    release: () => release?.(),
    setMode: (value: string) => {
      mode = value;
    },
    setStatus: (value: string) => {
      status = value;
      currentPayment = { ...payment, status: value === 'PAID' ? 'SUCCEEDED' : 'PENDING' };
    },
    setRole: (role: string) => {
      user = { ...user, role };
    },
    switchStudent: () => {
      user = { ...user, id: id(99), displayName: 'Học viên khác' };
      classDenied = true;
    },
  };
}
async function dimensions(page: Page, name: string) {
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width === 1440 || width === 390)
      await page.screenshot({ path: `test-results/phase22-${name}-${width}.png`, fullPage: true });
  }
}
test('PayOS create is single-flight, survives reload, and opens recovered QR-null link in a new tab', async ({
  page,
}) => {
  const control = await mock(page, { mode: 'blocked' });
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole('button', { name: 'Tạo link PayOS', exact: true })).toBeEnabled();
  await dimensions(page, 'payment');
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await page.getByRole('button', { name: 'Đang xử lý thanh toán…' }).dispatchEvent('click');
  await expect.poll(() => control.counts.create).toBe(1);
  control.release();
  const link = page.getByRole('link', { name: 'Mở PayOS để thanh toán' });
  await expect(link).toHaveAttribute('href', payment.checkoutUrl ?? '');
  await expect(link).toHaveAttribute('target', '_blank');
  await page.reload();
  await expect(link).toBeVisible();
  expect(control.counts.create).toBe(1);
});
test('CREATING is recoverable on same order without checkout', async ({ page }) => {
  const control = await mock(page, { mode: 'creating' });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await expect(page.getByText('Đang tạo link thanh toán', { exact: true })).toBeVisible();
  control.setMode('success');
  await page.getByRole('button', { name: 'Tiếp tục tạo link PayOS' }).click();
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toBeVisible();
  expect(control.counts.create).toBe(2);
});
test('lost creation response locks retry until order recovery succeeds', async ({ page }) => {
  const control = await mock(page, { mode: 'lost' });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kiểm tra kết quả tạo link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo link PayOS', exact: true })).toBeDisabled();
  control.allowReads();
  await page.getByRole('button', { name: 'Kiểm tra kết quả tạo link' }).click();
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toBeVisible();
  expect(control.counts.create).toBe(1);
});
test('unavailable PayOS recovers order before allowing deliberate retry', async ({ page }) => {
  const control = await mock(page, { mode: 'unavailable' });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await expect(page.getByText(/PayOS tạm thời chưa khả dụng/)).toBeVisible();
  control.setMode('success');
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toBeVisible();
  expect(control.counts.create).toBe(2);
});
for (const status of ['EXPIRED', 'CANCELLED'])
  test(`${status} hides payment actions and learning access`, async ({ page }) => {
    const control = await mock(page, { status, initialPayment: payment });
    await page.goto(`/orders/${orderId}`);
    await expect(page.getByRole('heading', { name: 'Chi tiết đơn của bạn.' })).toBeVisible();
    await expect(page.getByRole('article')).toContainText(
      status === 'EXPIRED' ? 'Đã hết hạn' : 'Đã hủy',
    );
    await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Tạo link PayOS|Tiếp tục tạo/ })).toHaveCount(0);
    expect(control.counts.create).toBe(0);
  });
test('review payment has no payable link or learning CTA', async ({ page }) => {
  await mock(page, {
    initialPayment: { ...payment, status: 'REQUIRES_REVIEW', checkoutUrl: null },
  });
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText('Cần đối soát', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Vào lớp|Mở PayOS/ })).toHaveCount(0);
});
test('pending polls every 5 seconds, pauses hidden tabs, resumes visible and stops after PAID', async ({
  page,
}) => {
  await page.clock.install();
  const control = await mock(page, { initialPayment: payment });
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toBeVisible();
  const before = control.counts.read;
  await page.clock.runFor(5100);
  await expect.poll(() => control.counts.read).toBe(before + 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(15000);
  expect(control.counts.read).toBe(before + 1);
  control.setStatus('PAID');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('link', { name: `Vào lớp ${classData.name}` })).toBeVisible();
  const paidReads = control.counts.read;
  await page.clock.runFor(11000);
  expect(control.counts.read).toBe(paidReads);
});
test('PAID order opens private timetable with unit history and mobile drawer', async ({ page }) => {
  const control = await mock(page, {
    status: 'PAID',
    initialPayment: { ...payment, status: 'SUCCEEDED', checkoutUrl: null },
  });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('link', { name: `Vào lớp ${classData.name}` }).click();
  await expect(page.getByRole('heading', { name: 'Học phần riêng', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở phòng học buổi 1' })).toHaveAttribute(
    'href',
    classData.units[0]?.sessions[0]?.meetingUrl ?? '',
  );
  await dimensions(page, 'learning');
  await page.getByRole('button', { name: 'Học phần của lớp', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Học phần của lớp', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Học phần của lớp', exact: true }).click();
  await page.getByRole('link', { name: '2. Học phần tiếp theo' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Học phần chưa có lịch học.')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Học phần riêng', exact: true })).toBeVisible();
  expect(control.counts.learning).toBe(1);
});
test('pending, foreign or cancelled class access denied does not show private data', async ({
  page,
}) => {
  await mock(page, { classDenied: true });
  await page.goto(`/learning/classes/${classId}`);
  await expect(page.getByText(/Bạn chưa có quyền truy cập lớp này/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Mở phòng học/ })).toHaveCount(0);
});
test('invalid unit never falls back to a different lesson', async ({ page }) => {
  await mock(page);
  await page.goto(`/learning/classes/${classId}?unitId=${id(99)}`);
  await expect(page.getByText('Học phần không thuộc lớp này.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Học phần riêng', exact: true })).toHaveCount(0);
});
test('account switch discards authorized private content; logout removes private navigation', async ({
  page,
}) => {
  const control = await mock(page);
  await page.goto(`/learning/classes/${classId}`);
  await expect(page.getByRole('link', { name: 'Mở phòng học buổi 1' })).toBeVisible();
  control.switchStudent();
  await page.evaluate(() => {
    const channel = new BroadcastChannel('mindy-session');
    channel.postMessage('login');
    channel.close();
  });
  // SessionProvider also refreshes on focus, matching a user returning after another tab login.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText(/Bạn chưa có quyền truy cập lớp này/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở phòng học buổi 1' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mở menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('link', { name: /Mở phòng học/ })).toHaveCount(0);
});
test('student/mentor cannot request ADMIN reconciliation or private student class', async ({
  page,
}) => {
  const control = await mock(page);
  await page.goto('/management/payments/reconciliation');
  await expect(page.getByText('Khu vực này dành cho quản trị viên.')).toBeVisible();
  expect(control.counts.review).toBe(0);
  control.setRole('MENTOR');
  await page.goto(`/learning/classes/${classId}`);
  await expect(page.getByRole('heading', { name: 'Khu vực dành cho học viên' })).toBeVisible();
  expect(control.counts.learning).toBe(0);
});
test('ADMIN review handles null paymentId, refreshes after reconciliation, and preserves review events', async ({
  page,
}) => {
  const control = await mock(page, { role: 'ADMIN', mode: 'blocked' });
  await page.goto('/management/payments/reconciliation');
  await expect(page.getByRole('button', { name: 'Đối soát với PayOS' })).toHaveCount(1);
  await expect(page.getByText('Chưa liên kết payment')).toBeVisible();
  await dimensions(page, 'review');
  await page.getByRole('button', { name: 'Đối soát với PayOS' }).click();
  await page.getByRole('button', { name: 'Đang đối soát…' }).dispatchEvent('click');
  await expect.poll(() => control.counts.reconcile).toBe(1);
  control.release();
  await expect(page.getByText(/Kết quả từ hệ thống: REQUIRES_REVIEW/)).toBeVisible();
  await expect.poll(() => control.counts.review).toBe(2);
  await expect(page.getByRole('row')).toHaveCount(3);
});
test('ADMIN provider error still refreshes review list', async ({ page }) => {
  const control = await mock(page, { role: 'ADMIN', mode: 'unavailable' });
  await page.goto('/management/payments/reconciliation');
  await page.getByRole('button', { name: 'Đối soát với PayOS' }).click();
  await expect(page.getByText(/PayOS tạm thời chưa khả dụng/)).toBeVisible();
  await expect.poll(() => control.counts.review).toBe(2);
});

test('account switch while creating payment discards the old response', async ({ page }) => {
  const control = await mock(page, { mode: 'blocked' });
  await page.goto(`/orders/${orderId}`);
  await page.getByRole('button', { name: 'Tạo link PayOS', exact: true }).click();
  await expect.poll(() => control.counts.create).toBe(1);
  control.switchStudent();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('mindy:session-changed'));
  });
  await expect(page.getByText('Bạn không có quyền xem đơn đăng ký này.')).toBeVisible();
  control.release();
  await expect(page.getByRole('link', { name: 'Mở PayOS để thanh toán' })).toHaveCount(0);
});
