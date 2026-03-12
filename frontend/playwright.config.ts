import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Start Next.js so you don't have to run frontend/backend manually. */
  webServer: {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry tests 1 time */
  retries: 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. Next.js dev runs on 3000. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
  },

  /* Configure projects */
  projects: [
    /* Global auth setup (real login) – only for non-auth e2e; do not run when testing e2e/auth only */
    { name: 'setup', testMatch: /^auth\.setup\.ts$/ },
    /* Auth-folder setup (mocked login) – runs when testing e2e/auth */
    { name: 'auth-setup', testMatch: /^auth\/auth\.setup\.ts$/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /^auth\//,
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /^auth\//,
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /^auth\//,
    },
    {
      name: 'auth-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /^auth\//,
      testIgnore: /\.setup\.ts$/,
    },
    {
      name: 'auth-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/auth/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /^auth\//,
      testIgnore: /\.setup\.ts$/,
    },
    {
      name: 'auth-webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/auth/.auth/user.json',
      },
      dependencies: ['auth-setup'],
      testMatch: /^auth\//,
      testIgnore: /\.setup\.ts$/,
    },
  ],
});