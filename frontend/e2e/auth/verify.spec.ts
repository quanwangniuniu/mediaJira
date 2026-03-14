import { test, expect } from "@playwright/test";
import { VERIFY_TOKEN, setupVerifyMock, setupVerifyFailureMock } from "./fixtures/mockUser";

test("verify with valid token (mock) → assert success message or redirect to login", async ({ page }) => {
  await setupVerifyMock(page);
  await page.goto(`/verify?token=${VERIFY_TOKEN}`);
  await page.waitForLoadState("domcontentloaded");

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("auth/verify") && res.request().method() === "GET",
    { timeout: 10000 }
  );
  const res = await responsePromise;
  expect(res.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "Email Verified!" })).toBeVisible({ timeout: 5000 });

  await expect(page).toHaveURL(/\/login\/?/, { timeout: 6000 });
});

test("verify: invalid or expired token (400) shows error", async ({ page }) => {
  await setupVerifyFailureMock(page, 400);
  await page.goto("/verify?token=invalid-token");
  await page.waitForLoadState("domcontentloaded");

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("auth/verify") && res.request().method() === "GET",
    { timeout: 10000 }
  );
  const res = await responsePromise;
  expect(res.status()).toBe(400);
});
