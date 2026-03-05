import path from 'path';
import fs from 'fs';
import { test as setup, expect } from '@playwright/test';

const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

const TEST_EMAIL = process.env.DEV_USER_EMAIL || 'devuser@example.com';
const TEST_PASSWORD = process.env.DEV_USER_PASSWORD || 'password123!';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL(/\/campaigns/, { timeout: 15_000 });

  await expect(page.getByText('Preparing your workspace')).not.toBeVisible({ timeout: 30_000 });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
