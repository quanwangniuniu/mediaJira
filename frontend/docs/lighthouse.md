# Lighthouse (LHCI)

Prerequisites: **Node 18.x** (align with CI), Chrome/Chromium available to Lighthouse.

## Local run (Docker on port 80)

Prerequisite: the stack is up so the app is served at **`http://localhost`** (port **80**, e.g. Docker Compose maps **`80:80`**). LHCI does **not** start Next.js; it only audits the URLs in [`lighthouserc.js`](../lighthouserc.js). Audits use **desktop** emulation (`preset: "desktop"`, `formFactor: "desktop"`) — not mobile Moto G–style viewport.

From `frontend/`:

```bash
npm ci
npm run lighthouse:local
```

**Env files (no extra npm package)** — `scripts/lhci-env.cjs` runs at the start of `lhci-run.cjs` and merges **`../.env`** (repo root) then **`frontend/.env`**, then applies keys only where the variable is **not** already set (so `export LHCI_AUTH_EMAIL=...` in your shell or GitHub Actions still wins). Optional: **`LHCI_ENV_FILE`** = path to another file (merged last among files). Set **`LHCI_VERBOSE=1`** to log how many keys were applied.

**Node 20.6+ alternative** — you can use the built-in flag instead: `node --env-file=.env scripts/lhci-run.cjs` (adjust path); the script loader is for Node 18 and for merging two `.env` paths without a single combined file.

This runs **`node scripts/lhci-run.cjs`**, which may call **`lhci-ensure-project.cjs`** (register user if needed → JWT login → find or create project when auth env is set), then **`lhci autorun`**, then **`lhci-build-dashboard.cjs`**. Audits use **`http://localhost/...`** (no `:port` — HTTP implies port 80). Output goes under `.lighthouseci/` (gitignored): one HTML report per URL, plus **`manifest.json`**. The dashboard step also writes **`report-<slug>.html`** (e.g. **`report-home.html`**, **`report-tasks-project-22.html`**) for readable filenames. The combined **dashboard** is **`report-dashboard.html`** (or **`report-<prefix>-dashboard.html`** if **`LHCI_REPORT_PREFIX`** is set); the same content is mirrored to **`.lighthouseci/index.html`** unless **`LHCI_DASHBOARD_WRITE_INDEX=0`**. Override the dashboard name with **`LHCI_DASHBOARD_FILENAME`**. Lighthouse does not produce a single native multi-URL HTML report; the dashboard is the usual workaround.

Open the summary: **`open .lighthouseci/report-dashboard.html`** or **`open .lighthouseci/index.html`** (macOS) — same file by default.

**Authenticated audits** — [`lighthouserc.js`](../lighthouserc.js) uses [`scripts/lhci-puppeteer-login.cjs`](../scripts/lhci-puppeteer-login.cjs): Puppeteer opens **`/login`**, submits **`LHCI_AUTH_EMAIL`** and **`LHCI_AUTH_PASSWORD`**, then waits for **`auth-storage`**. If unset, the script skips login (public/unauthenticated behavior only). Install deps (`npm ci` includes **`puppeteer`**). The config sets **`disableStorageReset: true`** so Lighthouse does not clear **`localStorage`** before each URL (default behavior would remove **`auth-storage`** after login).

```bash
export LHCI_AUTH_EMAIL="you@example.com"
export LHCI_AUTH_PASSWORD="your-test-password"
npm run lighthouse:local
```

With credentials set, [`scripts/lhci-ensure-project.cjs`](../scripts/lhci-ensure-project.cjs) registers via **`POST /auth/register/`** if the email is new, logs in, then finds a project named **`LHCI_PROJECT_NAME`** (default **`LHCI Test Project`**) or creates it (unless **`LHCI_TEST_PROJECT_ID`** is already set or **`LHCI_ENSURE_PROJECT=0`**) so [`lighthouserc.js`](../lighthouserc.js) can include **`/projects/{id}`** and **`/tasks?...&project_id=`**. Registration creates an **organization** from the email domain. Override origin with **`LHCI_API_BASE`** or **`LHCI_BASE_URL`** (shared by API ensure + Puppeteer) if it differs from `http://localhost`.

Start Docker (or your stack) from the repo root first, then from `frontend/` run the command above. To invoke the CLI directly (skips ensure + dashboard):

```bash
cd frontend
npx lhci autorun
node scripts/lhci-build-dashboard.cjs   # optional if you skipped npm run lighthouse:local
```

## Host-only (no Docker)

If you run **`next start`** on the host bound to port **80** (so **`http://localhost`** still matches), you can use the same `lhci autorun` without changing `lighthouserc.js`. If you use another port, change the **`base`** URL in [`lighthouserc.js`](../lighthouserc.js) (e.g. `http://localhost:3000`) or put a reverse proxy on port 80.

## Quick single-page check

Use Chrome DevTools → Lighthouse → select a mode and URL — useful for ad-hoc checks; CI and `lighthouse:local` use the same URL list as [`lighthouserc.js`](../lighthouserc.js).

## Authenticated URLs and prerequisites (e.g. a project-specific page)

Lighthouse opens each URL in a **clean browser context** unless you add **cookies/session** or a **Puppeteer pre-script**. A page like `/projects/[projectId]/…` also needs a **real** `projectId` in the database.

### 1. Stabilize data and the URL

- Create or pick a **fixture project** in your environment, or let **`lhci-ensure-project`** find or create one (see **`LHCI_PROJECT_NAME`**), and copy its **numeric id** from the API or UI if you set **`LHCI_TEST_PROJECT_ID`** manually.
- Build the exact path your App Router uses, e.g. `http://localhost/projects/<projectId>` or `…/projects/<projectId>/spreadsheets` (match [`src/app/projects`](../../src/app/projects)).
- Ensure that project **exists before** the audit (same DB the app uses for `next start` or whatever stack serves `localhost`).

### 2. Optional: add the URL in LHCI without hardcoding

[`lighthouserc.js`](../lighthouserc.js) appends **`/projects/${LHCI_TEST_PROJECT_ID}`** when **`LHCI_TEST_PROJECT_ID`** is set:

```bash
export LHCI_TEST_PROJECT_ID="your-project-uuid-or-id"
npm run lighthouse:local
```

Use a **non-secret** test id only; do not commit real credentials.

### 3. How this app stores auth (`auth-storage`)

The frontend uses **Zustand `persist`** with the localStorage key **`auth-storage`** (see [`src/lib/authStore.ts`](../../src/lib/authStore.ts)). The persisted JSON includes **`state.token`** (and related fields); API calls send **`Authorization: Bearer …`** from that payload — not a classic **HttpOnly cookie** session.

For Lighthouse, that means:

- After you **log in through the UI**, **`auth-storage`** is set for the **origin** (e.g. `http://localhost`). A **persistent Chrome profile** (`--user-data-dir`) or **Playwright `storageState`** (from `e2e/auth.setup.ts`) captures the same data for E2E.
- **LHCI** uses a **Puppeteer** [`puppeteerScript`](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md#puppeteerscript) that performs **email/password login** on **`/login`** when **`LHCI_AUTH_EMAIL`** and **`LHCI_AUTH_PASSWORD`** are set, so Lighthouse shares the same browser session.

### 4. Authentication: practical options

| Approach | When to use |
|----------|-------------|
| **Chrome DevTools** | Log in manually in the same tab, then run Lighthouse — **`auth-storage`** applies. Quick manual checks only. |
| **Lighthouse CLI** (`lighthouse <url>`) | Use a **fixed `--user-data-dir`**, open the app once, log in (so **`auth-storage`** is saved), then run Lighthouse with the same flags. |
| **Lighthouse CI `puppeteerScript`** | Set **`LHCI_AUTH_EMAIL`** / **`LHCI_AUTH_PASSWORD`**; [`scripts/lhci-puppeteer-login.cjs`](../scripts/lhci-puppeteer-login.cjs) loads **`/login`**, submits the form, waits for **`auth-storage`**. |
| **E2E Playwright** | Same app auth as E2E ([`e2e/auth.setup.ts`](../../e2e/auth.setup.ts)) — separate from LHCI; use **env** creds for LHCI or manual/DevTools. |

Redirects to `/login` without a valid **`auth-storage`** entry will produce **login page scores**, not the protected page — you must complete login (manual or script) first.

**Ad-hoc audits** — You can always point Chrome DevTools or `lighthouse <url>` at **`http://localhost/...`** while the stack is running; no LHCI config is required. Scores reflect whatever build and mode Docker (or your server) is serving, not necessarily a cold production build on the host.

## CI and baselines

GitHub Actions workflow **[`.github/workflows/lighthouse-ci.yml`](../../.github/workflows/lighthouse-ci.yml)** runs on **push** and **pull_request** to **`lighthouse-ci-test`**: Docker stack (same pattern as main CI), migrates, waits for **`http://localhost/`**, then **`npm run lighthouse:local`** in `frontend/` (which registers/logs in and ensures a test project via the API — no backend seed script). Configure repository secrets **`LHCI_AUTH_EMAIL`** and **`LHCI_AUTH_PASSWORD`**; reports are uploaded as **`lighthouse-reports-<sha>`** artifacts.

Numeric thresholds and broader CI integration are still TBD. See [Lighthouse integration — remaining steps](../../docs/lighthouse-integration-remaining-steps.md) and the [integration plan](../../docs/lighthouse-auditing-integration-plan.md).
