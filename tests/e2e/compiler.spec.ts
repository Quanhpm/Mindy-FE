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
        stderr: error ? 'Error: Lỗi khi chạy thử' : '',
        exitCode: error ? 1 : 0,
        durationMs: 20,
        truncated: false,
      },
    });
  });
  await page.goto('/compiler');
  await page.getByLabel('Mã nguồn mẫu').selectOption('stdin');
  await expect(page.getByLabel('Dữ liệu đầu vào (tùy chọn)')).toHaveValue('2 3 5');
  await page.getByRole('button', { name: 'Chạy mã nguồn' }).click();
  await expect(page.getByRole('status')).toHaveText('Thành công');
  await expect(page.locator('pre').first()).toHaveText('10');
  await page.getByLabel('Mã nguồn mẫu').selectOption('error');
  await page.getByLabel('Mã nguồn JavaScript').press('Control+Enter');
  await expect(page.getByRole('status')).toHaveText('Lỗi chương trình');
  await expect(page.locator('pre').last()).toContainText('Error: Lỗi khi chạy thử');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
