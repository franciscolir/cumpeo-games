/* =============================================================
   SetService — fachada única sobre SetRepository.

   NO implementa lógica de negocio. Solo delega.
   La UI consume este servicio como único punto de entrada para
   operaciones sobre sets e items.

   Las operaciones de set NO llevan actionId porque son de
   configuración, no de ejecución de partida.
   ============================================================= */

import { SetRepository } from '../repositories/SetRepository.js';

export class SetService {
  constructor(adapter) {
    this.adapter = adapter;
    this.sets = new SetRepository(adapter);
  }

  /* =============================================================
     Grupo 1 — Sets
     ============================================================= */

  /**
   * Crea un nuevo set (version=1, activo=true).
   * @param {{ juego_id: string, nombre: string, descripcion?: string, orden_catalogo?: number }} payload
   * @returns {Promise<object>} Set creado.
   */
  async crearSet(payload) {
    return this.sets.crearSet(payload);
  }

  /**
   * Crea un set con sus items en una sola operación.
   * @param {{ juego_id: string, nombre: string, descripcion?: string|null, items: object[], actionId: string }} payload
   * @returns {Promise<object>} { ok, set_id, items_count } (Supabase) o Set (IndexedDB).
   */
  async crearSetCompleto(payload) {
    return this.sets.crearSetCompleto(payload);
  }

  /**
   * Obtiene un set por ID.
   * @param {string} setId
   * @returns {Promise<object|undefined>}
   */
  async obtenerSet(setId) {
    return this.sets.obtenerSet(setId);
  }

  /**
   * Lista sets de un juego (activos e inactivos).
   * @param {string} juegoId
   * @returns {Promise<object[]>}
   */
  async listarSetsPorJuego(juegoId) {
    return this.sets.listarSetsPorJuego(juegoId);
  }

  /**
   * Lista solo los sets activos de un juego.
   * @param {string} juegoId
   * @returns {Promise<object[]>}
   */
  async listarSetsActivosPorJuego(juegoId) {
    return this.sets.listarSetsActivosPorJuego(juegoId);
  }

  /**
   * Actualiza un set (nombre, descripcion, orden_catalogo). Incrementa version.
   * @param {string} setId
   * @param {object} cambios
   * @returns {Promise<object>} Set actualizado.
   */
  async actualizarSet(setId, cambios) {
    return this.sets.actualizarSet(setId, cambios);
  }

  /**
   * Desactiva un set (activo=false). NO incrementa version.
   * @param {string} setId
   * @returns {Promise<object>} Set desactivado.
   */
  async desactivarSet(setId) {
    return this.sets.desactivarSet(setId);
  }

  /**
   * Elimina un set y sus items. Pone source_set_id=null en snapshots huérfanos.
   * @param {string} setId
   * @returns {Promise<void>}
   */
  async eliminarSet(setId) {
    return this.sets.eliminarSet(setId);
  }

  /* =============================================================
     Grupo 2 — Items de set
     ============================================================= */

  /**
   * Obtiene un item por ID.
   * @param {string} itemId
   * @returns {Promise<object|undefined>}
   */
  async obtenerItem(itemId) {
    return this.sets.obtenerItem(itemId);
  }

  /**
   * Lista los items de un set, ordenados por `orden`.
   * @param {string} setId
   * @returns {Promise<object[]>}
   */
  async listarItemsDeSet(setId) {
    return this.sets.listarItemsDeSet(setId);
  }

  /**
   * Agrega un item al set. Si no se especifica posición, va al final.
   * Incrementa version del set.
   * @param {string} setId
   * @param {object} contenido
   * @param {{ posicion?: number }} [opciones]
   * @returns {Promise<object>} Item creado.
   */
  async agregarItem(setId, contenido, opciones = {}) {
    return this.sets.agregarItem(setId, contenido, opciones);
  }

  /**
   * Actualiza el contenido de un item. Incrementa version del set.
   * @param {string} itemId
   * @param {object} contenido
   * @returns {Promise<object>} Item actualizado.
   */
  async actualizarItem(itemId, contenido) {
    return this.sets.actualizarItem(itemId, contenido);
  }

  /**
   * Elimina un item y renumera los siguientes. Incrementa version del set.
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async eliminarItem(itemId) {
    return this.sets.eliminarItem(itemId);
  }

  /**
   * Reordena los items de un set. Incrementa version del set.
   * @param {string} setId
   * @param {Array<{ id: string, orden: number }>} ordenFinal
   * @returns {Promise<void>}
   */
  async reordenarItems(setId, ordenFinal) {
    return this.sets.reordenarItems(setId, ordenFinal);
  }
}
