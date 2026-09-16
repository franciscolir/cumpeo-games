/* =============================================================
   LocalAdapter — capa de acceso a IndexedDB.
   Implementa el contrato de persistencia para desarrollo.
   NO conoce el dominio, NO conoce los repositorios.
   ============================================================= */

import { DB_NAME, DB_VERSION } from './schema.js';
import { aplicarMigraciones } from './migrations.js';
import {
  IndexedDBError,
  BaseNoAbiertaError,
  TransaccionError
} from './errors.js';
import { crearCanal } from '../infrastructure/broadcast.js';

export class LocalAdapter {
  constructor({ broadcast = null } = {}) {
    this.db = null;
    this.canal = broadcast || crearCanal();
  }

  /* =============================================================
     Ciclo de vida
     ============================================================= */

  async abrir() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        try {
          aplicarMigraciones(event.target.result, event.oldVersion);
        } catch (err) {
          request.transaction.abort();
          reject(new IndexedDBError('Error durante la migración', err));
        }
      };

      request.onsuccess = () => {
        this.db = request.result;

        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
        };

        resolve(this.db);
      };

      request.onerror = () => {
        reject(new IndexedDBError('No se pudo abrir la base', request.error));
      };

      request.onblocked = () => {
        reject(new IndexedDBError('La base está bloqueada por otra pestaña'));
      };
    });
  }

  async cerrar() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.canal.cerrar();
  }

  /* =============================================================
     Transacción
     -------------------------------------------------------------
     fn recibe (tx, resolver). Todo el trabajo dentro de fn es síncrono.
     `resolver` es opcional: se usa para devolver un valor tras el commit.
     Nunca se hace await dentro de fn.
     ============================================================= */

  tx(stores, mode, fn) {
    if (!this.db) {
      return Promise.reject(new BaseNoAbiertaError());
    }

    let tx;
    try {
      tx = this.db.transaction(stores, mode);
    } catch (err) {
      return Promise.reject(new TransaccionError('No se pudo abrir la transacción', err));
    }

    let resultado;
    const resolver = (valor) => { resultado = valor; };

    try {
      fn(tx, resolver);
    } catch (err) {
      try { tx.abort(); } catch (_) { /* ignorar */ }
      return Promise.reject(err);
    }

    return this._txDone(tx)
      .then(() => {
        if (mode === 'readwrite') {
          try {
            this.canal.emitir({
              tipo: 'cambio',
              stores: Array.isArray(stores) ? stores : [stores]
            });
          } catch (_) {
            // BroadcastChannel es solo notificación.
            // Un fallo al publicar nunca invalida una transacción
            // que ya hizo commit en IndexedDB.
          }
        }

        return resultado;
      });
  }

  _txDone(tx) {
    return new Promise((resolve, reject) => {
      let terminada = false;

      const finalizar = (fn) => {
        if (terminada) return;
        terminada = true;
        fn();
      };

      tx.oncomplete = () => finalizar(resolve);
      tx.onerror    = () => finalizar(() => reject(new TransaccionError('Error en transacción', tx.error)));
      tx.onabort    = () => finalizar(() => reject(new TransaccionError('Transacción abortada', tx.error)));
    });
  }

  /* =============================================================
     Utilidades
     ============================================================= */

  static ahora() {
    return new Date().toISOString();
  }

  static nuevoId() {
    return crypto.randomUUID();
  }
}
