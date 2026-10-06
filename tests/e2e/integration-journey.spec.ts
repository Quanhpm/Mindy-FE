import { expect, test } from '@playwright/test';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const course = {
  id: id(1),
  code: 'JS-101',
  imgUrl: null,
  title: 'JavaScript tại Mindy',
  description: 'Học nền tảng JavaScript.',
  priceAmount: 1800000,
  category: { id: id(2), name: 'Lập trình', slug: 'lap-trinh' },
  units: [
    {
      id: id(3),
      unitNumber: 1,
      title: 'Khởi đầu',
      description: 'Các khái niệm cơ bản.',
      requiredScorePercent: 80,
    },
  ],
  openClasses: [],
};
const classItem = {
  id: id(4),
  courseId: course.id,
  code: 'JS-101-ON',
  name: 'JavaScript tối',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 10,
  mentor: { id: id(5), displayName: 'Mentor An' },
  units: [{ id: id(6), position: 1, title: 'Khởi đầu', sessions: [] }],
};
const user = {
  id: id(7),
  email: 'first@example.com',
  displayName: 'Học viên thứ nhất',
  phone: null,
  role: 'STUDENT',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00Z',
};

test('public class → login return → cart → checkout → own order, then clear on account switch (mock API)', async ({
  page,
}) => {
  let signedIn = false;
  let identity = user;
  let cart: unknown[] = [];
  let orders: unknown[] = [];
  const mutations: { path: string; body: unknown }[] = [];
  const receipt = {
    id: id(8),
    orderCode: 'MD-JOURNEY-01',
    paymentType: 'CASH',
    status: 'PENDING',
    totalAmount: course.priceAmount,
    expiresAt: '2099-11-03T00:00:00Z',
    paidAt: null,
    mentorId: classItem.mentor.id,
    createdAt: '2026-10-02T00:00:00Z',
    details: [
      {
        id: id(9),
        classId: classItem.id,
        courseTitle: course.title,
        className: classItem.name,
        priceAmount: course.priceAmount,
        quantity: 1,
        totalAmount: course.priceAmount,
      },
    ],
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === `/courses/${course.id}`) return route.fulfill({ json: course });
    if (path === `/classes/${classItem.id}`) return route.fulfill({ json: classItem });
    if (path === '/auth/login') {
      if (request.postDataJSON().email === 'second@example.com') {
        identity = {
          ...user,
          id: id(10),
          email: 'second@example.com',
          displayName: 'Học viên thứ hai',
        };
        cart = [];
        orders = [];
      }
      signedIn = true;
      return route.fulfill({
        json: { user: identity, accessTokenExpiresAt: '2099-10-02T00:00:00Z' },
      });
    }
    if (!signedIn)
      return route.fulfill({
        status: 401,
        json: {
          code: path === '/auth/refresh' ? 'INVALID_REFRESH_TOKEN' : 'AUTHENTICATION_REQUIRED',
          message: 'Unauthorized',
        },
      });
    if (path === '/auth/me') return route.fulfill({ json: identity });
    if (path === '/auth/logout') {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path === '/me/cart/items') {
      mutations.push({ path, body: request.postDataJSON() });
      cart = [
        {
          classId: classItem.id,
          classCode: classItem.code,
          className: classItem.name,
          courseId: course.id,
          courseTitle: course.title,
          deliveryMode: classItem.deliveryMode,
          startDate: classItem.startDate,
          endDate: classItem.endDate,
          priceSnapshot: course.priceAmount,
          currentPriceAmount: course.priceAmount,
          isPurchasable: true,
          addedAt: '2026-10-02T00:00:00Z',
        },
      ];
      return route.fulfill({ status: 201, json: { items: cart, totalAmount: course.priceAmount } });
    }
    if (path === '/me/cart')
      return route.fulfill({
        json: { items: cart, totalAmount: cart.length ? course.priceAmount : 0 },
      });
    if (path === '/me/cart/checkout') {
      mutations.push({ path, body: request.postDataJSON() });
      cart = [];
      orders = [receipt];
      return route.fulfill({ status: 201, json: { orders } });
    }
    if (path === '/me/orders')
      return route.fulfill({
        json: {
          items: orders,
          page: 1,
          pageSize: Number(new URL(request.url()).searchParams.get('pageSize') ?? 20),
          total: orders.length,
        },
      });
    if (path === `/me/orders/${receipt.id}`)
      return identity.id === user.id
        ? route.fulfill({ json: { ...receipt, payment: null } })
        : route.fulfill({
            status: 403,
            json: { code: 'ORDER_ACCESS_DENIED', message: 'Forbidden' },
          });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } });
  });
  const deepLink = `/classes/${classItem.id}?unitId=${classItem.units[0]?.id}`;
  await page.goto(deepLink);
  await page.getByRole('link', { name: 'Đăng nhập để thêm vào giỏ' }).click();
  await expect(page).toHaveURL(new RegExp(`next=${encodeURIComponent(deepLink)}`));
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`classes/${classItem.id}\\?unitId=${classItem.units[0]?.id}`),
  );
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã thêm lớp');
  await page.getByRole('link', { name: 'Giỏ hàng', exact: true }).click();
  await page.getByRole('link', { name: 'Tiếp tục tạo đơn' }).click();
  await page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Kết quả đăng ký' })).toContainText(
    receipt.orderCode,
  );
  await page.getByRole('link', { name: receipt.orderCode, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chi tiết đơn của bạn.' })).toBeVisible();
  await expect(page.getByRole('article', { name: `Đơn ${receipt.orderCode}` })).toContainText(
    'Chờ thanh toán',
  );
  expect(mutations).toEqual([
    { path: '/me/cart/items', body: { classId: classItem.id } },
    { path: '/me/cart/checkout', body: { paymentType: 'CASH' } },
  ]);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: true }).fill('second@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  await page.getByRole('link', { name: 'Đơn đăng ký', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chưa có đơn phù hợp.' })).toBeVisible();
  await expect(page.getByText(receipt.orderCode)).toHaveCount(0);
  await page.goto(`/orders/${receipt.id}`);
  await expect(page.locator('.error-panel[role="alert"]')).toContainText('không có quyền');
  await expect(page.getByText(receipt.orderCode)).toHaveCount(0);
});

test('home and public menu fit 1440/768/390/375 with keyboard focus return', async ({ page }) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({
      status: 401,
      json: { code: 'INVALID_REFRESH_TOKEN', message: 'Unauthorized' },
    }),
  );
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Khám phá khóa học', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const filteredRoute = '/courses?deliveryMode=ONLINE&page=2';
    await page.goto(filteredRoute);
    if (width < 850) {
      const trigger = page.getByRole('button', { name: 'Mở menu', exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Menu Mindy' })).toBeVisible();
      await expect(
        page
          .getByRole('dialog', { name: 'Menu Mindy' })
          .getByRole('link', { name: 'Đăng nhập', exact: true }),
      ).toHaveAttribute('href', `/login?next=${encodeURIComponent(filteredRoute)}`);
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    } else {
      await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveAttribute(
        'href',
        `/login?next=${encodeURIComponent(filteredRoute)}`,
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
