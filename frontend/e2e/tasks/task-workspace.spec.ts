import { test, expect } from '@playwright/test';
import {
  navigateToTasksAndSelectProject,
  waitForTasksPageReady,
} from './tasks-helpers';
import {
  switchTab,
  switchView,
  openFirstTaskFromListAndNavigate,
  openFirstTaskFromBoardAndNavigate,
} from './task-workspace-helpers';

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
    await page.goto(`/tasks?project_id=${projectId}&view=list`);
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

    const searchInput = page.getByPlaceholder('Search tasks...');
    await searchInput.fill('E2E');
    await expect(searchInput).toHaveValue('E2E');
    await expect(listbox).toBeVisible({ timeout: 5_000 });
  });

  // ── Flow 2: View switching ──────────────────────────────────────────

  test('switch to Summary tab shows metrics', async ({ page }) => {
    await switchTab(page, 'Summary');

    await expect(page.getByTestId('tab-content-summary')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('summary-work-type-overview')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('summary-total-work-items')).toBeVisible();
  });

  test('switch to Board tab shows board columns', async ({ page }) => {
    await switchTab(page, 'Board');

    await expect(page.getByTestId('board-columns')).toBeVisible({ timeout: 10_000 });
  });

  test('switch to Tasks tab restores the task list', async ({ page }) => {
    await switchTab(page, 'Board');
    await expect(page.getByTestId('board-columns')).toBeVisible({ timeout: 10_000 });

    await switchTab(page, 'Tasks');

    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });
  });

  test('toggle between List View and Timeline View', async ({ page }) => {
    await switchTab(page, 'Tasks');
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    await switchView(page, 'timeline');
    await expect(page.getByTestId('view-button-timeline')).toBeVisible();
    expect(page.url()).toContain('view=timeline');

    await switchView(page, 'list');
    await expect(listbox).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain('view=list');
  });

  // ── Flow 3: Open task ───────────────────────────────────────────────

  test('clicking a task navigates to the task detail page', async ({ page }) => {
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    const isTasksView = await listbox.isVisible().catch(() => false);

    if (isTasksView) {
      await openFirstTaskFromListAndNavigate(page);
    } else {
      await switchTab(page, 'Board');
      await openFirstTaskFromBoardAndNavigate(page);
    }

    await page.waitForURL(/\/tasks\/\d+/, { timeout: 10_000 });
    await expect(page.getByTestId('task-id-label')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('back-to-tasks')).toBeVisible();
  });

  // ── Flow 4: Task detail sections ────────────────────────────────────

  test('task detail page shows description, comments, and no errors', async ({ page }) => {
    await switchTab(page, 'Tasks');
    const listbox = page.getByRole('listbox', { name: 'Task list' });
    await expect(listbox).toBeVisible({ timeout: 10_000 });

    await openFirstTaskFromListAndNavigate(page);
    await page.waitForURL(/\/tasks\/\d+/, { timeout: 10_000 });

    await expect(page.getByTestId('task-description-heading')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('task-comments-heading')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('task-detail-error')).not.toBeVisible();
  });
});
