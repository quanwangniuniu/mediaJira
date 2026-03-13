import { test, expect } from "@playwright/test";
import { mockUser, SET_PASSWORD_TOKEN, setupSetPasswordMock, setupSetPasswordFailureMock } from "./fixtures/mockUser";

test("set password with valid token (mock) → set password → assert success", async ({ page }) => {
  await setupSetPasswordMock(page);
  await page.goto(`/set-password?token=${SET_PASSWORD_TOKEN}`);
  await page.waitForLoadState("domcontentloaded");

  await page.locator('input[name="password"]').fill(mockUser.password);
  await page.locator('input[name="confirmPassword"]').fill(mockUser.password);

  const submitBtn = page.getByRole("button", { name: /Set Password & Continue/i });
  await expect(submitBtn).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("set-password") && res.request().method() === "POST",
    { timeout: 10000 }
  );
  await submitBtn.click();
  const res = await responsePromise;
  expect(res.status()).toBe(200);

  await expect(page.getByRole("heading", { name: /Password Set Successfully!/i })).toBeVisible({ timeout: 5000 });
});

test("set password: invalid or expired token (400) shows error", async ({ page }) => {
  await setupSetPasswordFailureMock(page, 400);
  await page.goto(`/set-password?token=invalid-token`);
  await page.waitForLoadState("domcontentloaded");

  await page.locator('input[name="password"]').fill(mockUser.password);
  await page.locator('input[name="confirmPassword"]').fill(mockUser.password);
  const submitBtn = page.getByRole("button", { name: /Set Password & Continue/i });
  await expect(submitBtn).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("set-password") && res.request().method() === "POST",
    { timeout: 10000 }
  );
  await submitBtn.click();
  const res = await responsePromise;
  expect(res.status()).toBe(400);
});
