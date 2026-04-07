import { test, expect } from '@playwright/test';
import {
  createEventFromDaySlot,
  createEventViaApi,
  deleteCalendarById,
  deleteEventById,
  ensureCalendarAvailable,
  ensureOnCalendarPage,
  getCalendarEventCardByTitle,
  getCalendarTitle,
  switchCalendarView,
  waitForCalendarTitleToChange,
} from './calendar-helpers';

/**
 * Calendar page coverage for load, toolbar navigation, view switching,
 * event creation, and opening an existing event.
 */
test.describe('Calendar page', () => {
  // These tests share one authenticated account and create temporary calendar
  // data, so serial mode avoids cross-test interference.
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test('logged-in user opens calendar and sees toolbar plus default week grid', async ({
    page,
  }) => {
    await ensureOnCalendarPage(page);

    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Previous period' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Next period' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Calendar view' }),
    ).toContainText('Week');
    await expect(page.locator('[data-testid="calendar-header-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-week-slot"]')).toHaveCount(24 * 7);
  });

  test('calendar navigation updates the header title for previous next and today', async ({
    page,
  }) => {
    await ensureOnCalendarPage(page);

    // The header title is the clearest user-visible signal that the active
    // date range changed after toolbar navigation.
    const initialTitle = await getCalendarTitle(page);

    // 1) Move forward and confirm the visible range changes
    await page.getByRole('button', { name: 'Next period' }).click();
    await waitForCalendarTitleToChange(page, initialTitle);
    const nextTitle = await getCalendarTitle(page);
    expect(nextTitle).not.toBe(initialTitle);

    // 2) Move back to the original range
    await page.getByRole('button', { name: 'Previous period' }).click();
    await expect
      .poll(async () => await getCalendarTitle(page), { timeout: 10_000 })
      .toBe(initialTitle);

    // 3) Move away again, then use Today to return to the current range
    await page.getByRole('button', { name: 'Previous period' }).click();
    await waitForCalendarTitleToChange(page, initialTitle);

    await page.getByRole('button', { name: 'Today' }).click();
    await expect
      .poll(async () => await getCalendarTitle(page), { timeout: 10_000 })
      .toBe(initialTitle);
  });

  test('user can switch between day week and month views', async ({ page }) => {
    await ensureOnCalendarPage(page);

    // 1) Day view
    await switchCalendarView(page, 'Day');
    await expect(page.locator('[data-testid="calendar-day-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-day-slot"]')).toHaveCount(24);

    // 2) Month view
    await switchCalendarView(page, 'Month');
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible();

    // 3) Week view
    await switchCalendarView(page, 'Week');
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-week-slot"]')).toHaveCount(24 * 7);
  });

  test('user can create an event from a day time slot', async ({ page }) => {
    await ensureOnCalendarPage(page);

    let createdCalendarId: string | null = null;
    let eventId: string | null = null;

    try {
      // Ensure the account has a writable calendar before opening the create flow.
      const ensuredCalendar = await ensureCalendarAvailable(page);
      createdCalendarId = ensuredCalendar.createdCalendarId;

      // Create through the UI from a visible day slot.
      const title = `E2E Calendar Event ${Date.now()}`;
      eventId = await createEventFromDaySlot(
        page,
        title,
        9,
        ensuredCalendar.calendarId,
      );

      // The new event should render on the grid and the create dialog should close.
      await expect(getCalendarEventCardByTitle(page, title)).toBeVisible();
      await expect(
        page.getByRole('dialog', { name: 'Create event' }),
      ).not.toBeVisible();
    } finally {
      // Cleanup runs in finally so temporary data does not leak on failures.
      if (eventId) {
        await deleteEventById(page, eventId);
      }
      if (createdCalendarId) {
        await deleteCalendarById(page, createdCalendarId);
      }
    }
  });

  test('user can open an existing event from the calendar', async ({ page }) => {
    await ensureOnCalendarPage(page);

    let createdCalendarId: string | null = null;
    let eventId: string | null = null;

    try {
      // Ensure the account has a calendar, then seed an event by API so this
      // test stays focused on opening the existing event from the grid.
      const ensuredCalendar = await ensureCalendarAvailable(page);
      createdCalendarId = ensuredCalendar.createdCalendarId;

      const title = `E2E Existing Event ${Date.now()}`;
      const event = await createEventViaApi(page, ensuredCalendar.calendarId, title);
      eventId = event.id;

      // Reload so the seeded event is fetched through the normal page load flow.
      await page.reload();
      await ensureOnCalendarPage(page);
      await switchCalendarView(page, 'Day');

      // Open the existing event and assert the detail/edit actions are present.
      const eventCard = getCalendarEventCardByTitle(page, title);
      await expect(eventCard).toBeVisible({ timeout: 15_000 });
      await eventCard.click();

      const dialog = page.getByRole('dialog', { name: 'View event' });
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      await expect(dialog).toContainText(title);
      await expect(
        dialog.getByRole('button', { name: 'Edit event' }),
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'Delete event' }),
      ).toBeVisible();
    } finally {
      // Cleanup runs in finally so seeded data does not affect later tests.
      if (eventId) {
        await deleteEventById(page, eventId);
      }
      if (createdCalendarId) {
        await deleteCalendarById(page, createdCalendarId);
      }
    }
  });
});
