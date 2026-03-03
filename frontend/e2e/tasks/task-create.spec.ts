import { test, expect } from '@playwright/test';
import {
  goToTasks,
  submitCreateAndGetId,
  deleteTaskById,
} from './tasks-helpers';

test.describe('Task creation flow', () => {
  let createdTaskId: number | null = null;

  test.beforeEach(async ({ page }) => {
    createdTaskId = null;
    await goToTasks(page);
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
    await page.getByRole('button', { name: 'Create Task' }).click();

    const panel = page.getByTestId('task-create-panel');
    await expect(panel).toBeVisible();

    await panel.locator('#task-type').selectOption({ value: 'retrospective' });
    await panel
      .locator('#task-summary')
      .fill('E2E Retrospective Task – create flow');

    const expandBtn = panel.getByLabel('Expand create panel');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    const scheduledInput = panel.locator('#retrospective-scheduled-at');
    if (await scheduledInput.isVisible()) {
      const now = new Date();
      const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await scheduledInput.fill(value);
    }

    const statusSelect = panel.locator('#retrospective-status');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('scheduled');
    }

    createdTaskId = await submitCreateAndGetId(page, panel);

    await expect(page.locator('[data-testid="toast-error"]')).not.toBeVisible();
  });

});
