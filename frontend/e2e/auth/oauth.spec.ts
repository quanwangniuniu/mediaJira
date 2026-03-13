import { test, expect } from "@playwright/test";
import { getOAuthAuthDataBase64, setupLoginMock } from "./fixtures/mockUser";

test("OAuth callback with auth_data: redirect to /campaigns and auth state", async ({ page }) => {
  await setupLoginMock(page);
  const authData = getOAuthAuthDataBase64();
  await page.goto(`/auth/google/callback?auth_data=${encodeURIComponent(authData)}`);
  await page.waitForLoadState("domcontentloaded");

  await expect(page).toHaveURL(/\/(campaigns|profile|tasks)/, { timeout: 10000 });
});

test("OAuth callback then protected route /tasks is accessible", async ({ page }) => {
  await setupLoginMock(page);
  const authData = getOAuthAuthDataBase64();
  await page.goto(`/auth/google/callback?auth_data=${encodeURIComponent(authData)}`);
  await expect(page).toHaveURL(/\/(campaigns|profile|tasks)/, { timeout: 10000 });

  await page.goto("/tasks");
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/\/tasks/);
});
