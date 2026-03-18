import {
  selectProject,
  waitForTasksPageReady,
  openFirstTaskFromList,
} from "./tasks-helpers";

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

  it("shows task description", () => {
    cy.get('[data-testid="task-description-heading"]', {
      timeout: 10_000,
    }).should("be.visible");
  });

  it("shows comments section", () => {
    cy.get('[data-testid="task-comments-heading"]', {
      timeout: 10_000,
    }).should("be.visible");
  });

  it("shows back-to-tasks link", () => {
    cy.get('[data-testid="back-to-tasks"]').should("be.visible");
  });

  it("shows no error state", () => {
    cy.get('[data-testid="task-detail-error"]').should("not.exist");
  });
});
