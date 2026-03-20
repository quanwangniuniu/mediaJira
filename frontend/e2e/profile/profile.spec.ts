import { test, expect } from '@playwright/test';
import {
	goToProfile,
	ensureOnProfilePage,
	waitForProfileReady,
	getDisplayedJobTitle,
	SAMPLE_IMAGE_PATH,
	SAMPLE_IMAGE_BUFFER,
	getProfileHeaderSection,
	setHeaderAvatar,
} from './profile-helpers';
import * as fs from 'node:fs';


test.describe('Profile page', () => {
	test.describe.configure({ mode: 'serial', timeout: 60_000 });

	// ─── Profile load & header ─────────────────────────────────────────────

	test('logged-in user opens /profile and sees header and tab content', async ({
		page,
	}) => {
		await page.goto('/profile');
		await waitForProfileReady(page);

		await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Dashboard' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'My Organization' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Subscription', exact: true }),
		).toBeVisible();

		const dashboardContent = page.getByText('Dashboard').first();
		await expect(dashboardContent).toBeVisible();
	});

	test('profile header shows About and Contact sections', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
		await expect(
			page.getByRole('heading', { name: 'Contact' }),
		).toBeVisible();
		// Email is shown in Contact (either user email or placeholder)
		await expect(
			page.getByText(/@|Your email/).first(),
		).toBeVisible();
	});

	test('user can update header avatar (user icon)', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const avatarFile = fs.existsSync(SAMPLE_IMAGE_PATH)
			? SAMPLE_IMAGE_PATH
			: { name: 'avatar.png', mimeType: 'image/png', buffer: SAMPLE_IMAGE_BUFFER };
		await setHeaderAvatar(page, avatarFile);

		const header = getProfileHeaderSection(page);
		await expect(
			header.locator('img[src^="blob:"]'),
		).toBeVisible({ timeout: 5_000 });
	});

	// ─── Tab switch ───────────────────────────────────────────────────────

	test('user can switch tabs (Dashboard, My Organization, Subscription)', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		await page.getByRole('button', { name: 'My Organization' }).click();
		await expect(
			page
				.getByText(/My Organization|Organization Management|Members/i)
				.first(),
		).toBeVisible({ timeout: 10_000 });

		await page
			.getByRole('button', { name: 'Subscription', exact: true })
			.click();
		await expect(
			page
				.getByText(/subscription|plan|pricing|Get started/i)
				.first(),
		).toBeVisible({ timeout: 10_000 });

		await page.getByRole('button', { name: 'Dashboard' }).click();
		await expect(page.getByText('Dashboard').first()).toBeVisible();
	});

	test('tab switch preserves profile sidebar (About, Contact)', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		await page.getByRole('button', { name: 'My Organization' }).click();
		await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();

		await page
			.getByRole('button', { name: 'Subscription', exact: true })
			.click();
		await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
	});

	test('user can rapidly switch between tabs without breaking content', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const dashboardTab = page.getByRole('button', { name: 'Dashboard' });
		const orgTab = page.getByRole('button', { name: 'My Organization' });
		const subscriptionTab = page.getByRole('button', {
			name: 'Subscription',
			exact: true,
		});

		// Rapidly click through tabs a few times
		for (let i = 0; i < 3; i += 1) {
			await orgTab.click();
			await subscriptionTab.click();
			await dashboardTab.click();
		}

		// Final state: Subscription tab selected, and its main content visible
		await subscriptionTab.click();
		await expect(
			page
				.getByText(/subscription|plan|pricing|Get started/i)
				.first(),
		).toBeVisible({ timeout: 10_000 });

		// Sidebar should still be usable
		await expect(
			page.getByRole('heading', { name: 'About' }),
		).toBeVisible();
	});

	// ─── Entry points ──────────────────────────────────────────────────────

	test('user can open profile from campaigns and reach profile', async ({
		page,
	}) => {
		await page.goto('/campaigns');
		await goToProfile(page);
		await expect(page).toHaveURL(/\/profile/);
		await waitForProfileReady(page);
	});

	test('direct navigation to /profile loads profile for authenticated user', async ({
		page,
	}) => {
		await page.goto('/profile');
		await waitForProfileReady(page);
		await expect(page).toHaveURL(/\/profile/);
		await expect(
			page.getByRole('button', { name: 'Dashboard' }),
		).toBeVisible();
	});

	// ─── Profile field edit & save ─────────────────────────────────────────

	test('user can edit job title and save; value is updated', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const jobTitleButton = page.getByRole('button', {
			name: /Edit job title/i,
		});
		await expect(jobTitleButton).toBeVisible();
		await jobTitleButton.click();

		const jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		const newValue = `E2E Job Title}`;
		await jobInput.fill(newValue);

		await page.getByRole('button', { name: 'Save job title' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toContainText(newValue, { timeout: 5_000 });
	});

	test('user can edit department and save; value is updated', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const deptButton = page.getByRole('button', {
			name: /Edit department/i,
		});
		await expect(deptButton).toBeVisible();
		await deptButton.click();

		const deptInput = page.getByPlaceholder('Your department');
		await expect(deptInput).toBeVisible();
		const newValue = `E2E Dept`;
		await deptInput.fill(newValue);

		await page.getByRole('button', { name: 'Save department' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit department' }),
		).toContainText(newValue, { timeout: 5_000 });
	});

	test('job title and department support long text with special characters', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const longJobTitle =
			'E2E Job Title - Senior Developer / Team Lead [Profile Testing] (Very_Long_Title_1234567890)';
		const longDepartment =
			'Engineering / R&D - Platform_Infra [Testing_Department](Profile_E2E)_ABCDEFGHIJKLMNOPQRSTUVWXYZ';

		// Edit job title with long + special characters
		await page.getByRole('button', { name: /Edit job title/i }).click();
		const jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		await jobInput.fill(longJobTitle);
		await page.getByRole('button', { name: 'Save job title' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toContainText(longJobTitle, { timeout: 5_000 });

		// Edit department with long + special characters
		await page.getByRole('button', { name: /Edit department/i }).click();
		const deptInput = page.getByPlaceholder('Your department');
		await expect(deptInput).toBeVisible();
		await deptInput.fill(longDepartment);
		await page.getByRole('button', { name: 'Save department' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit department' }),
		).toContainText(longDepartment, { timeout: 5_000 });
	});

	test('job title cannot be saved as empty (falls back to previous value)', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const initial = (await getDisplayedJobTitle(page)).trim();

		await page.getByRole('button', { name: /Edit job title/i }).click();
		const jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();

		// Try to save empty value
		await jobInput.fill('');
		await page.getByRole('button', { name: 'Save job title' }).click();

		// After save, inline editor should be closed and previous value still shown
		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toBeVisible();
		const afterSave = (await getDisplayedJobTitle(page)).trim();

		// If backend allows empty, this will start failing and we can adjust expectation.
		expect(afterSave).toBe(initial);
	});

	test('user can edit job title multiple times and last value wins', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const firstValue = 'E2E Job Title First';
		const secondValue = 'E2E Job Title Second';

		// First edit
		await page.getByRole('button', { name: /Edit job title/i }).click();
		let jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		await jobInput.fill(firstValue);
		await page.getByRole('button', { name: 'Save job title' }).click();
		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toContainText(firstValue, { timeout: 5_000 });

		// Second edit
		await page.getByRole('button', { name: /Edit job title/i }).click();
		jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		await jobInput.fill(secondValue);
		await page.getByRole('button', { name: 'Save job title' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toContainText(secondValue, { timeout: 5_000 });
	});

	// ─── Edge cases: cancel edit ───────────────────────────────────────────

	test('cancel job title edit reverts to previous value', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		const initialText = await getDisplayedJobTitle(page);

		await page.getByRole('button', { name: /Edit job title/i }).click();
		const jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		await jobInput.fill('Temporary Edit That Should Be Reverted');

		await page.getByRole('button', { name: 'Cancel job title' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit job title' }),
		).toBeVisible();
		await expect(jobInput).not.toBeVisible();
		const afterCancel = await getDisplayedJobTitle(page);
		expect(afterCancel.trim()).toBe(initialText.trim());
	});

	test('cancel department edit closes inline editor', async ({
		page,
	}) => {
		await ensureOnProfilePage(page);

		await page.getByRole('button', { name: /Edit department/i }).click();
		await expect(
			page.getByPlaceholder('Your department'),
		).toBeVisible();
		await page.getByRole('button', { name: 'Cancel department' }).click();

		await expect(
			page.getByRole('button', { name: 'Edit department' }),
		).toBeVisible();
		await expect(page.getByPlaceholder('Your department')).not.toBeVisible();
	});

	test('edit About section then refresh keeps profile usable', async ({ page }) => {
		await ensureOnProfilePage(page);

		// Edit a field inside the About section (job title)
		await page.getByRole('button', { name: /Edit job title/i }).click();
		const jobInput = page.getByPlaceholder('Your job title');
		await expect(jobInput).toBeVisible();
		await jobInput.fill('E2E About Job Title');
		await page.getByRole('button', { name: 'Save job title' }).click();

		// Refresh the page and ensure profile still loads correctly
		await page.reload();
		await waitForProfileReady(page);

		await expect(
			page.getByRole('button', { name: 'Dashboard' }),
		).toBeVisible();
		await expect(
			page.getByRole('heading', { name: 'About' }),
		).toBeVisible();
	});
});
