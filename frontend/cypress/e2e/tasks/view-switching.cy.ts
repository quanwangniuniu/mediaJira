import {
  selectProject,
  waitForTasksPageReady,
  switchTab,
  switchView,
} from "./tasks-helpers";

/** Workspace tab (Summary / Tasks / Board) shows active underline + indigo text. */
function assertWorkspaceTabActive(
  tab: "Summary" | "Tasks" | "Board",
): void {
  const testId =
    tab === "Summary"
      ? "tab-summary"
      : tab === "Tasks"
        ? "tab-tasks"
        : "tab-board";
  cy.get(`[data-testid="${testId}"]`)
    .should("have.class", "border-indigo-600")
    .and("have.class", "text-indigo-600");
}


function assertViewModeButtonSelected(mode: "list" | "timeline"): void {
  const testId =
    mode === "list" ? "view-button-list" : "view-button-timeline";
  cy.get(`[data-testid="${testId}"]`)
    .parent("button")
    .should("have.class", "bg-blue-600")
    .and("have.class", "border-blue-600");
}

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

    assertWorkspaceTabActive("Summary");

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

    assertWorkspaceTabActive("Board");

    cy.get('[data-testid="board-columns"]', { timeout: 10_000 }).should(
      "be.visible",
    );
  });

  it("switches back to Tasks tab and restores the list", () => {
    switchTab("Board");
    cy.get('[data-testid="board-columns"]', { timeout: 10_000 }).should(
      "be.visible",
    );
    assertWorkspaceTabActive("Board");

    switchTab("Tasks");

    assertWorkspaceTabActive("Tasks");

    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");
    assertViewModeButtonSelected("list");
  });

  it("toggles between List View and Timeline View", () => {
    switchTab("Tasks");
    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");
    assertWorkspaceTabActive("Tasks");
    assertViewModeButtonSelected("list");

    switchView("timeline");
    cy.get('[data-testid="view-button-timeline"]').should("be.visible");
    cy.url().should("include", "view=timeline");
    assertViewModeButtonSelected("timeline");

    cy.get(
      "div.border.border-slate-200.rounded-md.overflow-hidden.bg-white",
    ).should("be.visible");

    switchView("list");
    cy.get('[role="listbox"][aria-label="Task list"]', {
      timeout: 10_000,
    }).should("be.visible");
    cy.url().should("include", "view=list");
    assertViewModeButtonSelected("list");
  });
});
