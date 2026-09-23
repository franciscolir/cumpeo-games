/* =============================================================
   Rosco E2E Helpers — fixture factories para tests e2e del Rosco.

   Modelo N rondas = N sets: cada set tiene exactamente 27 items
   (1 por letra, sin campo ronda).
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

const ALFABETO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'
];

/**
 * Crea N sets de Rosco, cada uno con 27 items (1 por letra).
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.cantidad - cantidad de sets (default 1)
 * @returns {Promise<{juegoId: string, sets: Array<{id: string, nombre: string}>}>}
 */
export async function crearSetsRosco(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async ({ cantidad }) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const rosco = juegos.find((j) => j.codigo === 'ROSCO');
    if (!rosco) throw new Error('Juego ROSCO no encontrado');

    const uid = Date.now().toString(36);
    const alfabeto = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];

    const sets = [];
    for (let s = 1; s <= cantidad; s++) {
      const nombre = `Rosco E2E S${s} ${uid}`;
      const set = await window.cumpeo.services.set.crearSet({
        juego_id: rosco.id,
        nombre
      });
      for (const letra of alfabeto) {
        await window.cumpeo.services.set.agregarItem(set.id, {
          letra,
          definicion: `Definición S${s} de la letra ${letra}`,
          respuesta: `Respuesta S${s} ${letra}`
        });
      }
      sets.push({ id: set.id, nombre });
    }

    return { juegoId: rosco.id, sets };
  }, { cantidad: Math.max(1, opts.cantidad || 1) });
}

/**
 * Crea uno o más sets de Rosco (retro-compatible).
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - cantidad de sets a crear (default 1)
 * @returns {Promise<{setId: string, juegoId: string, sets: Array}>}
 */
export async function crearSetRoscoCompleto(page, opts = {}) {
  const { juegoId, sets } = await crearSetsRosco(page, { cantidad: opts.rondas || 1 });
  return { setId: sets[0].id, juegoId, sets };
}

/**
 * Crea una partida completa de Rosco con circuito y N sets.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - rondas del circuito (default 1); crea esa cantidad de sets
 * @param {number} opts.segundos - segundos por equipo (default 60)
 * @returns {Promise<{partidaId: string, codigo: string, juegoId: string, sets: Array}>}
 */
export async function setupPartidaRosco(page, opts = {}) {
  const rondas = opts.rondas || 1;
  const { juegoId, sets } = await crearSetsRosco(page, { cantidad: opts.cantidadSets || rondas });

  const partida = await page.evaluate(async ({ juegoId, opts, rondas }) => {
    const uid = Date.now().toString(36);

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Rosco E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas,
          segundos_por_equipo: opts.segundos || 60,
          puntos_por_acierto: 10,
          penalizacion_puntos: 5
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
        nombre: `Rosco E2E Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: {
            rondas,
            segundos_por_equipo: opts.segundos || 60,
            puntos_por_acierto: 10,
            penalizacion_puntos: 5
          }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `RS${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo };
  }, { juegoId, opts, rondas });

  return { ...partida, juegoId, sets };
}

/**
 * Toma control, inicia partida, inicia juego Rosco.
 */
export async function iniciarPartidaRosco(page, partidaId) {
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
 * Abre el modal de inicio, elige N rondas y sus sets, y confirma.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {Array<{id: string}>} opts.sets - sets a elegir en orden (1 por ronda)
 * @param {number} opts.rondas - default sets.length
 */
export async function iniciarJuegoRoscoConSets(page, opts = {}) {
  const sets = opts.sets || [];
  const rondas = opts.rondas || sets.length || 1;

  await page.click('#btn-rosco-iniciar-juego');
  await page.waitForSelector('#rosco-modal-inicio', { timeout: 15000 });

  if (rondas > 1) {
    await page.selectOption('#rosco-select-rondas', String(rondas));
  }

  for (let i = 0; i < rondas; i++) {
    if (!sets[i]) throw new Error(`iniciarJuegoRoscoConSets: falta set para ronda ${i + 1}`);
    await page.selectOption(`#rosco-select-set-${i}`, sets[i].id);
  }

  await page.click('#btn-rosco-modal-iniciar');
}

/**
 * Abre el modal y confirma con el único set disponible (atajo para 1 ronda).
 */
export async function iniciarJuegoRoscoModalUnSet(page, setId) {
  await iniciarJuegoRoscoConSets(page, { sets: [{ id: setId }], rondas: 1 });
}

/**
 * Obtiene el contexto actual de la partida (juego ejecutado + estado).
 */
export async function obtenerContextoRosco(page, partidaId) {
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
 * Avanza el rosco N pasos aplicando aciertos.
 */
export async function avanzarConAciertos(page, partidaId, cantidad) {
  await page.evaluate(async ({ pid, cantidad }) => {
    const { RoscoGameDefinition } = await import('/src/games/rosco/RoscoGameDefinition.js');

    for (let i = 0; i < cantidad; i++) {
      const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      const je = ctx.juegos[0];
      const estado = je.estado_juego;
      const config = je.configuracion_congelada || RoscoGameDefinition.defaultConfig;

      const letraActual = estado.rosco?.[estado.indice_actual]?.letra;
      let nuevoEstado = RoscoGameDefinition.aplicarAcierto(estado, letraActual, config);
      nuevoEstado = RoscoGameDefinition.avanzarLetra(nuevoEstado);

      await window.cumpeo.services.partida.actualizarEstadoJuego(
        pid, je.id, nuevoEstado, je.state_version,
        window.cumpeo.session.sessionId, crypto.randomUUID()
      );
    }
  }, { pid: partidaId, cantidad });
}

/**
 * Aplica un pasapalabra a la letra actual.
 */
export async function aplicarPasapalabra(page, partidaId) {
  await page.evaluate(async (pid) => {
    const { RoscoGameDefinition } = await import('/src/games/rosco/RoscoGameDefinition.js');
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    const estado = je.estado_juego;
    const letraActual = estado.rosco?.[estado.indice_actual]?.letra;

    let nuevoEstado = RoscoGameDefinition.aplicarPasapalabra(estado, letraActual);
    nuevoEstado = RoscoGameDefinition.avanzarLetra(nuevoEstado);
    nuevoEstado = RoscoGameDefinition.cambiarTurno(nuevoEstado);

    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, je.id, nuevoEstado, je.state_version,
      window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);
}

/**
 * Aplica un error a la letra actual.
 */
export async function aplicarError(page, partidaId) {
  await page.evaluate(async (pid) => {
    const { RoscoGameDefinition } = await import('/src/games/rosco/RoscoGameDefinition.js');
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    const estado = je.estado_juego;
    const config = je.configuracion_congelada || RoscoGameDefinition.defaultConfig;
    const letraActual = estado.rosco?.[estado.indice_actual]?.letra;

    let nuevoEstado = RoscoGameDefinition.aplicarError(estado, letraActual, config);
    nuevoEstado = RoscoGameDefinition.cambiarTurno(nuevoEstado);

    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, je.id, nuevoEstado, je.state_version,
      window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);
}
