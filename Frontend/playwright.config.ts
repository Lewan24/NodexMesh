import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4178',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:performance && npm run preview:performance',
    url: 'http://127.0.0.1:4178/e2e/performance/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
