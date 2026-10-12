import { expect, test } from '@playwright/test';
import {
  getActiveProjectSlug,
  waitForWorkspaceReady,
} from '../tasks/tasks-helpers';

test('compares Meta, Google and TikTok with a selectable canonical KPI', async ({ page }) => {
  await page.route('**/api/report/cross-platform/**', async (route) => {
    await route.fulfill({
      json: {
        status: 'ready',
        start_date: '2026-09-10',
        end_date: '2026-10-09',
        rows: [
          { platform: 'meta', status: 'ready', cpm: '12', cpc: '0.5', ctr: '2.4', roas: '3' },
          { platform: 'google', status: 'ready', cpm: '10', cpc: '0.4', ctr: '2.8', roas: '4' },
          { platform: 'tiktok', status: 'ready', cpm: '8', cpc: '0.3', ctr: '3.1', roas: '2.5' },
        ],
      },
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForWorkspaceReady(page);
  await getActiveProjectSlug(page);
  await page.goto('/overview', { waitUntil: 'domcontentloaded' });

  const widget = page.getByTestId('cross-platform-performance');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  await expect(widget.getByText('Meta', { exact: true })).toBeVisible();
  await expect(widget.getByText('Google', { exact: true })).toBeVisible();
  await expect(widget.getByText('TikTok', { exact: true })).toBeVisible();

  await widget.getByRole('button', { name: 'ROAS' }).click();
  await expect(widget.getByRole('button', { name: 'ROAS' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(widget.getByTestId('platform-google')).toContainText('4');
});
