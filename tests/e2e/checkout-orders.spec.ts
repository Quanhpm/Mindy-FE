import { mkdir } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import type { Order, PaymentType } from '../../src/features/orders/schemas/order.schema';

const classIds = ['123e4567-e89b-42d3-a456-426614174001', '123e4567-e89b-42d3-a456-426614174002'];
const orderIds = ['223e4567-e89b-42d3-a456-426614174001', '223e4567-e89b-42d3-a456-426614174002'];
const foreignId = '223e4567-e89b-42d3-a456-426614174099';
const user = {
  id: '323e4567-e89b-42d3-a456-426614174001',
  email: 'student@example.com',
  phone: null,
  displayName: 'Học viên Ocean',
  role: 'STUDENT',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00Z',
};
const cartItems = classIds.map((classId, index) => ({
  classId,
  classCode: `MINDY-${index + 1}`,
  className: index === 0 ? 'Lớp nền tảng buổi tối' : 'Lớp thực hành cuối tuần',
  courseId: '423e4567-e89b-42d3-a456-426614174001',
  courseTitle: index === 0 ? 'Lập trình nền tảng' : 'Ứng dụng thực tế',
  deliveryMode: index === 0 ? 'ONLINE' : 'OFFLINE',
  startDate: '2026-11-01',
  endDate: '2026-12-15',
  priceSnapshot: index === 0 ? 700_000 : 1_000_000,
  currentPriceAmount: index === 0 ? 800_000 : 1_200_000,
  isPurchasable: true,
  addedAt: '2026-10-02T00:00:00Z',
}));
function makeOrders(
  paymentType: PaymentType = 'CASH',
  expiresAt = new Date(Date.now() + 48 * 3600_000).toISOString(),
): Order[] {
  const details = cartItems.map((item, index) => ({
    id: item.classId,
    classId: item.classId,
    courseTitle: item.courseTitle,
    className: item.className,
    priceAmount: index === 0 ? 900_000 : 1_100_000,
    quantity: 1 as const,
    totalAmount: index === 0 ? 900_000 : 1_100_000,
  }));
  const base = {
    status: 'PENDING' as const,
    paymentType,
    expiresAt,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };
  return paymentType === 'PAYOS'
    ? [
        {
          ...base,
          id: orderIds[0] ?? '',
          orderCode: 'MD-PAYOS-ALL',
          mentorId: null,
          totalAmount: 2_000_000,
          details,
        },
      ]
    : details.map((detail, index) => ({
        ...base,
        id: orderIds[index] ?? '',
        orderCode: `MD-CASH-${index + 1}`,
        mentorId: `523e4567-e89b-42d3-a456-42661417400${index + 1}`,
        totalAmount: detail.totalAmount,
        details: [detail],
      }));
}
type Mode = 'success' | 'unknown-committed' | 'unknown-not-committed' | 'unknown-read-fails';
async function mockCommerce(
  page: Page,
  options: {
    role?: string;
    orders?: ReturnType<typeof makeOrders>;
    mode?: Mode;
    blockCheckout?: boolean;
  } = {},
) {
  let identity = { ...user, role: options.role ?? 'STUDENT' };
  let signedIn = true;
  let orders = options.orders ?? [];
  let cart = { items: [...cartItems], totalAmount: 2_000_000 };
  let mode = options.mode ?? 'success';
  let recoveryReadsFail = false;
  let release: () => void = () => undefined;
  const counts = { checkout: 0, cart: 0, orders: 0, detail: 0, admin: 0 };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.includes('/admin/')) {
      counts.admin += 1;
      return route.fulfill({
        status: 403,
        json: { code: 'INSUFFICIENT_ROLE', message: 'Forbidden' },
      });
    }
    if (path.includes('/auth/logout')) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (!signedIn)
      return route.fulfill({
        status: 401,
        json: {
          code: path.endsWith('/refresh') ? 'INVALID_REFRESH_TOKEN' : 'AUTHENTICATION_REQUIRED',
          message: 'Unauthorized',
        },
      });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: identity });
    if (path.endsWith('/me/cart/checkout')) {
      counts.checkout += 1;
      const payload = request.postDataJSON();
      expect(Object.keys(payload)).toEqual(['paymentType']);
      expect(['CASH', 'PAYOS']).toContain(payload.paymentType);
      if (options.blockCheckout)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (mode === 'success' || mode === 'unknown-committed') {
        orders = makeOrders(payload.paymentType);
        cart = { items: [], totalAmount: 0 };
      }
      if (mode === 'unknown-read-fails') recoveryReadsFail = true;
      if (mode !== 'success') return route.abort('timedout');
      return route.fulfill({ status: 201, json: { orders } });
    }
    if (path.endsWith('/me/cart')) {
      counts.cart += 1;
      return route.fulfill({ json: cart });
    }
    if (path.endsWith('/me/orders')) {
      counts.orders += 1;
      if (recoveryReadsFail)
        return route.fulfill({
          status: 503,
          json: { code: 'API_UNAVAILABLE', message: 'Read unavailable' },
        });
      const status = url.searchParams.get('status');
      const filtered = status ? orders.filter((order) => order.status === status) : orders;
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
      return route.fulfill({
        json: {
          items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          page: pageNumber,
          pageSize,
          total: filtered.length,
        },
      });
    }
    if (path.includes('/me/orders/')) {
      counts.detail += 1;
      const id = path.split('/').at(-1);
      if (id === foreignId)
        return route.fulfill({
          status: 403,
          json: { code: 'ORDER_ACCESS_DENIED', message: 'Denied' },
        });
      const order = orders.find((item) => item.id === id);
      return order
        ? route.fulfill({ json: { ...order, payment: null } })
        : route.fulfill({ status: 404, json: { code: 'ORDER_NOT_FOUND', message: 'Not found' } });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Not found' } });
  });
  return {
    counts,
    release: () => release(),
    setMode: (value: Mode) => {
      mode = value;
    },
    allowReads: () => {
      recoveryReadsFail = false;
    },
    setRole: (role: string) => {
      identity = { ...identity, role };
    },
    switchStudent: () => {
      identity = {
        ...user,
        id: '323e4567-e89b-42d3-a456-426614174002',
        displayName: 'Học viên khác',
      };
      orders = [];
    },
    setStatus: (status: Order['status']) => {
      orders = orders.map((order) => ({ ...order, status }));
    },
  };
}

async function screenshots(page: Page, name: string) {
  await mkdir('docs/implement_phase/screenshots', { recursive: true });
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `docs/implement_phase/screenshots/product-${name}-${width === 1440 ? 'desktop' : 'mobile'}.png`,
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('CASH checkout blocks duplicate submission and displays every split order with server snapshots', async ({
  page,
}) => {
  const mock = await mockCommerce(page, { blockCheckout: true });
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true })).toBeEnabled();
  await screenshots(page, 'checkout');
  await page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang tạo đơn…', exact: true })).toBeDisabled();
  await page.locator('main form').dispatchEvent('submit');
  await expect.poll(() => mock.counts.checkout).toBe(1);
  mock.release();
  await expect(
    page.getByRole('heading', { name: 'Đơn đăng ký của bạn.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-1', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-2', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-1', exact: true })).toContainText(
    '900.000',
  );
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-2', exact: true })).toContainText(
    '1.100.000',
  );
  expect(mock.counts.checkout).toBe(1);
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole('link', { name: 'Xem tất cả đơn', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await screenshots(page, 'orders');
  expect(mock.counts.admin).toBe(0);
});

test('PayOS returns one pending order for all classes and no invented payment link', async ({
  page,
}) => {
  const mock = await mockCommerce(page);
  await page.goto('/checkout');
  await page.getByRole('radio', { name: /PayOS/ }).check();
  await page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Đơn MD-PAYOS-ALL', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Lớp nền tảng buổi tối');
  await expect(page.getByRole('article')).toContainText('Lớp thực hành cuối tuần');
  await expect(page.getByRole('article')).toContainText('Chờ thanh toán');
  await expect(page.getByRole('link', { name: /Thanh toán ngay|Mở PayOS|Hủy đơn/ })).toHaveCount(0);
  expect(mock.counts.checkout).toBe(1);
});

test('lost checkout response reconciles own orders and cart, displaying all committed orders without retry', async ({
  page,
}) => {
  const mock = await mockCommerce(page, { mode: 'unknown-committed' });
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đơn đăng ký của bạn.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(
    page.getByText('Đã tìm thấy các đơn liên quan trong lịch sử của bạn.', { exact: false }),
  ).toBeVisible();
  expect(mock.counts.checkout).toBe(1);
  expect(mock.counts.orders).toBeGreaterThanOrEqual(2);
  expect(mock.counts.cart).toBeGreaterThanOrEqual(2);
});

test('unknown result stays locked until both reads succeed and a student deliberately retries', async ({
  page,
}) => {
  const mock = await mockCommerce(page, { mode: 'unknown-read-fails' });
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
  await expect(
    page.getByText('Chưa đọc đủ đơn và giỏ hàng để xác định kết quả.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true })).toBeDisabled();
  expect(mock.counts.checkout).toBe(1);
  mock.allowReads();
  await page.getByRole('button', { name: 'Kiểm tra lại đơn và giỏ', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Tạo đơn lại sau khi kiểm tra', exact: true }),
  ).toBeEnabled();
  expect(mock.counts.checkout).toBe(1);
  mock.setMode('success');
  await page.getByRole('button', { name: 'Tạo đơn lại sau khi kiểm tra', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đơn đăng ký của bạn.', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(mock.counts.checkout).toBe(2);
});

test('student-only pages stop mentor/admin calls and ownership denial never loads admin user data', async ({
  page,
}) => {
  const mock = await mockCommerce(page, { role: 'MENTOR', orders: makeOrders() });
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Khu vực dành cho học viên' })).toBeVisible();
  mock.setRole('ADMIN');
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Khu vực dành cho học viên' })).toBeVisible();
  expect(mock.counts.orders).toBe(0);
  expect(mock.counts.cart).toBe(0);
  mock.setRole('STUDENT');
  await page.goto(`/orders/${foreignId}`);
  await expect(page.locator('.error-panel[role="alert"]')).toHaveText(
    'Bạn không có quyền xem đơn đăng ký này.',
  );
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.goto('/orders/not-a-uuid');
  await expect(page.locator('.error-panel[role="alert"]')).toHaveText('Mã đơn không hợp lệ.');
  expect(mock.counts.detail).toBe(1);
  expect(mock.counts.admin).toBe(0);
});

test('orders URL filters/pagination and account switch/logout clear private snapshots', async ({
  page,
}) => {
  const seeded = makeOrders().map(
    (order, index): Order => ({
      ...order,
      status: index === 0 ? 'PENDING' : 'EXPIRED',
    }),
  );
  const mock = await mockCommerce(page, { orders: seeded });
  await page.goto('/orders?pageSize=1');
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-1' })).toBeVisible();
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('article', { name: 'Đơn MD-CASH-2' })).toBeVisible();
  await page.getByLabel('Trạng thái đơn').selectOption('EXPIRED');
  await expect(page).toHaveURL(/page=1/);
  await expect(page).toHaveURL(/status=EXPIRED/);
  await expect(page.getByRole('article')).toHaveCount(1);
  mock.switchStudent();
  await page.evaluate(() => {
    const channel = new BroadcastChannel('mindy-session');
    channel.postMessage('login');
    channel.close();
  });
  await expect(page.getByRole('heading', { name: 'Chưa có đơn phù hợp.' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('MD-CASH-1', { exact: true })).toHaveCount(0);
  const previousReads = mock.counts.orders;
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login/);
  expect(mock.counts.orders).toBe(previousReads);
});

test('deadline rereads server status and keeps PENDING until the API actually returns EXPIRED', async ({
  page,
}) => {
  const now = Date.now();
  await page.clock.install({ time: new Date(now) });
  const mock = await mockCommerce(page, {
    orders: makeOrders('CASH', new Date(now + 2000).toISOString()),
  });
  await page.goto(`/orders/${orderIds[0]}`);
  await expect(page.getByText('Chờ thanh toán', { exact: true })).toBeVisible();
  await page.clock.fastForward(3000);
  await expect.poll(() => mock.counts.detail).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Chờ thanh toán', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã đến hạn giữ chỗ.', { exact: false })).toBeVisible();
  mock.setStatus('EXPIRED');
  await page.getByRole('button', { name: 'Cập nhật trạng thái từ hệ thống', exact: true }).click();
  await expect(page.getByText('Đã hết hạn', { exact: true })).toBeVisible();
  await screenshots(page, 'order-detail');
  const reads = mock.counts.detail;
  await page.clock.fastForward(60_000);
  expect(mock.counts.detail).toBe(reads);
});
