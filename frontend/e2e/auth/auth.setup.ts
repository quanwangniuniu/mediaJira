import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { mockUser, setupLoginMock } from "./fixtures/mockUser";

const AUTH_DIR = path.join(__dirname, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

setup("authenticate and save storage state", async ({ page }) => {
	await setupLoginMock(page);
	await page.goto("/login");
	await page.waitForLoadState("domcontentloaded");

	await page.locator('input[name="email"]').fill(mockUser.email);
	await page.locator('input[name="password"]').fill(mockUser.password);
	await page.locator('button[type="submit"]').click();

	await expect(page).toHaveURL(/\/campaigns/, { timeout: 15000 });
	const fs = await import("node:fs");
	fs.mkdirSync(AUTH_DIR, { recursive: true });
	await page.context().storageState({ path: AUTH_FILE });
});
