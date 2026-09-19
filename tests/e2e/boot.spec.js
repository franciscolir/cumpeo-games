import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

test('la app arranca y muestra el dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.font-display-hero').first()).toContainText('CUMPEO');
  await expect(page.getByText('Panel del conductor')).toBeVisible();
  await expect(page.getByText(/Circuitos \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/Juegos disponibles \(\d+\)/)).toBeVisible();
});

test('el dashboard muestra la sesión', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Sesión:/)).toBeVisible();
});

test('el dashboard muestra TRIVIA como juego registrado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Trivia')).toBeVisible();
});

test('el tema se resuelve a light o dark', async ({ page }) => {
  await page.goto('/');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(theme);
});

test('el botón de tema cambia el tema', async ({ page }) => {
  await page.goto('/');
  const themeAntes = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('#toggle-theme');
  const themeDespues = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(themeDespues).not.toBe(themeAntes);
});

test('los servicios quedan expuestos en window.cumpeo', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
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

test('los juegos están seedeados en la DB', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const juegos = await page.evaluate(async () => {
    return await window.cumpeo.services.juego.listarJuegos();
  });
  expect(juegos.length).toBeGreaterThanOrEqual(1);
  expect(juegos.some((j) => j.codigo === 'TRIVIA')).toBe(true);
  const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
  expect(trivia.id).not.toBe('TRIVIA');
  expect(trivia.id.length).toBeGreaterThan(20);
});

test('el dashboard muestra la card de partidas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Partidas', { exact: true }).first()).toBeVisible();
});
