import { expect, test } from '@playwright/test';

test('compiler samples send stdin and show output and runtime errors', async ({ page }) => {
  await page.route('**/api/v1/compiler/run', async (route) => {
    const body = route.request().postDataJSON();
    const error = body.code.includes('throw new Error');
    if (!error) expect(body.stdin).toBe('2 3 5');
    await route.fulfill({
      json: {
        ok: !error,
        status: error ? 'user_error' : 'success',
        stdout: error ? '' : '10\n',
        stderr: error ? 'Error: Test runtime error' : '',
        exitCode: error ? 1 : 0,
        durationMs: 20,
        truncated: false,
      },
    });
  });
  await page.goto('/compiler');
  await page.getByLabel('Code mẫu').selectOption('stdin');
  await expect(page.getByLabel('stdin (tùy chọn)')).toHaveValue('2 3 5');
  await page.getByRole('button', { name: 'Chạy code' }).click();
  await expect(page.getByRole('status')).toHaveText('Thành công');
  await expect(page.locator('pre').first()).toHaveText('10');
  await page.getByLabel('Code mẫu').selectOption('error');
  await page.getByLabel('Code JavaScript').press('Control+Enter');
  await expect(page.getByRole('status')).toHaveText('Lỗi chương trình');
  await expect(page.locator('pre').last()).toContainText('Error: Test runtime error');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
