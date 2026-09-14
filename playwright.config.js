import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server/server.js',
    port: 4000,
    timeout: 15000,
    reuseExistingServer: true,
  },
});
