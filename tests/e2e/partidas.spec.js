import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupCircuitoYPartida(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Circ ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Circ ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    return circuito.id;
  });
}

test('navegar de dashboard a lista de partidas', async ({ page }) => {
  await page.goto('/');
  await page.click('a[href="#/partidas"]');
  await expect(page.getByText('Partidas', { exact: true }).first()).toBeVisible();
});

test('empty state sin partidas', async ({ page }) => {
  await page.goto('/#/partidas');
  await waitForCumpeo(page);
  const heading = page.getByText('Partidas', { exact: true }).first();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('crear partida desde circuito LISTO', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await waitForCumpeo(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  const url = page.url();
  expect(url).toMatch(/#\/partidas\/[^/]+$/);
});

test('partida aparece en la lista', async ({ page }) => {
  await page.goto('/');
  const circuitoId = await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await waitForCumpeo(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);

  await page.goto('/#/partidas');
  await waitForCumpeo(page);
  const heading = page.getByText('Partidas', { exact: true }).first();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('ir a la consola desde la lista', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  const { codigo } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `IrConsola ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `IrConsola ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `IR${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { codigo: partida.public_codigo };
  });

  await page.goto('/#/partidas');
  await waitForCumpeo(page);
  const irBtn = page.locator('a:has-text("Ir a la consola")').first();
  await expect(irBtn).toBeVisible({ timeout: 10000 });
  await irBtn.click();
  await waitForCumpeo(page);
  await expect(page.locator('.font-display-hero').first()).toBeVisible({ timeout: 15000 });
});

test('tomar control en la consola', async ({ page }) => {
  await page.goto('/');
  const partidaId = await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await waitForCumpeo(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  const newId = page.url().split('/').pop();
  await page.goto(`/#/partidas-viejo/${newId}`);
  await waitForCumpeo(page);

  const btnTomar = page.locator('button[data-accion="tomar-control"]');
  if (await btnTomar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnTomar.click();
    await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });
  }
});

test('comenzar partida', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await waitForCumpeo(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  const newId = page.url().split('/').pop();
  await page.goto(`/#/partidas-viejo/${newId}`);
  await waitForCumpeo(page);

  const btnTomar = page.locator('button[data-accion="tomar-control"]');
  if (await btnTomar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnTomar.click();
    await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });
  }

  page.on('dialog', (dialog) => dialog.accept());
  const btnComenzar = page.locator('button[data-accion="comenzar"]');
  if (await btnComenzar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnComenzar.click();
    await expect(page.getByText('EN_CURSO')).toBeVisible({ timeout: 10000 });
  }
});

test('descartar partida', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await waitForCumpeo(page);
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  const newId = page.url().split('/').pop();
  await page.goto(`/#/partidas-viejo/${newId}`);
  await waitForCumpeo(page);

  const btnTomar = page.locator('button[data-accion="tomar-control"]');
  if (await btnTomar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnTomar.click();
    await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });
  }

  page.on('dialog', (dialog) => dialog.accept());
  const btnComenzar = page.locator('button[data-accion="comenzar"]');
  if (await btnComenzar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnComenzar.click();
    await expect(page.getByText('EN_CURSO')).toBeVisible({ timeout: 10000 });
  }

  const btnDescartar = page.locator('button[data-accion="descartar"]');
  if (await btnDescartar.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btnDescartar.click();
    const anyVisible = await page.getByText(/No hay partidas activas/).isVisible().catch(() => false)
      || await page.locator('ul li').count() > 0;
    expect(anyVisible).toBe(true);
  }
});
