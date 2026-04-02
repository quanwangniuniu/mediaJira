# Lighthouse — MediaJira internal guide

Lab-based performance and quality audits for the **Next.js** app. This doc covers **what we audit**, **where outputs live**, **targets**, **how to run and read results**, and **what to fix first**.

**Prerequisites:** **Node 18.x** (align with CI); Chrome/Chromium for Lighthouse.

---

## 1. Audit approach

### What we measure

- **Lighthouse CI (LHCI)** runs **desktop** audits (`preset: "desktop"` in [`lighthouserc.js`](./lighthouserc.js)): ~1350×940 viewport, simulated dense 4G. Scores are **lab** only (not CrUX / field data).
- **Category gates** are defined in [`lighthouserc.js`](./lighthouserc.js) under `ci.assert.assertions` — currently **`warn`** severity so sub-threshold scores **do not fail** the job but should be reviewed. Open that file for exact **minScore** values.

### Key pages (URL list)

| Area | Path | Notes |
|------|------|--------|
| Home | `/` | Entry shell |
| Spreadsheet | `/spreadsheet` | Heavy client surface |
| Projects | `/projects` | List / navigation |
| Decisions | `/decisions` | List |
| Project spreadsheets | `/projects/{id}/spreadsheets` | Only if `LHCI_TEST_PROJECT_ID` is set |
| Tasks | `/tasks?view=list&project_id={id}` | Only if `LHCI_TEST_PROJECT_ID` is set |

To change the list, edit **`url`** / **`base`** in [`lighthouserc.js`](./lighthouserc.js). **`http://localhost`** implies port **80**.

### Environment setup

| Topic | Requirement |
|--------|-------------|
| **Local stack** | App at **`http://localhost`** (port **80**). LHCI does **not** start Next.js — use Docker Compose (**80:80**) or a reverse proxy. |
| **Auth (optional)** | `LHCI_AUTH_EMAIL`, `LHCI_AUTH_PASSWORD` — API register/login + Puppeteer `/login` → `auth-storage`. See [`scripts/lhci-ensure-project.cjs`](./scripts/lhci-ensure-project.cjs), [`scripts/lhci-puppeteer-login.cjs`](./scripts/lhci-puppeteer-login.cjs). |
| **Project URLs** | `lhci-ensure-project` sets `LHCI_TEST_PROJECT_ID`, or set it manually. Default project name: **`LHCI Test Project`** (`LHCI_PROJECT_NAME`). |
| **Other env** | `LHCI_API_BASE` / `LHCI_BASE_URL` if not `http://localhost`. `lhci-env.cjs` merges repo **`.env`** and **`frontend/.env`** (shell wins). |

---

## 2. Where reports are and what they contain

After **`npm run lighthouse:local`** from **`frontend/`**, outputs live under **`frontend/.lighthouseci/`** (gitignored):

| Output | Purpose |
|--------|---------|
| **`report-dashboard.html`** | Index of all audited URLs + category scores. Mirrored as **`index.html`** unless `LHCI_DASHBOARD_WRITE_INDEX=0`. |
| **`report-<slug>.html`** | Readable per-URL HTML (e.g. `report-home.html`). |
| **`manifest.json`** | Run list for tooling. |
| Per-URL **`.html` / `.json`** | Full Lighthouse report + LHR JSON. |

Each artifact is a **lab snapshot** (throttling + desktop profile). Use for **regressions and opportunities**, not as a guarantee of real-user metrics.

---

## 3. Acceptable ranges (core metrics — lab)

Internal guidance only; lab variance is normal. Prefer **before/after** on the same setup.

| Metric | Good | Needs improvement | Poor | Notes |
|--------|------|-------------------|------|--------|
| **LCP** | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s | Largest Contentful Paint |
| **CLS** | ≤ 0.1 | 0.1–0.25 | > 0.25 | Cumulative Layout Shift |
| **TBT** | ≤ 200 ms | 200–600 ms | > 600 ms | Total Blocking Time (main thread) |
| **FCP** | ≤ 1.8 s | 1.8–3.0 s | > 3.0 s | First Contentful Paint |

---

## 4. How to prioritize optimization work

1. **Impact** — Fix routes that matter most (home, spreadsheet, project/task flows).
2. **Big gaps** — Large drops in **Performance** (LCP, TBT) and **Accessibility** before minor SEO tweaks.
3. **Opportunities** — In each HTML report, use **Opportunities** / **Diagnostics** (render-blocking, unused JS, images, long tasks).
4. **Consistency** — If one URL regresses, compare others on the same build before blaming one change.
5. **Field data** — After lab wins, validate with **RUM / CrUX** in production when available.

---

## 5. How to run audits

### Local

```bash
# Repo: stack on http://localhost:80, then:
cd frontend
npm ci
export LHCI_AUTH_EMAIL="..."    # optional
export LHCI_AUTH_PASSWORD="..."
npm run lighthouse:local
```

Open **`frontend/.lighthouseci/report-dashboard.html`**.

**Direct CLI** (skips ensure + dashboard): `npx lhci autorun` then optionally `node scripts/lhci-build-dashboard.cjs`.

**Host-only:** If Next listens on **80**, same URLs apply; otherwise change **`base`** in [`lighthouserc.js`](./lighthouserc.js) (e.g. `http://localhost:3000`).

### GitHub Actions

- Workflow: [`.github/workflows/lighthouse-ci.yml`](../.github/workflows/lighthouse-ci.yml) — **push/PR** to **`lighthouse-ci-test`** (see file for changes).
- Secrets: **`LHCI_AUTH_EMAIL`**, **`LHCI_AUTH_PASSWORD`** (repo **Settings → Secrets and variables → Actions**).
- Artifact: **`lighthouse-reports-<sha>`** — extract and open **`report-dashboard.html`**.
- **Fork PRs** usually have no secrets; authenticated runs may fail.

---

## 6. How to interpret reports

- **Category scores** — Summaries; use **numeric metrics** (LCP s, CLS, TBT ms) for decisions.
- **Trace / filmstrip** — Main-thread work and load sequence.
- **Variance** — CI vs local differ; compare **trends** and **PR vs main**, not single absolutes.
- **Login page in report** — Auth failed (`auth-storage` / env). **Zustand** key: **`auth-storage`** ([`src/lib/authStore.ts`](./src/lib/authStore.ts)).

---

## 7. Common remediation strategies

| Theme | Actions |
|-------|---------|
| **LCP** | LCP image priority, dimensions, formats; TTFB/server path; avoid blocking above-the-fold JS. |
| **CLS** | Reserve space for media/fonts/embeds; avoid late layout inserts without reserved space. |
| **TBT / long tasks** | Code-splitting, defer non-critical JS, review third parties. |
| **Accessibility** | Contrast, labels, focus, ARIA — fix listed audits in order. |
| **Best practices** | Per report (HTTPS, errors, image ratios, cookies, etc.). |

---

## 8. Quick checks without LHCI

- **Chrome DevTools → Lighthouse** on a single URL (ad-hoc; not the same URL list as CI unless you match manually).

---

## See also

- [`docs/lighthouse-auditing-integration-plan.md`](../docs/lighthouse-auditing-integration-plan.md)
- [`docs/lighthouse-integration-remaining-steps.md`](../docs/lighthouse-integration-remaining-steps.md)
