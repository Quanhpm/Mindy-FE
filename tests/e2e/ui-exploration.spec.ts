import { expect, type Page, test } from '@playwright/test';

const variants = ['ocean-editorial'];
const views = ['home', 'courses', 'cart', 'login', 'register', 'admin'];

function watchPreview(page: Page) {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) failures.push(request.url());
  });
  return failures;
}

for (const variant of variants) {
  test(`${variant}: all views fit desktop, tablet and small mobile without API calls`, async ({
    page,
  }) => {
    const failures = watchPreview(page);
    for (const width of [1440, 768, 390, 375]) {
      await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
      for (const view of views) {
        await page.goto(`/ui-lab/${variant}/${view}`);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('[data-variant]')).toHaveAttribute('data-variant', variant);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
        if (view === 'register')
          await expect(page.getByLabel('Họ tên', { exact: true })).toBeVisible();
      }
    }
    expect(failures).toEqual([]);
  });

  test(`${variant}: local form validation, submission, table states and keyboard drawer`, async ({
    page,
  }) => {
    const failures = watchPreview(page);
    for (const view of ['login', 'register']) {
      await page.goto(`/ui-lab/${variant}/${view}`);
      const submit = page.getByRole('button', {
        name: view === 'login' ? 'Đăng nhập' : 'Tạo tài khoản',
        exact: true,
      });
      await submit.click();
      await expect(page.locator('form').getByRole('alert').first()).toBeVisible();
      if (view === 'register')
        await page.getByLabel('Họ tên', { exact: true }).fill('Người xem thử');
      await page.getByLabel('Email', { exact: true }).fill('preview@example.com');
      const password = page.getByLabel('Mật khẩu', { exact: true });
      await password.fill('demo-password');
      await page.getByRole('button', { name: 'Hiện mật khẩu' }).click();
      await expect(password).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Ẩn mật khẩu' }).click();
      await submit.click();
      await expect(page.getByRole('status')).toContainText('chưa gửi dữ liệu');
      await expect(page).toHaveURL(new RegExp(`/ui-lab/${variant}/${view}$`));
      await page.getByLabel('Trạng thái UI').selectOption('error');
      await expect(page.locator('form').getByRole('alert')).toBeVisible();
      await page.getByLabel('Trạng thái UI').selectOption('submitting');
      await expect(page.locator('form button[type="submit"]')).toBeDisabled();
    }
    await page.goto(`/ui-lab/${variant}/admin`);
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await page.getByRole('button', { name: 'Trang tiếp' }).click();
    await expect(page.getByText('Hiển thị 6–10 / 15', { exact: true })).toBeVisible();
    await page.getByLabel('Vai trò', { exact: true }).selectOption('MENTOR');
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Trang tiếp' })).toBeDisabled();
    await page.getByLabel('Vai trò', { exact: true }).selectOption('ADMIN');
    await page.getByLabel('Trạng thái', { exact: true }).selectOption('SUSPENDED');
    await expect(page.getByRole('status')).toContainText('Chưa có người dùng phù hợp');
    await page.getByLabel('Trạng thái UI').selectOption('loading');
    await expect(page.getByRole('status', { name: 'Đang tải bảng minh họa' })).toBeVisible();
    await page.getByLabel('Trạng thái UI').selectOption('empty');
    await expect(page.getByRole('status')).toContainText('Chưa có người dùng phù hợp');
    await page.getByLabel('Trạng thái UI').selectOption('error');
    await expect(page.locator('main').getByRole('alert')).toContainText('Chưa tải được danh sách');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole('button', { name: 'Mở menu quản trị' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Menu quản trị mẫu' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(failures).toEqual([]);
  });
}

test('selected layout opens directly and retired concepts are unavailable', async ({ page }) => {
  const failures = watchPreview(page);
  await page.goto('/ui-lab');
  await expect(page).toHaveURL(/\/ui-lab\/ocean-editorial\/home$/);
  await expect(page.locator('main h1')).toContainText('Câu chuyện mới.');
  await expect(page.getByLabel('Mẫu giao diện')).toHaveCount(0);
  await expect(page.getByLabel('Nền phần đầu trang')).toHaveCount(0);
  await page.getByLabel('Màn hình').selectOption('login');
  await page.getByRole('link', { name: /Đăng ký ngay/ }).click();
  await expect(page).toHaveURL(/\/ocean-editorial\/register$/);
  await page.getByLabel('Màn hình').selectOption('home');
  await page.getByRole('link', { name: 'Cách học cùng Mindy' }).click();
  await expect(page.locator('#cach-hoc')).toBeInViewport();
  expect(failures).toEqual([]);
  for (const retired of [
    'sky-blue',
    'pastel-cloud',
    'white-blueprint',
    'azure-studio',
    'ice-minimal',
    'cobalt-mosaic',
    'polar-workspace',
    'blue-ribbon',
    'horizon-split',
    'unknown',
  ]) {
    const response = await page.goto(`/ui-lab/${retired}/home`);
    expect(response?.status()).toBe(404);
  }
});

test('real public routes retain their own theme and registration form', async ({ page }) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } }),
  );
  for (const route of ['/', '/login', '/register']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('[data-variant]')).toHaveCount(0);
  }
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('courses support discovery, details and a persistent cart without duplicate enrollments', async ({
  page,
}) => {
  const failures = watchPreview(page);
  await page.goto('/ui-lab/ocean-editorial/courses');
  const catalog = page.getByRole('region', { name: 'Danh sách khóa học' });
  await expect(catalog.getByRole('article')).toHaveCount(6);
  await page.getByRole('button', { name: 'Backend', exact: true }).click();
  await expect(catalog.getByRole('article')).toHaveCount(2);
  await page.getByLabel('Trình độ', { exact: true }).selectOption('Có nền tảng');
  await expect(catalog.getByRole('article')).toHaveCount(1);
  await page.getByLabel('Tìm khóa học').fill('không tồn tại');
  await expect(page.getByText('Chưa tìm thấy khóa học phù hợp.')).toBeVisible();
  await page.getByRole('button', { name: 'Xem tất cả khóa học' }).click();
  await expect(catalog.getByRole('article')).toHaveCount(6);
  await page.getByLabel('Tìm khóa học').fill('LAM VIEC VOI DU LIEU');
  await expect(catalog.getByRole('article')).toHaveCount(1);
  await page.getByLabel('Tìm khóa học').fill('');
  await page.getByLabel('Sắp xếp khóa học').selectOption('price-asc');
  await expect(catalog.getByRole('article').first()).toHaveAccessibleName(
    'Làm việc với dữ liệu & SQL',
  );
  const react = catalog.getByRole('article', { name: 'Xây dựng ứng dụng với React', exact: true });
  const detail = react.getByRole('button', { name: 'Xây dựng ứng dụng với React', exact: true });
  await detail.click();
  const dialog = page.getByRole('dialog', { name: 'Xây dựng ứng dụng với React', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('ol li')).toHaveCount(4);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(detail).toBeFocused();
  await react.getByRole('button', { name: 'Thêm Xây dựng ứng dụng với React vào giỏ' }).click();
  await expect(react.getByRole('link', { name: /Trong giỏ hàng/ })).toBeVisible();
  await expect(react.getByRole('button', { name: /Thêm .* vào giỏ/ })).toHaveCount(0);
  await catalog
    .getByRole('article', { name: 'Thiết kế web với HTML & CSS', exact: true })
    .getByRole('button', { name: /Thêm .* vào giỏ/ })
    .click();
  await page.getByRole('link', { name: 'Giỏ hàng, 2 khóa học', exact: true }).click();
  await expect(page).toHaveURL(/\/ocean-editorial\/cart$/);
  const list = page.getByRole('region', { name: 'Khóa học trong giỏ' });
  await expect(list.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('complementary', { name: 'Tóm tắt giỏ hàng' })).toContainText(
    '3.600.000',
  );
  await page.reload();
  await expect(list.getByRole('article')).toHaveCount(2);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  const review = page.getByRole('button', { name: 'Xem lại đăng ký' });
  await review.click();
  await expect(page.getByRole('dialog', { name: 'Những điều bạn sẽ học.' })).toContainText(
    '3.600.000',
  );
  await page.keyboard.press('Escape');
  await expect(review).toBeFocused();
  await page.getByRole('button', { name: 'Xóa Xây dựng ứng dụng với React khỏi giỏ' }).click();
  await expect(list.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('complementary', { name: 'Tóm tắt giỏ hàng' })).toContainText(
    '1.200.000',
  );
  await page.getByRole('button', { name: 'Xóa Thiết kế web với HTML & CSS khỏi giỏ' }).click();
  await expect(page.getByRole('region', { name: 'Giỏ hàng trống' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Giỏ hàng trống' })).toBeVisible();
  expect(failures).toEqual([]);
});

test('cart discards malformed storage and derives prices only from known preview courses', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'mindy-ocean-preview-cart',
      JSON.stringify(['javascript', 'javascript', 'unknown-course', 12, { id: 'react', price: 1 }]),
    );
  });
  await page.goto('/ui-lab/ocean-editorial/cart');
  const cart = page.getByRole('region', { name: 'Khóa học trong giỏ' });
  await expect(cart.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('complementary', { name: 'Tóm tắt giỏ hàng' })).toContainText(
    '1.800.000',
  );
});
