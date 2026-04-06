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
 */
const fs = require('fs');
const path = require('path');

// Resolve from this script's own directory
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

/**
 * Returns a CSS color class name based on score (0–1).
 * ≥ 0.90 → green, ≥ 0.50 → orange, < 0.50 → red.
 * @param {number | undefined} score
 * @returns {'score-good' | 'score-ok' | 'score-bad' | 'score-na'}
 */
function scoreClass(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'score-na';
  if (score >= 0.9) return 'score-good';
  if (score >= 0.5) return 'score-ok';
  return 'score-bad';
}

/**
 * Remove intermediate files left behind by `lhci collect` and `lhci upload`:
 *   - `lhr-<timestamp>.html/.json`   (raw collect output)
 *   - `*.report.html` / `*.report.json`  (LHCI upload timestamped copies,
 *     e.g. localhost--2026_04_03_11_09_14.report.html)
 *
 * The canonical `report-<slug>.html/json` files written by this script are
 * NOT removed — they are the final output.
 */
function cleanupIntermediates() {
  let removed = 0;
  try {
    for (const name of fs.readdirSync(outDir)) {
      if (/^lhr-\d+\.(html|json)$/.test(name) || /\.report\.(html|json)$/.test(name)) {
        fs.unlinkSync(path.join(outDir, name));
        removed += 1;
      }
    }
    if (removed > 0) {
      process.stderr.write(`lhci-build-dashboard: removed ${removed} intermediate file(s)\n`);
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

  // Clean up intermediates AFTER copying canonical files above.
  cleanupIntermediates();

  const dashboardPath = resolveDashboardPath(prefix);
  const dashboardBasename = path.basename(dashboardPath);
  const runDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const tableRows = rows
    .map((r) => {
      const perfClass = scoreClass(r.sum.performance);
      const a11yClass = scoreClass(r.sum.accessibility);
      const bpClass = scoreClass(r.sum['best-practices']);
      const seoClass = scoreClass(r.sum.seo);
      return `      <tr>
        <td class="url-cell"><a href="${esc(r.href)}" title="Open full Lighthouse report">${esc(r.url)}</a></td>
        <td class="num ${perfClass}">${pct(r.sum.performance)}</td>
        <td class="num ${a11yClass}">${pct(r.sum.accessibility)}</td>
        <td class="num ${bpClass}">${pct(r.sum['best-practices'])}</td>
        <td class="num ${seoClass}">${pct(r.sum.seo)}</td>
      </tr>`;
    })
    .join('\n');

  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lighthouse CI — Run Summary</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 1.5rem 2rem 3rem;
      color: #1a1a1a;
      background: #f8f9fa;
    }
    header { margin-bottom: 1.5rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.25rem; }
    .meta { color: #5f6368; font-size: 0.8125rem; }
    .meta code {
      background: #e8eaed;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      font-size: 0.8rem;
    }

    /* ── scores table ── */
    .card {
      background: #fff;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    table { border-collapse: collapse; width: 100%; font-size: 0.875rem; table-layout: fixed; }
    th, td { padding: 0.5rem 0.75rem; vertical-align: top; }
    th.url-col, td.url-cell { text-align: left; min-width: 0; }
    col.col-url { width: auto; }
    col.col-score { width: 4.25rem; }
    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
    thead tr { border-bottom: 2px solid #dadce0; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child { border-bottom: none; }
    th { font-weight: 600; color: #444; white-space: nowrap; }
    td.num { font-weight: 600; }
    td.url-cell a { color: #1a73e8; text-decoration: none; font-size: 0.8125rem; word-break: break-all; }
    td.url-cell a:hover { text-decoration: underline; }

    /* score colours: green / amber / red */
    .score-good { color: #137333; }
    .score-ok   { color: #b45309; }
    .score-bad  { color: #c5221f; }
    .score-na   { color: #777; }

    /* ── legend cards ── */
    .legend-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .legend-card {
      background: #fff;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .legend-card .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      margin-bottom: 0.5rem;
    }
    .badge-perf { background: #e6f4ea; color: #137333; }
    .badge-a11y { background: #e8f0fe; color: #1a73e8; }
    .badge-bp   { background: #fce8e6; color: #c5221f; }
    .badge-seo  { background: #fef7e0; color: #b45309; }
    .legend-card h3 { font-size: 0.9375rem; margin: 0 0 0.4rem; }
    .legend-card p  { font-size: 0.8125rem; color: #444; margin: 0 0 0.5rem; line-height: 1.5; }
    .legend-card ul { font-size: 0.8125rem; color: #555; margin: 0; padding-left: 1.1rem; line-height: 1.6; }

    /* ── colour scale legend ── */
    .scale { display: flex; gap: 1.25rem; font-size: 0.8125rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .scale span { display: flex; align-items: center; gap: 0.3rem; }
    .dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block;
    }
    .dot-good { background: #137333; }
    .dot-ok   { background: #b45309; }
    .dot-bad  { background: #c5221f; }
  </style>
</head>
<body>
  <header>
    <h1>Lighthouse CI — Run Summary</h1>
    <p class="meta">Generated <strong>${esc(runDate)}</strong> &nbsp;·&nbsp;
      Dashboard: <code>${esc(dashboardBasename)}</code> &nbsp;·&nbsp;
      Per-URL reports: <code>report-*.html</code></p>
  </header>

  <!-- ── score table ── -->
  <div class="card">
    <h2>Scores by URL</h2>
    <table>
      <colgroup>
        <col class="col-url" />
        <col class="col-score" />
        <col class="col-score" />
        <col class="col-score" />
        <col class="col-score" />
      </colgroup>
      <thead>
        <tr>
          <th class="url-col" scope="col">URL</th>
          <th class="num" scope="col" title="Performance">Perf</th>
          <th class="num" scope="col" title="Accessibility">A11y</th>
          <th class="num" scope="col" title="Best Practices">BP</th>
          <th class="num" scope="col" title="SEO">SEO</th>
        </tr>
      </thead>
      <tbody>
${tableRows}
      </tbody>
    </table>
    <div class="scale" style="margin-top:0.75rem">
      <span><span class="dot dot-good"></span> 90–100 &nbsp;Good</span>
      <span><span class="dot dot-ok"></span> 50–89 &nbsp;Needs improvement</span>
      <span><span class="dot dot-bad"></span> 0–49 &nbsp;Poor</span>
    </div>
  </div>

  <!-- ── category legend ── -->
  <div class="card">
    <h2>What each category measures</h2>
    <div class="legend-grid">

      <div class="legend-card">
        <div class="badge badge-perf">Perf — Performance</div>
        <h3>How fast does the page load?</h3>
        <p>Measures page speed and perceived responsiveness from a user's perspective using lab metrics such as:</p>
        <ul>
          <li><strong>FCP</strong> — First Contentful Paint (first visible content)</li>
          <li><strong>LCP</strong> — Largest Contentful Paint (main content loaded)</li>
          <li><strong>TBT</strong> — Total Blocking Time (JavaScript blocking the main thread)</li>
          <li><strong>CLS</strong> — Cumulative Layout Shift (unexpected visual jumps)</li>
          <li><strong>Speed Index</strong> — how quickly content is visually populated</li>
        </ul>
      </div>

      <div class="legend-card">
        <div class="badge badge-a11y">A11y — Accessibility</div>
        <h3>Can everyone use this page?</h3>
        <p>Checks whether the page is usable by people with disabilities or who rely on assistive technology:</p>
        <ul>
          <li>Sufficient colour contrast between text and background</li>
          <li>All images have descriptive <code>alt</code> text</li>
          <li>Interactive elements are reachable by keyboard</li>
          <li>ARIA roles and labels are used correctly</li>
          <li>Form fields have associated <code>&lt;label&gt;</code> elements</li>
        </ul>
      </div>

      <div class="legend-card">
        <div class="badge badge-bp">BP — Best Practices</div>
        <h3>Is the page built to modern standards?</h3>
        <p>Audits general web-health practices and security hygiene:</p>
        <ul>
          <li>Page served over HTTPS</li>
          <li>No deprecated or unsafe browser APIs used</li>
          <li>Images displayed at the correct aspect ratio</li>
          <li>No browser errors logged to the console</li>
          <li>Uses an appropriate HTTP/2 or HTTP/3 protocol</li>
          <li>No vulnerable JavaScript libraries detected</li>
        </ul>
      </div>

      <div class="legend-card">
        <div class="badge badge-seo">SEO — Search Engine Optimisation</div>
        <h3>Is the page discoverable by search engines?</h3>
        <p>Checks that search engine crawlers can read and index the page correctly:</p>
        <ul>
          <li>Page has a descriptive <code>&lt;title&gt;</code> and <code>meta description</code></li>
          <li>Not blocked by <code>robots.txt</code> or <code>noindex</code></li>
          <li>Links have descriptive anchor text (not "click here")</li>
          <li>Text is legible (font size ≥ 12 px)</li>
          <li>Tap targets are large enough on mobile</li>
          <li>Structured data (<code>schema.org</code>) is valid where present</li>
        </ul>
      </div>

    </div>
  </div>

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
