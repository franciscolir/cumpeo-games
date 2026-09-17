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

export class SupabaseAdapter {
  /**
   * @param {object} [opciones={}]
   * @param {object} [opciones.client] - Cliente Supabase inyectado (para tests).
   */
  constructor({ client = null } = {}) {
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

    try {
      const returning = opciones.returning || '*';
      const respuesta = await this.client
        .from(tabla)
        .insert(filas)
        .select(returning);
      return normalizarRespuesta(respuesta);
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

    try {
      const returning = opciones.returning || '*';
      let q = this.client
        .from(tabla)
        .update(cambios)
        .select(returning);
      q = aplicarFiltros(q, filtros);
      const respuesta = await q;
      return normalizarRespuesta(respuesta);
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

    try {
      let q = this.client.from(tabla).delete();
      q = aplicarFiltros(q, filtros);
      const respuesta = await q;

      if (respuesta.error) {
        throw traducirError(respuesta.error);
      }
    } catch (err) {
      if (err.name?.includes('Error') && 'entidad' in err) throw err;
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

    try {
      const respuesta = await this.client.rpc(nombre, params);

      if (respuesta.error) {
        throw traducirError(respuesta.error);
      }

      return respuesta.data;
    } catch (err) {
      if (err.name?.includes('Error') && 'entidad' in err) throw err;
      throw traducirError(err);
    }
  }

  /* =============================================================
     Realtime — stub
     ============================================================= */

  /**
   * Suscribe a cambios en una tabla (Realtime).
   * NO implementado en H7.2.
   *
   * @param {string} tabla - Nombre de la tabla.
   * @param {object} filtros - Filtros de suscripción.
   * @param {function} callback - Callback cuando hay cambios.
   * @returns {function} Función para cancelar la suscripción.
   */
  suscribir(tabla, filtros, callback) {
    throw new Error('SupabaseAdapter.suscribir no implementado todavía (H7.9)');
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
}
