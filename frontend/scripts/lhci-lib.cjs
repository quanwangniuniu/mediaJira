/**
 * Shared Lighthouse CI helpers — single module for HTTP (auth + projects).
 *
 * - Used by `lhci-ensure-project.cjs` (orchestration before `lhci autorun`).
 * - Used by `lhci-puppeteer-login.cjs` for env + base URL only (`getBaseUrl`, `getCredentials`).
 *
 * Base URL: `LHCI_API_BASE` or `LHCI_BASE_URL` (default `http://localhost`) — keep in sync with `lighthouserc.js` `base`.
 */
const DEFAULT_BASE = 'http://localhost';

function getBaseUrl() {
  const raw = process.env.LHCI_API_BASE || process.env.LHCI_BASE_URL || DEFAULT_BASE;
  return raw.replace(/\/$/, '');
}

/**
 * Align with RegisterView: local part of email, `.` → `_`, max 20 chars.
 * @param {string} email
 */
function buildUsernameFromEmail(email) {
  const local = email.split('@')[0] || '';
  const base = local.replace(/\./g, '_').slice(0, 20) || 'lhci';
  return base;
}

/**
 * POST /auth/register/ — idempotent for CI: succeeds if email is already registered.
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 */
async function registerUserIfNotExists(baseUrl, email, password) {
  const username = buildUsernameFromEmail(email);
  const res = await fetch(`${baseUrl}/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password, username }),
  });

  if (res.status === 201) {
    return;
  }

  const text = await res.text();
  /** @type {{ error?: string } | null} */
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const errMsg = (data && data.error) || text || '';
  if (
    res.status === 400 &&
    (String(errMsg).includes('already registered') || String(errMsg).includes('Email already'))
  ) {
    return;
  }

  throw new Error(`LHCI register failed ${res.status}: ${text.slice(0, 500)}`);
}

/** @returns {{ email: string, password: string } | null} */
function getCredentials() {
  const email = process.env.LHCI_AUTH_EMAIL;
  const password = process.env.LHCI_AUTH_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

/**
 * POST /auth/login/ — same contract as frontend authAPI.login.
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} JWT access token
 */
async function loginWithApi(baseUrl, email, password) {
  const res = await fetch(`${baseUrl}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LHCI login failed ${res.status}: ${text.slice(0, 500)}`);
  }

  /** @type {{ token?: string }} */
  const data = await res.json();
  if (!data.token) {
    throw new Error('LHCI login response missing token');
  }
  return data.token;
}

/**
 * POST /api/core/projects/ body — aligned with backend/core/tests/test_projects.py (ProjectSerializer).
 * @param {string} name
 */
function buildProjectCreateBody(name) {
  return {
    name,
    description: 'Created by Lighthouse CI (lhci-ensure-project.cjs)',
    objectives: ['awareness'],
    kpis: { ctr: { target: 0.02 } },
  };
}

/**
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} projectName
 * @returns {Promise<{ id: number } | null>}
 */
async function findProjectByName(baseUrl, token, projectName) {
  let nextUrl = `${baseUrl}/api/core/projects/`;
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LHCI list projects failed ${res.status}: ${text.slice(0, 500)}`);
    }
    /** @type {{ results?: Array<{ id: number; name: string }>; next?: string | null }} */
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data.results || [];
    const found = rows.find((p) => p.name === projectName);
    if (found) {
      return found;
    }
    nextUrl = data.next || null;
  }
  return null;
}

/**
 * @param {string} baseUrl
 * @param {string} token
 * @param {string} projectName
 * @returns {Promise<{ id: number }>}
 */
async function createProject(baseUrl, token, projectName) {
  const createRes = await fetch(`${baseUrl}/api/core/projects/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildProjectCreateBody(projectName)),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`LHCI create project failed ${createRes.status}: ${text.slice(0, 800)}`);
  }

  return createRes.json();
}

module.exports = {
  DEFAULT_BASE,
  getBaseUrl,
  getCredentials,
  buildUsernameFromEmail,
  registerUserIfNotExists,
  loginWithApi,
  buildProjectCreateBody,
  findProjectByName,
  createProject,
};
