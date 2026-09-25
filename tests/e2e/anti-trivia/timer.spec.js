import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaAntiTrivia,
  iniciarPartidaAntiTrivia,
  irACOnductor,
  iniciarJuegoYRonda,
  elegirSet,
  obtenerEstadoAntiTrivia
} from './_helpers/anti-trivia.js';

test.beforeEach(loginTestUser);

test('time-up muestra botones "El jugador respondió" / "No respondió"', async ({ page }) => {
  test.setTimeout(60000);
  // tiempo_respuesta_seg: 2 → el timer del conductor dispara time-up rápido
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page, { tiempoRespuesta: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-respuesta-antitrivia"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-respuesta-antitrivia"]');
  await page.waitForTimeout(300);

  // Esperar time-up: aparecen los 2 botones de decisión
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel &&
      panel.querySelector('[data-accion-conductor="jugador-respondio-antitrivia"]') &&
      panel.querySelector('[data-accion-conductor="no-respondio-antitrivia"]');
  }, null, { timeout: 15000 });

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('RESPONDIENDO');
  expect(estado.tiempo_agotado).toBe(true);
  expect(estado.timer_activo).toBe(false);
});

test('time-up + "El jugador respondió" → ESPERA_VALIDACION → acierto', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page, { tiempoRespuesta: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-respuesta-antitrivia"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-respuesta-antitrivia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="jugador-respondio-antitrivia"]'), null, { timeout: 15000 });
  await page.click('[data-accion-conductor="jugador-respondio-antitrivia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="marcar-acierto-antitrivia"]');
  }, null, { timeout: 10000 });

  let estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('ESPERA_VALIDACION');

  // Validar acierto desde ESPERA_VALIDACION
  await page.click('[data-accion-conductor="marcar-acierto-antitrivia"]');
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="siguiente-pregunta-antitrivia"]'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.respuestas[0].tiempo_agotado).toBe(true);
});

test('time-up + "No respondió" → MOSTRANDO_RESULTADO sin puntaje', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page, { tiempoRespuesta: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-respuesta-antitrivia"]'), null, { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-respuesta-antitrivia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="no-respondio-antitrivia"]'), null, { timeout: 15000 });
  await page.click('[data-accion-conductor="no-respondio-antitrivia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="siguiente-pregunta-antitrivia"]'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
  expect(estado.puntos_equipo_1).toBe(0);
  expect(estado.respuestas).toHaveLength(1);
  expect(estado.respuestas[0].resultado).toBe('sin_respuesta');
  expect(estado.respuestas[0].puntos).toBe(0);
});
