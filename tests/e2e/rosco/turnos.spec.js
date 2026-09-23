/* =============================================================
   Rosco Turnos — test e2e de cambios de turno y pasapalabra.
   
   Cubre: cambio por error, pasapalabra, saltar letra,
   siguiente equipo, y cambio automático al completar rosco.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  setupPartidaRosco,
  iniciarPartidaRosco,
  iniciarJuegoRoscoConSets,
  obtenerContextoRosco
} from './_helpers/rosco.js';

test.beforeEach(loginTestUser);

async function esperarPanelRosco(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-juego');
  }, { timeout: 30000 });
}

async function esperarBotonTurno(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-turno');
  }, { timeout: 30000 });
}

test('error cambia al equipo 2', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  let ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.equipo_actual).toBe(1);

  await page.click('#btn-rosco-error');
  await page.waitForTimeout(200);

  ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.equipo_actual).toBe(2);
  expect(ctx.estadoJuego.fase).toBe('CAMBIO_TURNO');
});

test('pasapalabra cambia de turno y marca letra como pasada', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  let ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.rosco[0].estado).toBe('pendiente');
  expect(ctx.estadoJuego.equipo_actual).toBe(1);

  await page.click('#btn-rosco-pasapalabra');
  await page.waitForTimeout(200);

  ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.rosco[0].estado).toBe('pasada');
  expect(ctx.estadoJuego.equipo_actual).toBe(2);
});

test('saltar letra avanza sin marcar estado', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  await page.click('#btn-rosco-saltar');
  await page.waitForTimeout(200);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.rosco[0].estado).toBe('pendiente');
  expect(ctx.estadoJuego.indice_actual).toBe(1);
});

test('siguiente equipo cambia turno manualmente', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  let ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.equipo_actual).toBe(1);

  await page.click('#btn-rosco-siguiente-equipo');
  await page.waitForTimeout(200);

  ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.equipo_actual).toBe(2);
  expect(ctx.estadoJuego.fase).toBe('CAMBIO_TURNO');
});

test('dos aciertos seguidos mantienen mismo equipo', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(200);

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(200);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.equipo_actual).toBe(1);
  expect(ctx.estadoJuego.puntos_equipo_1).toBe(20);
});

test('aciertos de ambos equipos acumulan puntos correctamente', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  await page.click('#btn-rosco-pasapalabra');
  await page.waitForTimeout(500);

  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');
  await page.waitForTimeout(200);

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(500);

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(500);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.puntos_equipo_2).toBe(20);
});
