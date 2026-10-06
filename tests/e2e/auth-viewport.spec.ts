import { expect, test } from '@playwright/test';

test('login and registration fit portrait and landscape viewports without scrolling', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
  );
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [375, 667],
    [320, 568],
    [844, 390],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const path of ['/login', '/register']) {
      await page.goto(path);
      await expect(page.locator('form')).toBeVisible();
      const dimensions = await page.locator('form').evaluate((element) => {
        const pane = element.parentElement;
        if (!pane) throw new Error('Auth form has no viewport container');
        return {
          pageWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
          paneHeight: pane.clientHeight,
          contentHeight: pane.scrollHeight,
        };
      });
      expect(dimensions.pageWidth, `${path} at ${width}x${height}`).toBe(width);
      expect(dimensions.pageHeight, `${path} at ${width}x${height}`).toBe(height);
      expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.paneHeight);
      await expect(page.getByRole('link', { name: 'Tiếp tục với Google' })).toBeInViewport();
    }
  }
});

test('validation stays reachable on a short screen without overflowing the page', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
  );
  await page.setViewportSize({ width: 320, height: 400 });
  await page.goto('/register');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#displayName-error')).not.toBeEmpty();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(400);
  const google = page.getByRole('link', { name: 'Tiếp tục với Google' });
  await google.focus();
  await expect(google).toBeFocused();
  await expect(google).toBeInViewport();
});
