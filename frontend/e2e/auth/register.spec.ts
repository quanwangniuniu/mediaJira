import { test, expect } from "@playwright/test";
import { mockUser, setupRegisterMock, setupRegisterFailureMock } from "./fixtures/mockUser";

test("register success (mock)", async ({ page }) => {
  await setupRegisterMock(page);
  await page.goto("/register");
  await page.waitForLoadState("domcontentloaded");

  await page.locator('input[name="username"]').fill(mockUser.username);
  await page.locator('input[name="email"]').fill(mockUser.email);
  await page.locator('input[name="password"]').fill(mockUser.password);
  await page.locator('input[name="confirmPassword"]').fill(mockUser.password);

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("auth/register") && res.request().method() === "POST",
    { timeout: 10000 }
  );
  await page.locator('button[type="submit"]').click();
  const res = await responsePromise;
  expect(res.status()).toBe(201);

  await expect(page.getByRole("heading", { name: /Registration Successful!/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: /Go to Login Page/i })).toBeVisible();
  await page.getByRole("link", { name: /Go to Login Page/i }).click();
  await expect(page).toHaveURL(/\/login\/?$/);
});

test("register: duplicate email (409) shows error and stays on register", async ({ page }) => {
  await setupRegisterFailureMock(page, 409);
  await page.goto("/register");
  await page.waitForLoadState("domcontentloaded");

  await page.locator('input[name="username"]').fill(mockUser.username);
  await page.locator('input[name="email"]').fill(mockUser.email);
  await page.locator('input[name="password"]').fill(mockUser.password);
  await page.locator('input[name="confirmPassword"]').fill(mockUser.password);

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("auth/register") && res.request().method() === "POST",
    { timeout: 10000 }
  );
  await page.locator('button[type="submit"]').click();
  const res = await responsePromise;
  expect(res.status()).toBe(409);

  await expect(page).toHaveURL(/\/register\/?$/);
});