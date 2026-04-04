# Lighthouse — Marketing Simplified internal guide

Lab-based performance and quality audits for the **Next.js** app.

**Prerequisites:** Node 20, Chrome/Chromium (bundled with Puppeteer via `npm ci`).

---

## 1. What we audit

- **Tool:** Lighthouse CI (`@lhci/cli`) running **desktop** audits (`preset: "desktop"` in [`lighthouserc.js`](./lighthouserc.js)) — ~1350×940 viewport, simulated dense 4G.
- **Assertions:** All thresholds are `warn` severity in `lighthouserc.js` — sub-threshold scores are reported but do **not** fail the job.

### Audited pages

| Area | Path | Notes |
|------|------|--------|
| Home | `/` | Entry shell |
| Spreadsheet | `/spreadsheet` | Heavy client surface |
| Projects | `/projects` | List / navigation |
| Decisions | `/decisions` | List |
| Campaigns | `/campaigns` | |
| Variations | `/variations` | |
| Mailchimp | `/mailchimp` | |
| Notion | `/notion` | |
| TikTok | `/tiktok` | |
| Messages | `/messages` | |
| Calendar | `/calendar` | |
| Project spreadsheets | `/projects/{id}/spreadsheets` | When `LHCI_TEST_PROJECT_ID` is set |
| Project spreadsheet (grid) | `/projects/{id}/spreadsheets/{spreadsheetId}` | Seed script sets `LHCI_TEST_SPREADSHEET_ID` (needs `LHCI_AUTH_EMAIL` / `LHCI_AUTH_PASSWORD`) |
| Project meetings | `/projects/{id}/meetings` | When `LHCI_TEST_PROJECT_ID` is set |
| Tasks | `/tasks?view=list&project_id={id}` | When `LHCI_TEST_PROJECT_ID` is set |

To change the list edit `url` / `base` in [`lighthouserc.js`](./lighthouserc.js).

---

## 2. Report outputs

After `npm run lighthouse:local` from `frontend/`, all outputs are in **`frontend/.lighthouseci/`** (gitignored). The directory is wiped at the start of each run so there is no accumulation from previous runs.

| File | Purpose |
|------|---------|
| `report-dashboard.html` | Summary table — all URLs, category scores, links. Mirrored as `index.html`. |
| `report-<slug>.html` / `.json` | Full per-URL Lighthouse report (e.g. `report-home.html`). |
| `manifest.json` | Run metadata for tooling. |
| `assertion-results.json` | Per-assertion pass/warn/fail detail. |

---

## 3. How to run locally

```bash
cd frontend
npm ci
export LHCI_AUTH_EMAIL="you@example.com"    # optional — enables authenticated URL audits
export LHCI_AUTH_PASSWORD="..."
npm run lighthouse:local
# Open frontend/.lighthouseci/report-dashboard.html
```

What `npm run lighthouse:local` does:
1. Clears `frontend/.lighthouseci/`
2. Registers/logs in the LHCI test user via the API
3. Finds or creates `LHCI_PROJECT_NAME` (default: `LHCI Test Project`) → sets `LHCI_TEST_PROJECT_ID`
4. Seeds a spreadsheet (`LHCI Seed Spreadsheet`) and an asset task (`LHCI seed asset task`) via API → sets `LHCI_TEST_SPREADSHEET_ID` (skipped without auth env or if `LHCI_SEED_ENTITIES=0`)
5. Runs `lhci autorun` (collect → assert → upload to filesystem)
6. Builds `report-dashboard.html` and cleans up intermediate LHCI files

**Direct CLI** (bypasses step 1–3 and the dashboard): `npx lhci autorun`

**Auth env vars:**

| Variable | Purpose |
|----------|---------|
| `LHCI_AUTH_EMAIL` | Registers (if new) and logs in via `/auth/register/` and `/auth/login/` |
| `LHCI_AUTH_PASSWORD` | Password for the above |
| `LHCI_TEST_PROJECT_ID` | Skip project lookup — use this project ID directly |
| `LHCI_PROJECT_NAME` | Name of the project to find or create (default: `LHCI Test Project`) |
| `LHCI_API_BASE` / `LHCI_BASE_URL` | Override base URL if not `http://localhost` |
| `LHCI_VERBOSE=1` | Print response body snippets to stderr for debugging (no passwords logged) |
| `LHCI_SEED_ENTITIES=0` | Skip spreadsheet/task API seed (no `LHCI_TEST_SPREADSHEET_ID`) |
| `LHCI_TEST_SPREADSHEET_ID` | Set automatically after seed; enables `/projects/{id}/spreadsheets/{id}` in `lighthouserc.js` |

`lhci-env.cjs` auto-merges repo-root `.env` and `frontend/.env` before any other script runs (shell / CI env takes priority).

---

## 4. GitHub Actions

- **Workflow:** [`.github/workflows/lighthouse-ci.yml`](../.github/workflows/lighthouse-ci.yml) — triggers on push or PR to `lighthouse-ci-test`.
- **Secrets:** `LHCI_AUTH_EMAIL`, `LHCI_AUTH_PASSWORD` — set in repo **Settings → Secrets and variables → Actions**.
- **Artifact:** `lighthouse-reports-<sha>` — download and open `report-dashboard.html`.
- **Fork PRs** have no access to secrets; authenticated URL audits will fail.
- **On failure** the workflow prints `docker compose ps`, backend logs, and nginx logs so Django tracebacks are visible.

---

## 5. CI design decisions

### Migrations: no `--settings=backend.ci_settings`

Migrations run without the `--settings` flag, using the default `backend.settings`. `ci_settings.py` does `from .settings import *`, but `settings.py` defines `__all__ = ('celery_app',)`, which means `import *` only imports `celery_app` — `INSTALLED_APPS` is never loaded. Django then sees zero apps, applies no migrations, and tables like `core_customuser` are never created.

### Migrations: no `makemigrations --check`

`makemigrations --check --dry-run` exits with code 1 whenever any app has model changes without a committed migration file. On feature branches this is common (e.g. `agent`, `chat`, `decision`, `miro`). That gate belongs in the main CI quality pipeline. For Lighthouse we just need a working database, so we run `makemigrations --noinput` to auto-generate any missing files inside the ephemeral container, then `--merge --noinput` to resolve any multi-head conflicts, then `migrate`.

### Artifact upload: `include-hidden-files: true`

`actions/upload-artifact` defaults `include-hidden-files` to `false`, which silently skips any directory whose name starts with `.`. Because the output directory is `.lighthouseci` (dot-prefixed), without this flag the upload reports "No files were found" even though the files exist.

### `outputDir` uses an absolute path

`lighthouserc.js` sets `outputDir: path.join(__dirname, '.lighthouseci')` instead of `"./.lighthouseci"`. On CI runners, LHCI can inherit a process `cwd` of `$GITHUB_WORKSPACE` (the repo root) rather than `frontend/`, which would resolve a relative path to the wrong location.

### Node 24 opt-in

`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` is set at the workflow level. `actions/setup-node@v6`, `actions/upload-artifact@v6`, `docker/setup-buildx-action@v4`, and `docker/build-push-action@v7` already bundle Node 24 natively; the env var covers any transitive action that still ships a Node 20 binary ahead of GitHub's June 2026 forced migration.

---

## 6. Acceptable metric ranges (lab — internal guidance)

Lab variance is normal. Prefer **before/after** comparisons on the same setup over single absolutes.

| Metric | Good | Needs improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| **CLS** | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| **TBT** | ≤ 200 ms | 200–600 ms | > 600 ms |
| **FCP** | ≤ 1.8 s | 1.8–3.0 s | > 3.0 s |

---

## 7. Reading reports

- **Category scores** are summaries. Use the **numeric metrics** (LCP, CLS, TBT, FCP) for decisions.
- **Opportunities / Diagnostics** in each HTML report show the highest-impact fixes.
- **Variance** — CI and local scores routinely differ, even for the same code. Key reasons:
  - **CPU speed.** Both environments use the same *simulated* 4G throttling, but Lighthouse's CPU throttling is applied as a *multiplier* on top of the host CPU. GitHub Actions runners are shared VMs with slower and more variable CPUs than a typical dev machine, so TBT and overall Performance scores are consistently lower on CI.
  - **Cold Docker build.** On CI the images are built fresh and started from scratch; locally Docker layers and filesystem caches are usually warm, making asset serving faster.
  - **Resource contention.** CI runners share host resources with other jobs. CPU spikes from unrelated processes increase main-thread blocking time and depress Performance scores.

  Because of this, treat absolute scores as environment-specific — compare **CI run vs CI run** (e.g. PR vs main) and **local run vs local run**, not one against the other.
- **Login page in report** — auth failed. Check `LHCI_AUTH_EMAIL` / `LHCI_AUTH_PASSWORD` and that the Zustand key `auth-storage` (`src/lib/authStore.ts`) is being set by the Puppeteer login script.

---

## 8. Prioritising optimisation work

1. **Impact first** — home, spreadsheet, and project/task flows matter most.
2. **Big gaps** — large Performance drops (LCP, TBT) before minor SEO tweaks.
3. **Opportunities** — render-blocking resources, unused JS, image sizing, long tasks.
4. **Consistency** — if one URL regresses, compare others on the same build before blaming a single change.
5. **Field validation** — after lab wins, validate with RUM / CrUX in production.

---

## 9. Common fixes

| Theme | Actions |
|-------|---------|
| **LCP** | Prioritise the LCP image (`fetchpriority="high"`), correct dimensions/format, reduce TTFB, avoid blocking above-the-fold JS. |
| **CLS** | Reserve space for images, fonts, and embeds; avoid late layout inserts without reserved space. |
| **TBT / long tasks** | Code-splitting, defer non-critical JS, audit third-party scripts. |
| **Accessibility** | Fix contrast, add labels, ensure keyboard focus order, correct ARIA usage. |
| **Best practices** | HTTPS, no console errors, correct image aspect ratios, no vulnerable libraries. |

---

## See also

- [`lighthouserc.js`](./lighthouserc.js) — URL list, thresholds, Puppeteer script, output config
- [`scripts/lhci-run.cjs`](./scripts/lhci-run.cjs) — orchestration entry point
- [`scripts/lhci-seed-spreadsheet-task.cjs`](./scripts/lhci-seed-spreadsheet-task.cjs) — API seed for spreadsheet + asset task
