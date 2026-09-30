import { expect, type Page, test } from '@playwright/test';

async function mockIdentity(page: Page, role = 'ADMIN') {
  let signedIn = false;
  const me = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'admin@example.com',
    displayName: 'Minh Anh',
    phone: null,
    role,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-09-30T00:00:00Z',
  };
  let student = {
    ...me,
    id: '223e4567-e89b-42d3-a456-426614174000',
    email: 'student@example.com',
    displayName: 'Nguyễn Hải An',
    role: 'STUDENT',
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/login')) {
      if (request.postDataJSON().password !== 'correct-password')
        return route.fulfill({
          status: 401,
          json: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
        });
      signedIn = true;
      return route.fulfill({ json: { user: me, accessTokenExpiresAt: '2026-10-01T00:00:00Z' } });
    }
    if (!signedIn)
      return route.fulfill({
        status: 401,
        json: {
          code: path.endsWith('/refresh') ? 'INVALID_REFRESH_TOKEN' : 'AUTHENTICATION_REQUIRED',
          message: 'Unauthorized',
        },
      });
    if (path.includes('/auth/logout')) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/auth/me')) return route.fulfill({ json: me });
    if (path.endsWith('/status')) {
      student = { ...student, status: request.postDataJSON().status };
      return route.fulfill({ json: student });
    }
    if (path.endsWith('/admin/users') && request.method() === 'POST') {
      const body = request.postDataJSON();
      student = { ...student, email: body.email, displayName: body.displayName, role: body.role };
      return route.fulfill({ status: 201, json: student });
    }
    if (path.endsWith('/admin/users'))
      return route.fulfill({ json: { items: [student], total: 1, page: 1, pageSize: 20 } });
    return route.fulfill({ json: student });
  });
}

test('login, filter, create, suspend and logout through the UI', async ({ page }) => {
  await mockIdentity(page);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('.inline-error[role="alert"]')).toHaveText(
    'Email hoặc mật khẩu chưa đúng.',
  );
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Người dùng', exact: true })).toBeVisible();
  await page.getByLabel('Vai trò', { exact: true }).selectOption('STUDENT');
  await expect(page).toHaveURL(/role=STUDENT/);
  await page.getByRole('link', { name: 'Thêm người dùng', exact: true }).click();
  await page.getByLabel('Họ và tên').fill('Trần Mai');
  await page.getByLabel('Email').fill('mai@example.com');
  await page.getByLabel('Mật khẩu ban đầu').fill('new-password-123');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByRole('heading', { name: 'Trần Mai', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạm khóa tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Đã cập nhật trạng thái tài khoản.');
  await expect(
    page.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('student cannot open management, and mobile navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockIdentity(page, 'STUDENT');
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('student@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  await page.goto('/management/users');
  await expect(page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' })).toBeVisible();
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeVisible();
});

test('API proxy rejects cross-origin mutations and unsupported routes', async ({ request }) => {
  const result = await request.post('/api/v1/auth/login', {
    headers: { origin: 'https://untrusted.example' },
    data: {},
  });
  expect(result.status()).toBe(403);
  expect((await result.json()).code).toBe('ORIGIN_NOT_ALLOWED');
  const unavailable = await request.get('/api/v1/internal/secrets');
  expect(unavailable.status()).toBe(404);
});
