import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaEnlaces,
  iniciarPartidaEnlaces,
  irACOnductor,
  iniciarJuegoYRonda,
  elegirSet,
  obtenerEstadoEnlaces,
  esperarFase,
  moverElemento,
  deshacer
} from './_helpers/enlaces.js';

test.beforeEach(loginTestUser);

test('arrastrar elemento de B a otra posición cambia el orden', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];

  await moverElemento(page, 1, 4);

  const despues = await obtenerEstadoEnlaces(page, partidaId);
  expect(despues.fase).toBe('ORDENANDO');
  expect(despues.columna_b[4]).toBe(bAntes[1]);
  expect(despues.movimientos).toHaveLength(1);
  expect(despues.movimientos[0]).toEqual({ desde: 1, hasta: 4 });
});

test('drop en misma posición no cambia el orden ni registra movimiento', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];

  // dragstart + drop sobre el mismo índice: la UI no emite la acción
  const el = page.locator('.enlaces-columna-b-item[data-idx="2"]');
  await el.dispatchEvent('dragstart');
  await el.dispatchEvent('dragover');
  await el.dispatchEvent('drop');
  await el.dispatchEvent('dragend');
  await page.waitForTimeout(500);

  const despues = await obtenerEstadoEnlaces(page, partidaId);
  expect(despues.columna_b).toEqual(bAntes);
  expect(despues.movimientos).toHaveLength(0);
});

test('deshacer revierte el último movimiento', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];

  await moverElemento(page, 0, 3);
  const conMov = await obtenerEstadoEnlaces(page, partidaId);
  expect(conMov.movimientos).toHaveLength(1);
  expect(conMov.columna_b).not.toEqual(bAntes);

  await deshacer(page);

  const revertido = await obtenerEstadoEnlaces(page, partidaId);
  expect(revertido.columna_b).toEqual(bAntes);
  expect(revertido.movimientos).toHaveLength(0);
  expect(revertido.fase).toBe('ORDENANDO');
});

test('mientras el timer corre se puede deshacer', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page, { tiempoTurno: 60 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];
  expect(antes.tiempo_agotado).toBe(false);

  await moverElemento(page, 2, 5);
  const conMov = await obtenerEstadoEnlaces(page, partidaId);
  expect(conMov.movimientos).toHaveLength(1);
  expect(conMov.tiempo_agotado).toBe(false);

  // El botón Deshacer está visible mientras el timer corre
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="deshacer-enlaces"]'), null, { timeout: 10000 });

  await deshacer(page);

  const revertido = await obtenerEstadoEnlaces(page, partidaId);
  expect(revertido.columna_b).toEqual(bAntes);
  expect(revertido.movimientos).toHaveLength(0);
  expect(revertido.tiempo_agotado).toBe(false);
  expect(revertido.fase).toBe('ORDENANDO');
});

test('después del time-up no se puede deshacer (botón oculto, fase ESPERA_VALIDACION)', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page, { tiempoTurno: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  // Hacer un movimiento antes del time-up para tener historial
  await moverElemento(page, 0, 3);

  // Esperar time-up → ESPERA_VALIDACION
  await esperarFase(page, partidaId, 'ESPERA_VALIDACION', 15000);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.tiempo_agotado).toBe(true);

  // El botón Deshacer no existe en ESPERA_VALIDACION
  const deshacerBtn = await page.locator('[data-accion-conductor="deshacer-enlaces"]').count();
  expect(deshacerBtn).toBe(0);

  // Intentar deshacer vía acción directa: el dominio lanza ValidacionError
  const resultado = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const estado = ctx.juegos[0].estado_juego;
    const { EnlacesGameDefinition } = await import('/src/games/enlaces/EnlacesGameDefinition.js');
    try {
      EnlacesGameDefinition.deshacerMovimiento(estado);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, partidaId);

  expect(resultado.ok).toBe(false);
  expect(resultado.error).toContain('ORDENANDO');
});
