import { test, expect } from '@playwright/test';
import {
  navigateToTasksAndSelectProject,
  ensureOnTasksPage,
  submitCreateAndGetId,
  deleteTaskById,
} from './tasks-helpers';

test.describe('Task creation flow', () => {
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

  test.beforeEach(async ({ page }) => {
    createdTaskId = null;
    await ensureOnTasksPage(page, projectId);
  });

  test.afterEach(async ({ page }) => {
    if (createdTaskId) {
      try {
        await deleteTaskById(page, createdTaskId);
      } catch {
        /* cleanup is best-effort */
      }
      createdTaskId = null;
    }
  });

  test('user can create a new task', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Task' }).first().click();

    const panel = page.getByTestId('task-create-panel');
    await expect(panel).toBeVisible();

    await panel.locator('#task-type').selectOption({ value: 'asset' });
    await panel.locator('#task-summary').fill('E2E Asset Task – create flow');
    await panel.locator('#asset-tags').fill('e2e,test');

    createdTaskId = await submitCreateAndGetId(page, panel);

    await expect(page.locator('[data-testid="toast-error"]')).not.toBeVisible();
  });

});
