import { test, expect } from '@playwright/test';

test('la app arranca y muestra el título CUMPEO', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.font-display-hero').first()).toContainText('CUMPEO');
  await expect(page.getByText('H6.1 · OK')).toBeVisible();
});

test('el tema se resuelve a light o dark', async ({ page }) => {
  await page.goto('/');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(theme);
});

test('los servicios quedan expuestos en window.cumpeo', async ({ page }) => {
  await page.goto('/');
  const cumpeo = await page.evaluate(() => ({
    hasAdapter: !!window.cumpeo?.adapter,
    hasSession: !!window.cumpeo?.session,
    hasServices: !!window.cumpeo?.services,
    hasRegistry: !!window.cumpeo?.registry,
    juegosRegistrados: window.cumpeo?.registry?.listarCodigos() || []
  }));
  expect(cumpeo.hasAdapter).toBe(true);
  expect(cumpeo.hasSession).toBe(true);
  expect(cumpeo.hasServices).toBe(true);
  expect(cumpeo.hasRegistry).toBe(true);
  expect(cumpeo.juegosRegistrados).toContain('TRIVIA');
});
