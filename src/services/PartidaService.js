/* =============================================================
   PartidaService — fachada única sobre PartidaRepository y ControlService.

   NO implementa lógica de negocio. Solo delega.
   La UI consume este servicio como único punto de entrada para
   operaciones sobre partidas.

   Todos los métodos de escritura crítica reciben `actionId` como
   último argumento (excepto `expirarPartida`, que es operación
   del sistema sin lease ni idempotencia).
   ============================================================= */

import { PartidaRepository } from '../repositories/PartidaRepository.js';
import { ControlService } from './ControlService.js';

export class PartidaService {
  constructor(adapter) {
    this.adapter = adapter;
    this.partidas = new PartidaRepository(adapter);
    this.control = new ControlService(adapter);
  }

  /* =============================================================
     Grupo 1 — Lecturas (delegan a this.partidas)
     ============================================================= */

  /**
   * Obtiene una partida por ID.
   * @param {string} partidaId
   * @returns {Promise<object>} Partida encontrada
   */
  async obtenerPartida(partidaId) {
    return this.partidas.obtenerPartida(partidaId);
  }

  /**
   * Obtiene el contexto completo de espera de una partida (partida, juegos, equipos).
   * @param {string} partidaId
   * @returns {Promise<object>} { partida, juegos, equipos }
   */
  async obtenerContextoEspera(partidaId) {
    return this.partidas.obtenerContextoEspera(partidaId);
  }

  /**
   * Obtiene una partida por su código público.
   * @param {string} publicCodigo
   * @returns {Promise<object>} Partida encontrada
   */
  async obtenerPartidaPorCodigo(publicCodigo) {
    return this.partidas.obtenerPartidaPorCodigo(publicCodigo);
  }

  /**
   * Lista partidas filtradas por estado.
   * @param {string} estado
   * @returns {Promise<object[]>} Array de partidas
   */
  async listarPartidasPorEstado(estado) {
    return this.partidas.listarPartidasPorEstado(estado);
  }

  /**
   * Lista todas las partidas en curso.
   * @returns {Promise<object[]>} Array de partidas
   */
  async listarPartidasEnCurso() {
    return this.partidas.listarPartidasEnCurso();
  }

  /**
   * Lista partidas que pueden ser recuperadas.
   * @returns {Promise<object[]>} Array de partidas
   */
  async listarPartidasRecuperables() {
    return this.partidas.listarPartidasRecuperables();
  }

  /**
   * Lista partidas que pueden expirar.
   * @returns {Promise<object[]>} Array de partidas
   */
  async listarPartidasExpirables() {
    return this.partidas.listarPartidasExpirables();
  }

  /* =============================================================
     Grupo 2 — Lease (delegan a this.control)
     ============================================================= */

  /**
   * Toma el control de la partida.
   * @param {string} partidaId
   * @param {string} sessionId
   * @param {string|null} usuarioId
   * @returns {Promise<{adquirido: boolean}>}
   */
  async tomarControl(partidaId, sessionId, usuarioId = null) {
    return this.control.tomarControl(partidaId, sessionId, usuarioId);
  }

  /**
   * Renueva el lease de control.
   * @param {string} partidaId
   * @param {string} sessionId
   * @returns {Promise<{renovado: boolean}>}
   */
  async renovarControl(partidaId, sessionId) {
    return this.control.renovarControl(partidaId, sessionId);
  }

  /**
   * Libera el control de la partida.
   * @param {string} partidaId
   * @param {string} sessionId
   * @returns {Promise<{liberado: boolean}>}
   */
  async liberarControl(partidaId, sessionId) {
    return this.control.liberarControl(partidaId, sessionId);
  }

  /**
   * Verifica si la sesión tiene control vigente.
   * @param {string} partidaId
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async verificarControl(partidaId, sessionId) {
    return this.control.verificarControl(partidaId, sessionId);
  }

  /**
   * Agenda heartbeat de lease (INV-093) para la partida.
   * @param {string} partidaId
   * @param {string} sessionId
   */
  iniciarHeartbeat(partidaId, sessionId) {
    this.control.iniciarHeartbeat(partidaId, sessionId);
  }

  /**
   * Cancela el heartbeat de la partida.
   * @param {string} partidaId
   */
  detenerHeartbeat(partidaId) {
    this.control.detenerHeartbeat(partidaId);
  }

  /**
   * Cancela todos los heartbeats activos.
   */
  detenerTodosLosHeartbeats() {
    this.control.detenerTodosLosHeartbeats();
  }

  /* =============================================================
     Grupo 3 — Escritura crítica (delegan a this.partidas, con actionId)
     ============================================================= */

  /**
   * Crea una nueva partida.
   * @param {{circuito_id: string, public_codigo: string}} datos
   * @param {string} actionId
   * @returns {Promise<object>} Partida creada
   */
  async crearPartida({ circuito_id, public_codigo }, actionId) {
    return this.partidas.crearPartida({ circuito_id, public_codigo, actionId });
  }

  /**
   * Comienza una partida (la pone en EN_CURSO y crea JuegoEjecutados).
   * @param {string} partidaId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<{partidaId: string, juegos: object[]}>}
   */
  async comenzarPartida(partidaId, sessionId, actionId) {
    return this.partidas.comenzarPartida(partidaId, sessionId, actionId);
  }

  /**
   * Inicia un juego ejecutado (PENDIENTE → EN_CURSO).
   * @param {string} partidaId
   * @param {string} juegoEjecutadoId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} JuegoEjecutado actualizado
   */
  async iniciarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    return this.partidas.iniciarJuego(partidaId, juegoEjecutadoId, sessionId, actionId);
  }

  /**
   * Actualiza el estado interno de un juego en curso.
   * @param {string} partidaId
   * @param {string} juegoEjecutadoId
   * @param {object} estadoJuego
   * @param {number} expectedStateVersion
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} JuegoEjecutado actualizado
   */
  async actualizarEstadoJuego(partidaId, juegoEjecutadoId, estadoJuego, expectedStateVersion, sessionId, actionId) {
    return this.partidas.actualizarEstadoJuego(
      partidaId, juegoEjecutadoId, estadoJuego, expectedStateVersion, sessionId, actionId
    );
  }

  /**
   * Pausa un juego en curso.
   * @param {string} partidaId
   * @param {string} juegoEjecutadoId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} JuegoEjecutado actualizado
   */
  async pausarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    return this.partidas.pausarJuego(partidaId, juegoEjecutadoId, sessionId, actionId);
  }

  /**
   * Reanuda un juego pausado.
   * @param {string} partidaId
   * @param {string} juegoEjecutadoId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} JuegoEjecutado actualizado
   */
  async reanudarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    return this.partidas.reanudarJuego(partidaId, juegoEjecutadoId, sessionId, actionId);
  }

  /**
   * Finaliza un juego con resultado y puntos.
   * @param {string} partidaId
   * @param {string} juegoEjecutadoId
   * @param {{puntos_equipo_1: number, puntos_equipo_2: number}} resultado
   * @param {string} finishReason
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} JuegoEjecutado finalizado
   */
  async finalizarJuego(partidaId, juegoEjecutadoId, resultado, finishReason, sessionId, actionId) {
    return this.partidas.finalizarJuego(
      partidaId, juegoEjecutadoId, resultado, finishReason, sessionId, actionId
    );
  }

  /**
   * Descarta una partida (la marca como DESCARTADA).
   * @param {string} partidaId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} { partida, juegos }
   */
  async descartarPartida(partidaId, sessionId, actionId) {
    return this.partidas.descartarPartida(partidaId, sessionId, actionId);
  }

  /**
   * Finaliza el circuito (marca la partida como FINALIZADA).
   * @param {string} partidaId
   * @param {string} sessionId
   * @param {string} actionId
   * @returns {Promise<object>} { partida, juegos }
   */
  async finalizarCircuito(partidaId, sessionId, actionId) {
    return this.partidas.finalizarCircuito(partidaId, sessionId, actionId);
  }

  /**
   * Expira una partida (operación del sistema, sin lease ni idempotencia).
   * @param {string} partidaId
   * @returns {Promise<object>} Partida expirada
   */
  async expirarPartida(partidaId) {
    return this.partidas.expirarPartida(partidaId);
  }
}
