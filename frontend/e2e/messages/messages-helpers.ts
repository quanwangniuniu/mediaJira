import { type Page, expect } from '@playwright/test';

export async function waitForLayoutMain(page: Page) {
	await page.setViewportSize({ width: 1280, height: 800});
	await page.waitForLoadState('domcontentloaded');

	await page
	    .getByText('Loading...', { exact: true})
		.waitFor({ state: 'hidden', timeout: 45_000 })
		.catch(() => {});

	await page.waitForURL((url) => !/\/(login|unauthorized)(\?|$)/i.test(url.pathname), {
		timeout: 20_000,
	});

	await expect(page.locator('body')).toBeVisible({ timeout: 15_000});
}

export function getProjectSelector(page: Page) {
	// Sidebar also uses border-b + buttons and appears before <main> in DOM; scope to Messages chrome.
	return page
		.locator('main')
		.locator('div.border-b.border-gray-200')
		.filter({ has: page.getByRole('heading', { name: 'Messages', level: 1 }) })
		.filter({ has: page.getByRole('button') })
		.first();
}

/** Toggle control in Messages header (folder icon + project name / “Select Project”). */
export function getMessagesProjectToggle(page: Page) {
	return getProjectSelector(page).getByRole('button').first();
}

/** Dropdown list panel under the project toggle (project rows are buttons inside). */
export function getMessagesProjectDropdownPanel(page: Page) {
	return getProjectSelector(page).locator('div.absolute.top-full.left-0.mt-1');
}

export async function openMessagesProjectDropdown(page: Page) {
	const toggle = getMessagesProjectToggle(page);
	await expect(toggle).toBeVisible();
	await toggle.click();
	await expect(getMessagesProjectDropdownPanel(page)).toBeVisible({ timeout: 5000 });
}

/** Assumes dropdown is already open. Matches option row by visible project title text. */
export async function selectProjectOptionByVisibleName(page: Page, projectTitle: string) {
	const panel = getMessagesProjectDropdownPanel(page);
	await expect(panel).toBeVisible();
	await panel.locator('button').filter({ hasText: projectTitle }).first().click();
}

export async function selectFirstProject(page: Page): Promise<boolean> {
	const selector = getProjectSelector(page);
	await expect(selector).toBeVisible();

	const toggleButton = selector.getByRole('button').first();
	const currentLabel = (await toggleButton.textContent())?.trim() || '';

	// If a project is already selected (not placeholder), skip selection.
	if (currentLabel && !/Select Project/i.test(currentLabel)) {
		return true;
	}

	// No-project environment: banner is rendered instead of selectable options.
	const noProjectBanner = page.getByText('No projects available');
	if (await noProjectBanner.isVisible().catch(() => false)) {
		return false;
	}

	await toggleButton.click();

	const optionButtons = selector.locator('button');
	const optionCount = await optionButtons.count();
	if (optionCount <= 1) {
		// Some UIs may auto-select the only project or render options outside this container.
		// Re-check current label after opening; if selected now, continue safely.
		const refreshedLabel = (await toggleButton.textContent())?.trim() || '';
		if (refreshedLabel && !/Select Project/i.test(refreshedLabel)) {
			return true;
		}
		return false;
	}

	await optionButtons.nth(1).click();
	return true;
}

export async function assertChatListOrEmptyState(page: Page) {
	const chatRows = page.locator('div.max-w-sm div[role="button"]');
	const noChatsState = page.getByRole('heading', { name: 'No chats yet' });
	const selectProjectHint = page.getByText('Select a project to view chats');
	const noProjectBanner = page.getByText('No projects available');

	await expect
		.poll(async () => {
			const rows = await chatRows.count();
			const noChatsVisible = await noChatsState.isVisible().catch(() => false);
			const selectHintVisible = await selectProjectHint.isVisible().catch(() => false);
			const noProjectVisible = await noProjectBanner.isVisible().catch(() => false);
			return rows > 0 || noChatsVisible || selectHintVisible || noProjectVisible;
		}, { timeout: 20_000 })
		.toBeTruthy();
}

export async function openFirstChatIfPresent(page: Page) {
	const chatRows = page.locator('div.max-w-sm div[role="button"]');
	const count = await chatRows.count();

	if (count === 0) {
		return false;
	}

	await chatRows.first().click();
	await expect(page.getByRole('button', { name: 'Back to chat list' })).toBeVisible({
		timeout: 15_000,
	});
	return true;
}

export async function trySendMessage(page: Page, content: string) {
	const messageInput = page.getByPlaceholder(/Type a message|Add a message/);
	await expect(messageInput).toBeVisible({ timeout: 10_000 });
	await messageInput.fill(content);
	await page.getByRole('button', { name: 'Send message' }).click();

	await expect
		.poll(async () => {
			const sentVisible = await page.getByText(content, { exact: false }).isVisible().catch(() => false);
			const inputHasText = await messageInput.inputValue().catch(() => content);
			return sentVisible || inputHasText.trim().length === 0;
		}, { timeout: 15_000 })
		.toBeTruthy();
}