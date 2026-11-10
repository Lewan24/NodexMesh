import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/guide',
  outputDir: './test-results/guide-capture',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4181',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:guide && npm run preview:guide',
    url: 'http://127.0.0.1:4181/e2e/guide/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
