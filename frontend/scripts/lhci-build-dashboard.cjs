/**
 * After `lhci autorun`, reads `.lighthouseci/manifest.json` and writes `.lighthouseci/index.html`
 * — one page listing every audited URL with category scores and links to each full Lighthouse HTML report.
 *
 * Lighthouse does not support merging multiple URLs into a single native Lighthouse report; this is the usual workaround.
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(process.cwd(), '.lighthouseci', 'manifest.json');
const outPath = path.join(process.cwd(), '.lighthouseci', 'index.html');

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

function main() {
  if (!fs.existsSync(manifestPath)) {
    process.stderr.write(`lhci-build-dashboard: no ${manifestPath} (run lhci autorun first).\n`);
    process.exit(0);
  }

  /** @type {Array<{ url: string, isRepresentativeRun: boolean, htmlPath: string, summary: Record<string, number> }>} */
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    process.stderr.write(`lhci-build-dashboard: invalid JSON in ${manifestPath}\n`);
    process.exit(1);
  }

  const rows = manifest
    .filter((e) => e.isRepresentativeRun)
    .map((e) => {
      const dir = path.dirname(outPath);
      const href = path.relative(dir, e.htmlPath).split(path.sep).join('/');
      const sum = e.summary || {};
      return { url: e.url, href, sum };
    });

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
  </style>
</head>
<body>
  <h1>Lighthouse CI — audited URLs</h1>
  <p class="hint">Open an individual report for full audits and opportunities. Scores are 0–100.</p>
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
        <td><a href="${esc(r.href)}">Open</a></td>
      </tr>`
  )
  .join('\n')}
    </tbody>
  </table>
</body>
</html>
`;

  fs.writeFileSync(outPath, body, 'utf8');
  process.stdout.write(`lhci-build-dashboard: wrote ${outPath}\n`);
}

main();
