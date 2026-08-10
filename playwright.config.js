import path from 'node:path';
import { defineConfig } from '@playwright/test';

// Every local or CI run gets a new ignored database. The browser check must
// never reopen, clean up or otherwise touch an existing development database.
const testDatabase = path.join(
  process.cwd(),
  'tmp',
  `playwright-${Date.now().toString(36)}.sqlite`
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4170',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'node server.js',
      url: 'http://127.0.0.1:4171/api/health',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '4171',
        DATABASE_FILE: testDatabase,
        APP_SECRET: 'playwright-test-secret-not-for-production',
        REGISTRATION_MODE: 'open',
        PUBLIC_FAMILY_DIRECTORY: 'false',
        NODE_ENV: 'test',
        TZ: 'Europe/Berlin'
      }
    },
    {
      command:
        'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4170',
      url: 'http://127.0.0.1:4170',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_TARGET: 'http://127.0.0.1:4171'
      }
    }
  ]
});
