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
