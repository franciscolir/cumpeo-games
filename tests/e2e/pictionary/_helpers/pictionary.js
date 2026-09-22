/* =============================================================
   Pictionary E2E Helpers — fixture factories para tests e2e.
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea un set válido de Pictionary con items para todos los modos.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - rondas del juego (default 1)
 * @param {number} opts.palabrasPorModo - palabras por modo (default 1)
 * @returns {Promise<{setId: string, juegoId: string}>}
 */
export async function crearSetPictionary(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const pic = juegos.find((j) => j.codigo === 'PICTIONARY');
    if (!pic) throw new Error('Juego PICTIONARY no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: pic.id,
      nombre: `Pictionary E2E ${uid}`
    });

    const rondas = opts.rondas || 1;
    const palabrasPorModo = opts.palabrasPorModo || 1;
    const totalItems = rondas * palabrasPorModo;

    const modos = [
      { modo: 1, conceptos: ['GATO', 'PERRO', 'CASA', 'ARBOL', 'SOL', 'LUNA', 'AGUA', 'FUEGO'] },
      { modo: 2, conceptos: ['BAILAR', 'CANTAR', 'CORRER', 'SALTAR', 'NADAR', 'VOLAR', 'COMER', 'DORMIR'] },
      { modo: 3, conceptos: ['MONTAÑA', 'RIO', 'CIUDAD', 'BARCO', 'AVION', 'TREN', 'MOTO', 'BICI'] },
      { modo: 4, conceptos: ['HIELO', 'VIENTO', 'LUZ', 'SONIDO', 'CALOR', 'FRIO', 'COLOR', 'FORMA'] }
    ];

    for (const { modo, conceptos } of modos) {
      for (let i = 0; i < totalItems; i++) {
        const item = {
          modo,
          concepto: conceptos[i % conceptos.length]
        };
        if (modo === 1) {
          item.prohibidas = ['prohibida_a', 'prohibida_b'];
        }
        await window.cumpeo.services.set.agregarItem(set.id, item);
      }
    }

    return { setId: set.id, juegoId: pic.id };
  }, opts);
}

/**
 * Crea una partida completa de Pictionary con circuito y set.
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {number} opts.rondas - rondas (default 1)
 * @param {number} opts.palabrasPorModo - palabras por modo (default 1)
 * @param {number} opts.segundosPorModo - segundos por modo (default 3)
 * @returns {Promise<{partidaId: string, codigo: string}>}
 */
export async function crearPartidaPictionary(page, opts = {}) {
  const { juegoId } = await crearSetPictionary(page, opts);

  return await page.evaluate(async ({ juegoId, opts }) => {
    const uid = Date.now().toString(36);

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pictionary E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas: opts.rondas || 1,
          palabras_por_modo: opts.palabrasPorModo || 1,
          segundos_por_modo: opts.segundosPorModo || 3,
          puntos_por_acierto: 10,
          penalizacion_por_error: 0,
          penalizacion_por_pasar: 0,
          bonus_puntos: 5
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
        nombre: `Pictionary E2E Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: {
            rondas: opts.rondas || 1,
            palabras_por_modo: opts.palabrasPorModo || 1,
            segundos_por_modo: opts.segundosPorModo || 3,
            puntos_por_acierto: 10,
            penalizacion_por_error: 0,
            penalizacion_por_pasar: 0,
            bonus_puntos: 5
          }
        }],
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

    return { partidaId: partida.id, codigo: partida.public_codigo };
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
 * Juega un turno completo vía UI: iniciar modo → iniciar tiempo → acierto.
 */
export async function jugarTurnoUI(page) {
  await page.click('#btn-pic-iniciar-modo');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-pic-iniciar-tiempo');
  }, { timeout: 10000 });

  await page.click('#btn-pic-iniciar-tiempo');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-pic-acierto');
  }, { timeout: 10000 });

  await page.click('#btn-pic-acierto');
  await page.waitForTimeout(300);
}

/**
 * Avanza N turnos programáticamente (vía service calls).
 * Cada iteración completa un turno full (INICIO→ADIVINANDO→next).
 */
export async function avanzarTurnosProgramatico(page, partidaId, cantidad) {
  await page.evaluate(async ({ pid, cantidad }) => {
    const { PictionaryGameDefinition } = await import('/src/games/pictionary/PictionaryGameDefinition.js');

    for (let i = 0; i < cantidad; i++) {
      let ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      let je = ctx.juegos[0];
      let estado = je.estado_juego;
      let config = je.configuracion_congelada || PictionaryGameDefinition.defaultConfig;

      if (estado.fase === 'FIN_DE_RONDA' || estado.fase === 'FIN_DE_JUEGO') break;

      if (estado.fase === 'INICIO_RONDA') {
        let nuevoEstado = PictionaryGameDefinition.seleccionarModo(estado);
        nuevoEstado = PictionaryGameDefinition.mostrarPalabra(nuevoEstado, { items: [] });
        nuevoEstado = PictionaryGameDefinition.iniciarTiempo(nuevoEstado);

        await window.cumpeo.services.partida.actualizarEstadoJuego(
          pid, je.id, nuevoEstado, je.state_version,
          window.cumpeo.session.sessionId, crypto.randomUUID()
        );
      }

      ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      je = ctx.juegos[0];
      estado = je.estado_juego;
      config = je.configuracion_congelada || PictionaryGameDefinition.defaultConfig;

      if (estado.fase === 'ADIVINANDO') {
        let nuevoEstado = PictionaryGameDefinition.detenerTiempo(estado, estado.tiempo_restante_seg || 0);
        nuevoEstado = PictionaryGameDefinition.aplicarAcierto(nuevoEstado, config);

        await window.cumpeo.services.partida.actualizarEstadoJuego(
          pid, je.id, nuevoEstado, je.state_version,
          window.cumpeo.session.sessionId, crypto.randomUUID()
        );
      }
    }
  }, { pid: partidaId, cantidad }, { timeout: 60000 });
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
