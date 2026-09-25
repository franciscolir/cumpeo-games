/* =============================================================
   Pictionary E2E Helpers — fixture factories para tests e2e.
   Reescrito en 8.5d-pre (deuda #122): sets con `submodo`,
   config `palabras_por_turno`, 9 fases reales y acciones
   reales del shell vía `window.__shellPartidaCallbacks`
   (sin fabricar estados).
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea un set válido por submodo de Pictionary.
 * Los items siguen el formato real: `{ concepto, prohibidas? }`,
 * donde `prohibidas` solo existe en PALABRAS.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} [opts.rondas] - rondas del juego (default 1)
 * @param {number} [opts.palabrasPorTurno] - palabras por turno (default 1)
 * @param {string[]} [opts.submodos] - submodos a crear (default los 4)
 * @returns {Promise<{setIds: Record<string, string>, juegoId: string}>}
 */
export async function crearSetPictionary(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const pic = juegos.find((j) => j.codigo === 'PICTIONARY');
    if (!pic) throw new Error('Juego PICTIONARY no encontrado');

    const uid = Date.now().toString(36);
    const rondas = opts.rondas || 1;
    const palabrasPorTurno = opts.palabrasPorTurno || 1;
    const submodos = Array.isArray(opts.submodos) && opts.submodos.length > 0
      ? opts.submodos
      : ['PALABRAS', 'GESTOS', 'PREGUNTAS', 'DIBUJO'];
    const totalItems = rondas * palabrasPorTurno;

    const setIds = {};
    for (const submodo of submodos) {
      const set = await window.cumpeo.services.set.crearSet({
        juego_id: pic.id,
        nombre: `Pictionary ${submodo} E2E ${uid}`,
        submodo
      });

      for (let i = 0; i < totalItems; i++) {
        const item = { concepto: `${submodo}_CONCEPTO_${i}` };
        if (submodo === 'PALABRAS') {
          item.prohibidas = [`${submodo}_PROH_A_${i}`, `${submodo}_PROH_B_${i}`];
        }
        await window.cumpeo.services.set.agregarItem(set.id, item);
      }

      setIds[submodo] = set.id;
    }

    return { setIds, juegoId: pic.id };
  }, opts);
}

/**
 * Crea una partida completa de Pictionary: sets por submodo,
 * circuito LISTO y partida con código público.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} [opts.rondas] - rondas (default 1)
 * @param {number} [opts.palabrasPorTurno] - palabras por turno (default 1)
 * @param {number} [opts.segundosPorModo] - segundos por submodo (default 30)
 * @returns {Promise<{partidaId: string, codigo: string}>}
 */
export async function crearPartidaPictionary(page, opts = {}) {
  const { juegoId } = await crearSetPictionary(page, opts);

  return await page.evaluate(async ({ juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const config = {
      rondas: opts.rondas || 1,
      palabras_por_turno: opts.palabrasPorTurno || 1,
      segundos_por_modo: opts.segundosPorModo || 30,
      puntos_por_acierto: 10,
      penalizacion_por_error: 0,
      penalizacion_por_pasar: 0,
      bonus_puntos: 5
    };

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pictionary E2E Circuit ${uid}`,
      juegos: [{ juego_id: juegoId, configuracion: config }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Pictionary E2E Circuit ${uid}`,
        juegos: [{ juego_id: juegoId, configuracion: config }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PK${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo || codigo };
  }, { juegoId, opts });
}

/**
 * Toma control, inicia partida, inicia juego Pictionary.
 */
export async function iniciarPartidaPictionary(page, partidaId) {
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

/**
 * Obtiene el contexto actual de la partida.
 */
export async function obtenerContextoPictionary(page, partidaId) {
  return await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    return {
      juegoEjecutadoId: je.id,
      estadoJuego: je.estado_juego,
      stateVersion: je.state_version,
      equipos: ctx.equipos,
      config: je.configuracion_congelada
    };
  }, partidaId);
}

/**
 * Navega al conductor de la partida por ID.
 */
export async function irAConductor(page, partidaId) {
  await page.goto(`/#/partidas/${partidaId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navega a la pantalla pública.
 */
export async function irAPublica(page, codigo) {
  await page.goto(`/#/publica-nueva/${codigo}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Espera a que el panel del conductor muestre un botón específico.
 */
export async function esperarBotonPictionary(page, botonId) {
  await page.waitForFunction((id) => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector(id);
  }, botonId, { timeout: 15000 });
}

/**
 * Lleva la UI hasta la fase ADIVINANDO (submodo → set → tiempo).
 * Deja el botón `#btn-pic-acierto` visible.
 */
export async function empezarTurnoUI(page) {
  await esperarBotonPictionary(page, '#btn-pic-submodo-PALABRAS');
  await page.click('#btn-pic-submodo-PALABRAS');
  await esperarBotonPictionary(page, '#btn-pic-elegir-set');
  await page.click('#btn-pic-elegir-set');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-tiempo');
  await page.click('#btn-pic-iniciar-tiempo');
  await esperarBotonPictionary(page, '#btn-pic-acierto');
}

/**
 * Juega un turno completo vía UI: submodo → set → tiempo → acierto.
 * Tras el acierto el shell aplica puntos y cambia de turno solo.
 */
export async function jugarTurnoUI(page) {
  await empezarTurnoUI(page);
  await page.click('#btn-pic-acierto');
  await page.waitForTimeout(300);
}

/**
 * Motor interno: ejecuta las acciones REALES del shell
 * (`window.__shellPartidaCallbacks.onAccion`) hasta cumplir el
 * objetivo, sin fabricar estados.
 * - `{ turnos }`: se detiene tras N aciertos.
 * - `{ submodo, fase }`: se detiene en esa combinación.
 * @param {import('@playwright/test').Page} page
 * @param {string} partidaId
 * @param {object} opciones
 */
async function _ejecutarFasesPictionary(page, partidaId, opciones) {
  await page.evaluate(async ({ pid, opciones }) => {
    const MAX_ITER = 200;

    const leer = async () => {
      const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      return ctx.juegos[0];
    };

    const ejecutar = async (tipo, payload) => {
      const previo = await leer();
      const version = previo.state_version;
      const cb = window.__shellPartidaCallbacks;
      if (!cb || typeof cb.onAccion !== 'function') {
        throw new Error('window.__shellPartidaCallbacks no disponible en el conductor');
      }
      await cb.onAccion(tipo, payload || {});

      const inicio = Date.now();
      while (Date.now() - inicio < 15000) {
        const je = await leer();
        if (je.state_version !== version) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      const je = await leer();
      throw new Error(
        `Sin cambio de estado tras "${tipo}" (fase=${je.estado_juego?.fase || 'sin fase'})`
      );
    };

    let turnos = 0;
    for (let iter = 0; iter < MAX_ITER; iter++) {
      const je = await leer();
      const estado = je.estado_juego || {};
      const fase = estado.fase || '';

      const cumplido = opciones.turnos != null
        ? turnos >= opciones.turnos
        : (estado.submodo_actual === opciones.submodo && fase === opciones.fase);
      if (cumplido) return;

      if (fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO') {
        throw new Error(`Objetivo no alcanzado: el juego terminó en ${fase}`);
      }

      if (fase === 'SELECCIONANDO_SUBMODO') {
        await ejecutar('elegir-submodo-pictionary', { submodo: estado.submodo_actual });
      } else if (fase === 'SELECCIONANDO_SET') {
        const sets = await window.cumpeo.services.set.listarSetsActivosPorJuego(je.juego_id);
        const set = (sets || []).find(
          (s) => !s.submodo || s.submodo === (estado.submodo_actual || 'PALABRAS')
        );
        if (!set) throw new Error(`No hay set activo para ${estado.submodo_actual}`);
        await ejecutar('elegir-set-pictionary', { set_id: set.id });
      } else if (fase === 'MOSTRANDO_PALABRA') {
        await ejecutar('iniciar-tiempo-pictionary');
      } else if (fase === 'ADIVINANDO') {
        await ejecutar('marcar-acierto-pictionary');
        turnos++;
      } else if (fase === 'ESPERA_VALIDACION') {
        await ejecutar('siguiente-turno-pictionary');
      } else {
        throw new Error(`Fase no manejada: ${fase || '(sin fase)'}`);
      }
    }
    throw new Error('Se alcanzó el máximo de iteraciones sin cumplir el objetivo');
  }, { pid: partidaId, opciones });
}

/**
 * Avanza N turnos programáticamente ejecutando las acciones reales
 * del shell (elegir submodo → set → tiempo → acierto), hasta que se
 * completen N aciertos o el juego termine.
 */
export async function avanzarTurnosProgramatico(page, partidaId, cantidad) {
  await _ejecutarFasesPictionary(page, partidaId, { turnos: cantidad });
}

/**
 * Salta a la primera vez que `submodo` queda en fase MOSTRANDO_PALABRA
 * (concepts cargados), jugando los turnos previos con acciones reales.
 */
export async function saltarASubmodoPictionary(page, partidaId, submodo) {
  await _ejecutarFasesPictionary(page, partidaId, {
    submodo,
    fase: 'MOSTRANDO_PALABRA'
  });
}
