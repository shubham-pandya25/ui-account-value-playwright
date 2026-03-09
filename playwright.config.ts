import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
      },
    },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        storageState: 'playwright/.auth/session.json',
      },
    },
  ],
});