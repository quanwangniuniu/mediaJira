import {
  assertWeekGridShowsEventTitle,
  calendarVisitOptions,
  clickCalendarEventByTitle,
  clickWeekViewTimeSlot,
  registerAgendaRefetchIntercept,
  registerCalendarWorkspaceProjectsIntercept,
  selectCalendarView,
  typeEventTitleInDialog,
  waitForAgendaIncludingEventId,
  waitForCalendarPageReady,
} from "./calendar-helpers";

describe("Calendar", () => {
  beforeEach(() => {
    cy.login();
    registerCalendarWorkspaceProjectsIntercept();
    cy.visit("/calendar", calendarVisitOptions());
    waitForCalendarPageReady();
  });

  it("loads the toolbar and week view with time grid", () => {
    cy.contains("button", "Today", { timeout: 15_000 }).should("be.visible");
    cy.get('[aria-label="Previous period"]').should("be.visible");
    cy.get('[aria-label="Next period"]').should("be.visible");
    cy.get('[aria-label="Calendar view"]').should("contain", "Week");
    cy.get("section.overflow-auto", { timeout: 15_000 })
      .find("button.h-12")
      .should("have.length.greaterThan", 10);
  });

  it("updates the header when navigating with next and previous", () => {
    cy.contains("button", "Today")
      .closest("header")
      .find("span.text-lg")
      .should("be.visible")
      .invoke("text")
      .then((before) => {
        expect(before.trim().length).to.be.greaterThan(0);
        cy.get('[aria-label="Next period"]').click();
        cy.contains("button", "Today")
          .closest("header")
          .find("span.text-lg")
          .should("be.visible")
          .invoke("text")
          .should("not.eq", before);
        cy.get('[aria-label="Previous period"]').click();
        cy.contains("button", "Today")
          .closest("header")
          .find("span.text-lg")
          .should("be.visible")
          .invoke("text")
          .should("eq", before);
      });
  });

  it("updates the header when clicking Today", () => {
    cy.get('[aria-label="Next period"]').click();
    cy.contains("button", "Today").click();
    cy.contains("button", "Today")
      .closest("header")
      .find("span.text-lg")
      .should("be.visible")
      .invoke("text")
      .then((text) => {
        expect(text.trim().length).to.be.greaterThan(0);
      });
  });

  it("switches between day, week, and month views", () => {
    selectCalendarView("Day");
    cy.get("section.overflow-auto")
      .find("button.h-12")
      .should("have.length", 24);

    selectCalendarView("Month");
    cy.get("section.overflow-auto").find(".grid-rows-6").should("exist");

    selectCalendarView("Week");
    cy.get('[aria-label="Calendar view"]').should("contain", "Week");
    cy.get("section.overflow-auto")
      .find("button.h-12")
      .should("have.length.greaterThan", 100);
  });

  it("creates an event from a time slot and shows it on the grid", () => {
    registerAgendaRefetchIntercept();
    cy.intercept("POST", "**/api/v1/events/**").as("createEvent");

    clickWeekViewTimeSlot(0);

    cy.get('input[placeholder="Add title"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.contains("button", "Save", { timeout: 10_000 }).should("be.visible");

    const title = `E2E Cal ${Date.now()}`;
    typeEventTitleInDialog(title);
    cy.contains("button", "Save").should("be.visible").click();

    cy.wait("@createEvent", { timeout: 30_000 }).then((interception) => {
      const body = interception.response?.body as { id?: string; title?: string };
      expect(body?.title).to.eq(title);
      expect(body?.id).to.be.a("string");
      waitForAgendaIncludingEventId(body!.id as string);
    });

    cy.get('input[placeholder="Add title"]').should("not.exist");
    assertWeekGridShowsEventTitle(title);
  });

  it("opens event detail when clicking an existing event", () => {
    registerAgendaRefetchIntercept();
    cy.intercept("POST", "**/api/v1/events/**").as("createEvent");

    clickWeekViewTimeSlot(3);

    cy.get('input[placeholder="Add title"]', { timeout: 20_000 }).should(
      "be.visible",
    );
    cy.contains("button", "Save", { timeout: 10_000 }).should("be.visible");

    const title = `E2E Open ${Date.now()}`;
    typeEventTitleInDialog(title);
    cy.contains("button", "Save").click();

    cy.wait("@createEvent", { timeout: 30_000 }).then((interception) => {
      const body = interception.response?.body as { id?: string; title?: string };
      expect(body?.title).to.eq(title);
      expect(body?.id).to.be.a("string");
      waitForAgendaIncludingEventId(body!.id as string);
    });

    cy.get('input[placeholder="Add title"]').should("not.exist");

    clickCalendarEventByTitle(title);

    cy.get('[aria-label="Edit event"]', { timeout: 15_000 }).should(
      "be.visible",
    );
    cy.get('[aria-label="Close"]').should("be.visible").click();
    cy.get('[aria-label="Edit event"]').should("not.exist");
  });
});
