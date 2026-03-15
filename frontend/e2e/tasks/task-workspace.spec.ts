import { test, expect } from '@playwright/test';
import {
  navigateToTasksAndSelectProject,
  waitForTasksPageReady,
} from './tasks-helpers';
import { switchTab, switchView, openFirstTask } from './task-workspace-helpers';

test.describe('Tasks workspace flows', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: number;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    projectId = await navigateToTasksAndSelectProject(page);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/tasks?project_id=${projectId}`);
    await waitForTasksPageReady(page);
  });

  // ── Flow 1: Tasks list ──────────────────────────────────────────────

  test('tasks list shows tasks after selecting a project', async ({ page }) => {
    expect(page.url()).toContain(`project_id=${projectId}`);

    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 15_000 });

    const items = listbox.getByRole('option');
    await expect(items.first()).toBeVisible({ timeout: 10_000 });
    expect(await items.count()).toBeGreaterThan(0);
  });

  // ── Flow 2: View switching ──────────────────────────────────────────

  test('switch to Summary tab shows metrics', async ({ page }) => {
    await switchTab(page, 'Summary');

    await expect(page.getByText('Work type overview')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total work items')).toBeVisible();
  });

  test('switch to Board tab shows board columns', async ({ page }) => {
    await switchTab(page, 'Board');

    await expect(page.locator('#mj-board-columns-scroll')).toBeVisible({ timeout: 10_000 });
  });

  test('switch to Tasks tab restores the task list', async ({ page }) => {
    await switchTab(page, 'Board');
    await expect(page.locator('#mj-board-columns-scroll')).toBeVisible({ timeout: 10_000 });

    await switchTab(page, 'Tasks');

    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });
  });

  test('toggle between List View and Timeline View', async ({ page }) => {
    await switchTab(page, 'Tasks');
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    await switchView(page, 'timeline');
    await expect(page.getByRole('button', { name: 'Timeline View' })).toBeVisible();
    expect(page.url()).toContain('view=timeline');

    await switchView(page, 'list');
    await expect(listbox).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain('view=list');
  });

  // ── Flow 3: Open task ───────────────────────────────────────────────

  test('clicking a task navigates to the task detail page', async ({ page }) => {
    await switchTab(page, 'Tasks');
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    await openFirstTask(page);

    await page.waitForURL(/\/tasks\/\d+/, { timeout: 10_000 });
    await expect(page.getByText(/Task #\d+/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Back to Tasks' })).toBeVisible();
  });

  // ── Flow 4: Task detail sections ────────────────────────────────────

  test('task detail page shows description, comments, and no errors', async ({ page }) => {
    await switchTab(page, 'Tasks');
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    await openFirstTask(page);
    await page.waitForURL(/\/tasks\/\d+/, { timeout: 10_000 });

    await expect(page.getByText('Task Description')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 10_000 });

    const errorBanner = page.locator('.text-red-600');
    const errorCount = await errorBanner.count();
    for (let i = 0; i < errorCount; i++) {
      await expect(errorBanner.nth(i)).not.toBeVisible();
    }
  });
});
