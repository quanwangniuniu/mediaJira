import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'h7bqvk',
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {},
  },
});
