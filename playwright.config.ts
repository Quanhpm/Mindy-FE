import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3101', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --port 3101',
    url: 'http://localhost:3101/login',
    reuseExistingServer: false,
    env: { APP_ORIGIN: 'http://localhost:3101', API_BASE_URL: 'http://127.0.0.1:3199/api/v1' },
  },
});
