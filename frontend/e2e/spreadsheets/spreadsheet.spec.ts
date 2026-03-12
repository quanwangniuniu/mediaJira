import { test, expect } from '@playwright/test';
import {
  waitForSpreadsheetPageReady,
  navigateToSpreadsheetAndSelectProject,
  clickCell,
  editCell,
  createSheetByApi,
  deleteSheetByName,
  deletePatternByName,
} from './spreadsheet-helpers';

test.describe('Spreadsheet e2e flows', () => {
  test.describe.configure({ mode: 'serial' });

  let projectId: number;
  let spreadsheetId: number;
  const spreadsheetName =
    process.env.E2E_SPREADSHEET_NAME || 'E2E Spreadsheet';

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
    });
    const page = await context.newPage();
    const ids = await navigateToSpreadsheetAndSelectProject(page);
    projectId = ids.projectId;
    spreadsheetId = ids.spreadsheetId;
    await context.close();
  });

  // ── Flow 1: Spreadsheet entry ─────────────────────────────────────────

  test('navigate to spreadsheets', async ({
    page,
  }) => {
    await page.goto('/spreadsheet');
    await waitForSpreadsheetPageReady(page);

    await expect(
      page.getByRole('heading', { name: 'Spreadsheet' }),
    ).toBeVisible({ timeout: 10_000 });

    const projectCards = page.locator(
      'ul.grid button',
    );
    await expect(projectCards.first()).toBeVisible({ timeout: 10_000 });

    const projectName = process.env.E2E_PROJECT_NAME || 'E2E Test Project';
    const card = page
      .locator('button')
      .filter({
        has: page.locator('.font-medium.text-gray-900', {
          hasText: projectName,
        }),
      })
      .first();
    await card.click();

    await page.waitForURL(/\/projects\/\d+\/spreadsheets/, {
      timeout: 10_000,
    });

    expect(page.url()).toContain(`/projects/${projectId}/spreadsheets`);
  });

  // ── Flow 2: Spreadsheet list ──────────────────────────────────────────

  test('spreadsheet list page shows table or empty state', async ({
    page,
  }) => {
    await page.goto(`/projects/${projectId}/spreadsheets`);
    await waitForSpreadsheetPageReady(page);

    const table = page.locator('table');
    const emptyState = page.getByText('No spreadhseet yet');

    await expect(table.or(emptyState).first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Flow 3: Open existing spreadsheet ────────────────────────────────

  test('open an existing spreadsheet and see the grid', async ({ page }) => {
    await page.goto(`/projects/${projectId}/spreadsheets`);
    await waitForSpreadsheetPageReady(page);

    const row = page
      .locator('tr')
      .filter({
        has: page.locator('.font-medium.text-gray-900', {
          hasText: spreadsheetName,
        }),
      })
      .first();

    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.click();

    await page.waitForURL(
      new RegExp(
        `\\/projects\\/${projectId}\\/spreadsheets\\/\\d+`,
      ),
      { timeout: 15_000 },
    );

    expect(page.url()).toContain(`/projects/${projectId}/spreadsheets/${spreadsheetId}`);

    const selectAllCell = page.getByTestId('select-all-cell');
    const loadingText = page.getByText('Loading spreadsheet');
    await expect(selectAllCell.or(loadingText).first()).toBeVisible({
      timeout: 20_000,
    });

    if (await loadingText.isVisible().catch(() => false)) {
      await expect(selectAllCell).toBeVisible({ timeout: 30_000 });
    }
  });

  // ── Flow 4a: Highlight cell ───────────────────────────────────────────

  test('highlight a cell with yellow', async ({ page }) => {
    const testSheetName = `E2E Highlight ${Date.now()}`;
    await page.goto(
      `/projects/${projectId}/spreadsheets/${spreadsheetId}`,
    );
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });

    await createSheetByApi(page, spreadsheetId, testSheetName);
    await page.reload();
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByText(testSheetName).click();
    await page.waitForTimeout(500);

    await clickCell(page, 1, 0);

    await page.getByTestId('highlight-button').click();
    await page.getByTestId('highlight-color-yellow').click();

    // Assert UI: cell shows yellow highlight
    const cell = page.locator('td[data-row="1"][data-col="0"]').first();
    await expect(cell).toHaveCSS(
      'background-color',
      /rgb\(254,\s*240,\s*138\)/,
      { timeout: 5_000 },
    );

    await deleteSheetByName(page, projectId, spreadsheetId, testSheetName);
  });

  // ── Flow 4b: Bold cell ────────────────────────────────────────────────

  test('bold a cell', async ({ page }) => {
    const testSheetName = `E2E Bold ${Date.now()}`;
    await page.goto(
      `/projects/${projectId}/spreadsheets/${spreadsheetId}`,
    );
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });

    await createSheetByApi(page, spreadsheetId, testSheetName);
    await page.reload();
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByText(testSheetName).click();
    await page.waitForTimeout(500);

    await clickCell(page, 2, 0);

    await page.getByTestId('format-bold').click();

    // Assert UI: cell content shows bold
    const cellContent = page
      .locator('td[data-row="2"][data-col="0"] div.text-gray-900')
      .first();
    await expect(cellContent).toHaveCSS('font-weight', '700', {
      timeout: 5_000,
    });

    await deleteSheetByName(page, projectId, spreadsheetId, testSheetName);
  });

  // ── Flow 4c: Pattern export + apply ──────────────────────────────

  test('rename header, apply highlight, export pattern, create new sheet, then apply pattern in new sheet', async ({
    page,
  }) => {
    const recordSheetName = `E2E Pattern Record ${Date.now()}`;
    const applySheetName = `E2E Pattern Apply ${Date.now()}`;
    const patternName = `E2E Pattern ${Date.now()}`;

    await page.goto(
      `/projects/${projectId}/spreadsheets/${spreadsheetId}`,
    );
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });

    // Sheet 1: Record the pattern
    await createSheetByApi(page, spreadsheetId, recordSheetName);
    await page.reload();
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(1000);
    await page.getByText(recordSheetName).click();
    await page.waitForTimeout(500);

    // Step 1: Rename header cell
    await editCell(page, 0, 0, 'e2e header');
    const headerCell = page.locator('td[data-row="0"][data-col="0"]').first();
    await expect(headerCell).toContainText('e2e header', { timeout: 5_000 });

    // Step 2: Highlight the same cell
    await clickCell(page, 0, 0);
    await page.getByTestId('highlight-button').click();
    await page.getByTestId('highlight-color-green').click();
    await expect(headerCell).toHaveCSS(
      'background-color',
      /rgb\(187,\s*247,\s*208\)/,
      { timeout: 5_000 },
    );

    // Step 3: Export as pattern
    const timelineTab = page.getByRole('button', { name: 'Timeline' });
    if (await timelineTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await timelineTab.click();
    }

    const selectAllBtn = page.getByRole('button', { name: 'Select all' });
    await expect(selectAllBtn).toBeVisible({ timeout: 5_000 });
    await selectAllBtn.click();

    const exportBtn = page.getByRole('button', { name: 'Export Pattern' });
    await expect(exportBtn).toBeEnabled({ timeout: 3_000 });
    await exportBtn.click();

    const exportModal = page.getByText('Save selected steps as a reusable pattern.');
    await expect(exportModal).toBeVisible({ timeout: 5_000 });

    const nameInput = exportModal
      .locator('..')
      .locator('..')
      .locator('input');
    await nameInput.fill(patternName);

    await page
      .getByRole('button', { name: 'Save', exact: true })
      .click();

    await expect(exportModal).not.toBeVisible({ timeout: 5_000 });

    // Step 4: Create new sheet, switch to it, and wait for grid resize
    await page.waitForTimeout(2000);
    await createSheetByApi(page, spreadsheetId, applySheetName);
    await page.reload();
    await expect(page.getByTestId('select-all-cell')).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(1000);

    const resizePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/resize/') &&
        resp.request().method() === 'POST',
    );
    await page.getByText(applySheetName).click();
    await resizePromise;

    // Step 5: Select the pattern and apply
    const patternsTab = page.getByRole('button', { name: 'Patterns' });
    await patternsTab.click();

    const patternCard = page.getByText(patternName);
    await expect(patternCard).toBeVisible({ timeout: 5_000 });
    await patternCard.click();

    const applyBtn = page.getByRole('button', { name: 'Apply', exact: true });
    await expect(applyBtn).toBeVisible({ timeout: 10_000 });
    await applyBtn.click();

    // Assert UI: status indicator shows job was accepted and processed
    await expect(page.getByText('Status: succeeded')).toBeVisible({ timeout: 30_000 });

    // Assert pattern was applied in the new sheet: cell (0, 0) has value and green highlight
    const appliedCell = page.locator('td[data-row="0"][data-col="0"]').first();
    await expect(appliedCell).toContainText('e2e header', { timeout: 15_000 });
    await expect(appliedCell).toHaveCSS(
      'background-color',
      /rgb\(187,\s*247,\s*208\)/,
      { timeout: 5_000 },
    );

    await deletePatternByName(page, patternName);
    await deleteSheetByName(page, projectId, spreadsheetId, recordSheetName);
    await deleteSheetByName(page, projectId, spreadsheetId, applySheetName);
  });
});
