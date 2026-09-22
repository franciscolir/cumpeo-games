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

test('set con menos de preguntas_por_turno items → set inválido', async ({ page }) => {
  await waitForCumpeo(page);

  const shortSetId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const at = juegos.find((j) => j.codigo === 'ANTI_TRIVIA');
    if (!at) throw new Error('Juego ANTI_TRIVIA no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: at.id,
      nombre: `AntiTrivia Short Set ${uid}`
    });

    for (let i = 0; i < 3; i++) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        pregunta: `Pregunta ${i + 1}?`,
        respuestas_correctas: [`Correcta ${i + 1}a`, `Correcta ${i + 1}b`],
        categoria: 'E2E'
      });
    }

    return set.id;
  });

  const validacion = await page.evaluate(async (setId) => {
    const itemsRaw = await window.cumpeo.services.set.listarItemsDeSet(setId);
    const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));

    const { AntiTriviaGameDefinition } = await import('/src/games/anti-trivia/AntiTriviaGameDefinition.js');
    const config = {
      rondas: 1,
      preguntas_por_turno: 5,
      tiempo_respuesta_seg: 30,
      penalizacion_por_error: 0,
      puntos_por_acierto: 10
    };
    try {
      AntiTriviaGameDefinition.validarContenidoSet({ items }, config);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, shortSetId);

  expect(validacion.ok).toBe(false);
  expect(validacion.error).toContain('al menos 5 items');
});

test('item sin respuestas_correctas → set inválido', async ({ page }) => {
  await waitForCumpeo(page);

  const validacion = await page.evaluate(async () => {
    const { AntiTriviaGameDefinition } = await import('/src/games/anti-trivia/AntiTriviaGameDefinition.js');
    const config = {
      rondas: 1,
      preguntas_por_turno: 2,
      tiempo_respuesta_seg: 30,
      penalizacion_por_error: 0,
      puntos_por_acierto: 10
    };
    const contenido = {
      items: [
        { pregunta: 'P1?', respuestas_correctas: ['A', 'B'] },
        { pregunta: 'P2?', respuestas_correctas: [] }
      ]
    };
    try {
      AntiTriviaGameDefinition.validarContenidoSet(contenido, config);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  expect(validacion.ok).toBe(false);
  expect(validacion.error).toContain('respuestas_correctas');
});

test('múltiples rondas: FIN_DE_RONDA → siguiente ronda → INICIO_RONDA ronda 2', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaAntiTrivia(page, { rondas: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaAntiTrivia(page, partidaId);

  // Ronda 1 — Eq1
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  await jugarTurnoCompleto(page, 'acierto');
  await page.waitForTimeout(300);

  // Ronda 1 — Eq2
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-turno'), null, { timeout: 15000 });
  await page.click('#btn-antitrivia-iniciar-turno');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), null, { timeout: 10000 });
  await elegirSet(page, setIdEq2);
  await jugarTurnoCompleto(page, 'acierto');

  // FIN_DE_RONDA ronda 1 → siguiente ronda
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-siguiente-ronda'), null, { timeout: 15000 });
  await page.click('#btn-antitrivia-siguiente-ronda');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-ronda'), null, { timeout: 10000 });

  const estado = await obtenerEstadoAntiTrivia(page, partidaId);
  expect(estado.ronda_actual).toBe(2);
  expect(estado.fase).toBe('INICIO_RONDA');
  expect(estado.puntos_equipo_1).toBe(50);
  expect(estado.puntos_equipo_2).toBe(50);
});
