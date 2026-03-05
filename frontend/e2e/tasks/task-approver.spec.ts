import { test, expect } from '@playwright/test';
import {
  navigateToTasksAndSelectProject,
  ensureOnTasksPage,
  submitCreateAndGetId,
  deleteTaskById,
} from './tasks-helpers';

test.describe('Task approver assignment', () => {
  test.describe.configure({ mode: 'serial' });
  let createdTaskId: number | null = null;
  let projectId: number;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    projectId = await navigateToTasksAndSelectProject(page);
    await context.close();
  });

  test.afterEach(async ({ page }) => {
    if (createdTaskId) {
      try {
        await deleteTaskById(page, createdTaskId);
      } catch {
        /* best-effort */
      }
      createdTaskId = null;
    }
  });

  test('create task with approver, verify in list view detail panel', async ({ page }) => {
    await ensureOnTasksPage(page, projectId);

    // Create a task with approver "dev user"
    await page.getByRole('button', { name: 'Create Task' }).first().click();
    const panel = page.getByTestId('task-create-panel');
    await expect(panel).toBeVisible();

    await panel.locator('#task-type').selectOption({ value: 'alert' });
    await panel.locator('#task-summary').fill('E2E Approver Test Task');
    await panel.locator('#task-approver').selectOption({ label: 'dev user' });

    createdTaskId = await submitCreateAndGetId(page, panel);
    expect(createdTaskId).toBeTruthy();

    // Switch to list view
    await page.getByRole('button', { name: 'List View' }).click();
    await page.waitForURL(/view=list/);

    // Click the task in the list to select it
    const taskEntry = page.getByText('E2E Approver Test Task').first();
    await expect(taskEntry).toBeVisible({ timeout: 10_000 });
    await taskEntry.click();

    // verify the Approver select shows "dev user"
    const approverSelect = page.locator('select').filter({
      has: page.locator('option[value=""]', { hasText: 'Unassigned' }),
    });
    const approverRow = page.locator('text=Approver').locator('..').locator('select');
    await expect(approverRow).toBeVisible({ timeout: 10_000 });

    const selectedText = await approverRow.locator('option:checked').textContent();
    expect(selectedText?.trim()).toBe('dev user');
  });
});
