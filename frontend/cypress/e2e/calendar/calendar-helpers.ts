/// <reference types="cypress" />

/** Same key as app `CALENDAR_FILTER_STORAGE_KEY` — single-calendar filter can hide new events. */
const CALENDAR_FILTER_STORAGE_KEY = "calendar:selected_calendar_id";

/**
 * Visit options: clear persisted calendar filter so GET returns all calendars’ events.
 */
export function calendarVisitOptions() {
  return {
    onBeforeLoad(win: Cypress.AUTWindow) {
      win.localStorage.removeItem(CALENDAR_FILTER_STORAGE_KEY);
    },
  };
}

/**
 * Call **before** `cy.visit("/calendar")`. Matches `ProjectAPI.getProjects` used by
 * `OnboardingContext.refreshProjects` while `checking` is true ("Preparing your workspace").
 */
export function registerCalendarWorkspaceProjectsIntercept(): void {
  cy.intercept("GET", "**/api/core/projects/**").as("calendarWorkspaceProjects");
}

/**
 * After login + visit, wait until the calendar shell and week time grid are interactive.
 *
 * Why not only `cy.contains("Preparing…").should("not.exist")`? On first paint
 * `checking` is still false, so the text is not in the DOM yet and the assertion can pass
 * too early; the overlay then mounts and Cypress still treats Today as "visible" (blur /
 * pointer-events-none do not hide nodes for Cypress).
 */
export function waitForCalendarPageReady(): void {
  cy.url({ timeout: 30_000 }).should("include", "/calendar");
  cy.wait("@calendarWorkspaceProjects", { timeout: 30_000 });
  cy.get("body", { timeout: 30_000 }).should(($body) => {
    expect($body.text()).not.to.include("Preparing your workspace");
  });
  cy.contains("button", "Today", { timeout: 30_000 }).should("be.visible");
  cy.get('[aria-label="Calendar view"]', { timeout: 30_000 })
    .should("be.visible")
    .and("contain", "Week");
  cy.get("section.overflow-auto", { timeout: 30_000 })
    .find("button.h-12")
    .should("have.length.greaterThan", 0);
}

/**
 * Clicks a week/day hour slot (`button.h-12`). Event blocks are absolutely positioned on top
 * of the same column; Cypress rejects a normal `.click()` when the slot is covered (e.g. by
 * the event’s time row `div.truncate.opacity-90`). `{ force: true }` targets the slot’s handler.
 */
export function clickWeekViewTimeSlot(slotIndex: number): void {
  cy.get("section.overflow-auto")
    .find("button.h-12")
    .eq(slotIndex)
    .scrollIntoView()
    .should("be.visible")
    .click({ force: true });
}

export function registerAgendaRefetchIntercept(): void {
  cy.intercept("GET", "**/api/v1/views/agenda/**").as("agenda");
}

export function waitForAgendaRefetch(): void {
  cy.wait("@agenda", { timeout: 30_000 });
}

function getEventsFromAgendaBody(
  body: unknown,
): Array<{ id?: string; title?: string }> {
  if (!body || typeof body !== "object") {
    return [];
  }
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.events)) {
    return b.events as Array<{ id?: string; title?: string }>;
  }
  const data = b.data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { events?: unknown }).events)
  ) {
    return (data as { events: Array<{ id?: string; title?: string }> }).events;
  }
  return [];
}

function agendaHasEventId(
  interception: { response?: { body?: unknown } },
  eventId: string,
): boolean {
  const events = getEventsFromAgendaBody(interception.response?.body);
  return events.some((e) => String(e.id) === String(eventId));
}

/**
 * After POST /events/, refetch uses GET agenda. A slower in-flight agenda GET can finish
 * after POST and satisfy the first cy.wait("@agenda") with stale data — wait again if needed.
 * Prefer matching by event id (stable); title alone can differ from POST if backend normalizes.
 */
export function waitForAgendaIncludingEventId(eventId: string): void {
  cy.wait("@agenda", { timeout: 30_000 }).then((interception) => {
    if (agendaHasEventId(interception, eventId)) {
      return;
    }
    cy.wait("@agenda", { timeout: 30_000 }).then((interception2) => {
      expect(
        agendaHasEventId(interception2, eventId),
        `agenda should include created event id=${eventId} (retried after stale first response)`,
      ).to.be.true;
    });
  });
}

/**
 * Title field in the create/edit dialog. `cy.clear()` + `cy.type()` can lose characters on
 * React controlled inputs (e.g. "E2E Cal …" → "E Cal …"); set via native value setter + events.
 */
export function typeEventTitleInDialog(title: string): void {
  cy.get('input[placeholder="Add title"]')
    .should("be.visible")
    .click()
    .then(($input) => {
      const el = $input[0] as HTMLInputElement;
      const win = el.ownerDocument.defaultView;
      if (!win) {
        throw new Error("expected input owner document defaultView");
      }
      const setter = Object.getOwnPropertyDescriptor(
        win.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!setter) {
        throw new Error("expected HTMLInputElement value setter");
      }
      setter.call(el, title);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    })
    .should("have.value", title);
}

export function openCalendarViewSwitcher(): void {
  cy.get('[aria-label="Calendar view"]').should("be.visible").click();
  cy.get('[role="listbox"]', { timeout: 10_000 }).should("be.visible");
}

export function selectCalendarView(label: "Day" | "Week" | "Month"): void {
  openCalendarViewSwitcher();
  cy.get('[role="option"]').contains(label).click();
  cy.get('[aria-label="Calendar view"]').should("contain", label);
}

/** Scroll the week/day time grid (inner overflow) so chips above/below the fold become discoverable. */
export function scrollCalendarWeekGridToTop(): void {
  cy.get("section.overflow-auto")
    .find("div.overflow-auto")
    .first()
    .scrollTo(0, 0, { ensureScrollable: false });
}

/**
 * Event chips are `button` with title in a child; do not scope to `section` — layout can nest sections.
 * Prefer unique titles (e.g. timestamp) to avoid matching the wrong row.
 */
export function assertWeekGridShowsEventTitle(title: string): void {
  scrollCalendarWeekGridToTop();
  cy.contains(title, { timeout: 30_000 })
    .should("be.visible")
    .scrollIntoView()
    .closest("button")
    .should("be.visible")
    .and("contain", title);
}

export function clickCalendarEventByTitle(title: string): void {
  scrollCalendarWeekGridToTop();
  cy.contains(title, { timeout: 30_000 })
    .should("be.visible")
    .scrollIntoView()
    .closest("button")
    .should("be.visible")
    .click({ force: true });
}

/** Prefer global selector — `section … [data-calendar-event-id]` can miss if section is not the chip ancestor. */
export function clickCalendarEventById(eventId: string): void {
  cy.get(`[data-calendar-event-id="${eventId}"]`, { timeout: 30_000 })
    .scrollIntoView()
    .should("be.visible")
    .click({ force: true });
}
