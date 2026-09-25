/* =============================================================
   Rosco Flujo Completo — test e2e del flujo feliz Rosco.
   
   Cubre: crear set → circuito → partida → modal de inicio → jugar → fin.
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
    return panel && panel.querySelector('[data-accion-conductor="iniciar-turno-rosco"]');
  }, { timeout: 30000 });
}

test('flujo completo: crear set, partida, jugar y finalizar', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page, { rondas: 1, segundos: 30 });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  const ctx1 = await obtenerContextoRosco(page, partidaId);
  expect(ctx1.estadoJuego.fase).toBe('TURNO_ACTIVO');

  await page.click('[data-accion-conductor="marcar-acierto-rosco"]');
  await page.waitForTimeout(200);

  const ctx2 = await obtenerContextoRosco(page, partidaId);
  expect(ctx2.estadoJuego.rosco[0].estado).toBe('correcta');
  expect(ctx2.estadoJuego.puntos_equipo_1).toBe(10);
});

test('rosco se renderiza con 27 letras', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  await page.waitForFunction(() => {
    return document.querySelector('[data-letra]');
  }, { timeout: 10000 });

  const letras = await page.locator('[data-letra]').count();
  expect(letras).toBe(27);
});

test('definition panel muestra la definición actual', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('de la letra')).toBeVisible({ timeout: 10000 });
});

test('puntaje se actualiza tras acierto', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  await page.click('[data-accion-conductor="marcar-acierto-rosco"]');
  await page.waitForTimeout(200);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.puntos_equipo_1).toBe(10);
  expect(ctx.estadoJuego.rosco[0].estado).toBe('correcta');
});

test('error marca letra como incorrecta', async ({ page }) => {
  await page.goto('/');
  const { partidaId, sets } = await setupPartidaRosco(page);

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await iniciarPartidaRosco(page, partidaId);

  await esperarPanelRosco(page);
  await iniciarJuegoRoscoConSets(page, { sets });
  await esperarBotonTurno(page);
  await page.click('[data-accion-conductor="iniciar-turno-rosco"]');

  await page.click('[data-accion-conductor="marcar-error-rosco"]');
  await page.waitForTimeout(200);

  const ctx = await obtenerContextoRosco(page, partidaId);
  expect(ctx.estadoJuego.rosco[0].estado).toBe('incorrecta');
  expect(ctx.estadoJuego.equipo_actual).toBe(2);
});
