import fs from 'fs';
import path from 'path';
import { type Locator, type Page, expect } from '@playwright/test';
import { waitForLayoutMain } from '../navigation/navigation-helpers';

type CalendarViewName = 'Day' | 'Week' | 'Month';

type CalendarDTO = {
  id: string;
  name: string;
};

type EventDTO = {
  id: string;
  title: string;
};

type EnsureCalendarResult = {
  calendarId: string;
  createdCalendarId: string | null;
};

const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_FILE = path.resolve(__dirname, '../.auth/user.json');

function calendarViewTrigger(page: Page): Locator {
  return page.getByRole('button', { name: 'Calendar view' });
}

function calendarViewOption(page: Page, view: CalendarViewName): Locator {
  return page
    .getByRole('listbox')
    .getByRole('option', { name: new RegExp(`^${view}(?:\\s|$)`) })
    .first();
}

function calendarViewRoot(page: Page, view: CalendarViewName): Locator {
  if (view === 'Day') {
    return page.locator('[data-testid="calendar-day-view"]');
  }
  if (view === 'Week') {
    return page.locator('[data-testid="calendar-week-view"]');
  }
  return page.locator('[data-testid="calendar-month-view"]');
}

function parseAuthToken(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function readAuthTokenFromStorageState(): string | null {
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const authEntry = parsed?.origins
      ?.flatMap((origin: { localStorage?: Array<{ name: string; value: string }> }) =>
        origin.localStorage ?? [],
      )
      .find((entry: { name: string; value: string }) => entry.name === AUTH_STORAGE_KEY);

    return parseAuthToken(authEntry?.value);
  } catch {
    return null;
  }
}

async function getAuthToken(page: Page): Promise<string | null> {
  if (page.isClosed()) {
    return readAuthTokenFromStorageState();
  }

  try {
    return await page.evaluate((storageKey) => {
      const raw = localStorage.getItem(storageKey);
      return raw;
    }, AUTH_STORAGE_KEY).then(parseAuthToken);
  } catch {
    return readAuthTokenFromStorageState();
  }
}

function getBaseUrl(page: Page): string {
  try {
    return new URL(page.url()).origin;
  } catch {
    return (process.env.BASE_URL || 'http://localhost').replace(/\/$/, '');
  }
}

async function getAuthenticatedApiContext(page: Page) {
  const token = await getAuthToken(page);
  if (!token) {
    throw new Error('No auth token found in localStorage.');
  }

  return {
    baseUrl: getBaseUrl(page),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Wait for the calendar shell and default week view to finish rendering before
 * interacting with toolbar controls or calendar slots.
 */
export async function waitForCalendarPageReady(page: Page) {
  await waitForLayoutMain(page);
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole('button', { name: 'Previous period' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next period' }),
  ).toBeVisible();
  await expect(calendarViewTrigger(page)).toBeVisible();
  await expect(page.locator('[data-testid="calendar-header-title"]')).toBeVisible();
  await expect(calendarViewRoot(page, 'Week')).toBeVisible({ timeout: 20_000 });
}

/**
 * Navigate directly to /calendar and wait for the page shell to become stable.
 * Use this when a test does not care how the user reached the calendar route.
 */
export async function ensureOnCalendarPage(page: Page) {
  await page.goto('/calendar');
  await waitForCalendarPageReady(page);
}

/** Calendar toolbar title element that shows the current visible date range. */
export function getCalendarTitleLocator(page: Page) {
  return page.locator('[data-testid="calendar-header-title"]').first();
}

/** Read and normalize the visible calendar header title text. */
export async function getCalendarTitle(page: Page) {
  return (await getCalendarTitleLocator(page).innerText()).trim();
}

/**
 * Wait until the calendar header title changes after toolbar navigation.
 * This gives us a stable signal that the visible date range has updated.
 */
export async function waitForCalendarTitleToChange(
  page: Page,
  previousTitle: string,
) {
  await expect
    .poll(async () => await getCalendarTitle(page), { timeout: 10_000 })
    .not.toBe(previousTitle);
}

/**
 * Open the calendar view picker and wait for the listbox options to render.
 * The trigger itself stays labeled "Calendar view" across view changes.
 */
export async function openCalendarViewSwitcher(page: Page) {
  const trigger = calendarViewTrigger(page);
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('listbox')).toBeVisible({ timeout: 10_000 });
}

/**
 * Switch between Day / Week / Month views and assert both the target view root
 * and the trigger text update to the selected view.
 */
export async function switchCalendarView(page: Page, view: CalendarViewName) {
  await openCalendarViewSwitcher(page);
  const listbox = page.getByRole('listbox');
  const option = calendarViewOption(page, view);

  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
  await expect(listbox).not.toBeVisible({ timeout: 10_000 });
  await expect(calendarViewTrigger(page)).toContainText(view);
  await expect(calendarViewRoot(page, view)).toBeVisible({ timeout: 10_000 });
}

/**
 * Move to Day view, click a visible hour slot, and return the create-event
 * dialog once it is open.
 */
export async function openCreateEventDialogFromDaySlot(
  page: Page,
  hour = 9,
) {
  await switchCalendarView(page, 'Day');
  const slot = page.locator('[data-testid="calendar-day-slot"]').nth(hour);
  await expect(slot).toBeVisible();
  await slot.click();

  const dialog = page.getByRole('dialog', { name: 'Create event' });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  return dialog;
}

/** Find the first rendered calendar event card whose visible text includes `title`. */
export function getCalendarEventCardByTitle(page: Page, title: string) {
  return page
    .locator('[data-testid="calendar-event-card"]')
    .filter({ hasText: title })
    .first();
}

/**
 * Create an event from a visible day slot and wait for both the POST response
 * and dialog dismissal so the test does not depend on optimistic UI timing.
 */
export async function createEventFromDaySlot(
  page: Page,
  title: string,
  hour = 9,
  calendarId?: string,
): Promise<string | null> {
  const dialog = await openCreateEventDialogFromDaySlot(page, hour);
  const calendarSelect = dialog.getByRole('combobox');
  await expect(calendarSelect).toBeVisible({ timeout: 10_000 });

  // Wait for the calendar field to initialize before filling the form.
  await expect
    .poll(
      async () =>
        await calendarSelect.evaluate(
          (element) => (element as HTMLSelectElement).value,
        ),
      { timeout: 10_000 },
    )
    .not.toBe('');

  if (calendarId) {
    await expect(calendarSelect.locator(`option[value="${calendarId}"]`)).toHaveCount(1, {
      timeout: 10_000,
    });
    await calendarSelect.selectOption(calendarId);
    await expect(calendarSelect).toHaveValue(calendarId);
  }

  const titleInput = dialog.getByPlaceholder('Add title');
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);

  const isCreateEventRequest = (url: string, method: string) => {
    const pathname = new URL(url).pathname;
    return pathname === '/api/v1/events/' && method === 'POST';
  };

  const saveButton = dialog.getByRole('button', { name: 'Save' });
  const responsePromise = page.waitForResponse(
    (candidate) =>
      isCreateEventRequest(candidate.url(), candidate.request().method()),
    { timeout: 15_000 },
  );

  await saveButton.click();

  const response = await responsePromise;

  let eventId: string | null = null;
  if (response.ok()) {
    const body = await response.json();
    eventId = body?.id ?? null;
  }

  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  await expect(getCalendarEventCardByTitle(page, title)).toBeVisible({
    timeout: 15_000,
  });

  return eventId;
}

/**
 * List calendars the authenticated user can access.
 * Used by setup helpers so tests can adapt to the environment's seed data.
 */
export async function listAccessibleCalendars(page: Page): Promise<CalendarDTO[]> {
  const { baseUrl, headers } = await getAuthenticatedApiContext(page);
  const response = await page.request.get(`${baseUrl}/api/v1/calendars/`, {
    headers,
  });

  if (!response.ok()) {
    throw new Error(`Failed to list calendars (${response.status()}).`);
  }

  return (await response.json()) as CalendarDTO[];
}

/**
 * Create a temporary calendar through the API for tests that need a writable
 * calendar but cannot assume one already exists.
 */
export async function createCalendarViaApi(
  page: Page,
  name: string,
): Promise<CalendarDTO> {
  const { baseUrl, headers } = await getAuthenticatedApiContext(page);
  const response = await page.request.post(`${baseUrl}/api/v1/calendars/`, {
    headers,
    data: {
      name,
      color: '#1E88E5',
      visibility: 'private',
      timezone: 'UTC',
      is_primary: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create calendar (${response.status()}).`);
  }

  return (await response.json()) as CalendarDTO;
}

/** Best-effort calendar cleanup helper for calendars created during a test. */
export async function deleteCalendarById(page: Page, calendarId: string) {
  try {
    const { baseUrl, headers } = await getAuthenticatedApiContext(page);
    const response = await page.request.delete(`${baseUrl}/api/v1/calendars/${calendarId}/`, {
      headers,
    });

    if (!response.ok() && response.status() !== 404) {
      console.warn(`Failed to delete calendar ${calendarId} (${response.status()}).`);
    }
  } catch (error) {
    console.warn(`Calendar cleanup skipped for ${calendarId}.`, error);
  }
}

/**
 * Return an existing writable calendar when possible, otherwise create a
 * temporary one so event-creation tests remain deterministic.
 */
export async function ensureCalendarAvailable(
  page: Page,
): Promise<EnsureCalendarResult> {
  const calendars = await listAccessibleCalendars(page);
  if (calendars.length > 0) {
    return {
      calendarId: calendars[0].id,
      createdCalendarId: null,
    };
  }

  const createdCalendar = await createCalendarViaApi(
    page,
    `E2E Calendar ${Date.now()}`,
  );

  await page.reload();
  await waitForCalendarPageReady(page);

  return {
    calendarId: createdCalendar.id,
    createdCalendarId: createdCalendar.id,
  };
}

/**
 * Seed a regular event through the API so "open existing event" tests can stay
 * focused on calendar rendering and dialog behavior.
 */
export async function createEventViaApi(
  page: Page,
  calendarId: string,
  title: string,
): Promise<EventDTO> {
  const { baseUrl, headers } = await getAuthenticatedApiContext(page);
  const eventWindow = await page.evaluate(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const start = new Date();
    start.setHours(11, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);

    return {
      timezone,
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
    };
  });

  const response = await page.request.post(`${baseUrl}/api/v1/events/`, {
    headers,
    data: {
      calendar_id: calendarId,
      title,
      description: 'Created by Playwright E2E',
      start_datetime: eventWindow.startDatetime,
      end_datetime: eventWindow.endDatetime,
      timezone: eventWindow.timezone,
      is_all_day: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create event (${response.status()}).`);
  }

  return (await response.json()) as EventDTO;
}

/** Best-effort event cleanup helper for events created or seeded during a test. */
export async function deleteEventById(page: Page, eventId: string) {
  try {
    const { baseUrl, headers } = await getAuthenticatedApiContext(page);
    const response = await page.request.delete(`${baseUrl}/api/v1/events/${eventId}/`, {
      headers,
    });

    if (!response.ok() && response.status() !== 404) {
      console.warn(`Failed to delete event ${eventId} (${response.status()}).`);
    }
  } catch (error) {
    console.warn(`Event cleanup skipped for ${eventId}.`, error);
  }
}
