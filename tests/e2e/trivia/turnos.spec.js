import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaTrivia, iniciarPartidaTrivia, irACOnductor, responderTurnoCompleto, elegirSetTrivia } from './_helpers/trivia.js';

test.beforeEach(loginTestUser);

test('Eq1 y Eq2 alternan correctamente', async ({ page }) => {
  test.setTimeout(90000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaTrivia(page);

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego + ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-trivia"]');
  await page.waitForTimeout(300);

  // Eq1 elige set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq1);
  await page.waitForTimeout(300);

  // Responder 5 preguntas de Eq1
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="validar-respuesta-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="validar-respuesta-trivia"]');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('[data-accion-conductor="siguiente-pregunta-trivia"]');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // Verificar CAMBIO_TURNO
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-turno-trivia"]'), { timeout: 10000 });

  // Iniciar turno de Eq2
  await page.click('[data-accion-conductor="iniciar-turno-trivia"]');
  await page.waitForTimeout(300);

  // Eq2 elige set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq2);
  await page.waitForTimeout(300);

  // Responder 1 pregunta de Eq2 para verificar
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
  await page.waitForTimeout(200);

  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.equipo_actual).toBe(2);
  expect(ctx.fase).toBe('SELECCIONANDO_RESPUESTA');
});

test('al terminar 5 preguntas de Eq1, fase es SELECCIONANDO_SET con equipo_actual: 2', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaTrivia(page);

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego + ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-trivia"]');
  await page.waitForTimeout(300);

  // Eq1 elige set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq1);
  await page.waitForTimeout(300);

  // Responder 5 preguntas
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="validar-respuesta-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="validar-respuesta-trivia"]');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('[data-accion-conductor="siguiente-pregunta-trivia"]');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // Verificar que Eq1 terminó y ahora Eq2 debe elegir set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-turno-trivia"]'), { timeout: 10000 });

  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.fase).toBe('CAMBIO_TURNO');
  expect(ctx.equipo_actual).toBe(2);
});

test('al terminar 5 preguntas de Eq2, fase es FIN_DE_RONDA', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaTrivia(page, { rondas: 2 });

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego + ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-trivia"]');
  await page.waitForTimeout(300);

  // Eq1: elegir set + responder 5 preguntas
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq1);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="validar-respuesta-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="validar-respuesta-trivia"]');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('[data-accion-conductor="siguiente-pregunta-trivia"]');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // CAMBIO_TURNO → iniciar turno Eq2
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-turno-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-turno-trivia"]');
  await page.waitForTimeout(300);

  // Eq2: elegir set + responder 5 preguntas
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq2);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('[data-accion-conductor="validar-respuesta-trivia"]'), { timeout: 10000 });
    await page.click('[data-accion-conductor="validar-respuesta-trivia"]');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('[data-accion-conductor="siguiente-pregunta-trivia"]');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // Verificar FIN_DE_RONDA
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-trivia"]');
  }, { timeout: 10000 });

  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.fase).toBe('FIN_DE_RONDA');
  expect(ctx.puntos_equipo_1).toBe(50);
  expect(ctx.puntos_equipo_2).toBe(50);
});
