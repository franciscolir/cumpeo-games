/* =============================================================
   ControlService — lógica de negocio del lease de control.

   Envuelve ControlRepository. Su responsabilidad es:
   - Gestionar la adquisición, renovación y liberación del lease.
   - Proveer helpers de alto nivel para otros servicios.
   - Encapsular la política de reintentos y expiración.

   NO accede a IndexedDB directamente. Todo pasa por el repo.
   ============================================================= */

import { ControlRepository } from '../repositories/ControlRepository.js';
import {
  NoEncontradoError,
  SinControlError,
  ValidacionError
} from '../repositories/errors.js';
import { validarNoVacio } from '../repositories/utils.js';

const HEARTBEAT_MS = 10000;

export class ControlService {
  constructor(adapter) {
    this.adapter = adapter;
    this.repo = new ControlRepository(adapter);
    this._heartbeats = new Map();
  }

  /* =============================================================
     Adquisición
     ============================================================= */

  /**
   * Toma el control de la partida.
   * Devuelve { adquirido: true } si se obtuvo.
   * Lanza SinControlError si otra sesión lo tiene.
   */
  async tomarControl(partidaId, sessionId, usuarioId = null) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    const r = await this.repo.tomarControl(partidaId, sessionId, usuarioId);
    if (!r.adquirido) {
      if (r.motivo instanceof NoEncontradoError) {
        throw r.motivo;
      }
      throw new SinControlError(partidaId);
    }
    return { adquirido: true };
  }

  /**
   * Renueva el lease. Solo funciona si la sesión es la dueña.
   */
  async renovarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    const r = await this.repo.renovarControl(partidaId, sessionId);
    if (!r.renovado) {
      if (r.motivo instanceof NoEncontradoError) {
        throw r.motivo;
      }
      throw new SinControlError(partidaId);
    }
    return { renovado: true };
  }

  /**
   * Libera el control. No-op si la sesión no lo tiene.
   */
  async liberarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    const r = await this.repo.liberarControl(partidaId, sessionId);
    return { liberado: r.liberado };
  }

  /* =============================================================
     Consultas
     ============================================================= */

  async obtenerControl(partidaId) {
    validarNoVacio(partidaId, 'partidaId');
    return this.repo.obtenerControl(partidaId);
  }

  async verificarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');
    return this.repo.verificarControl(partidaId, sessionId);
  }

  async listarControlesPorSesion(sessionId) {
    validarNoVacio(sessionId, 'sessionId');
    return this.repo.listarControlesPorSesion(sessionId);
  }

  /* =============================================================
     Helper de alto nivel
     ============================================================= */

  /**
   * Ejecuta una función asumiendo que la sesión ya tiene el control.
   * Si no lo tiene, lanza SinControlError.
   *
   * Uso:
   *   await controlService.conControl(partidaId, sessionId, async () => {
   *     // acción crítica
   *   });
   */
  async conControl(partidaId, sessionId, fn) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');
    if (typeof fn !== 'function') {
      throw new ValidacionError('fn debe ser una función');
    }

    const ok = await this.verificarControl(partidaId, sessionId);
    if (!ok) {
      throw new SinControlError(partidaId);
    }
    return fn();
  }

  /* =============================================================
     Heartbeat (INV-093: lease 30s, heartbeat cada 10s)
     ============================================================= */

  /**
   * Agenda un heartbeat cada HEARTBEAT_MS para renovar el lease.
   * No duplica si ya existe heartbeat para esa partida.
   * @param {string} partidaId
   * @param {string} sessionId
   */
  iniciarHeartbeat(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');
    if (this._heartbeats.has(partidaId)) return;

    const intervalId = setInterval(async () => {
      try {
        await this.renovarControl(partidaId, sessionId);
      } catch (_) {
        try {
          await this.tomarControl(partidaId, sessionId);
        } catch (__) { /* silencio: el siguiente tick reintenta */ }
      }
    }, HEARTBEAT_MS);

    this._heartbeats.set(partidaId, intervalId);
  }

  /**
   * Cancela el heartbeat de una partida.
   * @param {string} partidaId
   */
  detenerHeartbeat(partidaId) {
    const intervalId = this._heartbeats.get(partidaId);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      this._heartbeats.delete(partidaId);
    }
  }

  /**
   * Cancela todos los heartbeats activos.
   */
  detenerTodosLosHeartbeats() {
    for (const intervalId of this._heartbeats.values()) {
      clearInterval(intervalId);
    }
    this._heartbeats.clear();
  }
}
