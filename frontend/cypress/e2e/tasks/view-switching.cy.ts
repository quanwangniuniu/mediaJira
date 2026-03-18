import {
  selectProject,
  waitForTasksPageReady,
  switchTab,
  switchView,
} from "./tasks-helpers";

describe("View switching", () => {
  beforeEach(() => {
    cy.login();
    selectProject();

    cy.get<number>("@projectId").then((id) => {
      cy.visit(`/tasks?project_id=${id}&view=list`);
      waitForTasksPageReady();
    });
  });

  it("switches to Summary tab and shows metrics", () => {
    switchTab("Summary");

    cy.get('[data-testid="tab-content-summary"]', { timeout: 10_000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="summary-work-type-overview"]', {
      timeout: 10_000,
    }).should("be.visible");
    cy.get('[data-testid="summary-total-work-items"]').should("be.visible");
  });

  it("switches to Board tab and shows columns", () => {
    switchTab("Board");

    cy.get('[data-testid="board-columns"]', { timeout: 10_000 }).should(
      "be.visible",
    );
  });

  it("switches back to Tasks tab and restores the list", () => {
    switchTab("Board");
    cy.get('[data-testid="board-columns"]', { timeout: 10_000 }).should(
      "be.visible",
    );

    switchTab("Tasks");

    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");
  });

  it("toggles between List View and Timeline View", () => {
    switchTab("Tasks");
    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");

    switchView("timeline");
    cy.get('[data-testid="view-button-timeline"]').should("be.visible");
    cy.url().should("include", "view=timeline");

    switchView("list");
    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");
    cy.url().should("include", "view=list");
  });
});
