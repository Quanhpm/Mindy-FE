import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.UI_LAB_BASE_URL || 'http://localhost:3001';
const directory = resolve('docs/ui-exploration/screenshots');
const variants = ['ocean-editorial'];
const views = ['home', 'courses', 'cart', 'login', 'register', 'admin'];
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
const failures = [];
const captures = [];
page.on('pageerror', (error) => failures.push(error.message));
page.on('request', (request) => {
  if (new URL(request.url()).pathname.startsWith('/api/')) failures.push(request.url());
});
try {
  for (const variant of variants) {
    for (const view of views) {
      for (const [device, viewport] of Object.entries(sizes)) {
        await page.setViewportSize(viewport);
        const response = await page.goto(`${baseURL}/ui-lab/${variant}/${view}`);
        if (response?.status() !== 200) throw new Error(`Failed route: ${variant}/${view}`);
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({
          content: '[data-review-toolbar], nextjs-portal { display: none !important; }',
        });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) {
          failures.push(`${variant}/${view}/${device}: body overflow`);
        }
        const filename = `${variant}-${view}-${device}.png`;
        await page.screenshot({
          path: resolve(directory, filename),
          fullPage: true,
          animations: 'disabled',
        });
        captures.push({ variant, view, device, viewport, filename });
        console.info(filename);
      }
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  await writeFile(
    resolve(directory, 'manifest.json'),
    `${JSON.stringify({ baseURL, toolbarHidden: true, captures }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
