/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", () => {
  const email = Cypress.expose("DEV_USER_EMAIL") || "devuser@example.com";
  const password = Cypress.expose("DEV_USER_PASSWORD") || "password123!";

  cy.session([email], () => {
    cy.visit("/login");
    cy.get('input[placeholder="Enter your email"]').type(email);
    cy.get('input[placeholder="Enter your password"]').type(password);
    cy.contains("button", "Sign in").click();
    cy.url().should("match", /\/campaigns/, { timeout: 30_000 });
    cy.contains("Preparing your workspace").should("not.exist");
  });
});

export {};
