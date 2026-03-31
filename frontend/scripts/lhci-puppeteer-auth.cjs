/**
 * Lighthouse CI puppeteerScript — logs in via /login so Zustand persist populates `auth-storage`.
 * Runs before each audited URL; login runs once per `lhci` process (same browser as Lighthouse).
 *
 * Set LHCI_AUTH_EMAIL and LHCI_AUTH_PASSWORD for authenticated audits. If either is unset, skips (public-only).
 * Optional: LHCI_BASE_URL (default http://localhost) — must match lighthouserc.js `base`.
 *
 * LHCI requires this hook so Lighthouse attaches to the same Puppeteer browser (CDP port).
 */
const base = process.env.LHCI_BASE_URL || 'http://localhost';

let sessionReady = false;

/**
 * @param {import('puppeteer').Browser} browser
 * @param {{ url: string, options: unknown }} _context
 */
module.exports = async function lhciPuppeteerAuth(browser, _context) {
  const email = process.env.LHCI_AUTH_EMAIL;
  const password = process.env.LHCI_AUTH_PASSWORD;

  if (!email || !password) {
    return;
  }

  if (sessionReady) {
    return;
  }

  const page = await browser.newPage();
  try {
    const loginUrl = `${base.replace(/\/$/, '')}/login`;
    await page.goto(loginUrl, { waitUntil: 'load', timeout: 90_000 });

    await page.waitForSelector('input[name="email"]', { visible: true, timeout: 30_000 });
    await page.waitForSelector('input[name="password"]', { visible: true, timeout: 30_000 });

    await page.$eval('input[name="email"]', (el) => {
      el.value = '';
    });
    await page.$eval('input[name="password"]', (el) => {
      el.value = '';
    });

    await page.type('input[name="email"]', email, { delay: 5 });
    await page.type('input[name="password"]', password, { delay: 5 });

    await page.click('form button[type="submit"]');

    try {
      await page.waitForFunction(
        () => {
          try {
            const raw = localStorage.getItem('auth-storage');
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return Boolean(parsed?.state?.token);
          } catch {
            return false;
          }
        },
        { timeout: 90_000 }
      );
    } catch {
      throw new Error(
        'LHCI login did not produce auth-storage (check LHCI_AUTH_EMAIL / LHCI_AUTH_PASSWORD, API reachability, and email verification).'
      );
    }

    sessionReady = true;
  } finally {
    await page.close();
  }
};
