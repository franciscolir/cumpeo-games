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

test('editor de items no aparece si el set no es de ¿Qué piensa el público?', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: `NoQPEP ${Date.now().toString(36)}` });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await waitForCumpeo(page);
  await page.locator(`li:has-text("NoQPEP") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);

  await expect(page.locator('#editor-items-section')).toHaveCount(0);
  await expect(page.getByText('Este juego aún no tiene editor de items.')).toBeVisible();
});

test('editor aparece en set de ¿Qué piensa el público?', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const qpepId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO')?.id;
  });

  const uid = Date.now().toString(36);
  await crearSetViaAPI(page, { juegoId: qpepId, nombre: `QPEP ${uid}` });
  await page.goto(`/#/sets?juego=${qpepId}`);
  await waitForCumpeo(page);
  await page.locator(`li:has-text("${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);

  await expect(page.locator('#editor-items-section')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#lista-items-preguntas')).toBeVisible();
  await expect(page.locator('#item-pregunta')).toBeVisible();
});

test('agregar pregunta', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const qpepId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO')?.id;
  });

  const uid = Date.now().toString(36);
  await crearSetViaAPI(page, { juegoId: qpepId, nombre: `AddP ${uid}` });
  await page.goto(`/#/sets?juego=${qpepId}`);
  await waitForCumpeo(page);
  await page.locator(`li:has-text("AddP ${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);

  await page.fill('#item-pregunta', '¿Pizza o empanadas?');
  await page.fill('#item-opcion-a', 'Pizza');
  await page.fill('#item-opcion-b', 'Empanadas');
  await page.click('#btn-guardar-item');

  await expect(page.getByText('¿Pizza o empanadas?')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('A: Pizza | B: Empanadas')).toBeVisible();
});

test('editar pregunta', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const qpepId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO')?.id;
  });

  const uid = Date.now().toString(36);
  await crearSetViaAPI(page, { juegoId: qpepId, nombre: `EditP ${uid}` });
  await page.goto(`/#/sets?juego=${qpepId}`);
  await waitForCumpeo(page);
  await page.locator(`li:has-text("EditP ${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);

  await page.fill('#item-pregunta', '¿Fernet o fernu?');
  await page.fill('#item-opcion-a', 'Fernet');
  await page.fill('#item-opcion-b', 'Fernu');
  await page.click('#btn-guardar-item');
  await expect(page.getByText('¿Fernet o fernu?')).toBeVisible({ timeout: 10000 });

  await page.locator('[data-accion="editar"]').first().click();
  await expect(page.locator('#form-item-titulo')).toHaveText('Editar pregunta');
  await expect(page.locator('#btn-cancelar-edicion')).toBeVisible();

  await page.fill('#item-pregunta', '¿Cerveza o vino?');
  await page.click('#btn-guardar-item');

  await expect(page.getByText('¿Cerveza o vino?')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('¿Fernet o fernu?')).not.toBeVisible();
});

test('eliminar pregunta', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const qpepId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO')?.id;
  });

  const uid = Date.now().toString(36);
  await crearSetViaAPI(page, { juegoId: qpepId, nombre: `DelP ${uid}` });
  await page.goto(`/#/sets?juego=${qpepId}`);
  await waitForCumpeo(page);
  await page.locator(`li:has-text("DelP ${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/sets\/.+/);
  await waitForCumpeo(page);

  await page.fill('#item-pregunta', 'Borrar esta');
  await page.fill('#item-opcion-a', 'Si');
  await page.fill('#item-opcion-b', 'No');
  await page.click('#btn-guardar-item');
  await expect(page.getByText('Borrar esta')).toBeVisible({ timeout: 10000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('[data-accion="eliminar"]').first().click();
  await expect(page.getByText('Borrar esta')).not.toBeVisible({ timeout: 10000 });
});
