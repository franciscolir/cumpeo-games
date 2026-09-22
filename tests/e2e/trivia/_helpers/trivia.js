/* =============================================================
   Trivia E2E Helpers — fixture factories para tests e2e.
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea un set de Trivia con numPreguntas preguntas genéricas.
 * Cada pregunta tiene opciones A/B/C/D y la correcta en índice 0.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.numPreguntas - cantidad de preguntas (default 5)
 * @returns {Promise<{setId: string, juegoId: string}>}
 */
export async function crearSetTrivia(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    if (!trivia) throw new Error('Juego TRIVIA no encontrado');

    const uid = opts.uid || Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: trivia.id,
      nombre: `Trivia E2E ${uid}`
    });

    const numPreguntas = opts.numPreguntas || 5;
    for (let i = 0; i < numPreguntas; i++) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        pregunta: `Pregunta ${i + 1}?`,
        opciones: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        respuesta_correcta_index: 0
      });
    }

    return { setId: set.id, juegoId: trivia.id };
  }, opts);
}

/**
 * Crea 2 sets de Trivia (uno para Eq1, otro para Eq2).
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @returns {Promise<{setIdEq1: string, setIdEq2: string, juegoId: string}>}
 */
export async function crearSetsTrivia(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    if (!trivia) throw new Error('Juego TRIVIA no encontrado');

    const uid = opts.uid || Date.now().toString(36);
    const numPreguntas = opts.numPreguntas || 5;

    // Set para Eq1
    const set1 = await window.cumpeo.services.set.crearSet({
      juego_id: trivia.id,
      nombre: `Trivia E2E Eq1 ${uid}`
    });
    for (let i = 0; i < numPreguntas; i++) {
      await window.cumpeo.services.set.agregarItem(set1.id, {
        pregunta: `Eq1 Pregunta ${i + 1}?`,
        opciones: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        respuesta_correcta_index: 0
      });
    }

    // Set para Eq2
    const set2 = await window.cumpeo.services.set.crearSet({
      juego_id: trivia.id,
      nombre: `Trivia E2E Eq2 ${uid}`
    });
    for (let i = 0; i < numPreguntas; i++) {
      await window.cumpeo.services.set.agregarItem(set2.id, {
        pregunta: `Eq2 Pregunta ${i + 1}?`,
        opciones: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        respuesta_correcta_index: 0
      });
    }

    return { setIdEq1: set1.id, setIdEq2: set2.id, juegoId: trivia.id };
  }, opts);
}

/**
 * Crea una partida completa de Trivia con circuito y 2 sets.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @returns {Promise<{partidaId: string, codigo: string, setIdEq1: string, setIdEq2: string}>}
 */
export async function setupPartidaTrivia(page, opts = {}) {
  const { setIdEq1, setIdEq2, juegoId } = await crearSetsTrivia(page, opts);

  return await page.evaluate(async ({ setIdEq1, setIdEq2, juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const rondas = opts.rondas || 1;
    const preguntasPorTurno = opts.numPreguntas || 5;
    const tiempoPorPregunta = opts.tiempoPorPregunta || 3;

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Trivia E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas,
          preguntas_por_turno: preguntasPorTurno,
          tiempo_por_pregunta_seg: tiempoPorPregunta,
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
      circuito.id, circuito.version,
      {
        nombre: `Trivia E2E Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: {
            rondas,
            preguntas_por_turno: preguntasPorTurno,
            tiempo_por_pregunta_seg: tiempoPorPregunta,
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

    const codigo = `TR${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo, setIdEq1, setIdEq2 };
  }, { setIdEq1, setIdEq2, juegoId, opts });
}

/**
 * Toma control, comienza partida, inicia el juego Trivia.
 */
export async function iniciarPartidaTrivia(page, partidaId) {
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, je.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);
}

export async function irACOnductor(page, partidaId) {
  await page.goto(`/#/partidas/${partidaId}`);
  await page.waitForLoadState('networkidle');
}

export async function irAPublica(page, publicCodigo) {
  await page.goto(`/#/publica-nueva/${publicCodigo}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Responde una pregunta: selecciona la opción indicada y valida.
 */
export async function responderPregunta(page, opcionIndex) {
  await page.waitForFunction(() => {
    const area = document.querySelector('#shell-game-container');
    return area && area.querySelector('[data-opcion-index]');
  }, { timeout: 10000 });

  await page.click(`[data-opcion-index="${opcionIndex}"]`);
  await page.waitForTimeout(200);

  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-trivia-validar');
  }, { timeout: 10000 });

  await page.click('#btn-trivia-validar');
  await page.waitForTimeout(300);
}

/**
 * Responde las 5 preguntas de un turno completo.
 * Selecciona la opción correcta (índice 0) en cada una.
 */
export async function responderTurnoCompleto(page) {
  for (let i = 0; i < 5; i++) {
    // Esperar MOSTRANDO_PREGUNTA o SELECCIONANDO_RESPUESTA
    await page.waitForFunction(() => {
      const panel = document.querySelector('#shell-panel-conductor');
      if (!panel) return false;
      return panel.querySelector('#btn-trivia-iniciar-respuesta') ||
             document.querySelector('#shell-game-container [data-opcion-index]');
    }, { timeout: 10000 });

    // Si hay botón "Iniciar respuesta", clickearlo
    const btnIniciar = await page.$('#btn-trivia-iniciar-respuesta');
    if (btnIniciar) {
      await btnIniciar.click();
      await page.waitForTimeout(200);
    }

    // Responder con opción 0 (correcta)
    await responderPregunta(page, 0);

    // Si hay "Siguiente pregunta", clickearlo
    const btnSiguiente = await page.$('#btn-trivia-siguiente');
    if (btnSiguiente) {
      await btnSiguiente.click();
      await page.waitForTimeout(300);
    }
  }
}
