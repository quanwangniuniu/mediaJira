import { test, expect } from '@playwright/test';
import {
	waitForLayoutMain,
	getProjectSelector,
	getMessagesProjectToggle,
	getMessagesProjectDropdownPanel,
	openMessagesProjectDropdown,
	selectProjectOptionByVisibleName,
	selectFirstProject,
	assertChatListOrEmptyState,
	openFirstChatIfPresent,
	trySendMessage,
} from './messages-helpers';

async function mockProjects(page: any, projects: Array<Record<string, any>>) {
	await page.route('**/api/core/projects/', async (route: any) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(projects),
		});
	});
}


test.describe('Messages and main layout', () => {
	test.describe.configure({ mode: 'serial', timeout: 90_000});

	test('Logged-in user opens /messages → assert project selector and initial state', async ({
		page,
	}) => {
		await page.goto('/messages');
		await waitForLayoutMain(page);
		await expect(getProjectSelector(page)).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();
		await assertChatListOrEmptyState(page);
	});

	test('Project selector (mocked): open dropdown, choose another project, toggle label updates', async ({
		page,
	}) => {
		const alpha = { id: 701, name: 'E2E Selector Alpha', member_count: 1 };
		const beta = { id: 702, name: 'E2E Selector Beta', member_count: 2 };

		await mockProjects(page, [alpha, beta]);

		await page.route('**/api/core/projects/*/members/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results: [], next: null }),
			});
		});

		await page.route('**/api/chat/chats/**', async (route) => {
			if (route.request().method() !== 'GET') {
				await route.fallback();
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					count: 0,
					next: null,
					previous: null,
					results: [],
				}),
			});
		});

		await page.goto('/messages');
		await waitForLayoutMain(page);

		const toggle = getMessagesProjectToggle(page);
		await expect(toggle).toBeVisible();
		await expect(toggle).toContainText(alpha.name);

		await openMessagesProjectDropdown(page);
		const panel = getMessagesProjectDropdownPanel(page);
		await expect(panel.locator('button').filter({ hasText: alpha.name })).toBeVisible();
		await expect(panel.locator('button').filter({ hasText: beta.name })).toBeVisible();

		await selectProjectOptionByVisibleName(page, beta.name);

		await expect(panel).toBeHidden();
		await expect(toggle).toContainText(beta.name);
		// Chats API mocked empty → list shows empty state for the selected project
		await expect(page.getByRole('heading', { name: 'No chats yet' })).toBeVisible({
			timeout: 15_000,
		});
		await assertChatListOrEmptyState(page);
	});

	test('Open first chat and optionally send a message', async ({ page }) => {
		await page.goto('/messages');
		await waitForLayoutMain(page);
		const hasProject = await selectFirstProject(page);
		if (!hasProject) {
			await assertChatListOrEmptyState(page);
			return;
		}
		await assertChatListOrEmptyState(page);

		const opened = await openFirstChatIfPresent(page);
		if (!opened) {
			await expect(page.getByRole('heading', { name: 'No chats yet' })).toBeVisible();
			return;
		}

		const messageEmptyState = page.getByText('No messages yet. Start the conversation!');
		const messageInput = page.getByPlaceholder(/Type a message|Add a message/);
		await expect
			.poll(async () => {
				const emptyVisible = await messageEmptyState.isVisible().catch(() => false);
				const inputVisible = await messageInput.isVisible().catch(() => false);
				return emptyVisible || inputVisible;
			}, { timeout: 15_000 })
			.toBeTruthy();

		const canType = await messageInput.isVisible().catch(() => false);
		if (canType) {
			const uniqueMessage = `E2E message ${Date.now()}`;
			await trySendMessage(page, uniqueMessage);
		}
	});

	test('Send message with mocked chat APIs → message appears in thread', async ({ page }) => {
		const projectId = 101;
		const chatId = 201;
		const currentUserId = 1;
		const mockNow = new Date().toISOString();
		const messagesStore: Array<Record<string, any>> = [
			{
				id: 9001,
				chat: chatId,
				content: 'Seed message',
				created_at: mockNow,
				sender: { id: 2, username: 'teammate' },
				statuses: [],
				attachments: [],
			},
		];

		await page.route('**/api/core/projects/', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([{ id: projectId, name: 'E2E Project', member_count: 2 }]),
			});
		});

		await page.route(`**/api/core/projects/${projectId}/members/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results: [], next: null }),
			});
		});

		await page.route('**/api/chat/chats/**', async (route) => {
			if (route.request().method() !== 'GET') {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					count: 1,
					next: null,
					previous: null,
					results: [
						{
							id: chatId,
							type: 'private',
							project_id: projectId,
							participants: [
								{ id: 1, user: { id: 1, username: 'e2e-user', email: 'e2e@example.com' } },
								{ id: 2, user: { id: 2, username: 'teammate', email: 'tm@example.com' } },
							],
							last_message: null,
							unread_count: 0,
						},
					],
				}),
			});
		});

		await page.route('**/api/chat/messages/unread_count/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ unread_count: 0 }),
			});
		});

		await page.route(`**/api/chat/chats/${chatId}/mark_as_read/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({}),
			});
		});

		await page.route('**/api/chat/messages/**', async (route) => {
			const method = route.request().method();

			if (method === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						results: messagesStore,
						next_cursor: null,
						prev_cursor: null,
						page_size: 50,
					}),
				});
				return;
			}

			if (method === 'POST') {
				const payload = route.request().postDataJSON() as { content?: string; chat?: number };
				const newMessage = {
					id: 9000 + messagesStore.length + 1,
					chat: payload.chat || chatId,
					content: payload.content || '',
					created_at: new Date().toISOString(),
					sender: { id: currentUserId, username: 'e2e-user' },
					statuses: [],
					attachments: [],
				};
				messagesStore.push(newMessage);

				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(newMessage),
				});
				return;
			}

			await route.fallback();
		});

		await page.goto(`/messages?projectId=${projectId}&chatId=${chatId}`);
		await waitForLayoutMain(page);
		await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();

		const mockMessage = `Mocked send ${Date.now()}`;
		await trySendMessage(page, mockMessage);
		await expect(
			page.locator('div.flex-1.overflow-y-auto p.text-sm.whitespace-pre-wrap', { hasText: mockMessage }).first()
		).toBeVisible();
	});

	test('Create chat (mocked): New Chat → pick participant → create → appears in list', async ({
		page,
	}) => {
		const projectId = 301;
		const me = { id: 1, username: 'e2e-user', email: 'e2e@example.com' };
		const teammate = { id: 2, username: 'teammate', email: 'teammate@example.com' };
		const chatsStore: Array<Record<string, any>> = [];

		await page.route('**/api/core/projects/', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([{ id: projectId, name: 'Create Chat Project', member_count: 2 }]),
			});
		});

		await page.route(`**/api/core/projects/${projectId}/members/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					results: [
						{
							id: 11,
							user: me,
							project: { id: projectId, name: 'Create Chat Project' },
							role: 'owner',
							is_active: true,
						},
						{
							id: 12,
							user: teammate,
							project: { id: projectId, name: 'Create Chat Project' },
							role: 'member',
							is_active: true,
						},
					],
					next: null,
				}),
			});
		});

		await page.route('**/api/chat/chats/**', async (route) => {
			const req = route.request();
			const method = req.method();
			const url = new URL(req.url());
			const isPrivateLookup = url.searchParams.get('type') === 'private';

			if (method === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						count: chatsStore.length,
						next: null,
						previous: null,
						results: isPrivateLookup ? [] : chatsStore,
					}),
				});
				return;
			}

			if (method === 'POST') {
				const payload = req.postDataJSON() as {
					type: 'private' | 'group';
					project: number;
					participant_ids: number[];
					name?: string;
				};
				const newId = 700 + chatsStore.length + 1;
				const createdAt = new Date().toISOString();
				const newChat = {
					id: newId,
					project_id: payload.project,
					type: payload.type,
					name: payload.type === 'group' ? payload.name || null : null,
					participants: [
						{ id: 101, user: me, chat_id: newId, joined_at: createdAt },
						...payload.participant_ids.map((uid, idx) => ({
							id: 102 + idx,
							user: uid === teammate.id ? teammate : { id: uid, username: `user-${uid}`, email: `u${uid}@example.com` },
							chat_id: newId,
							joined_at: createdAt,
						})),
					],
					created_at: createdAt,
					updated_at: createdAt,
					last_message: null,
					unread_count: 0,
				};
				chatsStore.push(newChat);
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(newChat),
				});
				return;
			}

			await route.fallback();
		});

		await page.goto(`/messages?projectId=${projectId}`);
		await waitForLayoutMain(page);

		await page
			.locator('div.bg-white.border-b.border-gray-200')
			.getByRole('button', { name: 'New Chat', exact: true })
			.click();
		await expect(page.getByRole('heading', { name: 'Create New Chat' })).toBeVisible();

		await page
			.locator('label', { has: page.getByText(teammate.username, { exact: true }) })
			.locator('input[type="checkbox"]')
			.first()
			.check();

		await expect(page.getByText('Selected: 1 member')).toBeVisible();
		const chatRows = page.locator('div.max-w-sm div[role="button"]');
		const beforeCount = await chatRows.count();
		await page.getByRole('button', { name: 'Create Chat' }).click();

		await expect
			.poll(async () => await chatRows.count(), { timeout: 15_000 })
			.toBeGreaterThan(beforeCount);
	});
});

test.describe('Messages edge cases without mock', () => {
	test.describe.configure({ mode: 'serial', timeout: 90_000 });

	test('Invalid query params should not break page rendering', async ({ page }) => {
		await page.goto('/messages?projectId=abc&chatId=-1');
		await waitForLayoutMain(page);
		await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();
		await expect(page.locator('main')).toBeVisible();
		await assertChatListOrEmptyState(page);
	});

	test('No projects (mocked): banner, select-project hints, New Chat disabled', async ({ page }) => {
		await mockProjects(page, []);
		await page.goto('/messages');
		await waitForLayoutMain(page);

		await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible();
		await expect(page.getByText('No projects available')).toBeVisible({ timeout: 15_000 });

		await expect(page.getByText('Select a project to view chats')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Select a project to start' })).toBeVisible();
		await expect(
			page.getByText('Choose a project from the dropdown above to view and manage your team conversations.')
		).toBeVisible();

		const newChatBtn = page
			.locator('main')
			.locator('div.bg-white.border-b.border-gray-200')
			.filter({ has: page.getByRole('heading', { name: 'Messages', level: 1 }) })
			.getByRole('button', { name: 'New Chat', exact: true });
		await expect(newChatBtn).toBeVisible();
		await expect(newChatBtn).toBeDisabled();

		await assertChatListOrEmptyState(page);
	});

	test('New Chat button state follows project selection availability', async ({ page }) => {
		await page.goto('/messages');
		await waitForLayoutMain(page);
		const newChatBtn = page
			.locator('div.bg-white.border-b.border-gray-200')
			.getByRole('button', { name: 'New Chat', exact: true });
		await expect(newChatBtn).toBeVisible();

		const hasProject = await selectFirstProject(page);
		if (!hasProject) {
			const noProjectBanner = page.getByText('No projects available');
			if (await noProjectBanner.isVisible().catch(() => false)) {
				await expect(newChatBtn).toBeDisabled();
			}
			await assertChatListOrEmptyState(page);
			return;
		}

		await expect(newChatBtn).toBeEnabled();
		await assertChatListOrEmptyState(page);
	});

test('Open chat then back to list (mocked)', async ({ page }) => {
		const projectId = 405;
		const chatId = 505;
		await mockProjects(page, [{ id: projectId, name: 'Back Flow Project', member_count: 2 }]);

		await page.route(`**/api/core/projects/${projectId}/members/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results: [], next: null }),
			});
		});

		await page.route('**/api/chat/chats/**', async (route) => {
			if (route.request().method() !== 'GET') {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					count: 1,
					next: null,
					previous: null,
					results: [
						{
							id: chatId,
							type: 'private',
							project_id: projectId,
							participants: [
								{ id: 1, user: { id: 1, username: 'e2e-user', email: 'e2e@example.com' } },
								{ id: 2, user: { id: 2, username: 'teammate', email: 'teammate@example.com' } },
							],
							last_message: null,
							unread_count: 0,
						},
					],
				}),
			});
		});

		await page.route('**/api/chat/messages/**', async (route) => {
			if (route.request().method() !== 'GET') {
				await route.fallback();
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					results: [
						{
							id: 9501,
							chat_id: chatId,
							content: 'hello in thread',
							created_at: new Date().toISOString(),
							sender: { id: 2, username: 'teammate' },
							statuses: [],
							attachments: [],
						},
					],
					next_cursor: null,
					prev_cursor: null,
					page_size: 50,
				}),
			});
		});

		await page.route('**/api/chat/messages/unread_count/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ unread_count: 0 }),
			});
		});

		await page.route(`**/api/chat/chats/${chatId}/mark_as_read/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({}),
			});
		});

		await page.goto(`/messages?projectId=${projectId}`);
		await waitForLayoutMain(page);
		await expect(page.locator('div.max-w-sm div[role="button"]')).toHaveCount(1);

		await page.locator('div.max-w-sm div[role="button"]').first().click();
		await expect(page.getByRole('button', { name: 'Back to chat list' })).toBeVisible();

		await page.getByRole('button', { name: 'Back to chat list' }).click();
		await expect(page.getByRole('heading', { name: 'Select a conversation' })).toBeVisible();
	});
});
