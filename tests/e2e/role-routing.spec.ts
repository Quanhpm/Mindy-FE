import { expect, test } from '@playwright/test';

for (const [role, destination] of [
  ['ADMIN', '/management/users'],
  ['MANAGER', '/manager/classes'],
  ['MENTOR', '/mentor/classes'],
] as const) {
  test(`${role} login and Google session default go to the role workspace`, async ({ page }) => {
    let signedIn = false;
    const user = {
      id: '10000000-0000-4000-8000-000000000001',
      email: 'role@example.com',
      phone: null,
      displayName: 'Kiểm tra điều hướng',
      role,
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: '2026-10-12T00:00:00Z',
    };
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/login')) {
        signedIn = true;
        return route.fulfill({ json: { user, accessTokenExpiresAt: '2099-01-01T00:00:00Z' } });
      }
      if (path.endsWith('/auth/me'))
        return route.fulfill(
          signedIn ? { json: user } : { status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } },
        );
      if (path.endsWith('/auth/refresh'))
        return route.fulfill({ status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } });
      return route.fulfill({ json: { items: [], page: 1, pageSize: 20, total: 0 } });
    });
    await page.goto('/login?next=%2Fcourses');
    await page.getByLabel('Email', { exact: true }).fill('role@example.com');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(destination);
    await page.goto('/account?mindyAuth=google');
    await expect(page).toHaveURL(destination);
    await page.reload();
    await expect(page).toHaveURL(destination);
    await page.goto('/account');
    await expect(
      page.getByRole('heading', { name: 'Tài khoản của tôi', exact: true }),
    ).toBeVisible();
    await page.goto('/');
    await expect(page).toHaveURL(destination);
  });
}
