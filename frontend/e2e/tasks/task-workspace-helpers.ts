import { type Page, expect } from '@playwright/test';

export type WorkspaceTab = 'Summary' | 'Tasks' | 'Board';
export type TasksViewMode = 'list' | 'timeline';

/**
 * Click one of the top-level workspace tabs (Summary / Tasks / Board).
 * Uses the visible button text inside the tab nav bar.
 */
export async function switchTab(page: Page, tab: WorkspaceTab): Promise<void> {
  const btn = page.locator('nav').getByRole('button', { name: tab, exact: true });
  await btn.click();
  await page.waitForTimeout(500);
}

const viewButtonLabel: Record<TasksViewMode, string> = {
  list: 'List View',
  timeline: 'Timeline View',
};

/**
 * Toggle between List View and Timeline View inside the Tasks tab.
 */
export async function switchView(page: Page, mode: TasksViewMode): Promise<void> {
  await page.getByRole('button', { name: viewButtonLabel[mode] }).click();
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
