import path from 'node:path';
import { type Page, expect } from '@playwright/test';

/**
 * Click "Go to profile" 
 */
export async function goToProfile(page: Page) {
	await page.getByRole('button', { name: 'Go to profile' }).click();
}

/**
 * Wait for the profile page to be ready (URL and main content visible).
 * Waits for any of About, Contact, or Dashboard within the page.
 * We avoid relying on a specific wrapper class so tests keep working if layout changes.
 */
export async function waitForProfileReady(page: Page) {
	await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });

	const aboutHeading = page.getByRole('heading', { name: 'About' });
	const contactHeading = page.getByRole('heading', { name: 'Contact' });
	const dashboardTab = page.getByRole('button', { name: 'Dashboard' });
	const anyIndicator = aboutHeading.or(contactHeading).or(dashboardTab).first();

	await expect(anyIndicator).toBeVisible({ timeout: 10_000 });
}

/**
 * Navigate to /profile and wait until the profile is ready.
 * Use when tests need to start directly on the profile page with authenticated user.
 */
export async function ensureOnProfilePage(page: Page) {
	await page.goto('/profile');
	await waitForProfileReady(page);
}

/**
 * Get the currently displayed job title text (button with Edit job title aria-label).
 */
export async function getDisplayedJobTitle(page: Page): Promise<string> {
	const btn = page.getByRole('button', { name: /Edit job title/i });
	await expect(btn).toBeVisible();
	return (await btn.textContent()) ?? '';
}

/** Path to sample image used for avatar uploads. Replace this file with a real picture to use it in tests. */
export const SAMPLE_IMAGE_PATH = path.join(
	process.cwd(),
	'e2e',
	'profile',
	'fixtures',
	'sample-image.png',
);

/** Fallback: minimal 1x1 PNG buffer if fixture file is missing. */
export const SAMPLE_IMAGE_BUFFER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
);

/**
 * Profile header section (contains cover + avatar).
 */
export function getProfileHeaderSection(page: Page) {
	return page
		.locator('section')
		.filter({ has: page.getByRole('button', { name: 'Change cover' }) })
		.first();
}

/** File for upload: path string or buffer payload (Playwright setInputFiles accepts both). */
export type ProfileHeaderFile = string | { name: string; mimeType: string; buffer: Buffer };


export async function setHeaderAvatar(page: Page, file: ProfileHeaderFile) {
	const header = getProfileHeaderSection(page);
	await expect(header).toBeVisible();
	const avatarInput = header.locator('input[type="file"][accept="image/*"]').nth(1);
	await avatarInput.setInputFiles(file);
}