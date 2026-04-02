/**
 * Lighthouse CI entry: register user if needed → login → find/create test project → lhci autorun → dashboard.
 * @see ../lighthouserc.js
 */
require('./lhci-env.cjs').loadLhciEnv();

const path = require('path');
const { spawnSync } = require('child_process');
const { ensureProject } = require('./lhci-ensure-project.cjs');

const cwd = path.join(__dirname, '..');

async function main() {
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
