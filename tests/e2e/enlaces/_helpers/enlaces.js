/* =============================================================
   Enlaces E2E Helpers — fixture factories para tests e2e.

   DRAG-AND-DROP (documentado):
   La UI del conductor usa HTML5 Drag API nativa (dragstart /
   dragover / drop / dragend) sobre .enlaces-columna-b-item[data-idx].
   Verificado en este proyecto: locator.dragTo() SÍ funciona en
   Chromium headless (probe: _probe-drag.spec.js) y dispara los
   listeners de la UI. Se usa dragTo como método primario.
   Fallback documentado (si dragTo fallara en algún entorno):
     await source.dispatchEvent('dragstart');
     await target.dispatchEvent('dragover');
     await target.dispatchEvent('drop');
     await source.dispatchEvent('dragend');
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea 2 sets de Enlaces (uno por equipo) con numPares pares.
 * Cada item: { concepto_a, concepto_b, categoria }.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.numPares - default 8 (pares_por_turno)
 * @returns {Promise<{setIdEq1: string, setIdEq2: string, juegoId: string}>}
 */
export async function crearSetsEnlaces(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const enlaces = juegos.find((j) => j.codigo === 'ENLACES');
    if (!enlaces) throw new Error('Juego ENLACES no encontrado');

    const uid = opts.uid || Date.now().toString(36);
    const numPares = opts.numPares || 8;

    const crearSetConItems = async (nombre, prefijo) => {
      const set = await window.cumpeo.services.set.crearSet({
        juego_id: enlaces.id,
        nombre
      });
      for (let i = 0; i < numPares; i++) {
        await window.cumpeo.services.set.agregarItem(set.id, {
          concepto_a: `${prefijo} A${i + 1}`,
          concepto_b: `${prefijo} B${i + 1}`,
          categoria: 'E2E',
          dificultad: 1
        });
      }
      return set.id;
    };

    const setIdEq1 = await crearSetConItems(`Enlaces E2E Eq1 ${uid}`, 'E1');
    const setIdEq2 = await crearSetConItems(`Enlaces E2E Eq2 ${uid}`, 'E2');

    return { setIdEq1, setIdEq2, juegoId: enlaces.id };
  }, opts);
}

/**
 * Crea una partida de Enlaces con circuito y 2 sets.
 * @returns {Promise<{partidaId: string, codigo: string, setIdEq1: string, setIdEq2: string}>}
 */
export async function setupPartidaEnlaces(page, opts = {}) {
  const { setIdEq1, setIdEq2, juegoId } = await crearSetsEnlaces(page, opts);

  return await page.evaluate(async ({ setIdEq1, setIdEq2, juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const config = {
      rondas: opts.rondas || 1,
      pares_por_turno: opts.numPares || 8,
      tiempo_turno_seg: opts.tiempoTurno || 60,
      puntos_por_acierto: 10
    };

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Enlaces E2E Circuit ${uid}`,
      juegos: [{ juego_id: juegoId, configuracion: config }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Enlaces E2E Circuit ${uid}`,
        juegos: [{ juego_id: juegoId, configuracion: config }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `EN${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo, setIdEq1, setIdEq2 };
  }, { setIdEq1, setIdEq2, juegoId, opts });
}

/**
 * Toma control, comienza partida, inicia el juego Enlaces.
 */
export async function iniciarPartidaEnlaces(page, partidaId) {
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
 * Obtiene el estado de juego actual de Enlaces.
 */
export async function obtenerEstadoEnlaces(page, partidaId) {
  return await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].estado_juego;
  }, partidaId);
}

/**
 * Espera hasta que la fase del juego sea la indicada.
 * Polling con page.evaluate (waitForFunction+async no esperaba bien).
 */
export async function esperarFase(page, partidaId, faseEsperada, timeout = 15000) {
  const inicio = Date.now();
  let ultima = null;
  while (Date.now() - inicio < timeout) {
    ultima = await obtenerEstadoEnlaces(page, partidaId);
    if (ultima?.fase === faseEsperada) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timeout esperando fase ${faseEsperada}; última fase=${ultima?.fase}`);
}

/**
 * Iniciar juego + iniciar ronda → SELECCIONANDO_SET con sets visibles.
 */
export async function iniciarJuegoYRonda(page) {
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-iniciar-juego'), null, { timeout: 20000 });
  await page.click('#btn-enlaces-iniciar-juego');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-iniciar-ronda'), null, { timeout: 10000 });
  await page.click('#btn-enlaces-iniciar-ronda');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), null, { timeout: 10000 });
}

/**
 * Elegir set por id (o el primero si no se indica).
 * seleccionar-set encadena seleccionarSet + prepararTablero → ORDENANDO.
 */
export async function elegirSet(page, setId) {
  await page.waitForFunction(() => document.querySelector('[data-set-id]'), null, { timeout: 10000 });
  if (setId) {
    await page.click(`[data-set-id="${setId}"]`);
  } else {
    await page.locator('[data-set-id]').first().click();
  }
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-validar'), null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('.enlaces-columna-b-item'), null, { timeout: 10000 });
}

/**
 * Simula drag-and-drop de un elemento de la columna B.
 * Método primario: locator.dragTo (verificado en Chromium headless).
 * @param {import('@playwright/test').Page} page
 * @param {number} desdeIdx
 * @param {number} hastaIdx
 */
export async function moverElemento(page, desdeIdx, hastaIdx) {
  const source = page.locator(`.enlaces-columna-b-item[data-idx="${desdeIdx}"]`);
  const target = page.locator(`.enlaces-columna-b-item[data-idx="${hastaIdx}"]`);
  await source.dragTo(target);
  await page.waitForTimeout(350);
}

/**
 * Presiona Validar (disponible en ORDENANDO y ESPERA_VALIDACION).
 */
export async function validarTurno(page) {
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-validar'), null, { timeout: 10000 });
  await page.click('#btn-enlaces-validar');
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-siguiente-turno'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
}

/**
 * Presiona Deshacer (solo disponible en ORDENANDO).
 */
export async function deshacer(page) {
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-deshacer'), null, { timeout: 10000 });
  await page.click('#btn-enlaces-deshacer');
  await page.waitForTimeout(350);
}

/**
 * Orden objetivo de columna_b para 100% de aciertos.
 * @param {object} estado - estadoJuego con columna_a y pares_correctos
 * @returns {string[]}
 */
export function objetivoDesde(estado) {
  return estado.columna_a.map((a) => estado.pares_correctos[a]);
}

/**
 * Derange del orden objetivo (0 aciertos): rotación a izquierda de 1.
 * Con valores únicos, B[i] = T[(i+1)%n] nunca coincide en fila i.
 * @param {string[]} objetivo
 * @returns {string[]}
 */
export function derange(objetivo) {
  if (objetivo.length <= 1) return [...objetivo];
  return objetivo.slice(1).concat(objetivo.slice(0, 1));
}

/**
 * Plan de movimientos (selection-sort) para llevar columna_b actual
 * hasta el orden `objetivo`. Cada movimiento es {desde, hasta}
 * relativo al estado en el momento de aplicarse.
 * @param {string[]} actual
 * @param {string[]} objetivo
 * @returns {Array<{desde: number, hasta: number}>}
 */
export function planificarOrden(actual, objetivo) {
  const arr = [...actual];
  const moves = [];
  for (let i = 0; i < objetivo.length; i++) {
    if (arr[i] === objetivo[i]) continue;
    const j = arr.indexOf(objetivo[i]);
    if (j === -1) {
      throw new Error(`Elemento objetivo "${objetivo[i]}" no está en la columna`);
    }
    if (j !== i) {
      moves.push({ desde: j, hasta: i });
      const [elem] = arr.splice(j, 1);
      arr.splice(i, 0, elem);
    }
  }
  return moves;
}

/**
 * Aplica una lista de movimientos vía drag-and-drop y espera a que
 * el estado del juego refleje cada cambio.
 */
export async function aplicarMovimientos(page, partidaId, moves, estadoInicial) {
  let esperado = [...estadoInicial.columna_b];
  for (const m of moves) {
    await moverElemento(page, m.desde, m.hasta);
    const [elem] = esperado.splice(m.desde, 1);
    esperado.splice(m.hasta, 0, elem);
    const copia = [...esperado];
    const inicio = Date.now();
    let ok = false;
    while (Date.now() - inicio < 10000) {
      const estado = await obtenerEstadoEnlaces(page, partidaId);
      if (JSON.stringify(estado?.columna_b || []) === JSON.stringify(copia)) {
        ok = true;
        break;
      }
      await page.waitForTimeout(200);
    }
    if (!ok) {
      throw new Error(`Timeout esperando movimiento ${m.desde}->${m.hasta}`);
    }
  }
  return esperado;
}

/**
 * Ordena la columna B al orden objetivo (100% aciertos) con drag-and-drop.
 */
export async function ordenarPerfecto(page, partidaId, estado) {
  const objetivo = objetivoDesde(estado);
  const moves = planificarOrden(estado.columna_b, objetivo);
  await aplicarMovimientos(page, partidaId, moves, estado);
  return objetivo;
}

/**
 * Ordena la columna B a un derange del objetivo (0 aciertos).
 */
export async function ordenarCeroAciertos(page, partidaId, estado) {
  const objetivo = derange(objetivoDesde(estado));
  const moves = planificarOrden(estado.columna_b, objetivo);
  await aplicarMovimientos(page, partidaId, moves, estado);
  return objetivo;
}

/**
 * Avanza Eq1 desde ORDENANDO hasta CAMBIO_TURNO (valida y pasa turno).
 */
export async function completarTurnoEq1(page, partidaId) {
  await validarTurno(page);
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-siguiente-turno'), null, { timeout: 10000 });
  await page.click('#btn-enlaces-siguiente-turno');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
}

/**
 * Desde CAMBIO_TURNO inicia el siguiente turno (Eq1→Eq2 o Eq2→FIN_DE_RONDA).
 */
export async function iniciarSiguienteTurno(page, partidaId) {
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-iniciar-turno'), null, { timeout: 15000 });
  await page.click('#btn-enlaces-iniciar-turno');
  await page.waitForTimeout(400);
}
