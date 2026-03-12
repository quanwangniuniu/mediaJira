import { test, expect } from '@playwright/test';
import {
  createDraftDecisionViaApi,
  deleteDecisionViaApi,
  goToDecisions,
  resolveFirstProjectSection,
  type DecisionCleanupRef,
} from './decisions-helpers';

test.describe('Decisions flows', () => {
  test.describe.configure({ mode: 'serial' });

  let cleanupRefs: DecisionCleanupRef[] = [];

  test.beforeEach(async ({ page }) => {
    cleanupRefs = [];
    await goToDecisions(page);
  });

  test.afterEach(async ({ page }) => {
    for (const ref of cleanupRefs) {
      try {
        await deleteDecisionViaApi(page, ref);
      } catch {
        /* best-effort cleanup */
      }
    }
    cleanupRefs = [];
  });

  test('decisions list shows project sections and list or empty state', async ({
    page,
  }) => {
    const project = await resolveFirstProjectSection(page);
    if (!project) {
      await expect(page.getByText('Decisions.')).toBeVisible();
      return;
    }

    const headers = page.locator('[data-project-header]');
    await expect(headers.first()).toBeVisible();

    const section = project.section;
    await expect(section.getByRole('heading', { name: 'Decision Tree' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Decision List' })).toBeVisible();

    const hasEmptyState = await section
      .getByText('No decisions for this project yet.')
      .isVisible()
      .catch(() => false);
    const decisionLinks = section.locator('a[href*="/decisions/"]');
    const linkCount = await decisionLinks.count();

    expect(
      hasEmptyState || linkCount > 0,
      'Expected either decisions empty state or at least one decision link.',
    ).toBeTruthy();
  });

  test('opening decision navigates to /decisions/[decisionId] with detail content', async ({
    page,
  }) => {
    const project = await resolveFirstProjectSection(page);
    test.skip(!project, 'No project available for decisions tests.');

    const decisionId = await createDraftDecisionViaApi(page, project!.projectId);
    cleanupRefs.push({ decisionId, projectId: project!.projectId });

    await goToDecisions(page);
    const detailsLink = page
      .locator(`a[href^="/decisions/${decisionId}"]`)
      .filter({ hasText: 'Details' })
      .first();
    await expect(detailsLink).toBeVisible({ timeout: 15_000 });
    await detailsLink.click();

    await expect(page).toHaveURL(
      new RegExp(`/decisions/${decisionId}(\\?.*project_id=${project!.projectId}.*)?$`),
    );
    await expect(page.getByRole('heading', { name: 'Context Summary' })).toBeVisible();
  });

  test('create decision redirects to draft editor', async ({ page }) => {
    const project = await resolveFirstProjectSection(page);
    test.skip(!project, 'No project available for decisions tests.');

    await project!.section.getByRole('button', { name: 'Create Decision' }).click();

    await expect(page).toHaveURL(/\/decisions\/\d+(\?.*)?$/, { timeout: 20_000 });
    const match = page.url().match(/\/decisions\/(\d+)/);
    expect(match?.[1], 'Expected a decision id in URL after create.').toBeTruthy();

    const createdId = Number(match![1]);
    if (Number.isFinite(createdId) && createdId > 0) {
      cleanupRefs.push({ decisionId: createdId, projectId: project!.projectId });
    }

    await expect(page.getByRole('heading', { name: 'Context Summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();
  });

  test('decision tree/link editor is visible when expanded', async ({ page }) => {
    const project = await resolveFirstProjectSection(page);
    test.skip(!project, 'No project available for decisions tests.');

    const section = project!.section;
    const collapsedText = section.getByText('Decision tree collapsed.');
    if (await collapsedText.isVisible().catch(() => false)) {
      await section.getByRole('button', { name: 'Expand' }).first().click();
      await expect(collapsedText).not.toBeVisible();
    }

    await expect(section.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(section.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(section.getByText('Decision Tree')).toBeVisible();
  });
});
