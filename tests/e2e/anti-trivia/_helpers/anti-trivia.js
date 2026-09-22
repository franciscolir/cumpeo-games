/* =============================================================
   Anti-Trivia E2E Helpers — fixture factories para tests e2e.
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea 2 sets de Anti-Trivia (uno por equipo) con numPreguntas items.
 * Cada item: { pregunta, respuestas_correctas: [2 strings], categoria }.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.numPreguntas - default 5
 * @returns {Promise<{setIdEq1: string, setIdEq2: string, juegoId: string}>}
 */
export async function crearSetsAntiTrivia(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const at = juegos.find((j) => j.codigo === 'ANTI_TRIVIA');
    if (!at) throw new Error('Juego ANTI_TRIVIA no encontrado');

    const uid = opts.uid || Date.now().toString(36);
    const numPreguntas = opts.numPreguntas || 5;

    const crearSetConItems = async (nombre, prefijo) => {
      const set = await window.cumpeo.services.set.crearSet({
        juego_id: at.id,
        nombre
      });
      for (let i = 0; i < numPreguntas; i++) {
        await window.cumpeo.services.set.agregarItem(set.id, {
          pregunta: `${prefijo} Pregunta ${i + 1}?`,
          respuestas_correctas: [`${prefijo} Correcta ${i + 1}a`, `${prefijo} Correcta ${i + 1}b`],
          categoria: 'E2E'
        });
      }
      return set.id;
    };

    const setIdEq1 = await crearSetConItems(`AntiTrivia E2E Eq1 ${uid}`, 'Eq1');
    const setIdEq2 = await crearSetConItems(`AntiTrivia E2E Eq2 ${uid}`, 'Eq2');

    return { setIdEq1, setIdEq2, juegoId: at.id };
  }, opts);
}

/**
 * Crea una partida de Anti-Trivia con circuito y 2 sets.
 * @returns {Promise<{partidaId: string, codigo: string, setIdEq1: string, setIdEq2: string}>}
 */
export async function setupPartidaAntiTrivia(page, opts = {}) {
  const { setIdEq1, setIdEq2, juegoId } = await crearSetsAntiTrivia(page, opts);

  return await page.evaluate(async ({ setIdEq1, setIdEq2, juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const config = {
      rondas: opts.rondas || 1,
      preguntas_por_turno: opts.numPreguntas || 5,
      tiempo_respuesta_seg: opts.tiempoRespuesta || 30,
      penalizacion_por_error: 0,
      puntos_por_acierto: 10
    };

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `AntiTrivia E2E Circuit ${uid}`,
      juegos: [{ juego_id: juegoId, configuracion: config }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `AntiTrivia E2E Circuit ${uid}`,
        juegos: [{ juego_id: juegoId, configuracion: config }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `AT${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo, setIdEq1, setIdEq2 };
  }, { setIdEq1, setIdEq2, juegoId, opts });
}

/**
 * Toma control, comienza partida, inicia el juego Anti-Trivia.
 */
export async function iniciarPartidaAntiTrivia(page, partidaId) {
  await waitForCumpeo(page);
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
  await waitForCumpeo(page);
}

export async function irAPublica(page, publicCodigo) {
  await page.goto(`/#/publica-nueva/${publicCodigo}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Obtiene el estado de juego actual de Anti-Trivia.
 */
export async function obtenerEstadoAntiTrivia(page, partidaId) {
  return await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);
}

/**
 * Iniciar juego + iniciar ronda → SELECCIONANDO_SET.
 */
export async function iniciarJuegoYRonda(page) {
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-juego'), null, { timeout: 20000 });
  await page.click('#btn-antitrivia-iniciar-juego');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-ronda'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-iniciar-ronda');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), null, { timeout: 10000 });
}

/**
 * Elegir set por id (o el primero si no se indica).
 */
export async function elegirSet(page, setId) {
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), null, { timeout: 10000 });
  if (setId) {
    await page.click(`[data-set-id="${setId}"]`);
  } else {
    await page.locator('[data-set-id]').first().click();
  }
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-respuesta'), null, { timeout: 10000 });
}

/**
 * Responde 1 pregunta completa: iniciar → marcar → siguiente.
 * Espera la transición de fase tras cada acción para evitar
 * clics sobre callbacks stale (race con _renderContenido).
 */
export async function responderPregunta(page, resultado = 'acierto') {
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-iniciar-respuesta'), null, { timeout: 10000 });
  await page.click('#btn-antitrivia-iniciar-respuesta');
  await page.waitForTimeout(300);

  const btn = resultado === 'acierto' ? '#btn-antitrivia-acierto' : '#btn-antitrivia-error';
  await page.waitForFunction((sel) => !!document.querySelector(sel), btn, { timeout: 10000 });
  await page.click(btn);
  await page.waitForFunction(() => document.querySelector('#btn-antitrivia-siguiente-pregunta'), null, { timeout: 10000 });
  await page.waitForTimeout(300);

  await page.click('#btn-antitrivia-siguiente-pregunta');
  await page.waitForTimeout(300);
}

/**
 * Completa las preguntas_por_turno preguntas de un turno.
 */
export async function jugarTurnoCompleto(page, resultado = 'acierto') {
  for (let i = 0; i < 5; i++) {
    await responderPregunta(page, resultado);
  }
  await page.waitForTimeout(300);
}
