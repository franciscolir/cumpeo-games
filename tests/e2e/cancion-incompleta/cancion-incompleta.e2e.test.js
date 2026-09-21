import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { bootstrap } from '../../../src/app/bootstrap.js';
import { DB_NAME } from '../../../src/adapters/schema.js';
import { crearPartidaCancionIncompleta, obtenerEstadoCancionIncompleta, CancionIncompletaGameDefinition } from './helper.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('Canción Incompleta e2e', () => {
  let adapter;
  let app;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    app = await bootstrap(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  it('crea partida y estado inicial vacío', async () => {
    const partida = await crearPartidaCancionIncompleta(app);
    const juego = partida.juegos.find(j => j.juego_codigo === 'CANCION_INCOMPLETA');
    expect(juego).toBeDefined();
    expect(juego.estado_juego).toBeNull();
  });

  it('inicia juego y alcanza TURNO_ACTIVO', async () => {
    const partida = await crearPartidaCancionIncompleta(app);
    const servicios = app.services;
    const juego = partida.juegos.find(j => j.juego_codigo === 'CANCION_INCOMPLETA');

    const config = { segundos_por_cancion: 10, puntos_por_acierto: 1, penalizacion_por_error: 1 };
    const estadoInicial = CancionIncompletaGameDefinition.estadoInicial(config);
    await servicios.partida.actualizarEstadoJuego(partida.id, juego.id, estadoInicial, juego.state_version, 'test', 'a1');

    const partidaAct = await servicios.partida.obtenerPartidaPorId(partida.id);
    const juegoAct = partidaAct.juegos.find(j => j.id === juego.id);
    expect(juegoAct.estado_juego.fase).toBe('INICIO_RONDA');

    const estadoTurno = CancionIncompletaGameDefinition.iniciarTurno(juegoAct.estado_juego);
    await servicios.partida.actualizarEstadoJuego(partida.id, juego.id, estadoTurno, juegoAct.state_version, 'test', 'a2');

    const partidaFinal = await servicios.partida.obtenerPartidaPorId(partida.id);
    const estadoFinal = obtenerEstadoCancionIncompleta(partidaFinal);
    expect(estadoFinal.fase).toBe('TURNO_ACTIVO');
  });

  it('acierto aumenta puntos y pasa turno', async () => {
    const partida = await crearPartidaCancionIncompleta(app);
    const { services } = app;
    let juego = partida.juegos.find(j => j.juego_codigo === 'CANCION_INCOMPLETA');

    const config = { segundos_por_cancion: 10 };
    const estadoInicial = CancionIncompletaGameDefinition.estadoInicial(config);
    await services.partida.actualizarEstadoJuego(partida.id, juego.id, estadoInicial, juego.state_version, 'test', 'a1');

    const estadoTurno = CancionIncompletaGameDefinition.iniciarTurno(estadoInicial);
    await services.partida.actualizarEstadoJuego(partida.id, juego.id, estadoTurno, 0, 'test', 'a2');

    const estadoAcierto = CancionIncompletaGameDefinition.aplicarAcierto(estadoTurno, config);
    await services.partida.actualizarEstadoJuego(partida.id, juego.id, estadoAcierto, 0, 'test', 'a3');

    const p = await services.partida.obtenerPartidaPorId(partida.id);
    const e = obtenerEstadoCancionIncompleta(p);
    expect(e.puntos_equipo_1).toBe(1);
    expect(e.equipo_actual).toBe(2);
  });
});
