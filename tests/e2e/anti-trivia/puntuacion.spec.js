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

test('acierto suma +10 al equipo activo', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-respuesta'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-iniciar-respuesta');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-acierto'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-acierto');
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-siguiente-pregunta'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.respuestas).toHaveLength(1);
  expect(estado.respuestas[0].resultado).toBe('acierto');
  expect(estado.respuestas[0].puntos).toBe(10);
});

test('error con penalizacion 0 no cambia el puntaje', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaAntiTrivia(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-respuesta'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-iniciar-respuesta');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-error'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-error');
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-siguiente-pregunta'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
  expect(estado.puntos_equipo_1).toBe(0);
  expect(estado.respuestas).toHaveLength(1);
  expect(estado.respuestas[0].resultado).toBe('error');
  expect(estado.respuestas[0].puntos).toBe(0);
});
