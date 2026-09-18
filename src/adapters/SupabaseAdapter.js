/* =============================================================
   SupabaseAdapter — implementación contra Supabase Cloud.

   Modos de operación:
   - query/insert/update/delete: CRUD directo vía PostgREST.
   - rpc: llamada a funciones plpgsql atómicas.
   - tx(): NO implementado en H7.2 (próximo bloque).
   - suscribir(): stub para H7.9 (Realtime).

   El constructor acepta { client } para inyección en tests.
   ============================================================= */

import { getSupabaseClient } from './supabase/client.js';
import { aplicarFiltros, aplicarOpciones, normalizarRespuesta } from './supabase/queries.js';
import { traducirError } from './supabase/errors.js';
import { ValidacionError, OperacionInvalidaError } from '../repositories/errors.js';

export class SupabaseAdapter {
  /**
   * @param {object} [opciones={}]
   * @param {object} [opciones.client] - Cliente Supabase inyectado (para tests).
   */
  constructor({ client = null } = {}) {
    this.modo = 'supabase';
    this._clientOpcional = client;
    this.client = null;
  }

  /* =============================================================
     Ciclo de vida
     ============================================================= */

  /**
   * Inicializa el cliente Supabase.
   * @returns {Promise<void>}
   */
  async abrir() {
    if (this.client) return;
    this.client = this._clientOpcional || getSupabaseClient();
  }

  /**
   * Limpia el cliente y el canal.
   * @returns {Promise<void>}
   */
  async cerrar() {
    this.client = null;
  }

  /* =============================================================
     CRUD — query / insert / update / delete
     ============================================================= */

  /**
   * Ejecuta una query de lectura o escritura simple contra PostgREST.
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object} [opciones={}] - Parámetros de la query.
   * @param {string} [opciones.select] - Columnas a seleccionar (ej: 'id, nombre').
   * @param {object} [opciones.eq] - Filtros de igualdad { col: val }.
   * @param {object} [opciones.neq] - Filtros de desigualdad { col: val }.
   * @param {object} [opciones.in] - Filtros de inclusión { col: [val1, val2] }.
   * @param {object} [opciones.order] - Orden { columna, asc }.
   * @param {number} [opciones.limit] - Límite de filas.
   * @param {boolean} [opciones.single] - Devolver una sola fila.
   * @returns {Promise<Array|Object|null>} Filas o fila única.
   */
  async query(tabla, opciones = {}) {
    this._verificarAbierto();
    this._verificarTabla(tabla);

    try {
      let q = this.client.from(tabla).select(opciones.select || '*');
      q = aplicarFiltros(q, opciones);
      q = aplicarOpciones(q, { ...opciones, select: undefined });
      const respuesta = await q;
      return normalizarRespuesta(respuesta, opciones.single);
    } catch (err) {
      throw traducirError(err);
    }
  }

  /**
   * Inserta una o más filas en una tabla.
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object|Array} filas - Fila(s) a insertar.
   * @param {object} [opciones={}]
   * @param {string} [opciones.returning] - Columnas a retornar (ej: '*').
   * @returns {Promise<Array|Object>} Filas insertadas.
   */
  async insert(tabla, filas, opciones = {}) {
    this._verificarAbierto();
    this._verificarTabla(tabla);

    if (!filas || (Array.isArray(filas) && filas.length === 0)) {
      throw new ValidacionError('filas requeridas para insert');
    }

    try {
      const returning = opciones.returning || '*';
      const respuesta = await this.client
        .from(tabla)
        .insert(filas)
        .select(returning);
      return normalizarRespuesta(respuesta, opciones.single);
    } catch (err) {
      throw traducirError(err);
    }
  }

  /**
   * Actualiza filas que cumplen un filtro.
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object} filtros - Filtros { eq: { col: val }, ... }.
   * @param {object} cambios - Campos a actualizar.
   * @param {object} [opciones={}]
   * @param {string} [opciones.returning] - Columnas a retornar.
   * @returns {Promise<Array>} Filas actualizadas.
   */
  async update(tabla, filtros, cambios, opciones = {}) {
    this._verificarAbierto();
    this._verificarTabla(tabla);
    this._verificarFiltros(filtros, 'update');

    if (!cambios || Object.keys(cambios).length === 0) {
      throw new ValidacionError('cambios requeridos para update');
    }

    try {
      const returning = opciones.returning || '*';
      let q = this.client
        .from(tabla)
        .update(cambios)
        .select(returning);
      q = aplicarFiltros(q, filtros);
      const respuesta = await q;
      return normalizarRespuesta(respuesta, opciones.single);
    } catch (err) {
      throw traducirError(err);
    }
  }

  /**
   * Elimina filas que cumplen un filtro.
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object} filtros - Filtros { eq: { col: val }, ... }.
   * @returns {Promise<void>} Resolución vacía si exitoso.
   */
  async delete(tabla, filtros) {
    this._verificarAbierto();
    this._verificarTabla(tabla);
    this._verificarFiltros(filtros, 'delete');

    try {
      let q = this.client.from(tabla).delete();
      q = aplicarFiltros(q, filtros);
      const respuesta = await q;
      normalizarRespuesta(respuesta);
      return;
    } catch (err) {
      throw traducirError(err);
    }
  }

  /* =============================================================
     RPC — funciones plpgsql
     ============================================================= */

  /**
   * Ejecuta una función plpgsql en Supabase.
   *
   * @param {string} nombre - Nombre de la función.
   * @param {object} [params={}] - Parámetros de la función.
   * @returns {Promise<any>} Resultado de la función.
   */
  async rpc(nombre, params = {}) {
    this._verificarAbierto();

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      throw new ValidacionError('nombre de función requerido');
    }

    try {
      const respuesta = await this.client.rpc(nombre, params);
      return normalizarRespuesta(respuesta);
    } catch (err) {
      throw traducirError(err);
    }
  }

  /* =============================================================
     Realtime — suscripciones a cambios en tablas
     ============================================================= */

  /**
   * Suscribe a cambios en una tabla (Realtime).
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object} [filtros={}] - Filtros de suscripción.
   * @param {string} [filtros.filter] - Filtro Postgres (ej: 'partida_id=eq.uuid').
   * @param {string} [filtros.event='*'] - Tipo de evento (INSERT, UPDATE, DELETE, *).
   * @param {function} callback - Callback cuando hay cambios. Recibe { eventType, new, old }.
   * @returns {function} Función para cancelar la suscripción.
   */
  suscribir(tabla, filtros = {}, callback) {
    this._verificarAbierto();
    if (!tabla || typeof tabla !== 'string') {
      throw new ValidacionError('nombre de tabla requerido');
    }
    if (typeof callback !== 'function') {
      throw new ValidacionError('callback debe ser una función');
    }

    const { filter, event = '*' } = filtros;
    const canalName = `cumpeo:${tabla}:${filter || 'all'}:${Date.now()}`;

    return new Promise((resolve, reject) => {
      const canal = this.client
        .channel(canalName)
        .on('postgres_changes', {
          event,
          schema: 'public',
          table: tabla,
          ...(filter ? { filter } : {})
        }, (payload) => callback(payload));

      canal.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve(() => { this.client.removeChannel(canal); });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Suscripción falló: ${status}`));
        }
      });
    });
  }

  /* =============================================================
     Transacción — stub
     ============================================================= */

  /**
   * Ejecuta una transacción atómica.
   * NO implementado en H7.2.
   *
   * @param {string|string[]} stores - Nombre(s) de tabla(s).
   * @param {string} mode - Modo de la transacción.
   * @param {function} fn - Función a ejecutar.
   * @returns {Promise<any>} Resultado de la función.
   */
  tx(stores, mode, fn) {
    throw new Error('SupabaseAdapter.tx no implementado todavía (H7.3)');
  }

  /* =============================================================
     Utilidades internas
     ============================================================= */

  /**
   * Verifica que el adapter esté abierto.
   * @throws {Error} Si el cliente no está inicializado.
   */
  _verificarAbierto() {
    if (!this.client) {
      throw new Error('SupabaseAdapter no está abierto. Llamá a abrir() primero.');
    }
  }

  /**
   * Verifica que el nombre de tabla sea válido.
   * @param {string} tabla
   * @throws {ValidacionError} Si la tabla es vacía o no es string.
   */
  _verificarTabla(tabla) {
    if (!tabla || typeof tabla !== 'string' || tabla.trim() === '') {
      throw new ValidacionError('nombre de tabla requerido');
    }
  }

  /**
   * Verifica que los filtros no estén vacíos.
   * Protege contra update/delete sin filtro (que afectarían toda la tabla).
   *
   * @param {object} filtros - Filtros a verificar.
   * @param {string} operacion - Nombre de la operación (para el mensaje de error).
   * @throws {OperacionInvalidaError} Si los filtros están vacíos.
   */
  _verificarFiltros(filtros, operacion) {
    const tieneEq = filtros?.eq && Object.keys(filtros.eq).length > 0;
    const tieneNeq = filtros?.neq && Object.keys(filtros.neq).length > 0;
    const tieneIn = filtros?.in && Object.keys(filtros.in).length > 0;

    if (!tieneEq && !tieneNeq && !tieneIn) {
      throw new OperacionInvalidaError(
        `No se puede ejecutar ${operacion} sin filtros. ` +
        `Si querés afectar todas las filas, usá un filtro explícito.`
      );
    }
  }
}
