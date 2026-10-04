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
  const callback = await request.get(
    '/api/v1/auth/google/callback?code=one-use-code&state=opaque&scope=openid',
    { maxRedirects: 0 },
  );
  expect(callback.status()).toBe(303);
  expect(callback.headers().location).toBe('/login/google/callback?code=one-use-code&state=opaque');
  expect(callback.headers()['set-cookie']).toBeUndefined();
  const rejectedCallback = await request.post('/api/v1/auth/google/callback', {
    headers: { origin: 'https://untrusted.example' },
    data: { code: 'code', state: 'state' },
  });
  expect(rejectedCallback.status()).toBe(403);
});

test('valid Google intent takes priority over an existing account session', async ({ page }) => {
  const existing = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'existing@example.com',
    displayName: 'Tài khoản hiện có',
    phone: null,
    role: 'ADMIN',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00Z',
  };
  const onboarding = {
    ...existing,
    id: '223e4567-e89b-42d3-a456-426614174000',
    email: 'new-google@example.com',
    role: 'STUDENT',
    displayName: 'Học viên Google mới',
  };
  let completed = false;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me'))
      return route.fulfill({ json: completed ? onboarding : existing });
    if (path.endsWith('/registration-context'))
      return route.fulfill({
        json: {
          email: onboarding.email,
          displayName: onboarding.displayName,
          avatarUrl: null,
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    if (path.endsWith('/complete-registration')) {
      completed = true;
      return route.fulfill({
        json: {
          user: onboarding,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { code: 'NOT_FOUND', message: 'Unexpected request' },
    });
  });
  await page.goto('/register/complete');
  await expect(page.getByLabel('Email đã xác thực')).toHaveValue(onboarding.email);
  await expect(page).toHaveURL(/\/register\/complete$/);
  await page.getByRole('button', { name: 'Hoàn tất đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  await expect(page.getByText(onboarding.email, { exact: true }).first()).toBeVisible();
});

test('Google browser finalization waits for another tab refresh and exchanges its code once', async ({
  context,
  page,
}) => {
  const original = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'existing@example.com',
    displayName: 'Tài khoản trước',
    phone: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00Z',
  };
  const google = {
    ...original,
    id: '223e4567-e89b-42d3-a456-426614174000',
    email: 'google-finalized@example.com',
    displayName: 'Tài khoản Google',
  };
  let releaseRefresh: () => void = () => undefined;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  let refreshStarted = false;
  let finalized = false;
  let callbackCalls = 0;
  const other = await context.newPage();
  await other.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) {
      refreshStarted = true;
      await refreshGate;
      return route.fulfill({
        json: {
          user: original,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    }
    return route.fulfill({
      status: 401,
      json: { code: 'AUTHENTICATION_REQUIRED', message: 'Expired' },
    });
  });
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: finalized ? google : original });
    if (path.endsWith('/auth/google/callback')) {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ code: 'one-use-code', state: 'opaque' });
      callbackCalls += 1;
      finalized = true;
      return route.fulfill({ json: { redirectTo: '/account?mindyAuth=google' } });
    }
    return route.fulfill({
      status: 404,
      json: { code: 'NOT_FOUND', message: 'Unexpected request' },
    });
  });
  try {
    await other.goto('/account', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => refreshStarted).toBe(true);
    await page.goto('/login/google/callback?code=one-use-code&state=opaque');
    await expect(page).toHaveURL(/\/login\/google\/callback$/);
    expect(callbackCalls).toBe(0);
    releaseRefresh();
    await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
    await expect(page.getByText(google.email, { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
    expect(callbackCalls).toBe(1);
    expect(
      await page.evaluate(
        () => `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)}`,
      ),
    ).not.toContain('one-use-code');
  } finally {
    releaseRefresh();
    await other.close();
  }
});

test('Google sign-in links, failure feedback and Ocean auth fit all supported widths', async ({
  page,
}) => {
  await mockIdentity(page);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login?next=%2Fmanagement%2Fclasses');
    await expect(page.getByRole('link', { name: 'Tiếp tục với Google' })).toHaveAttribute(
      'href',
      '/api/v1/auth/google?returnTo=%2Fmanagement%2Fclasses',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await page.getByRole('heading', { level: 1 }).count()).toBe(1);
    if (width === 1440 || width === 390)
      await page.screenshot({ path: `docs/implement_phase/screenshots/mock-login-${width}.png` });
  }
  await page.goto('/register');
  await expect(page.getByRole('link', { name: 'Tiếp tục với Google' })).toBeVisible();
  await page.goto('/login?error=google_unavailable');
  await expect(page.locator('.inline-error[role="alert"]')).toContainText('Google chưa khả dụng');
  await page.goto('/login?error=google_authentication_failed');
  await expect(page.locator('.inline-error[role="alert"]')).toContainText(
    'Không thể hoàn tất đăng nhập Google',
  );
});

test('Google onboarding prefills immutable email, submits only profile fields and starts a session', async ({
  page,
}) => {
  let signedIn = false;
  const user = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'google@example.com',
    phone: null,
    displayName: 'Học viên Google',
    role: 'STUDENT',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00Z',
  };
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/registration-context'))
      return route.fulfill({
        json: {
          email: user.email,
          displayName: 'Tên từ Google',
          avatarUrl: null,
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    if (path.endsWith('/complete-registration')) {
      expect(route.request().postDataJSON()).toEqual({
        displayName: user.displayName,
        deviceName: 'Mindy Web',
      });
      signedIn = true;
      return route.fulfill({
        status: 201,
        json: { user, accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString() },
      });
    }
    if (signedIn && path.endsWith('/auth/me')) return route.fulfill({ json: user });
    return route.fulfill({
      status: 401,
      json: { code: 'INVALID_REFRESH_TOKEN', message: 'Unauthorized' },
    });
  });
  await page.goto('/register/complete');
  await expect(page.getByLabel('Email đã xác thực')).toHaveValue(user.email);
  await expect(page.getByLabel('Email đã xác thực')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Họ tên', { exact: true })).toHaveValue('Tên từ Google');
  await page.getByLabel('Họ tên', { exact: true }).fill(user.displayName);
  await page.getByRole('button', { name: 'Hoàn tất đăng ký', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
});

test('expired Google intent offers a fresh navigation instead of refreshing the session', async ({
  page,
}) => {
  await page.route('**/api/v1/**', async (route) =>
    route.fulfill({
      status: 401,
      json: {
        code: new URL(route.request().url()).pathname.endsWith('/registration-context')
          ? 'INVALID_REGISTRATION_INTENT'
          : 'INVALID_REFRESH_TOKEN',
        message: 'Expired',
      },
    }),
  );
  await page.goto('/register/complete');
  await expect(page.locator('.inline-error[role="alert"]')).toContainText(
    'Phiên đăng ký Google đã hết hạn',
  );
  await expect(page.getByRole('link', { name: 'Tiếp tục với Google' })).toHaveAttribute(
    'href',
    '/api/v1/auth/google?returnTo=%2Faccount',
  );
  await expect(page.getByRole('button', { name: 'Hoàn tất đăng ký' })).toHaveCount(0);
});

test('Google callback failure remains visible with an old session and manual login can continue', async ({
  page,
}) => {
  const existing = {
    id: '123e4567-e89b-42d3-a456-426614174000',
    email: 'existing@example.com',
    displayName: 'Tài khoản hiện có',
    phone: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00Z',
  };
  const next = {
    ...existing,
    id: '223e4567-e89b-42d3-a456-426614174000',
    email: 'next@example.com',
    displayName: 'Tài khoản đăng nhập mới',
  };
  let signedInHere = false;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: signedInHere ? next : existing });
    if (path.endsWith('/auth/login')) {
      expect(route.request().postDataJSON().email).toBe(next.email);
      signedInHere = true;
      return route.fulfill({
        json: {
          user: next,
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { code: 'NOT_FOUND', message: 'Unexpected request' },
    });
  });
  await page.goto('/login?error=unrecognized_error');
  await expect(page).toHaveURL(/\/account$/);
  for (const error of ['google_unavailable', 'google_authentication_failed']) {
    await page.goto(`/login?error=${error}`);
    await expect(page.locator('.inline-error[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/login\\?error=${error}$`));
  }
  await page.getByLabel('Email', { exact: true }).fill(next.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(next.email, { exact: true }).first()).toBeVisible();
});
