/**
 * Lighthouse CI entry: register user if needed → login → find/create test project → lhci autorun → dashboard.
 * @see ../lighthouserc.js
 */
require('./lhci-env.cjs').loadLhciEnv();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureProject } = require('./lhci-ensure-project.cjs');

const cwd = path.join(__dirname, '..');
// Absolute path — must match outputDir in lighthouserc.js and lhci-build-dashboard.cjs.
const outDir = path.join(__dirname, '..', '.lighthouseci');

/**
 * Wipe the output directory before every run so reports from previous runs
 * do not accumulate alongside the new ones.
 */
function clearOutputDir() {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });
  process.stderr.write(`[lhci] cleared output dir: ${outDir}\n`);
}

async function main() {
  clearOutputDir();

  try {
    await ensureProject();
  } catch (err) {
    process.stderr.write(`${err && err.message ? err.message : err}\n`);
    process.exit(1);
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r1 = spawnSync(npx, ['lhci', 'autorun'], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r1.status !== 0) {
    process.exit(r1.status ?? 1);
  }

  const dash = spawnSync(process.execPath, [path.join(__dirname, 'lhci-build-dashboard.cjs')], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(dash.status ?? 0);
}

main();
