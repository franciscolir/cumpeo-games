/* =============================================================
   Rosco E2E Helpers — fixture factories para tests e2e del Rosco.
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

const ALFABETO = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'
];

/**
 * Crea un set de Rosco con todas las letras del alfabeto.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - rondas del juego (default 1)
 * @param {number} opts.segundos - segundos por equipo (default 60)
 * @returns {Promise<{setId: string, juegoId: string}>}
 */
export async function crearSetRoscoCompleto(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const rosco = juegos.find((j) => j.codigo === 'ROSCO');
    if (!rosco) throw new Error('Juego ROSCO no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: rosco.id,
      nombre: `Rosco E2E ${uid}`
    });

    const alfabeto = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];

    const rondas = opts.rondas || 1;

    for (let r = 1; r <= rondas; r++) {
      for (const letra of alfabeto) {
        await window.cumpeo.services.set.agregarItem(set.id, {
          letra,
          definicion: `Definición R${r} de la letra ${letra}`,
          respuesta: `Respuesta R${r} ${letra}`,
          ronda: r
        });
      }
    }

    return { setId: set.id, juegoId: rosco.id };
  }, opts);
}

/**
 * Crea una partida completa de Rosco con circuito y set.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - rondas (default 1)
 * @param {number} opts.segundos - segundos por equipo (default 60)
 * @returns {Promise<{partidaId: string, codigo: string, setId: string}>}
 */
export async function setupPartidaRosco(page, opts = {}) {
  const { juegoId } = await crearSetRoscoCompleto(page, opts);

  return await page.evaluate(async ({ juegoId, opts }) => {
    const uid = Date.now().toString(36);

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Rosco E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas: opts.rondas || 1,
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
            rondas: opts.rondas || 1,
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

    return { partidaId: partida.id, codigo: partida.public_codigo, setId: null };
  }, { juegoId, opts });
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
