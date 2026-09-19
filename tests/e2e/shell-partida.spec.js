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
      nombre: `Shell ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Shell ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `SH${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id, codigo: partida.public_codigo };
  });
}

test('shell carga en una partida existente', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.locator('.font-display-hero').first()).toBeVisible({ timeout: 15000 });
});

test('marcador de ambos equipos visible', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.getByText('VS')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Rojo')).toBeVisible();
  await expect(page.getByText('Azul')).toBeVisible();
});

test('código público visible', async ({ page }) => {
  await page.goto('/');
  const { id, codigo } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.getByText(codigo)).toBeVisible({ timeout: 15000 });
});

test('botón "Ver pública" tiene target="_blank"', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btn = page.locator('a[href*="/publica/"]');
  await expect(btn).toBeVisible({ timeout: 15000 });
  await expect(btn).toHaveAttribute('target', '_blank');
});

test('Equipo 1 usa color comicBlue', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const team1Box = page.locator('.border-\\[\\#00D2FF\\]').first();
  await expect(team1Box).toBeVisible({ timeout: 15000 });
});

test('Equipo 2 usa color comicRed', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const team2Box = page.locator('.border-\\[\\#FF3344\\]').first();
  await expect(team2Box).toBeVisible({ timeout: 15000 });
});

test('Botón Pausar visible cuando juego EN_CURSO y tengo control', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btnPausar = page.locator('#btn-pausar');
  await expect(btnPausar).toBeVisible({ timeout: 15000 });
});

test('shell del conductor renderiza TriviaGameUI', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  const tieneTrivia = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.existe('TRIVIA');
  });
  expect(tieneTrivia).toBe(true);

  const gameUICount = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.cantidad();
  });
  expect(gameUICount).toBeGreaterThanOrEqual(1);
});
