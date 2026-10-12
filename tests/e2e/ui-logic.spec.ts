import { expect, type Page, type Route, test } from '@playwright/test';

const userId = '123e4567-e89b-42d3-a456-426614174000';
const courseId = '123e4567-e89b-42d3-a456-426614174200';
const categoryId = '123e4567-e89b-42d3-a456-426614174100';
const unitId = '123e4567-e89b-42d3-a456-426614174300';
const user = {
  id: userId,
  displayName: 'Quản trị Mindy',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  phone: null,
  lastLoginAt: null,
  createdAt: '2026-10-06T00:00:00Z',
};
const category = {
  id: categoryId,
  name: 'Lập trình',
  slug: 'lap-trinh',
  isActive: true,
  description: null,
};
const course = {
  id: courseId,
  code: 'JS101',
  title: 'Khóa JavaScript',
  description: null,
  imgUrl: null,
  priceAmount: 1000000,
  category,
  isActive: false,
  createdAt: '2026-10-06T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
};
async function mockAdmin(page: Page, handle: (route: Route, path: string) => Promise<unknown>) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill({ json: user });
    return handle(route, path);
  });
}
function fail(route: Route) {
  return route.fulfill({
    status: 503,
    json: { code: 'API_UNAVAILABLE', message: 'Response lost' },
  });
}
async function fillUser(page: Page) {
  await page.getByLabel('Họ và tên').fill('Người dùng mới');
  await page.getByLabel('Email *', { exact: true }).fill('new@example.com');
  await page.getByLabel('Mật khẩu ban đầu').fill('correct-password-123');
}

test('unknown user creation blocks writes until a successful read and deliberate review', async ({
  page,
}) => {
  let writes = 0;
  let reads = 0;
  await mockAdmin(page, async (route, path) => {
    if (path === '/admin/users' && route.request().method() === 'POST') {
      writes++;
      return fail(route);
    }
    if (path === '/admin/users') {
      reads++;
      if (reads === 1) return fail(route);
      return route.fulfill({
        json: {
          items: [
            { ...user, email: 'new@example.com', displayName: 'Người dùng mới', role: 'STUDENT' },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
        },
      });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto('/management/users/new');
  await fillUser(page);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByText(/Kết quả thao tác chưa rõ/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo tài khoản', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Email *', { exact: true })).toHaveValue('new@example.com');
  await page.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(page.getByText(/Chưa đọc lại được dữ liệu/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đã kiểm tra, cho phép thử lại' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã tìm thấy');
  await expect(page.getByRole('button', { name: 'Tạo tài khoản', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByRole('button', { name: 'Đã kiểm tra, cho phép thử lại' }).click();
  await expect(page.getByRole('button', { name: 'Tạo tài khoản', exact: true })).toBeEnabled();
  expect(writes).toBe(1);
});

test('leaving a pending creation discards its late redirect', async ({ page }) => {
  let release = () => {};
  let writes = 0;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockAdmin(page, async (route, path) => {
    if (path === '/admin/users' && route.request().method() === 'POST') {
      writes++;
      await pending;
      return route.fulfill({ status: 201, json: { ...user, email: 'new@example.com' } });
    }
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20 } });
  });
  await page.goto('/management/users/new');
  await fillUser(page);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await page.getByRole('link', { name: 'Hủy', exact: true }).click();
  release();
  await expect(page).toHaveURL(/\/management\/users$/);
  await expect(page.getByRole('heading', { name: 'Người dùng', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chưa có người dùng phù hợp' })).toBeVisible();
});

test('status dialog returns focus and verifies the server after an unknown write', async ({
  page,
}, info) => {
  let status = 'ACTIVE';
  let writes = 0;
  await mockAdmin(page, async (route, path) => {
    if (path.endsWith('/status')) {
      status = 'SUSPENDED';
      writes++;
      return fail(route);
    }
    return route.fulfill({ json: { ...user, status } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/management/users/${userId}`);
  const trigger = page.getByRole('button', { name: 'Tạm khóa tài khoản', exact: true });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(dialog.getByText(/Kết quả thao tác chưa rõ/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'Trạng thái hiện tại' })).toContainText(
    'Tạm khóa',
  );
  await expect(dialog.getByRole('heading', { name: 'Tạm khóa tài khoản?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Đã kiểm tra, cho phép thử lại' }).click();
  await expect(dialog.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('status-recovery-mobile.png'), fullPage: true });
});

test('an appended unit with a lost response is inspected rather than appended again', async ({
  page,
}, info) => {
  const units: {
    id: string;
    unitNumber: number;
    title: string;
    description: null;
    requiredScorePercent: number;
  }[] = [];
  let writes = 0;
  await mockAdmin(page, async (route, path) => {
    if (path === '/course-categories')
      return route.fulfill({ json: { items: [category], page: 1, pageSize: 100, total: 1 } });
    if (path.endsWith('/units') && route.request().method() === 'POST') {
      writes++;
      units.push({
        id: unitId,
        unitNumber: 1,
        title: 'Học phần đã tạo',
        description: null,
        requiredScorePercent: 80,
      });
      return fail(route);
    }
    return route.fulfill({ json: { ...course, units } });
  });
  await page.goto(`/management/courses/${courseId}?unitId=new`);
  await page.getByLabel('Tên học phần').fill('Học phần đã tạo');
  await page.getByRole('button', { name: 'Thêm học phần', exact: true }).click();
  await expect(page.getByText(/Kết quả thao tác chưa rõ/)).toBeVisible();
  await page.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Học phần đã tạo');
  await expect(page.getByLabel('Tên học phần')).toHaveValue('Học phần đã tạo');
  await expect(page.getByRole('button', { name: 'Thêm học phần', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await expect(page.getByRole('link', { name: 'Học phần (1)', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('unit-recovery-desktop.png'), fullPage: true });
});

test('mentor public navigation exposes cash collection without student purchase links', async ({
  page,
}) => {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { ...user, role: 'MENTOR' } });
    return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 12 } });
  });
  await page.goto('/courses');
  const navigation = page.getByRole('navigation', { name: 'Điều hướng public' });
  await expect(navigation.getByRole('link', { name: 'Thu tiền mặt' })).toHaveAttribute(
    'href',
    '/mentor/cash-orders',
  );
  await expect(navigation.getByRole('link', { name: 'Giỏ hàng' })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Đăng nhập' })).toHaveCount(0);
});
