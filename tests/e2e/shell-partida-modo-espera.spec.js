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
      nombre: `ModoEspera ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `ModoEspera ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `ME${Date.now().toString(36).slice(-4).toUpperCase()}`;
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

test('al pausar, #btn-modo-espera es visible en la barra', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await expect(page.locator('#btn-modo-espera')).toHaveCount(0);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#btn-modo-espera')).toBeVisible();
});

test('al pausar, #btn-reanudar es visible en la barra (deuda #124)', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await expect(page.locator('#btn-reanudar')).toHaveCount(0);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#btn-reanudar')).toBeVisible();
});

test('al presionar Modo espera aparece el overlay y el modal desaparece', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });

  await page.locator('#btn-modo-espera').click();

  await expect(page.locator('#modo-espera-overlay')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#modal-pausa')).toHaveCount(0);
});

test('Reanudar con overlay activo lo cierra y el juego pasa a EN_CURSO', async ({ page }) => {
  const id = await (async () => {
    await page.goto('/');
    return await setupPartidaJuegoEnCurso(page);
  })();

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await page.locator('#btn-modo-espera').click();
  await expect(page.locator('#modo-espera-overlay')).toBeVisible({ timeout: 15000 });

  await page.locator('#btn-reanudar').click();

  await expect(page.locator('#modo-espera-overlay')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('#modal-pausa')).toHaveCount(0);

  const estado = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado;
  }, id);
  expect(estado).toBe('EN_CURSO');
});

test('auto-transición: al alcanzar el tiempo máximo entra a MODO ESPERA solo', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.evaluate(async () => {
    await window.cumpeo.services.ajustes.actualizar({ tiempo_max_pausa_seg: 2 });
  });

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(3000);

  await expect(page.locator('#modal-pausa')).toHaveCount(0);
  await expect(page.locator('#modo-espera-overlay')).toBeVisible({ timeout: 15000 });
});

test('el overlay NO tiene botón propio', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await page.locator('#btn-modo-espera').click();
  await expect(page.locator('#modo-espera-overlay')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('#modo-espera-overlay button')).toHaveCount(0);
  await expect(page.locator('#btn-pausa-reanudar')).toHaveCount(0);
});

test('el overlay cubre el área de juego pero NO la barra superior', async ({ page }) => {
  await page.goto('/');
  await setupPartidaJuegoEnCurso(page);

  await page.locator('#btn-pausar').click();
  await expect(page.locator('#modal-pausa')).toBeVisible({ timeout: 15000 });
  await page.locator('#btn-modo-espera').click();
  await expect(page.locator('#modo-espera-overlay')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('#btn-reanudar')).toBeVisible();

  const overlayBox = await page.locator('#modo-espera-overlay').boundingBox();
  const topbarBox = await page.locator('#shell-topbar').boundingBox();
  const gameBox = await page.locator('#shell-game-container').boundingBox();

  expect(overlayBox).not.toBeNull();
  expect(topbarBox).not.toBeNull();
  expect(gameBox).not.toBeNull();

  // El overlay empieza debajo de la barra (no la tapa)
  expect(overlayBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
  // El overlay cubre el área de juego
  expect(overlayBox.y).toBeLessThanOrEqual(gameBox.y);
  expect(overlayBox.y + overlayBox.height).toBeGreaterThanOrEqual(gameBox.y + gameBox.height);
});
