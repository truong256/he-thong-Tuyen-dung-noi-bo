import { defineConfig } from '@playwright/test';
import base from './playwright.config';

if (!process.env.S306_E2E_FIXTURE_FILE) {
  throw new Error('Start S305S306BrowserFixture and set S306_E2E_FIXTURE_FILE before running this dedicated suite.');
}

export default defineConfig({
  ...base,
  testMatch: 's305-s306-real.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    ...base.use,
    launchOptions: process.env.S306_BROWSER_EXECUTABLE ? {
      executablePath: process.env.S306_BROWSER_EXECUTABLE,
      args: process.env.S306_BROWSER_ARGS ? JSON.parse(process.env.S306_BROWSER_ARGS) : [],
    } : undefined,
  },
});
