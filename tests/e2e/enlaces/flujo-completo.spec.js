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
  validarTurno,
  planificarOrden,
  aplicarMovimientos,
  objetivoDesde,
  derange,
  iniciarSiguienteTurno
} from './_helpers/enlaces.js';

test.beforeEach(loginTestUser);

test('crear partida + iniciar juego + ronda + elegir set → ORDENANDO', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('ORDENANDO');
  expect(estado.equipo_actual).toBe(1);
  expect(estado.columna_a).toHaveLength(8);
  expect(estado.columna_b).toHaveLength(8);
  expect(estado.timer_activo).toBe(true);

  // El tablero B está visible en el DOM
  const itemsB = await page.locator('.enlaces-columna-b-item').count();
  expect(itemsB).toBe(8);
});

test('mover elemento 0 a posición 2 → cambia el orden de columna_b', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];

  await moverElemento(page, 0, 2);

  const despues = await obtenerEstadoEnlaces(page, partidaId);
  expect(despues.fase).toBe('ORDENANDO');
  expect(despues.columna_b).not.toEqual(bAntes);
  // El elemento original de la pos 0 queda en la pos 2 (splice semantics)
  expect(despues.columna_b[2]).toBe(bAntes[0]);
  expect(despues.movimientos).toHaveLength(1);
  expect(despues.movimientos[0]).toEqual({ desde: 0, hasta: 2 });
});

test('validar con 0 aciertos → MOSTRANDO_RESULTADO sin puntaje', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  const target = derange(objetivoDesde(estado));
  const moves = planificarOrden(estado.columna_b, target);
  await aplicarMovimientos(page, partidaId, moves, estado);

  await validarTurno(page);
  await esperarFase(page, partidaId, 'MOSTRANDO_RESULTADO');

  const final = await obtenerEstadoEnlaces(page, partidaId);
  expect(final.fase).toBe('MOSTRANDO_RESULTADO');
  expect(final.resultado_turno).toEqual({ aciertos: 0, total: 8 });
  expect(final.puntos_equipo_1).toBe(0);
});

test('Eq1 completa turno → CAMBIO_TURNO → Eq2 selecciona set', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  // Validar sin mover (puede tener aciertos o no) → resultado → cambio turno
  await validarTurno(page);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="siguiente-turno-enlaces"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="siguiente-turno-enlaces"]');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');

  let estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('CAMBIO_TURNO');
  expect(estado.equipo_actual).toBe(1); // aún no cambió; cambiará al iniciar turno

  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'SELECCIONANDO_SET');

  estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.equipo_actual).toBe(2);

  await elegirSet(page, setIdEq2);
  const estadoEq2 = await obtenerEstadoEnlaces(page, partidaId);
  expect(estadoEq2.fase).toBe('ORDENANDO');
  expect(estadoEq2.equipo_actual).toBe(2);
});

test('ronda completa Eq1+Eq2 → FIN_DE_RONDA → FIN_DE_JUEGO', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);

  // Ronda 1 — Eq1
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  await validarTurno(page);
  await page.click('[data-accion-conductor="siguiente-turno-enlaces"]');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'SELECCIONANDO_SET');

  // Ronda 1 — Eq2
  await elegirSet(page, setIdEq2);
  await validarTurno(page);
  await page.click('[data-accion-conductor="siguiente-turno-enlaces"]');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'FIN_DE_RONDA');

  let estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('FIN_DE_RONDA');
  expect(estado.ronda_actual).toBe(1);

  // Última ronda (rondas: 1) → FIN_DE_JUEGO
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-enlaces"]'), null, { timeout: 15000 });
  await page.click('[data-accion-conductor="iniciar-siguiente-ronda-enlaces"]');
  await esperarFase(page, partidaId, 'FIN_DE_JUEGO');

  estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('FIN_DE_JUEGO');
});
