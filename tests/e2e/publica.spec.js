import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupPartidaCompleta(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pub ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Pub ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PUB${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { codigo: partida.public_codigo, partidaId: partida.id };
  });
}

test('código inválido muestra "no encontrada"', async ({ page }) => {
  await page.goto('/#/publica/NOEXISTE');
  await expect(page.getByText('Partida no encontrada')).toBeVisible();
});

test('código válido muestra la partida', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);

  await page.goto(`/#/publica/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('CUMPEO')).toBeVisible({ timeout: 15000 });
});

test('pantalla pública no tiene botones de control', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);

  await page.goto(`/#/publica/${codigo}`);

  const botonesControl = page.locator('button[data-accion]');
  await expect(botonesControl).toHaveCount(0);
});

test('puntajes se muestran en grande', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);

  await page.goto(`/#/publica/${codigo}`);
  await expect(page.locator('.font-comic-score').first()).toBeVisible();
});

test('consola tiene link a pantalla pública', async ({ page }) => {
  await page.goto('/');
  const { partidaId, codigo } = await setupPartidaCompleta(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);
  const linkPublica = page.locator(`a[href*="/publica/"]`);
  await expect(linkPublica).toBeVisible({ timeout: 10000 });
});
