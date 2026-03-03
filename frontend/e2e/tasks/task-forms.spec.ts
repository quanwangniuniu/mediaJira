import { test, expect } from '@playwright/test';
import {
  goToTasksWithProject,
  submitCreateAndGetId,
  deleteTaskById,
} from './tasks-helpers';

test.describe('Task-type specific forms', () => {
  let createdTaskId: number | null = null;

  test.beforeEach(async ({ page }) => {
    createdTaskId = null;
    await goToTasksWithProject(page);

    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByTestId('task-create-panel')).toBeVisible();
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

  test('user can fill a Report task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'report' });
    await panel.locator('#task-summary').fill('E2E Report Task');

    const expandBtn = panel.getByLabel('Expand create panel');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    await panel.getByRole('button', { name: 'Last week' }).click();

    await panel
      .getByPlaceholder(/Performance became unstable/)
      .fill('Performance dipped after scaling spend last Monday.');

    await panel
      .getByPlaceholder(/Summarize the outcome|Campaign stabilized/)
      .fill('Campaign stabilized within 48 hours after budget reallocation.');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill an Asset task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'asset' });
    await panel.locator('#task-summary').fill('E2E Asset Task');
    await panel.locator('#asset-tags').fill('e2e,test');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill a Retrospective task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'retrospective' });
    await panel.locator('#task-summary').fill('E2E Retrospective Task');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill a Scaling task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'scaling' });

    // Type change may collapse the panel; expand if needed
    const expandBtn = panel.getByLabel('Expand create panel');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    // Wait for the Scaling form to render — the type change triggers a
    // re-render that can auto-fill/reset the summary field.
    await expect(panel.getByText('Scaling strategy')).toBeVisible();

    await panel.locator('#task-summary').fill('E2E Scaling Task');

    await panel
      .locator('select:has(option[value="horizontal"])')
      .selectOption('horizontal');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill an Alert task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'alert' });
    await panel.locator('#task-summary').fill('E2E Alert Task');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill an Experiment task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'experiment' });
    await panel.locator('#task-summary').fill('E2E Experiment Task');

    const expandBtn = panel.getByLabel('Expand create panel');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    // Label is not associated via htmlFor — use the placeholder instead
    await panel
      .getByPlaceholder(/New video creative increases CTR/)
      .fill('Test if increasing budget improves ROAS');

    await panel
      .locator('#task-start-date')
      .fill(new Date().toISOString().slice(0, 10));
    await panel
      .locator('#task-due-date')
      .fill(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      );

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill an Optimization task-type form', async ({ page }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'optimization' });
    await panel.locator('#task-summary').fill('E2E Optimization Task');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });

  test('user can fill a Client Communication task-type form', async ({
    page,
  }) => {
    const panel = page.getByTestId('task-create-panel');

    await panel.locator('#task-type').selectOption({ value: 'communication' });
    await panel.locator('#task-summary').fill('E2E Client Communication Task');

    await panel.locator('#communication-type').selectOption('budget_change');
    await panel.getByRole('checkbox', { name: 'Budget' }).check();
    await panel
      .locator('#communication-required-actions')
      .fill('Review and approve budget change');

    createdTaskId = await submitCreateAndGetId(page, panel);
  });
});
