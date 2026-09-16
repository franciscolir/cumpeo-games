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

export class ControlService {
  constructor(adapter) {
    this.adapter = adapter;
    this.repo = new ControlRepository(adapter);
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
}
