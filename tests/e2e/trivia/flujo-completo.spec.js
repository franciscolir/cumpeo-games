import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaTrivia, iniciarPartidaTrivia, irACOnductor, responderPregunta } from './_helpers/trivia.js';

test.beforeEach(loginTestUser);

test('crear partida + iniciar juego + comenzar ronda → SELECCIONANDO_SET', async ({ page }) => {
  const { partidaId } = await setupPartidaTrivia(page);

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-trivia-iniciar-juego');
  }, { timeout: 20000 });

  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  // Iniciar ronda
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-trivia-iniciar-ronda');
  }, { timeout: 10000 });

  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Verificar que estamos en SELECCIONANDO_SET
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-set-id]');
  }, { timeout: 10000 });

  const setCards = await page.$$('[data-set-id]');
  expect(setCards.length).toBeGreaterThanOrEqual(1);
});

test('Eq1 elige set → MOSTRANDO_PREGUNTA → responder → puntaje +10', async ({ page }) => {
  const { partidaId, setIdEq1 } = await setupPartidaTrivia(page);

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  // Iniciar ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Elegir set para Eq1
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq1}"]`);
  await page.waitForTimeout(300);

  // Iniciar respuesta
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-respuesta');
  await page.waitForTimeout(200);

  // Seleccionar opción 0 (correcta) y validar
  await responderPregunta(page, 0);

  // Verificar que Eq1 tiene 10 puntos
  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);
  expect(ctx.puntos_equipo_1).toBe(10);
});

test('Eq1 responde 5 preguntas → CAMBIO_TURNO → Eq2', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaTrivia(page);

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego + ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Elegir set
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq1}"]`);
  await page.waitForTimeout(300);

  // Responder 5 preguntas
  for (let i = 0; i < 5; i++) {
    // Esperarbotón "Iniciar respuesta"
    await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
    await page.click('#btn-trivia-iniciar-respuesta');
    await page.waitForTimeout(200);

    // Seleccionar opción correcta
    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    // Validar
    await page.waitForFunction(() => document.querySelector('#btn-trivia-validar'), { timeout: 10000 });
    await page.click('#btn-trivia-validar');
    await page.waitForTimeout(300);

    // Siguiente pregunta (si existe)
    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // Verificar CAMBIO_TURNO
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-turno'), { timeout: 10000 });

  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.fase).toBe('CAMBIO_TURNO');
  expect(ctx.equipo_actual).toBe(2);
  expect(ctx.puntos_equipo_1).toBe(50);
});
