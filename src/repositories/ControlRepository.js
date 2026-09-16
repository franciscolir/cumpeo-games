/* =============================================================
   ControlRepository — lease de control de partida (R9).
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { NoEncontradoError, SinControlError } from './errors.js';
import { ahora, validarNoVacio } from './utils.js';

const STORE = 'control_partidas';
const LEASE_MS = 30000;

export class ControlRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  async crearControlParaPartida(tx, partidaId) {
    validarNoVacio(partidaId, 'partidaId');
    tx.objectStore(STORE).add({
      partida_id: partidaId,
      session_id: null,
      usuario_id: null,
      acquired_at: null,
      expires_at: null,
      heartbeat_at: null
    });
  }

  async obtenerControl(partidaId) {
    return this.obtener(partidaId);
  }

  async listarControlesPorSesion(sessionId) {
    validarNoVacio(sessionId, 'sessionId');
    return this.listarPorIndice('control_partida_session_id', sessionId);
  }

  async tomarControl(partidaId, sessionId, usuarioId = null) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    return this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.get(partidaId);

      req.onsuccess = () => {
        const control = req.result;
        if (!control) {
          resolver({ adquirido: false, motivo: new NoEncontradoError('ControlPartida', partidaId) });
          return;
        }

        const ts = ahora();
        const puedeAdquirir =
          control.session_id === null ||
          control.session_id === sessionId ||
          (control.expires_at && control.expires_at <= ts);

        if (!puedeAdquirir) {
          resolver({ adquirido: false, motivo: new SinControlError(partidaId) });
          return;
        }

        store.put({
          partida_id: partidaId,
          session_id: sessionId,
          usuario_id: usuarioId,
          acquired_at: ts,
          heartbeat_at: ts,
          expires_at: new Date(Date.now() + LEASE_MS).toISOString()
        });

        resolver({ adquirido: true });
      };

      req.onerror = () => tx.abort();
    });
  }

  async renovarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    return this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.get(partidaId);

      req.onsuccess = () => {
        const control = req.result;

        if (!control) {
          resolver({
            renovado: false,
            motivo: new NoEncontradoError(
              'ControlPartida',
              partidaId
            )
          });
          return;
        }

        const ts = ahora();

        const leaseVigente =
          control.expires_at !== null &&
          control.expires_at > ts;

        if (
          control.session_id !== sessionId ||
          !leaseVigente
        ) {
          resolver({
            renovado: false,
            motivo: new SinControlError(partidaId)
          });
          return;
        }

        store.put({
          ...control,
          heartbeat_at: ts,
          expires_at: new Date(
            Date.now() + LEASE_MS
          ).toISOString()
        });

        resolver({
          renovado: true
        });
      };

      req.onerror = () => tx.abort();
    });
  }

  async liberarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    return this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.get(partidaId);

      req.onsuccess = () => {
        const control = req.result;
        if (!control) {
          resolver({ liberado: false, motivo: new NoEncontradoError('ControlPartida', partidaId) });
          return;
        }
        if (control.session_id !== sessionId) {
          resolver({
            liberado: false,
            motivo: new SinControlError(partidaId)
          });
          return;
        }

        store.put({
          partida_id: partidaId,
          session_id: null,
          usuario_id: null,
          acquired_at: null,
          expires_at: null,
          heartbeat_at: null
        });
        resolver({ liberado: true });
      };

      req.onerror = () => tx.abort();
    });
  }

  verificarControlEnTx(tx, partidaId, sessionId, onResult) {
    const store = tx.objectStore(STORE);
    const req = store.get(partidaId);
    req.onsuccess = () => {
      const control = req.result;
      if (!control) { onResult(false); return; }
      const ts = ahora();
      const ok =
        control.session_id === sessionId &&
        control.expires_at !== null &&
        control.expires_at > ts;
      onResult(ok);
    };

    req.onerror = () => tx.abort();
  }

  async verificarControl(partidaId, sessionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');

    return this.adapter.tx([STORE], 'readonly', (tx, resolver) => {
      this.verificarControlEnTx(tx, partidaId, sessionId, (ok) => resolver(ok));
    });
  }
}
