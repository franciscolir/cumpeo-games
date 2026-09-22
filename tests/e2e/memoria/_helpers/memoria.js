/* =============================================================
   Memoricé E2E Helpers — fixture factories para tests e2e.
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea un set de Memoricé con numParejas items.
 * Cada item tiene { contenido: 'Elemento N' }.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.numParejas - cantidad de parejas (default 6)
 * @returns {Promise<{setId: string, juegoId: string}>}
 */
export async function crearSetMemoria(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    if (!memoria) throw new Error('Juego MEMORIA no encontrado');

    const uid = opts.uid || Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: memoria.id,
      nombre: `Memoria E2E ${uid}`
    });

    const numParejas = opts.numParejas || 6;
    for (let i = 0; i < numParejas; i++) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        contenido: `Elemento ${i + 1}`
      });
    }

    return { setId: set.id, juegoId: memoria.id };
  }, opts);
}

/**
 * Crea una partida completa de Memoricé con circuito y set.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @returns {Promise<{partidaId: string, codigo: string, setId: string}>}
 */
export async function setupPartidaMemoria(page, opts = {}) {
  const { setId, juegoId } = await crearSetMemoria(page, opts);

  return await page.evaluate(async ({ setId, juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const rondas = opts.rondas || 1;
    const numParejas = opts.numParejas || 6;
    const tiempoModal = opts.tiempoModal || 1;

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Memoria E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas,
          parejas_por_ronda: numParejas,
          tiempo_turno_seg: 20,
          tiempo_modal_cambio_turno_seg: tiempoModal,
          puntos_por_pareja: 10
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
        nombre: `Memoria E2E Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: {
            rondas,
            parejas_por_ronda: numParejas,
            tiempo_turno_seg: 20,
            tiempo_modal_cambio_turno_seg: tiempoModal,
            puntos_por_pareja: 10
          }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `ME${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo, setId };
  }, { setId, juegoId, opts });
}

/**
 * Toma control, comienza partida, inicia el juego Memoricé.
 */
export async function iniciarPartidaMemoria(page, partidaId) {
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
 * Obtiene el estado de juego actual de Memoricé.
 */
export async function obtenerEstadoMemoria(page, codigo) {
  return await page.evaluate(async (codigo) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  }, codigo);
}

/**
 * Encuentra 2 elementos con el mismo id_pareja (pareja descubierta).
 * @param {object} estado - estadoJuego con elementos[]
 * @returns {[number, number]} índices de la pareja
 */
export function encontrarParejaEnEstado(estado) {
  const { elementos } = estado;
  for (let i = 0; i < elementos.length; i++) {
    for (let j = i + 1; j < elementos.length; j++) {
      if (elementos[i].id_pareja === elementos[j].id_pareja) {
        return [i, j];
      }
    }
  }
  throw new Error('No se encontró ninguna pareja en el estado');
}

/**
 * Encuentra 2 elementos con distinto id_pareja (no pareja).
 * @param {object} estado - estadoJuego con elementos[]
 * @returns {[number, number]} índices de los 2 elementos distintos
 */
export function encontrarNoParejaEnEstado(estado) {
  const { elementos } = estado;
  for (let i = 0; i < elementos.length; i++) {
    for (let j = i + 1; j < elementos.length; j++) {
      if (elementos[i].id_pareja !== elementos[j].id_pareja) {
        return [i, j];
      }
    }
  }
  throw new Error('No se encontraron elementos no pareja');
}
