import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function crearSetViaAPI(page, { juegoId, nombre }) {
  await page.evaluate(async ({ juegoId, nombre }) => {
    await window.cumpeo.services.set.crearSet({
      juego_id: juegoId,
      nombre
    });
  }, { juegoId, nombre });
}

test('navegar de dashboard a lista de sets', async ({ page }) => {
  await page.goto('/');
  await page.click('a[href="#/sets"]');
  await expect(page.getByText('Sets', { exact: true }).first()).toBeVisible();
});

test('lista de sets sin filtro muestra mensaje', async ({ page }) => {
  await page.goto('/#/sets');
  await waitForCumpeo(page);
  await expect(page.getByText('Seleccioná un juego para ver sus sets.')).toBeVisible();
});

test('crear set', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await page.goto(`/#/sets?juego=${triviaId}`);
  await waitForCumpeo(page);
  await expect(page.locator('#filtro-juego')).toHaveValue(triviaId);
  await page.click('a[href*="#/sets/nuevo"]');
  await waitForCumpeo(page);
  await page.fill('#nombre', `Set ${uid}`);

  await Promise.all([
    page.waitForURL(/#\/sets\?juego=/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Set ${uid}`)).toBeVisible({ timeout: 10000 });
});

test('editar set', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: `Orig ${uid}` });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await waitForCumpeo(page);
  await expect(page.getByText(`Orig ${uid}`)).toBeVisible();

  await page.locator(`li:has-text("${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);
  await page.fill('#nombre', `Mod ${uid}`);

  await Promise.all([
    page.waitForURL(/#\/sets\?juego=/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Mod ${uid}`)).toBeVisible({ timeout: 10000 });
});

test('desactivar set', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: `Des ${uid}` });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await waitForCumpeo(page);
  await expect(page.getByText(`Des ${uid}`)).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator(`li:has-text("${uid}") button[data-desactivar]`).click();
  await expect(page.getByText('Inactivo')).toBeVisible({ timeout: 10000 });
});

test('eliminar set', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: `Borr ${uid}` });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await waitForCumpeo(page);
  await expect(page.getByText(`Borr ${uid}`)).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator(`li:has-text("${uid}") button[data-eliminar]`).click();
  await expect(page.getByText(`Borr ${uid}`)).not.toBeVisible({ timeout: 10000 });
});
