import {
  selectProject,
  waitForTasksPageReady,
  openFirstTaskFromList,
  assertNoLoadingEllipsisText,
  assertTaskDetailShellNoLoadingOrError,
} from "./tasks-helpers";

/**
 * Task detail: Attachments mount for every loaded task (TaskDetail).
 * Subtasks mount when the task is not itself a subtask; the task list excludes
 * subtasks, so opening the first list task always yields both sections.
 */
describe("Task detail page", () => {
  beforeEach(() => {
    cy.login();
    selectProject();

    cy.get<number>("@projectId").then((id) => {
      cy.visit(`/tasks?project_id=${id}&view=list`);
      waitForTasksPageReady();
    });

    openFirstTaskFromList();
    cy.url().should("match", /\/tasks\/\d+/, { timeout: 10_000 });
  });

  it("shows description, comments, attachments, subtasks, navigation, and no error or stuck loading", () => {
    assertNoLoadingEllipsisText();
    assertTaskDetailShellNoLoadingOrError();

    cy.get('[data-testid="task-id-label"]', { timeout: 10_000 }).should(
      "be.visible",
    );

    cy.get('[data-testid="task-summary-title"]', { timeout: 15_000 })
      .should("be.visible")
      .and(($el) => {
        if (!$el.text().trim()) {
          throw new Error("task summary title is empty");
        }
      });

    cy.get('[data-testid="task-description-heading"]', {
      timeout: 10_000,
    }).should("be.visible");

    cy.get('[data-testid="task-comments-heading"]', {
      timeout: 10_000,
    }).should("be.visible");
    cy.get('[data-testid="task-comments-section"]', {
      timeout: 10_000,
    }).should("be.visible");

    cy.get('[data-testid="task-attachments-section"]', {
      timeout: 10_000,
    }).should("be.visible");
    cy.get('[data-testid="task-subtasks-section"]', {
      timeout: 10_000,
    }).should("be.visible");

    cy.get('[data-testid="back-to-tasks"]').should("be.visible");
  });
});
