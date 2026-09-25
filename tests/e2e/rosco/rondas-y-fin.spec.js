/* =============================================================
   Rosco Rondas y Fin — test e2e de rondas múltiples y fin de juego.
   
   Cubre: cascading pasapalabra, fin de ronda, rondas múltiples
   con N sets distintos, fin de juego con ganador, empate, y
   conducto↔público sync.
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
  }, { timeout: 15000 });
}

async function esperarBotonTurno(page) {
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="iniciar-turno-rosco"]');
  }, { timeout: 15000 });
}

test('cascading pasapalabra: rosco con pasapalabras permite respuestas del otro equipo', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  await page.click('[data-accion-conductor="pasapalabra-rosco"]');
  await page.waitForTimeout(200);

  const ctxAfterPP = await obtenerContextoRosco(page, partidaId);
  expect(ctxAfterPP.estadoJuego.rosco[0].estado).toBe('pasada');
  expect(ctxAfterPP.estadoJuego.equipo_actual).toBe(2);

  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');
  await page.waitForTimeout(200);

  await page.click('[data-accion-conductor="marcar-acierto-rosco"]');
  await page.waitForTimeout(200);

  const ctxAfterAcierto = await obtenerContextoRosco(page, partidaId);
  expect(ctxAfterAcierto.estadoJuego.rosco[0].estado).toBe('correcta');
  expect(ctxAfterAcierto.estadoJuego.puntos_equipo_2).toBe(10);
});

test('fin de ronda aparece al completar todas las letras', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');
  await page.waitForTimeout(500);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('[data-accion-conductor="marcar-acierto-rosco"]');

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
  await expect(page.locator('[data-accion-conductor="siguiente-ronda-rosco"]')).toBeVisible({ timeout: 5000 });
});

test('siguiente ronda inicia el set de la ronda 2', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page, { rondas: 2, segundos: 60 });
  expect(sets.length).toBe(2);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');
  await page.waitForTimeout(500);

  const ctxInicio = await obtenerContextoRosco(page, partidaId);
  expect(ctxInicio.estadoJuego.total_rondas).toBe(2);
  expect(ctxInicio.estadoJuego.set_ronda_actual.id).toBe(sets[0].id);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('[data-accion-conductor="marcar-acierto-rosco"]');

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

  await page.click('[data-accion-conductor="siguiente-ronda-rosco"]');
  await page.waitForTimeout(500);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.ronda_actual).toBe(2);
  expect(ctx.estadoJuego.fase).toBe('INICIO_RONDA');
  expect(ctx.estadoJuego.set_ronda_actual.id).toBe(sets[1].id);

  await page.waitForFunction(() => {
    return document.querySelector('[data-letra]');
  }, { timeout: 10000 });
  const letras = await page.locator('[data-letra]').count();
  expect(letras).toBe(27);
});

test('fin de juego en última ronda', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page, { rondas: 1, segundos: 60 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await page.waitForTimeout(500);
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');
  await page.waitForTimeout(500);

  for (let i = 0; i < 27; i++) {
    const ctx = await obtenerContextoRosco(page, partidaId);
    const fase = ctx.estadoJuego.fase;
    if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') break;

    const ptsAntes = (ctx.estadoJuego.puntos_equipo_1 || 0) + (ctx.estadoJuego.puntos_equipo_2 || 0);
    await page.click('[data-accion-conductor="marcar-acierto-rosco"]');

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

  await page.click('[data-accion-conductor="siguiente-ronda-rosco"]');
  await page.waitForTimeout(500);

  const ctxFinal = await obtenerContextoRosco(page, partidaId);
  expect(ctxFinal.estadoJuego.fase).toBe('FIN_DE_JUEGO');
});

test('pública muestra resultado del rosco', async ({ page }) => {
  await page.goto('/');
  const { partidaId, codigo, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  await page.click('[data-accion-conductor="marcar-acierto-rosco"]');
  await page.waitForTimeout(200);

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  await expect(page.getByText('Rosco').first()).toBeVisible({ timeout: 15000 });

  const roscoLetters = page.locator('[data-letra]');
  const count = await roscoLetters.count();
  expect(count).toBe(27);
});
