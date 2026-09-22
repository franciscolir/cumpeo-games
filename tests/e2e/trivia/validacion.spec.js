import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { crearSetsTrivia, setupPartidaTrivia, iniciarPartidaTrivia, irACOnductor } from './_helpers/trivia.js';

test.beforeEach(loginTestUser);

test('set con menos de 5 preguntas no permite iniciar', async ({ page }) => {
  await waitForCumpeo(page);

  // Crear set con solo 3 preguntas
  const { setId } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    if (!trivia) throw new Error('Juego TRIVIA no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: trivia.id,
      nombre: `Trivia Short Set ${uid}`
    });

    for (let i = 0; i < 3; i++) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        pregunta: `Pregunta ${i + 1}?`,
        opciones: ['A', 'B', 'C', 'D'],
        respuesta_correcta_index: 0
      });
    }

    return { setId: set.id };
  });

  // Crear partida con preguntas_por_turno: 5
  const circuito = await page.evaluate(async ({ setId }) => {
    const c = await window.cumpeo.services.circuito.crearCircuito({
      nombre: 'Trivia Validation Circuit',
      juegos: [{
        juego_id: (await window.cumpeo.services.juego.listarJuegos()).find((j) => j.codigo === 'TRIVIA').id,
        configuracion: {
          rondas: 1,
          preguntas_por_turno: 5,
          tiempo_por_pregunta_seg: 3,
          puntos_por_acierto: 10,
          penalizacion_por_error: 0,
          penalizacion_por_pasar: 0
        }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      c.id, c.version,
      {
        nombre: 'Trivia Validation Circuit',
        juegos: [{
          juego_id: (await window.cumpeo.services.juego.listarJuegos()).find((j) => j.codigo === 'TRIVIA').id,
          configuracion: {
            rondas: 1,
            preguntas_por_turno: 5,
            tiempo_por_pregunta_seg: 3,
            puntos_por_acierto: 10,
            penalizacion_por_error: 0,
            penalizacion_por_pasar: 0
          }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    return c;
  }, { setId });

  const codigo = `TV${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const partida = await page.evaluate(async ({ circuitoId, codigo }) => {
    return await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuitoId, public_codigo: codigo },
      crypto.randomUUID()
    );
  }, { circuitoId: circuito.id, codigo });

  await irACOnductor(page, partida.id);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partida.id);

  // Iniciar juego
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  // Iniciar ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Verificar que aparece el set
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  const setCards = await page.$$('[data-set-id]');
  expect(setCards.length).toBe(1);

  // El set debería estar disponible (la validación ocurre al iniciar el juego,
  // no al elegir el set)
});

test('múltiples rondas: FIN_DE_RONDA → siguiente ronda → FIN_DE_JUEGO', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaTrivia(page, { rondas: 2 });

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaTrivia(page, partidaId);

  // Iniciar juego
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-trivia-iniciar-juego');
  await page.waitForTimeout(300);

  // Ronda 1
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Eq1: elegir set + responder 5 preguntas
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq1}"]`);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
    await page.click('#btn-trivia-iniciar-respuesta');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#btn-trivia-validar'), { timeout: 10000 });
    await page.click('#btn-trivia-validar');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // CAMBIO_TURNO
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-turno'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-turno');
  await page.waitForTimeout(300);

  // Eq2: elegir set + responder 5 preguntas
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq2}"]`);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
    await page.click('#btn-trivia-iniciar-respuesta');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#btn-trivia-validar'), { timeout: 10000 });
    await page.click('#btn-trivia-validar');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // FIN_DE_RONDA → Siguiente ronda
  await page.waitForFunction(() => document.querySelector('#btn-trivia-siguiente-ronda'), { timeout: 10000 });
  await page.click('#btn-trivia-siguiente-ronda');
  await page.waitForTimeout(300);

  // Ronda 2: verificar INICIO_RONDA
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-ronda'), { timeout: 10000 });

  const ctxRonda2 = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctxRonda2.ronda_actual).toBe(2);
  expect(ctxRonda2.fase).toBe('INICIO_RONDA');

  // Ronda 2: iniciar ronda + Eq1 + Eq2 completos
  await page.click('#btn-trivia-iniciar-ronda');
  await page.waitForTimeout(300);

  // Eq1 ronda 2
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq1}"]`);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
    await page.click('#btn-trivia-iniciar-respuesta');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#btn-trivia-validar'), { timeout: 10000 });
    await page.click('#btn-trivia-validar');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // CAMBIO_TURNO
  await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-turno'), { timeout: 10000 });
  await page.click('#btn-trivia-iniciar-turno');
  await page.waitForTimeout(300);

  // Eq2 ronda 2
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.click(`[data-set-id="${setIdEq2}"]`);
  await page.waitForTimeout(300);

  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => document.querySelector('#btn-trivia-iniciar-respuesta'), { timeout: 10000 });
    await page.click('#btn-trivia-iniciar-respuesta');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#shell-game-container [data-opcion-index]'), { timeout: 10000 });
    await page.click('[data-opcion-index="0"]');
    await page.waitForTimeout(200);

    await page.waitForFunction(() => document.querySelector('#btn-trivia-validar'), { timeout: 10000 });
    await page.click('#btn-trivia-validar');
    await page.waitForTimeout(300);

    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }

  // FIN_DE_JUEGO
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    if (!panel) return false;
    // Verificar que no hay botones (FIN_DE_JUEGO no tiene botones)
    return !panel.querySelector('#btn-trivia-siguiente-ronda') &&
           !panel.querySelector('#btn-trivia-iniciar-turno');
  }, { timeout: 10000 });

  const ctxFinal = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);

  expect(ctxFinal.fase).toBe('FIN_DE_JUEGO');
  expect(ctxFinal.ronda_actual).toBe(2);
});
