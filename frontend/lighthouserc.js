/**
 * Lighthouse CI configuration.
 * Assertions use minScore 0 as placeholders until Phase 3 baselines exist.
 *
 * Prerequisites: the app is reachable at http://localhost on port 80 (e.g.
 * Docker Compose maps host :80 → the frontend). LHCI does not start Next.js — start
 * your stack first, then run `lhci autorun` from `frontend/`.
 *
 * Authenticated audits: set LHCI_AUTH_EMAIL + LHCI_AUTH_PASSWORD (see scripts/lhci-puppeteer-auth.cjs).
 * Requires `puppeteer` (devDependency). LHCI reuses the same browser for Puppeteer + Lighthouse.
 *
 * Optional: LHCI_TEST_PROJECT_ID — append /projects/{id} (see docs/lighthouse.md).
 * After autorun, npm script builds `.lighthouseci/index.html` (dashboard for all URLs).
 * @see ../docs/lighthouse-auditing-integration-plan.md
 */
const base = "http://localhost";

const testProjectId = process.env.LHCI_TEST_PROJECT_ID;

const urls = [
  `${base}/`,
  `${base}/login`,
  `${base}/spreadsheet`,
  `${base}/projects`,
  `${base}/tasks?view=list&project_id=22`,
];

if (testProjectId) {
  urls.push(`${base}/projects/${testProjectId}`);
}

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      puppeteerScript: "./scripts/lhci-puppeteer-auth.cjs",
      url: urls,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0 }],
        "categories:accessibility": ["error", { minScore: 0 }],
        "categories:best-practices": ["error", { minScore: 0 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
