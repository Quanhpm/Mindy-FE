import { expect, test } from '@playwright/test';
import { mindyTheme } from '../../src/shared/config/theme';

const course = {
  id: '10000000-0000-4000-8000-000000000001',
  code: 'JS-101',
  title: 'JavaScript tại Mindy',
  description: 'Học nền tảng JavaScript và thực hành cùng mentor.',
  priceAmount: 1800000,
  imgUrl: null,
  category: { id: '10000000-0000-4000-8000-000000000002', name: 'Lập trình', slug: 'lap-trinh' },
};
test('homepage renders API courses, fits four widths and supports keyboard menu', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/v1/courses?**', (route) =>
    route.fulfill({ json: { items: [course], total: 1, page: 1, pageSize: 4 } }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Học code.');
    await expect(page.getByRole('heading', { name: course.title })).toBeVisible();
    await expect(page.getByText('1.800.000 ₫', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const headingLines = await page
      .getByRole('heading', { level: 1 })
      .evaluate(
        (element) => element.clientHeight / Number.parseFloat(getComputedStyle(element).lineHeight),
      );
    expect(headingLines).toBeLessThanOrEqual(3.1);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
  }
  const trigger = page.getByRole('button', { name: 'Mở menu', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Menu Mindy' });
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test('homepage API failure recovers on retry and an empty catalog stays truthful', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/v1/courses?**', (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Thử lại sau' } }
        : { json: { items: [], total: 0, page: 1, pageSize: 4 } },
    ),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chương mới đang được chuẩn bị.' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('one palette recolors homepage, auth and catalog controls with readable CTA contrast', async ({
  page,
}, info) => {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(
      path.endsWith('/courses')
        ? { json: { items: [course], total: 1, page: 1, pageSize: 4 } }
        : path.endsWith('/course-categories')
          ? { json: { items: [], total: 0, page: 1, pageSize: 20 } }
          : { status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } },
    );
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/login', '/courses']) {
    await page.goto(route);
    const control =
      route === '/'
        ? page
            .getByRole('link', { name: /Khám phá khóa học/ })
            .filter({ has: page.locator('span') })
            .first()
        : route === '/login'
          ? page.getByRole('button', { name: 'Đăng nhập', exact: true })
          : page.getByRole('button', { name: 'Áp dụng bộ lọc' });
    const before = await control.evaluate((element) => getComputedStyle(element).backgroundColor);
    const palette = { ...mindyTheme.palettes.lavender, action: '#454d83' };
    await page.evaluate((colors) => {
      for (const [key, value] of Object.entries(colors))
        document.documentElement.style.setProperty(`--mindy-${key}`, value);
    }, palette);
    const after = await control.evaluate((element) => ({
      bg: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
    }));
    expect(after.bg).not.toBe(before);
    expect(after.bg).toBe('rgb(69, 77, 131)');
    expect(after.color).toBe('rgb(255, 255, 255)');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(255, 242, 242)',
    );
    await page.screenshot({
      path: info.outputPath(`lavender-${route === '/' ? 'home' : route.slice(1)}.png`),
      fullPage: true,
    });
  }
});

test('default motion reveals content and cleans up through route navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 4 } }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
  await page.getByRole('heading', { name: 'Có nhiều cách để bắt đầu.' }).scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('heading', { name: 'Có nhiều cách để bắt đầu.' }).locator('..'),
  ).toHaveCSS('opacity', '1');
  await page.getByRole('link', { name: /Mở không gian code/ }).click();
  await expect(page).toHaveURL('/compiler');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
