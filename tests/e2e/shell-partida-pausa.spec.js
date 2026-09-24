import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupPartidaJuegoEnCurso(page) {
  await waitForCumpeo(page);
  const { id } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pausa ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Pausa ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PA${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id };
  });

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.locator('#btn-pausar')).toBeVisible({ timeout: 15000 });

  return id;
}

test('al presionar Pausar aparece el modal de pausa', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();

  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('JUEGO EN PAUSA')).toBeVisible();
});

test('el contador de pausa tiene formato SS o MM:SS', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();

  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#pausa-contador')).toBeVisible();
  await expect(page.locator('#pausa-contador')).toHaveText(/^\d{1,2}(:\d{2})?$/);
});

test('REANUDAR de la barra cierra el modal y el juego vuelve a EN_CURSO', async ({ page }) => {
  const id = await (async () => {
    await page.goto('/');
    return await setupPartidaJuegoEnCurso(page);
  })();

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });

  await page.locator('#btn-reanudar').click();

  await expect(page.locator('#modal-pausa')).toHaveCount(0, { timeout: 15000 });

  const estado = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado;
  }, id);
  expect(estado).toBe('EN_CURSO');
});

test('click fuera del modal NO lo cierra', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });

  await page.locator('#modal-pausa').click({ position: { x: 5, y: 120 } });
  await expect(page.locator('#modal-pausa')).toBeVisible();
});

test('ESC NO cierra el modal de pausa', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });

  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-pausa')).toBeVisible();
});
