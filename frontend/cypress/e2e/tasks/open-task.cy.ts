import {
  selectProject,
  waitForTasksPageReady,
  switchTab,
  openFirstTaskFromList,
  openFirstTaskFromBoard,
  assertTaskDetailCoreContentVisible,
} from "./tasks-helpers";

describe("Open task", () => {
  beforeEach(() => {
    cy.login();
    selectProject();

    cy.get<number>("@projectId").then((id) => {
      cy.visit(`/tasks?project_id=${id}&view=list`);
      waitForTasksPageReady();
    });
  });

  it("clicking a task in list navigates to the detail page", () => {
    openFirstTaskFromList();

    cy.url().should("match", /\/tasks\/\d+/, { timeout: 10_000 });
    cy.get('[data-testid="task-id-label"]', { timeout: 10_000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="back-to-tasks"]').should("be.visible");

    assertTaskDetailCoreContentVisible();
  });

  it("clicking a task in board navigates to the detail page", () => {
    switchTab("Board");

    openFirstTaskFromBoard();

    cy.url().should("match", /\/tasks\/\d+/, { timeout: 10_000 });
    cy.get('[data-testid="task-id-label"]', { timeout: 10_000 }).should(
      "be.visible",
    );
    cy.get('[data-testid="back-to-tasks"]').should("be.visible");

    assertTaskDetailCoreContentVisible();
  });
});
