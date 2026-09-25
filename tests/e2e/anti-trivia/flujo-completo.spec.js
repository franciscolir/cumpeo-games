import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  setupPartidaAntiTrivia,
  iniciarPartidaAntiTrivia,
  irACOnductor,
  iniciarJuegoYRonda,
  elegirSet,
  jugarTurnoCompleto,
  obtenerEstadoAntiTrivia
} from './_helpers/anti-trivia.js';

test.beforeEach(loginTestUser);

test('crear partida + iniciar juego + ronda + elegir set → MOSTRANDO_PREGUNTA', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('MOSTRANDO_PREGUNTA');
  expect(estado.equipo_actual).toBe(1);
  expect(estado.preguntas_equipo_1).toHaveLength(5);
});

test('responder pregunta con acierto → MOSTRANDO_RESULTADO +10', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-respuesta-antitrivia"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-respuesta-antitrivia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="marcar-acierto-antitrivia"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="marcar-acierto-antitrivia"]');
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="siguiente-pregunta-antitrivia"]'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.respuestas).toHaveLength(1);
  expect(estado.respuestas[0].resultado).toBe('acierto');
});

test('Eq1 completa 5 preguntas → CAMBIO_TURNO → Eq2', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  await jugarTurnoCompleto(page, 'acierto');

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-turno-antitrivia"]'), null, { timeout: 15000 });

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('CAMBIO_TURNO');
  expect(estado.equipo_actual).toBe(2);
  expect(estado.puntos_equipo_1).toBe(50);
  expect(estado.puntos_equipo_2).toBe(0);
});

test('ronda completa Eq1+Eq2 → FIN_DE_RONDA → FIN_DE_JUEGO', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  // Ronda 1 — Eq1
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  await jugarTurnoCompleto(page, 'acierto');

  // Cambio de turno → Eq2
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-turno-antitrivia"]'), null, { timeout: 15000 });
  await page.click('[data-accion-conductor="iniciar-turno-antitrivia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-antitrivia"]'), null, { timeout: 10000 });
  await elegirSet(page, setIdEq2);

  // Eq2 completa su turno → FIN_DE_RONDA
  await jugarTurnoCompleto(page, 'acierto');
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-antitrivia"]'), null, { timeout: 15000 });

  let estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('FIN_DE_RONDA');
  expect(estado.puntos_equipo_1).toBe(50);
  expect(estado.puntos_equipo_2).toBe(50);

  // Última ronda (rondas: 1) → FIN_DE_JUEGO
  await page.click('[data-accion-conductor="iniciar-siguiente-ronda-antitrivia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    if (!panel) return false;
    return !panel.querySelector('[data-accion-conductor="iniciar-ronda-antitrivia"]') &&
           !panel.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-antitrivia"]');
  }, null, { timeout: 10000 });

  estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('FIN_DE_JUEGO');
});
