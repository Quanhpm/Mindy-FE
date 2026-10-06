import { expect, test } from '@playwright/test';

test('retired UI references open the current Mindy homepage', async ({ page }) => {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 401, json: { code: 'AUTHENTICATION_REQUIRED' } }),
  );
  for (const route of ['/learnthru', '/ui-lab', '/ui-lab/ocean-editorial/home']) {
    await page.goto(route);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Học code.');
  }
});
