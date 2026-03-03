import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Wait for any blocking overlay (Guided Onboarding, "Preparing your workspace")
 * to dismiss before interacting with the tasks page.
 * If "Failed to load projects" is shown, clicks "Retry check" and waits for success.
 */
export async function waitForTasksPageReady(page: Page) {
  const retryBtn = page.getByRole('button', { name: 'Retry check' });
  if (await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await retryBtn.click();
  }

  await expect(page.getByText('Guided Onboarding')).not.toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Preparing your workspace')).not.toBeVisible({
    timeout: 5_000,
  });
}

/**
 * Navigate to /tasks and, if projects are listed, select the first one.
 */
export async function goToTasks(page: Page) {
  await page.goto('/tasks');

  await expect(page.getByText('Preparing your workspace')).not.toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole('heading', { name: 'Select a project' })).toBeVisible({ timeout: 10_000 });

  const firstProjectCard = page
    .locator('button.group')
    .filter({ has: page.locator('span.font-medium', { hasText: /^P-\d+$/ }) })
    .first();

  await expect(firstProjectCard).toBeVisible({ timeout: 10_000 });
  await firstProjectCard.scrollIntoViewIfNeeded();
  await firstProjectCard.click();

  await page.waitForURL(/\/tasks\?project_id=\d+/, { timeout: 10_000 });

  await waitForTasksPageReady(page);
}

/** Alias for goToTasks (same behavior). */
export const goToTasksWithProject = goToTasks;

/**
 * Click the Create button, capture the task ID from the POST response,
 * and wait for the panel to close.
 */
export async function submitCreateAndGetId(
  page: Page,
  panel: Locator,
): Promise<number | null> {
  const responsePromise = page.waitForResponse((resp) => {
    const path = new URL(resp.url()).pathname;
    return (
      (path === '/api/tasks/' || path === '/api/tasks') &&
      resp.request().method() === 'POST'
    );
  });

  await panel.getByRole('button', { name: 'Create', exact: true }).click();

  const response = await responsePromise;
  let taskId: number | null = null;
  if (response.ok()) {
    const body = await response.json();
    taskId = body.id ?? null;
  }

  await expect(panel).not.toBeVisible({ timeout: 10_000 });
  return taskId;
}

/**
 * Delete a task by ID via the REST API using the auth token from localStorage.
 */
export async function deleteTaskById(page: Page, taskId: number) {
  const token: string | null = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    } catch {
      return null;
    }
  });

  if (!token) return;

  const origin = new URL(page.url()).origin;
  await page.request.delete(`${origin}/api/tasks/${taskId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
