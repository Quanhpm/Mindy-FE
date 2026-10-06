import { mkdir } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

const uuid = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const classId = uuid(1);
const secondClassId = uuid(2);
const courseId = uuid(3);
const student = {
  id: uuid(4),
  email: 'student@example.com',
  displayName: 'Học viên Mindy',
  role: 'STUDENT',
  status: 'ACTIVE',
  phone: null,
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00Z',
};
const item = {
  classId,
  classCode: 'WEB-01',
  className: 'Lớp Web tối',
  courseId,
  courseTitle: 'Web căn bản',
  deliveryMode: 'ONLINE',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  priceSnapshot: 1500000,
  currentPriceAmount: 1800000,
  isPurchasable: true,
  addedAt: '2026-10-02T00:00:00Z',
};
const publicClass = {
  id: classId,
  courseId,
  code: item.classCode,
  name: item.className,
  startDate: item.startDate,
  endDate: item.endDate,
  maxStudents: 20,
  availableSeats: 10,
  deliveryMode: item.deliveryMode,
  mentor: { id: uuid(5), displayName: 'Mentor An' },
  units: [],
};
const publicCourse = {
  id: courseId,
  code: 'WEB101',
  imgUrl: null,
  title: item.courseTitle,
  description: null,
  priceAmount: item.currentPriceAmount,
  category: { id: uuid(6), name: 'Web', slug: 'web' },
  units: [],
  openClasses: [],
};
async function mockCart(
  page: Page,
  options: {
    role?: string;
    anonymous?: boolean;
    empty?: boolean;
    addError?: string;
    addLostResponse?: boolean;
    deleteLostResponse?: boolean;
    unavailable?: boolean;
  } = {},
) {
  let owner = 0;
  let signedIn = !options.anonymous;
  let items = options.empty
    ? []
    : [
        { ...item },
        {
          ...item,
          classId: secondClassId,
          classCode: 'WEB-02',
          className: 'Lớp Web cuối tuần',
          currentPriceAmount: 1200000,
          priceSnapshot: 1200000,
          isPurchasable: !options.unavailable,
        },
      ];
  let cartReads = 0;
  let readsUnavailable = false;
  let additions = 0;
  const deletions: string[] = [];
  const snapshot = () => ({
    items: owner === 0 ? items : [],
    totalAmount:
      owner === 0 ? items.reduce((total, value) => total + value.currentPriceAmount, 0) : 0,
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/logout') {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path === '/auth/me')
      return signedIn
        ? route.fulfill({
            json: {
              ...student,
              id: owner === 0 ? student.id : uuid(44),
              role: options.role ?? 'STUDENT',
            },
          })
        : route.fulfill({
            status: 401,
            json: { code: 'AUTHENTICATION_REQUIRED', message: 'Anonymous' },
          });
    if (path === '/auth/refresh')
      return route.fulfill({
        status: 401,
        json: { code: 'INVALID_REFRESH_TOKEN', message: 'Anonymous' },
      });
    if (path === `/classes/${classId}`) return route.fulfill({ json: publicClass });
    if (path === `/courses/${courseId}`) return route.fulfill({ json: publicCourse });
    if (path === '/me/cart') {
      cartReads += 1;
      if (readsUnavailable)
        return route.fulfill({
          status: 503,
          json: { code: 'API_UNAVAILABLE', message: 'Unavailable' },
        });
      return route.fulfill({ json: snapshot() });
    }
    if (path === '/me/cart/items') {
      additions += 1;
      expect(request.postDataJSON()).toEqual({ classId });
      if (options.addError)
        return route.fulfill({
          status: 409,
          json: { code: options.addError, message: 'Conflict' },
        });
      if (items.some((value) => value.classId === classId))
        return route.fulfill({
          status: 409,
          json: { code: 'CART_ITEM_ALREADY_EXISTS', message: 'Duplicate' },
        });
      items.push({ ...item });
      if (options.addLostResponse) return route.abort('failed');
      return route.fulfill({ status: 201, json: snapshot() });
    }
    if (path.startsWith('/me/cart/items/')) {
      expect(request.method()).toBe('DELETE');
      expect(request.postData()).toBeNull();
      deletions.push(path);
      items = items.filter((value) => value.classId !== path.split('/').at(-1));
      if (options.deleteLostResponse) return route.abort('failed');
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: path } });
  });
  return {
    cartReads: () => cartReads,
    additions: () => additions,
    deletions,
    setReadsUnavailable: (value: boolean) => {
      readsUnavailable = value;
    },
    setOwner: () => {
      owner = 1;
    },
  };
}

test('real cart renders current/snapshot prices, removes unavailable class and uses keyboard at every width', async ({
  page,
}) => {
  const state = await mockCart(page, { unavailable: true });
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Giỏ hàng của bạn.' })).toBeVisible();
  await expect(page.locator('[data-cart-total]')).toHaveText(/3\.000\.000/);
  await expect(page.getByText('Giá khi thêm: 1.500.000', { exact: false })).toBeVisible();
  await expect(page.getByText('Học phí đã thay đổi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiếp tục tạo đơn', exact: true })).toBeDisabled();
  await mkdir('docs/implement_phase/screenshots', { recursive: true });
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width === 1440 || width === 390) {
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await page.screenshot({
        path: `docs/implement_phase/screenshots/mock-cart-${width}.png`,
        fullPage: true,
      });
    }
    const remove = page.getByRole('button', {
      name: 'Xóa Lớp Web cuối tuần khỏi giỏ',
      exact: true,
    });
    await remove.focus();
    await expect(remove).toBeFocused();
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('.success-notice[role="status"]')).toContainText('Đã xóa lớp');
  await expect(page.getByRole('article', { name: 'Lớp Web cuối tuần', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('[data-cart-total]')).toHaveText(/1\.800\.000/);
  await expect(page.getByRole('link', { name: 'Tiếp tục tạo đơn', exact: false })).toHaveAttribute(
    'href',
    '/checkout',
  );
  expect(state.deletions).toEqual([`/me/cart/items/${secondClassId}`]);
  expect(state.cartReads()).toBeGreaterThanOrEqual(2);
});

test('failed cart refresh clears stale prices and checkout link until retry succeeds', async ({
  page,
}) => {
  const state = await mockCart(page);
  await page.goto('/cart');
  await expect(page.locator('[data-cart-total]')).toHaveText(/3\.000\.000/);
  state.setReadsUnavailable(true);
  await page.evaluate(() => window.dispatchEvent(new Event('mindy:cart-changed')));
  await expect(page.locator('.error-panel[role="alert"]')).toBeVisible();
  await expect(page.locator('[data-cart-total]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Tiếp tục tạo đơn', exact: false })).toHaveCount(0);
  state.setReadsUnavailable(false);
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('[data-cart-total]')).toHaveText(/3\.000\.000/);
  await expect(page.getByRole('link', { name: 'Tiếp tục tạo đơn', exact: false })).toBeVisible();
});

test('add-to-cart reconciles duplicate from backend and sends only classId', async ({ page }) => {
  const state = await mockCart(page);
  await page.goto(`/classes/${classId}`);
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await expect(page.locator('.inline-error[role="alert"]')).toContainText('đã có trong giỏ');
  await expect(
    page.getByRole('link', { name: 'Đã có trong giỏ · Xem giỏ', exact: true }),
  ).toBeVisible();
  expect(state.additions()).toBe(1);
  expect(state.cartReads()).toBe(1);
});

test('lost add response is reconciled with a read and the POST is never replayed', async ({
  page,
}) => {
  const state = await mockCart(page, { empty: true, addLostResponse: true });
  await page.goto(`/classes/${classId}`);
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await expect(page.locator('.inline-error[role="alert"]')).toContainText(
    'Kết quả thêm lớp chưa rõ',
  );
  await expect(
    page.getByRole('link', { name: 'Đã có trong giỏ · Xem giỏ', exact: true }),
  ).toBeVisible();
  expect(state.additions()).toBe(1);
  expect(state.cartReads()).toBe(1);
});

test('lost DELETE response reconciles cart and does not repeat mutation', async ({ page }) => {
  const state = await mockCart(page, { deleteLostResponse: true });
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Xóa Lớp Web tối khỏi giỏ', exact: true }).click();
  await expect(page.locator('.error-panel[role="alert"]')).toContainText('Kết quả xóa lớp chưa rõ');
  await expect(page.getByRole('article', { name: 'Lớp Web tối', exact: true })).toHaveCount(0);
  expect(state.deletions).toHaveLength(1);
  expect(state.cartReads()).toBeGreaterThanOrEqual(2);
});

test('account switch clears private cart and logout leaves no previous cart in UI', async ({
  page,
}) => {
  const state = await mockCart(page);
  await page.goto('/cart');
  await expect(page.getByRole('article', { name: 'Lớp Web tối', exact: true })).toBeVisible();
  state.setOwner();
  await page.evaluate(() => {
    const channel = new BroadcastChannel('mindy-session');
    channel.postMessage('login');
    channel.close();
  });
  await expect(page.getByRole('region', { name: 'Giỏ hàng trống', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Lớp Web tối', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('article', { name: 'Lớp Web tối', exact: true })).toHaveCount(0);
});

test('cart rejects non-student UI without requesting private cart; anonymous add retains safe return path', async ({
  page,
}) => {
  const state = await mockCart(page, { role: 'ADMIN' });
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Giỏ hàng dành cho học viên' })).toBeVisible();
  expect(state.cartReads()).toBe(0);
  await page.unroute('**/api/v1/**');
  await mockCart(page, { anonymous: true });
  await page.goto(`/classes/${classId}`);
  const login = page.getByRole('link', { name: 'Đăng nhập để thêm vào giỏ', exact: true });
  await expect(login).toHaveAttribute(
    'href',
    `/login?${new URLSearchParams({ next: `/classes/${classId}` })}`,
  );
});
