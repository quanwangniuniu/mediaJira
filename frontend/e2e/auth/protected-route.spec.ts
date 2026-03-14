import { test, expect } from "@playwright/test";

test("protected route: unauthenticated visit to /tasks redirects to /login", async ({ page }) => {
  await page.goto("/tasks");
  await page.waitForLoadState("domcontentloaded");

  await expect(page).toHaveURL(/\/login\/?/, { timeout: 10000 });
});

test("protected route: unauthenticated visit to /campaigns redirects to /login", async ({ page }) => {
  await page.goto("/campaigns");
  await page.waitForLoadState("domcontentloaded");

  await expect(page).toHaveURL(/\/login\/?/, { timeout: 10000 });
});


