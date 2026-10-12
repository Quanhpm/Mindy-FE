import { expect, test } from '@playwright/test';

for (const role of ['ADMIN', 'MANAGER', 'STUDENT', 'MENTOR', 'ANONYMOUS'] as const) {
  test(`${role}: home and courses agree on session; management requires ADMIN`, async ({
    page,
  }, info) => {
    let adminRequests = 0;
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/admin/')) adminRequests += 1;
      if (path.endsWith('/auth/me'))
        return route.fulfill(
          role === 'ANONYMOUS'
            ? { status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } }
            : {
                json: {
                  id: '10000000-0000-4000-8000-000000000001',
                  email: 'permission@example.com',
                  displayName: 'Permission Test',
                  phone: null,
                  role,
                  status: 'ACTIVE',
                  lastLoginAt: null,
                  createdAt: '2026-10-09T00:00:00Z',
                },
              },
        );
      if (path.endsWith('/auth/refresh'))
        return route.fulfill({ status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } });
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 12 } });
    });
    await page.goto('/');
    const staff = role === 'ADMIN' || role === 'MANAGER' || role === 'MENTOR';
    const destinations = {
      ADMIN: '/management/users',
      MANAGER: '/manager/classes',
      MENTOR: '/mentor/classes',
    };
    if (staff) {
      await expect(page).toHaveURL(destinations[role]);
      await expect(page.getByRole('button', { name: 'Mở trình đơn tài khoản' })).toBeVisible();
    } else {
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const header = page.locator('header');
      if (role === 'ANONYMOUS')
        await expect(
          header.getByRole('link', { name: 'Đăng nhập', exact: true }).last(),
        ).toBeVisible();
      else await expect(header.getByRole('link', { name: /Permission Test/ }).last()).toBeVisible();
    }
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width <= 768) {
        await page.getByRole('button', { name: 'Mở trình đơn', exact: true }).click();
        const drawer = page.getByRole('dialog', { name: 'Trình đơn Mindy' });
        await expect(drawer).toBeVisible();
        await page.keyboard.press('Escape');
      }
      await page.screenshot({ path: info.outputPath(`session-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/courses');
    await expect(
      page
        .getByRole('link', { name: role === 'ANONYMOUS' ? 'Đăng nhập' : 'Tài khoản', exact: true })
        .first(),
    ).toBeVisible();
    for (const path of [
      '/management/users',
      '/management/courses',
      '/management/classes',
      '/management/course-categories',
      '/management/payments/reconciliation',
    ]) {
      await page.goto(path);
      if (role === 'ANONYMOUS') await expect(page).toHaveURL(/\/login\?next=/);
      else if (role !== 'ADMIN')
        await expect(
          page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole('link', { name: 'Người dùng', exact: true }).first(),
        ).toBeVisible();
    }
    if (role !== 'ADMIN') expect(adminRequests).toBe(0);
    else expect(adminRequests).toBeGreaterThan(0);
  });
}

for (const path of ['/', '/courses']) {
  for (const outcome of ['authenticated', 'anonymous', 'error'] as const) {
    test(`${path}: slow ${outcome} session stays unobtrusive in the public header`, async ({
      page,
    }, info) => {
      let release = () => {};
      const waiting = new Promise<void>((resolve) => {
        release = resolve;
      });
      let sessionRequests = 0;
      await page.route('**/api/v1/**', async (route) => {
        const endpoint = new URL(route.request().url()).pathname;
        if (endpoint.endsWith('/auth/me')) {
          sessionRequests++;
          await waiting;
          return route.fulfill(
            outcome === 'authenticated'
              ? {
                  json: {
                    id: '10000000-0000-4000-8000-000000000001',
                    email: 'permission@example.com',
                    displayName: 'Người dùng thử',
                    phone: null,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    lastLoginAt: null,
                    createdAt: '2026-10-09T00:00:00Z',
                  },
                }
              : {
                  status: outcome === 'anonymous' ? 401 : 503,
                  json: {
                    code: outcome === 'anonymous' ? 'AUTHENTICATION_REQUIRED' : 'API_UNAVAILABLE',
                  },
                },
          );
        }
        if (endpoint.endsWith('/auth/refresh'))
          return route.fulfill({ status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } });
        return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 12 } });
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await expect.poll(() => sessionRequests).toBeGreaterThan(0);
      if (path === '/') await expect(page.getByText('Đang mở trang của bạn…')).toBeVisible();
      else await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const header = page.locator('header');
      await expect(header.getByText('Đang kiểm tra tài khoản…')).toHaveCount(0);
      await expect(header.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveCount(0);
      await expect(header.getByRole('link', { name: 'Quản trị', exact: true })).toHaveCount(0);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        if (width === 390 && path !== '/') {
          await page.getByRole('button', { name: 'Mở trình đơn', exact: true }).click();
          const drawer = page.getByRole('dialog', { name: 'Trình đơn Mindy' });
          await expect(drawer).toBeVisible();
          await expect(drawer.getByText('Đang kiểm tra tài khoản…')).toHaveCount(0);
          await expect(drawer.getByRole('link', { name: 'Đăng nhập', exact: true })).toHaveCount(0);
          await page.keyboard.press('Escape');
        }
        await page.screenshot({ path: info.outputPath(`initial-session-${width}.png`) });
      }
      release();
      await page.setViewportSize({ width: 1440, height: 900 });
      if (outcome === 'authenticated') {
        if (path === '/') await expect(page).toHaveURL('/management/users');
        else
          await expect(header.getByRole('link', { name: 'Quản trị', exact: true })).toBeVisible();
      } else if (outcome === 'anonymous')
        await expect(header.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
      else
        await expect(header.getByRole('button', { name: 'Thử lại phiên đăng nhập' })).toBeVisible();
    });
  }
}
