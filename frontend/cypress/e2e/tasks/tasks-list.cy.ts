import { selectProject, waitForTasksPageReady } from "./tasks-helpers";

describe("Tasks list", () => {
  beforeEach(() => {
    cy.login();
    selectProject();

    cy.get<number>("@projectId").then((id) => {
      cy.visit(`/tasks?project_id=${id}&view=list`);
      waitForTasksPageReady();
    });
  });

  it("loads the task list successfully", () => {
    cy.get('[role="listbox"][aria-label="Task list"]', { timeout: 15_000 })
      .should("be.visible")
      .find('[role="option"]')
      .should("have.length.greaterThan", 0);
  });

  it("shows empty state when no tasks match the search", () => {
    cy.get('[placeholder="Search tasks..."]').type(
      "zzz_no_match_xyzzy_999{enter}",
    );

    cy.contains("No tasks", { timeout: 10_000 }).should("be.visible");
  });

  it("applies a filter and the list updates accordingly", () => {
    cy.get('[placeholder="Search tasks..."]').type("E2E");

    cy.get('[role="listbox"][aria-label="Task list"]', { timeout: 10_000 })
      .should("be.visible")
      .find('[role="option"]')
      .should("have.length.greaterThan", 0);
  });
});
