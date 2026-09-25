import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaTrivia, iniciarPartidaTrivia, irACOnductor, responderPregunta, elegirSetTrivia } from './_helpers/trivia.js';

test.beforeEach(loginTestUser);

test('acertar suma +10 puntos al Eq1', async ({ page }) => {
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

  // Elegir set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq1);
  await page.waitForTimeout(300);

  // Iniciar respuesta
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
  await page.waitForTimeout(200);

  // Responder con opción correcta (índice 0)
  await responderPregunta(page, 0);

  // Verificar puntaje
  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.puntos_equipo_1).toBe(10);
  expect(ctx.respuestas).toHaveLength(1);
  expect(ctx.respuestas[0].correcta).toBe(true);
  expect(ctx.respuestas[0].puntos).toBe(10);
});

test('pasar pregunta queda registrada como pasada', async ({ page }) => {
  const { partidaId, setIdEq1 } = await setupPartidaTrivia(page, { rondas: 1, numPreguntas: 5 });

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

  // Elegir set
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-trivia"]'), { timeout: 10000 });
  await elegirSetTrivia(page, setIdEq1);
  await page.waitForTimeout(300);

  // Iniciar respuesta
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-tiempo-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-tiempo-trivia"]');
  await page.waitForTimeout(200);

  // Pasar pregunta
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="pasar-pregunta-trivia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="pasar-pregunta-trivia"]');
  await page.waitForTimeout(300);

  // Verificar que la respuesta fue registrada como pasada
  const ctx = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctx.respuestas).toHaveLength(1);
  expect(ctx.respuestas[0].paso).toBe(true);
  expect(ctx.respuestas[0].correcta).toBe(false);
});
