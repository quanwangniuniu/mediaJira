/**
 * After `lhci autorun`, reads `.lighthouseci/manifest.json` and writes the **dashboard** HTML
 * — one page listing every audited URL with category scores and links to each full Lighthouse report.
 *
 * Default dashboard filename: **`report-dashboard.html`** (or **`report-<prefix>-dashboard.html`** when
 * `LHCI_REPORT_PREFIX` is set). Override with **`LHCI_DASHBOARD_FILENAME`** (with or without `.html`).
 * Unless **`LHCI_DASHBOARD_WRITE_INDEX=0`**, the same content is also written to **`index.html`** for
 * compatibility with tools that expect that path.
 *
 * Each run also copies the canonical report files to **readable names**: `report-<slug>.html` (and
 * `report-<slug>.json`) in the same folder, derived from the audited URL (e.g. `report-home.html`,
 * `report-spreadsheet.html`, `report-tasks-project-22.html`). The dashboard links to these files.
 *
 * Optional env:
 * - `LHCI_REPORT_PREFIX` — prepended to each report basename and to the default dashboard name
 * - `LHCI_DASHBOARD_FILENAME` — full dashboard basename (e.g. `lighthouse-summary` → `lighthouse-summary.html`)
 * - `LHCI_DASHBOARD_WRITE_INDEX=0` — do not write `index.html`
 * - `LHCI_CLEANUP_LHR=1` — delete intermediate `lhr-*.html` / `lhr-*.json` in `.lighthouseci/` (not referenced by manifest)
 *
 * Lighthouse does not support merging multiple URLs into a single native Lighthouse report; this is the usual workaround.
 */
const fs = require('fs');
const path = require('path');

// Resolve from this script's own directory (scripts/ → parent = frontend/).
// Using process.cwd() was fragile: if the Node process inherits a cwd other
// than frontend/ (e.g. the repo root), the manifest would not be found.
const outDir = path.join(__dirname, '..', '.lighthouseci');
const manifestPath = path.join(outDir, 'manifest.json');

/**
 * @param {string} prefix — sanitized prefix or empty
 * @returns {string} absolute path to dashboard HTML
 */
function resolveDashboardPath(prefix) {
  const custom = process.env.LHCI_DASHBOARD_FILENAME;
  if (custom) {
    const base = path.basename(String(custom).trim()).replace(/\.html$/i, '');
    const safe = base.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'dashboard';
    return path.join(outDir, `${safe}.html`);
  }
  const base = prefix ? `report-${prefix}-dashboard` : 'report-dashboard';
  return path.join(outDir, `${base}.html`);
}

/**
 * @param {string} urlStr
 * @returns {string} filesystem-safe slug
 */
function urlToReportSlug(urlStr) {
  const u = new URL(urlStr);
  const pathname = u.pathname.replace(/\/$/, '') || '/';

  if (pathname === '/') {
    return 'home';
  }

  let slug = pathname.replace(/^\//, '').replace(/\//g, '-');

  const projectId = u.searchParams.get('project_id');
  if (projectId) {
    slug += `-project-${projectId}`;
  }

  const view = u.searchParams.get('view');
  if (view && slug.includes('tasks')) {
    slug += `-view-${view}`;
  }

  slug = slug
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return slug || 'page';
}

/**
 * @param {string} slug
 * @param {Set<string>} used
 */
function uniqueSlug(slug, used) {
  let s = slug;
  let n = 2;
  while (used.has(s)) {
    s = `${slug}-${n}`;
    n += 1;
  }
  used.add(s);
  return s;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function pct(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return `${Math.round(score * 100)}`;
}

function cleanupIntermediateLhr() {
  if (process.env.LHCI_CLEANUP_LHR !== '1') {
    return;
  }
  let n = 0;
  try {
    const names = fs.readdirSync(outDir);
    for (const name of names) {
      if (/^lhr-\d+\.(html|json)$/.test(name)) {
        fs.unlinkSync(path.join(outDir, name));
        n += 1;
      }
    }
    if (n > 0) {
      process.stderr.write(`lhci-build-dashboard: removed ${n} intermediate lhr-* file(s)\n`);
    }
  } catch (err) {
    process.stderr.write(`lhci-build-dashboard: cleanup skipped (${err && err.message})\n`);
  }
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`lhci-build-dashboard: no ${manifestPath} (run lhci autorun first).\n`);
    process.exit(0);
  }

  /** @type {Array<{ url: string, isRepresentativeRun: boolean, htmlPath: string, jsonPath?: string, summary: Record<string, number> }>} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    process.stderr.write(`lhci-build-dashboard: invalid JSON in ${manifestPath}\n`);
    process.exit(1);
  }

  const prefix = process.env.LHCI_REPORT_PREFIX
    ? String(process.env.LHCI_REPORT_PREFIX).replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';

  const usedSlugs = new Set();
  const rows = manifest
    .filter((e) => e.isRepresentativeRun)
    .map((e) => {
      const baseSlug = urlToReportSlug(e.url);
      const slug = uniqueSlug(baseSlug, usedSlugs);
      const baseName = prefix ? `report-${prefix}-${slug}` : `report-${slug}`;
      const htmlDest = path.join(outDir, `${baseName}.html`);
      const jsonDest = path.join(outDir, `${baseName}.json`);

      try {
        if (e.htmlPath && fs.existsSync(e.htmlPath)) {
          fs.copyFileSync(e.htmlPath, htmlDest);
        }
        if (e.jsonPath && fs.existsSync(e.jsonPath)) {
          fs.copyFileSync(e.jsonPath, jsonDest);
        }
      } catch (err) {
        process.stderr.write(`lhci-build-dashboard: copy failed for ${e.url}: ${err && err.message}\n`);
      }

      const href = path.relative(outDir, htmlDest).split(path.sep).join('/');
      const sum = e.summary || {};
      return {
        url: e.url,
        href,
        reportFile: `${baseName}.html`,
        sum,
      };
    });

  cleanupIntermediateLhr();

  const dashboardPath = resolveDashboardPath(prefix);
  const dashboardBasename = path.basename(dashboardPath);

  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lighthouse CI — run summary</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #1a1a1a; }
    h1 { font-size: 1.25rem; }
    table { border-collapse: collapse; width: 100%; max-width: 56rem; margin-top: 1rem; font-size: 0.875rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f5f5f5; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    a { color: #1a73e8; }
    .hint { color: #5f6368; font-size: 0.8125rem; margin-top: 1rem; }
    code { font-size: 0.8125rem; background: #f5f5f5; padding: 0.1rem 0.35rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Lighthouse CI — audited URLs</h1>
  <p class="hint">Open an individual report for full audits and opportunities. Scores are 0–100. This summary: <code>${esc(dashboardBasename)}</code>. Per-URL copies: <code>report-*.html</code> in this folder.</p>
  <table>
    <thead>
      <tr>
        <th>URL</th>
        <th class="num">Perf</th>
        <th class="num">A11y</th>
        <th class="num">Best practices</th>
        <th class="num">SEO</th>
        <th>Report</th>
      </tr>
    </thead>
    <tbody>
${rows
  .map(
    (r) => `      <tr>
        <td>${esc(r.url)}</td>
        <td class="num">${pct(r.sum.performance)}</td>
        <td class="num">${pct(r.sum.accessibility)}</td>
        <td class="num">${pct(r.sum['best-practices'])}</td>
        <td class="num">${pct(r.sum.seo)}</td>
        <td><a href="${esc(r.href)}">${esc(r.reportFile)}</a></td>
      </tr>`
  )
  .join('\n')}
    </tbody>
  </table>
</body>
</html>
`;

  fs.writeFileSync(dashboardPath, body, 'utf8');
  process.stdout.write(`lhci-build-dashboard: wrote ${dashboardPath} (${rows.length} report link(s))\n`);

  if (process.env.LHCI_DASHBOARD_WRITE_INDEX !== '0') {
    const indexPath = path.join(outDir, 'index.html');
    fs.writeFileSync(indexPath, body, 'utf8');
    process.stdout.write(`lhci-build-dashboard: mirrored ${indexPath}\n`);
  }
}

main();
