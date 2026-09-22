/* =============================================================
   Rosco Rondas y Fin — test e2e de rondas múltiples y fin de juego.
   
   Cubre: cascading pasapalabra, fin de ronda, rondas múltiples,
   fin de juego con ganador, empate, y conducto↔público sync.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  setupPartidaRosco,
  iniciarPartidaRosco,
  obtenerContextoRosco
} from './_helpers/rosco.js';

test.beforeEach(loginTestUser);

async function esperarPanelRosco(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-juego');
  }, { timeout: 15000 });
}

async function esperarBotonTurno(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-turno');
  }, { timeout: 15000 });
}

async function jugarRoscoCompleto(page, rondas) {
  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, await page.evaluate(() => window.cumpeo?.partidaId));
    const fase = ctx.estadoJuego.fase;
    if (fase === 'CAMBIO_TURNO') {
      await page.click('#btn-rosco-iniciar-turno');
      await page.waitForTimeout(100);
    } else if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') {
      break;
    }

    const btnAcierto = page.locator('#btn-rosco-acierto');
    if (await btnAcierto.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btnAcierto.click();
    }
    await page.waitForTimeout(50);
  }
}

test('cascading pasapalabra: rosco con pasapalabras permite respuestas del otro equipo', async ({ page }) => {
  await page.goto('/');
  const { partidaId } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await page.click('#btn-rosco-iniciar-juego');
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  await page.click('#btn-rosco-pasapalabra');
  await page.waitForTimeout(200);

  const ctxAfterPP = await obtenerContextoRosco(page, partidaId);
  expect(ctxAfterPP.estadoJuego.rosco[0].estado).toBe('pasada');
  expect(ctxAfterPP.estadoJuego.equipo_actual).toBe(2);

  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');
  await page.waitForTimeout(200);

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(200);

  const ctxAfterAcierto = await obtenerContextoRosco(page, partidaId);
  expect(ctxAfterAcierto.estadoJuego.rosco[0].estado).toBe('correcta');
  expect(ctxAfterAcierto.estadoJuego.puntos_equipo_2).toBe(10);
});

test('fin de ronda aparece al completar todas las letras', async ({ page }) => {
  await page.goto('/');
  const { partidaId } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await page.click('#btn-rosco-iniciar-juego');
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');
  await page.waitForTimeout(500);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('#btn-rosco-acierto');

    await page.waitForFunction(
      async ({ pid, ptsAntes }) => {
        const ctxW = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
        const je = ctxW.juegos[0];
        const ptsAhora = (je.estado_juego.puntos_equipo_1 || 0) + (je.estado_juego.puntos_equipo_2 || 0);
        return ptsAhora > ptsAntes;
      },
      { pid: partidaId, ptsAntes },
      { timeout: 10000 }
    );
  }

  await page.waitForTimeout(500);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.fase).toBe('FIN_DE_RONDA');
  await expect(page.locator('#btn-rosco-siguiente-ronda')).toBeVisible({ timeout: 5000 });
});

test('siguiente ronda inicia nuevo rosco', async ({ page }) => {
  await page.goto('/');
  const { partidaId } = await setupPartidaRosco(page, { rondas: 2, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await page.click('#btn-rosco-iniciar-juego');
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');
  await page.waitForTimeout(500);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('#btn-rosco-acierto');

    await page.waitForFunction(
      async ({ pid, ptsAntes }) => {
        const ctxW = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
        const je = ctxW.juegos[0];
        const ptsAhora = (je.estado_juego.puntos_equipo_1 || 0) + (je.estado_juego.puntos_equipo_2 || 0);
        return ptsAhora > ptsAntes;
      },
      { pid: partidaId, ptsAntes },
      { timeout: 10000 }
    );
  }

  await page.waitForTimeout(500);

  await page.click('#btn-rosco-siguiente-ronda');
  await page.waitForTimeout(500);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.ronda_actual).toBe(2);
  expect(ctx.estadoJuego.fase).toBe('INICIO_RONDA');
});

test('fin de juego en última ronda', async ({ page }) => {
  await page.goto('/');
  const { partidaId } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await page.click('#btn-rosco-iniciar-juego');
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');
  await page.waitForTimeout(500);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('#btn-rosco-acierto');

    await page.waitForFunction(
      async ({ pid, ptsAntes }) => {
        const ctxW = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
        const je = ctxW.juegos[0];
        const ptsAhora = (je.estado_juego.puntos_equipo_1 || 0) + (je.estado_juego.puntos_equipo_2 || 0);
        return ptsAhora > ptsAntes;
      },
      { pid: partidaId, ptsAntes },
      { timeout: 10000 }
    );
  }

  await page.waitForTimeout(500);

  const ctxFin = await obtenerContextoRosco(page, partidaId);
  expect(ctxFin.estadoJuego.fase).toBe('FIN_DE_RONDA');

  await page.click('#btn-rosco-siguiente-ronda');
  await page.waitForTimeout(500);

  const ctxFinal = await obtenerContextoRosco(page, partidaId);
  expect(ctxFinal.estadoJuego.fase).toBe('FIN_DE_JUEGO');
});

test('pública muestra resultado del rosco', async ({ page }) => {
  await page.goto('/');
  const { partidaId, codigo } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await page.click('#btn-rosco-iniciar-juego');
  await esperarBotonTurno(page);
  await page.click('#btn-rosco-iniciar-turno');

  await page.click('#btn-rosco-acierto');
  await page.waitForTimeout(200);

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  await expect(page.getByText('Rosco').first()).toBeVisible({ timeout: 15000 });

  const roscoLetters = page.locator('[data-letra]');
  const count = await roscoLetters.count();
  expect(count).toBe(27);
});
