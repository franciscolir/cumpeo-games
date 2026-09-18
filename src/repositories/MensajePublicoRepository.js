/* =============================================================
   MensajePublicoRepository — mensajes enviados por el público
   durante una partida (INV-161 a INV-165).

   Estados:
     PENDIENTE → APROBADO
     PENDIENTE → RECHAZADO
     (un APROBADO o RECHAZADO no puede volver a PENDIENTE)

   Operaciones:
     crearMensaje        → crea en PENDIENTE
     obtenerMensaje      → por id
     listarMensajesDePartida → todos, ordenados por created_at asc
     listarPendientesDePartida → solo PENDIENTES
     listarAprobadosDePartida  → solo APROBADOS
     aprobarMensaje      → PENDIENTE → APROBADO
     rechazarMensaje     → PENDIENTE → RECHAZADO
     eliminarMensaje     → solo si RECHAZADO
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  OperacionInvalidaError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'mensajes_publicos';

const ESTADOS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO'
};

export class MensajePublicoRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  /* =============================================================
     Consultas
     ============================================================= */

  /**
   * Obtiene un mensaje por su id.
   *
   * @param {string} id - ID del mensaje.
   * @returns {Promise<object|undefined>} El mensaje o undefined.
   */
  async obtenerMensaje(id) {
    return this.obtener(id);
  }

  /**
   * Lista todos los mensajes de una partida, ordenados por created_at asc.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de mensajes.
   */
  async listarMensajesDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId }
      });
      return lista.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }

    const lista = await this.listarPorIndice('mensaje_publico_partida_id', partidaId);
    return lista.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  /**
   * Lista mensajes PENDIENTES de una partida.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de mensajes pendientes.
   */
  async listarPendientesDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId, estado: ESTADOS.PENDIENTE }
      });
    }

    const todos = await this.listarMensajesDePartida(partidaId);
    return todos.filter((m) => m.estado === ESTADOS.PENDIENTE);
  }

  /**
   * Lista mensajes APROBADOS de una partida.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de mensajes aprobados.
   */
  async listarAprobadosDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId, estado: ESTADOS.APROBADO }
      });
    }

    const todos = await this.listarMensajesDePartida(partidaId);
    return todos.filter((m) => m.estado === ESTADOS.APROBADO);
  }

  /* =============================================================
     Escritura
     ============================================================= */

  /**
   * Crea un mensaje en estado PENDIENTE.
   *
   * @param {object} params - Parámetros.
   * @param {string} params.partidaId - ID de la partida.
   * @param {string} params.participanteId - ID del participante.
   * @param {string} params.texto - Texto del mensaje (no vacío).
   * @returns {Promise<object>} El mensaje creado.
   */
  async crearMensaje({ partidaId, participanteId, texto }) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(participanteId, 'participanteId');

    if (texto == null || String(texto).trim() === '') {
      throw new ValidacionError('El texto del mensaje no puede estar vacío (INV-164)');
    }

    const mensaje = {
      id: nuevoId(),
      partida_id: partidaId,
      participante_id: participanteId,
      texto: String(texto).trim(),
      estado: ESTADOS.PENDIENTE,
      created_at: ahora(),
      moderado_at: null,
      moderado_por: null
    };

    await this.agregarRegistro(mensaje);
    return mensaje;
  }

  /**
   * Aprobar un mensaje pendiente.
   *
   * @param {string} id - ID del mensaje.
   * @param {string} sessionId - ID de sesión del conductor.
   * @returns {Promise<object>} El mensaje actualizado.
   */
  async aprobarMensaje(id, sessionId) {
    validarNoVacio(id, 'id');
    validarNoVacio(sessionId, 'sessionId');

    const mensaje = await this.obtener(id);
    if (!mensaje) throw new NoEncontradoError('MensajePublico', id);

    if (mensaje.estado === ESTADOS.APROBADO) {
      return mensaje;
    }

    if (mensaje.estado === ESTADOS.RECHAZADO) {
      throw new OperacionInvalidaError(
        'No se puede re-aprobar un mensaje que fue rechazado (INV-161)'
      );
    }

    const actualizado = {
      ...mensaje,
      estado: ESTADOS.APROBADO,
      moderado_at: ahora(),
      moderado_por: sessionId
    };

    await this.actualizarRegistro(actualizado);
    return actualizado;
  }

  /**
   * Rechazar un mensaje pendiente.
   *
   * @param {string} id - ID del mensaje.
   * @param {string} sessionId - ID de sesión del conductor.
   * @returns {Promise<object>} El mensaje actualizado.
   */
  async rechazarMensaje(id, sessionId) {
    validarNoVacio(id, 'id');
    validarNoVacio(sessionId, 'sessionId');

    const mensaje = await this.obtener(id);
    if (!mensaje) throw new NoEncontradoError('MensajePublico', id);

    if (mensaje.estado === ESTADOS.RECHAZADO) {
      return mensaje;
    }

    if (mensaje.estado === ESTADOS.APROBADO) {
      throw new OperacionInvalidaError(
        'No se puede rechazar un mensaje que ya fue aprobado (INV-161)'
      );
    }

    const actualizado = {
      ...mensaje,
      estado: ESTADOS.RECHAZADO,
      moderado_at: ahora(),
      moderado_por: sessionId
    };

    await this.actualizarRegistro(actualizado);
    return actualizado;
  }

  /**
   * Elimina un mensaje. Solo permitido si estado === RECHAZADO.
   *
   * @param {string} id - ID del mensaje.
   * @returns {Promise<void>}
   */
  async eliminarMensaje(id) {
    validarNoVacio(id, 'id');

    const mensaje = await this.obtener(id);
    if (!mensaje) throw new NoEncontradoError('MensajePublico', id);

    if (mensaje.estado !== ESTADOS.RECHAZADO) {
      throw new OperacionInvalidaError(
        `No se puede eliminar un mensaje en estado ${mensaje.estado}. Solo mensajes RECHAZADOS pueden eliminarse.`
      );
    }

    await this.eliminarRegistro(id);
  }
}
