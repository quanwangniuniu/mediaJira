/**
 * Load `.env` into `process.env` for Lighthouse helper scripts — no dotenv package.
 * - Files are merged in order; later files override earlier ones for the same key.
 * - Only applies a key if `process.env[key]` is still undefined (shell / CI wins).
 * - Paths: optional LHCI_ENV_FILE, repo root `.env`, `frontend/.env`.
 */
const fs = require('fs');
const path = require('path');

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  } else {
    const hash = val.indexOf(' #');
    if (hash !== -1) val = val.slice(0, hash).trim();
  }
  return { key, val };
}

function parseFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) out[parsed.key] = parsed.val;
  }
  return out;
}

function loadLhciEnv() {
  const paths = [];
  if (process.env.LHCI_ENV_FILE) {
    const p = process.env.LHCI_ENV_FILE;
    paths.push(path.isAbsolute(p) ? p : path.join(process.cwd(), p));
  }
  paths.push(path.join(__dirname, '..', '..', '.env'));
  paths.push(path.join(__dirname, '..', '.env'));

  const seen = new Set();
  /** @type {Record<string, string>} */
  const merged = {};
  for (const p of paths) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    Object.assign(merged, parseFile(resolved));
  }

  let n = 0;
  for (const [key, val] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = val;
      n += 1;
    }
  }
  if (n > 0 && process.env.LHCI_VERBOSE === '1') {
    process.stderr.write(`lhci-env: applied ${n} env var(s) from .env (shell/CI overrides preserved)\n`);
  }
}

module.exports = { loadLhciEnv };
