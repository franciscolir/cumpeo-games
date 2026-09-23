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
  validarTurno,
  planificarOrden,
  aplicarMovimientos,
  objetivoDesde,
  iniciarSiguienteTurno
} from './_helpers/enlaces.js';

test.beforeEach(loginTestUser);

function derangeSinPrimero(objetivo) {
  const resto = objetivo.slice(1);
  if (resto.length <= 1) return resto;
  return resto.slice(1).concat(resto.slice(0, 1));
}

test('acierto suma +10 al equipo activo', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  // Objetivo con exactamente 1 acierto: fila 0 correcta, resto derangeado
  const estado = await obtenerEstadoEnlaces(page, partidaId);
  const objetivo = objetivoDesde(estado);
  const con1 = [objetivo[0], ...derangeSinPrimero(objetivo)];
  const moves = planificarOrden(estado.columna_b, con1);
  await aplicarMovimientos(page, partidaId, moves, estado);

  await validarTurno(page);
  await esperarFase(page, partidaId, 'MOSTRANDO_RESULTADO');

  const final = await obtenerEstadoEnlaces(page, partidaId);
  expect(final.resultado_turno.aciertos).toBe(1);
  expect(final.puntos_equipo_1).toBe(10);
});

test('múltiples aciertos suman (8 aciertos = 80 puntos)', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  const objetivo = objetivoDesde(estado);
  const moves = planificarOrden(estado.columna_b, objetivo);
  await aplicarMovimientos(page, partidaId, moves, estado);

  await validarTurno(page);
  await esperarFase(page, partidaId, 'MOSTRANDO_RESULTADO');

  const final = await obtenerEstadoEnlaces(page, partidaId);
  expect(final.resultado_turno).toEqual({ aciertos: 8, total: 8 });
  expect(final.puntos_equipo_1).toBe(80);
  expect(final.puntos_equipo_2).toBe(0);
});

test('empate técnico al final de ambos turnos con mismo puntaje', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaEnlaces(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);

  // Eq1: 8 aciertos → 80
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  let estado = await obtenerEstadoEnlaces(page, partidaId);
  let objetivo = objetivoDesde(estado);
  let moves = planificarOrden(estado.columna_b, objetivo);
  await aplicarMovimientos(page, partidaId, moves, estado);
  await validarTurno(page);
  await page.click('#btn-enlaces-siguiente-turno');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'SELECCIONANDO_SET');

  // Eq2: 8 aciertos → 80
  await elegirSet(page, setIdEq2);
  estado = await obtenerEstadoEnlaces(page, partidaId);
  objetivo = objetivoDesde(estado);
  moves = planificarOrden(estado.columna_b, objetivo);
  await aplicarMovimientos(page, partidaId, moves, estado);
  await validarTurno(page);
  await page.click('#btn-enlaces-siguiente-turno');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'FIN_DE_RONDA');

  // FIN_DE_RONDA → FIN_DE_JUEGO
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-siguiente-ronda'), null, { timeout: 15000 });
  await page.click('#btn-enlaces-siguiente-ronda');
  await esperarFase(page, partidaId, 'FIN_DE_JUEGO');

  const final = await obtenerEstadoEnlaces(page, partidaId);
  expect(final.fase).toBe('FIN_DE_JUEGO');
  expect(final.puntos_equipo_1).toBe(80);
  expect(final.puntos_equipo_2).toBe(80);

  // Verificar empate técnico en el DOM público/conductor
  const ganadorText = await page.locator('text=Empate técnico').count();
  expect(ganadorText).toBeGreaterThan(0);
});
