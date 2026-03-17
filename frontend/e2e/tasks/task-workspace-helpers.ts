import { type Page, expect } from '@playwright/test';

export type WorkspaceTab = 'Summary' | 'Tasks' | 'Board';
export type TasksViewMode = 'list' | 'timeline';

const tabTestId: Record<WorkspaceTab, string> = {
  Summary: 'tab-summary',
  Tasks: 'tab-tasks',
  Board: 'tab-board',
};

/**
 * Click one of the top-level workspace tabs (Summary / Tasks / Board).
 */
export async function switchTab(page: Page, tab: WorkspaceTab): Promise<void> {
  const btn = page.getByTestId(tabTestId[tab]);
  await btn.click();
  await page.waitForTimeout(500);
}

/**
 * Toggle between List View and Timeline View inside the Tasks tab.
 */
export async function switchView(page: Page, mode: TasksViewMode): Promise<void> {
  const testId = mode === 'list' ? 'view-button-list' : 'view-button-timeline';
  await page.getByTestId(testId).click();
  await page.waitForTimeout(500);
}

/**
 * Click the first task in the task listbox (role="option") and return
 * the visible summary text so the caller can assert on the detail page.
 */
export async function openFirstTask(page: Page): Promise<string> {
  const listbox = page.getByRole('listbox', { name: 'Task list' });
  await expect(listbox).toBeVisible({ timeout: 10_000 });

  const firstOption = listbox.getByRole('option').first();
  await expect(firstOption).toBeVisible({ timeout: 5_000 });

  const summary = (await firstOption.innerText()).split('\n')[0].trim();

  await firstOption.click();
  return summary;
}

/**
 * In Tasks (list) view: click the first task to select it, then click the
 * "Open" button in the detail panel to navigate to the task detail page.
 */
export async function openFirstTaskFromListAndNavigate(page: Page): Promise<void> {
  await openFirstTask(page);
  await page.getByTestId('task-open-button').click();
}

/**
 * In Board view: click the first task card to navigate directly to the
 * task detail page.
 */
export async function openFirstTaskFromBoardAndNavigate(page: Page): Promise<void> {
  const board = page.getByTestId('board-columns');
  await expect(board).toBeVisible({ timeout: 10_000 });
  const firstCard = board.getByRole('button').first();
  await expect(firstCard).toBeVisible({ timeout: 5_000 });
  await firstCard.click();
}
