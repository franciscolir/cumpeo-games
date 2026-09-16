/* =============================================================
   AccionProcesadaRepository — registro de action_id procesados.

   Su única responsabilidad es la reserva atómica de un action_id
   dentro de una transacción. El servicio que lo usa decide si es
   la primera vez (ejecutar) o la segunda (devolver cacheado).

   Reglas (INV-003, INV-083, INV-085, INV-086, INV-087, INV-149):
   - action_id es único globalmente.
   - Se inserta al inicio de la transacción, no al final.
   - Rollback elimina el registro.
   - Inmutable una vez insertada exitosamente.
   - partida_id es nullable.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { ValidacionError } from './errors.js';
import { ahora, validarNoVacio } from './utils.js';

const STORE = 'accion_procesadas';

export class AccionProcesadaRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  /* =============================================================
     Consultas
     ============================================================= */

  async obtenerPorActionId(actionId) {
    validarNoVacio(actionId, 'actionId');
    return this.obtener(actionId);
  }

  async listarPorPartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');
    return this.listarPorIndice('accion_procesada_partida_id', partidaId);
  }

  /* =============================================================
     Reserva atómica dentro de una transacción externa
     -------------------------------------------------------------
     Devuelve vía callback:
       { yaProcesada: false }                     → reservar OK
       { yaProcesada: true, resultado }            → existía
     ============================================================= */

  reservarEnTx(tx, actionId, partidaId, tipoAccion, onResult) {
    validarNoVacio(actionId, 'actionId');
    validarNoVacio(tipoAccion, 'tipoAccion');
    if (typeof onResult !== 'function') {
      throw new ValidacionError('onResult debe ser una función');
    }

    const store = tx.objectStore(STORE);
    const req = store.get(actionId);

    req.onsuccess = () => {
      const existente = req.result;
      if (existente) {
        onResult({ yaProcesada: true, resultado: existente.resultado });
        return;
      }

      const registro = {
        action_id: actionId,
        partida_id: partidaId ?? null,
        tipo_accion: tipoAccion,
        resultado: null,
        created_at: ahora()
      };
      store.add(registro);
      onResult({ yaProcesada: false });
    };

    req.onerror = () => tx.abort();
  }

  /**
   * Actualiza el resultado de una acción ya reservada, dentro de una
   * transacción YA abierta.
   */
  actualizarResultadoEnTx(tx, actionId, resultado) {
    validarNoVacio(actionId, 'actionId');
    const store = tx.objectStore(STORE);
    const req = store.get(actionId);
    req.onsuccess = () => {
      const reg = req.result;
      if (!reg) return;
      store.put({ ...reg, resultado });
    };
    req.onerror = () => tx.abort();
  }
}
