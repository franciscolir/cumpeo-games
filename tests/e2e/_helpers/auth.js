/* =============================================================
   E2E Auth Helper — login programático para tests e2e.
   ============================================================= */

const TEST_USER_EMAIL = 'test@cumpeo.local';
const TEST_USER_PASSWORD = 'test-cumpeo-2026-securetest-cumpeo-2026-secure';

/**
 * Espera a que window.cumpeo esté disponible.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForCumpeo(page) {
  await page.waitForFunction(() => window.cumpeo?.services, { timeout: 15000 });
}

/**
 * Hace login como test user antes de cada test.
 * 1. Navega a /
 * 2. Si no hay sesión, usa signInWithPassword via Supabase client
 * 3. Recarga para que la app boote con sesión activa
 * 4. Espera a window.cumpeo
 *
 * Compatible con test.beforeEach() — recibe el objeto fixtures de Playwright.
 *
 * @param {{ page: import('@playwright/test').Page }} fixtures
 */
export async function loginTestUser({ page }) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const yaLogueado = await page.evaluate(() => !!window.cumpeo?.services);
  if (yaLogueado) return;

  await page.evaluate(async ({ email, password }) => {
    const { loginConPassword } = await import('/src/app/auth.js');
    const result = await loginConPassword(email, password);
    if (!result.ok) throw new Error(`Login failed: ${result.error}`);
  }, { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD });

  await page.reload();
  await waitForCumpeo(page);
}
