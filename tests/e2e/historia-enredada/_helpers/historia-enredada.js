/* =============================================================
   Historia Enredada E2E Helpers
   ============================================================= */

import { waitForCumpeo } from '../../_helpers/auth.js';

/**
 * Crea un set de Historia Enredada con 3 historias.
 * @returns {Promise<{setId: string, juegoId: string}>}
 */
export async function crearSetHistoriaEnredada(page, opts = {}) {
  await waitForCumpeo(page);
  return await page.evaluate(async (opts) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const he = juegos.find((j) => j.codigo === 'HISTORIA_ENREDADA');
    if (!he) throw new Error('Juego HISTORIA_ENREDADA no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: he.id,
      nombre: `Historia E2E ${uid}`
    });

    const itemsBase = [
      { titulo: 'El robo', descripcion: 'Dos ladrones', guion: 'Guion 1' },
      { titulo: 'El naufragio', descripcion: 'Un barco', guion: 'Guion 2' },
      { titulo: 'La boda', descripcion: 'Una boda', guion: 'Guion 3' }
    ];

    for (const item of itemsBase) {
      await window.cumpeo.services.set.agregarItem(set.id, item);
    }

    return { setId: set.id, juegoId: he.id };
  }, opts);
}

/**
 * Crea una partida completa de Historia Enredada con circuito y set.
 * @returns {Promise<{partidaId: string, codigo: string, setId: string}>}
 */
export async function setupPartidaHistoriaEnredada(page, opts = {}) {
  const { setId, juegoId } = await crearSetHistoriaEnredada(page, opts);

  return await page.evaluate(async ({ setId, juegoId, opts }) => {
    const uid = Date.now().toString(36);
    const rondas = opts.rondas || 1;

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Historia E2E Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: { rondas, puntos_por_historia: 10 }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Historia E2E Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: { rondas, puntos_por_historia: 10 }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `HE${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo, setId };
  }, { setId, juegoId, opts });
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
 * Toma control, comienza partida, inicia el juego Historia Enredada.
 */
export async function iniciarPartidaHistoriaEnredada(page, partidaId) {
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
