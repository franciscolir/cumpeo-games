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

   Modo Supabase: delega a RPC reservar_accion para reserva atómica.
   Modo IndexedDB: usa transacción nativa con reservarEnTx.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { ValidacionError } from './errors.js';
import { ahora, validarNoVacio } from './utils.js';

const STORE = 'accion_procesadas';

export class AccionProcesadaRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE, 'action_id');
  }

  /* =============================================================
     Consultas
     ============================================================= */

  /**
   * Obtiene una acción procesada por su action_id.
   *
   * @param {string} actionId - ID de la acción.
   * @returns {Promise<object|null>} La acción o null.
   */
  async obtenerPorActionId(actionId) {
    validarNoVacio(actionId, 'actionId');
    return this.obtener(actionId);
  }

  /**
   * Lista acciones procesadas por partida_id.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de acciones.
   */
  async listarPorPartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId }
      });
    }

    return this.listarPorIndice('accion_procesada_partida_id', partidaId);
  }

  /* =============================================================
     Reserva atómica — wrapper polimórfico
     -------------------------------------------------------------
     Modo IndexedDB: delega a reservarEnTx con callback.
     Modo Supabase: llama a RPC reservar_accion.
     ============================================================= */

  /**
   * Reserva un action_id de forma atómoda.
   *
   * Modo Supabase: llama a la RPC reservar_accion.
   * Modo IndexedDB: requiere tx abierta (ver reservarEnTx).
   *
   * @param {object} params - Parámetros de reserva.
   * @param {string} params.actionId - ID de la acción.
   * @param {string|null} params.partidaId - ID de la partida (nullable).
   * @param {string} params.tipoAccion - Tipo de acción.
   * @returns {Promise<object>} { yaProcesada, resultado? }
   */
  async reservar({ actionId, partidaId = null, tipoAccion }) {
    validarNoVacio(actionId, 'actionId');
    validarNoVacio(tipoAccion, 'tipoAccion');

    if (this.modo === 'supabase') {
      const resultado = await this.adapter.rpc('reservar_accion', {
        p_action_id: actionId,
        p_partida_id: partidaId,
        p_tipo_accion: tipoAccion
      });

      if (resultado && resultado.resultado !== null && resultado.resultado !== undefined) {
        return { yaProcesada: true, resultado: resultado.resultado };
      }

      return { yaProcesada: false };
    }

    throw new Error('reservar() sin transacción no soportado en IndexedDB. Usar reservarEnTx.');
  }

  /**
   * Actualiza el resultado de una acción ya reservada.
   *
   * Modo Supabase: llama a la RPC actualizar_resultado_accion.
   * Modo IndexedDB: requiere tx abierta (ver actualizarResultadoEnTx).
   *
   * @param {string} actionId - ID de la acción.
   * @param {object} resultado - Resultado a guardar.
   * @returns {Promise<void>}
   */
  async actualizarResultado(actionId, resultado) {
    validarNoVacio(actionId, 'actionId');

    if (this.modo === 'supabase') {
      await this.adapter.rpc('actualizar_resultado_accion', {
        p_action_id: actionId,
        p_resultado: resultado
      });
      return;
    }

    throw new Error('actualizarResultado() sin transacción no soportado en IndexedDB. Usar actualizarResultadoEnTx.');
  }

  /* =============================================================
     Reserva atómica dentro de una transacción externa (IndexedDB)
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
