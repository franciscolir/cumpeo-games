/* =============================================================
   JuegoService — fachada única sobre JuegoRepository.

   NO implementa lógica de negocio. Solo delega.
   La UI consume este servicio como único punto de entrada para
   operaciones sobre juegos (catálogo).

   Sin actionId. Los juegos son catálogo, no ejecución.
   ============================================================= */

import { JuegoRepository } from '../repositories/JuegoRepository.js';

export class JuegoService {
  constructor(adapter) {
    this.adapter = adapter;
    this.juegos = new JuegoRepository(adapter);
  }

  /* =============================================================
     Grupo 1 — Lecturas
     ============================================================= */

  /**
   * Obtiene un juego por ID.
   * @param {string} juegoId
   * @returns {Promise<object|null>}
   */
  async obtenerJuego(juegoId) {
    return this.juegos.obtenerJuego(juegoId);
  }

  /**
   * Obtiene un juego por código.
   * @param {string} codigo
   * @returns {Promise<object|null>}
   */
  async obtenerJuegoPorCodigo(codigo) {
    return this.juegos.obtenerJuegoPorCodigo(codigo);
  }

  /**
   * Lista juegos, opcionalmente incluyendo inactivos.
   * @param {{ incluirInactivos?: boolean }} [opciones]
   * @returns {Promise<object[]>}
   */
  async listarJuegos(opciones = {}) {
    return this.juegos.listarJuegos(opciones);
  }

  /* =============================================================
     Grupo 2 — Escritura
     ============================================================= */

  /**
   * Crea un nuevo juego.
   * Rechaza si ya existe un juego con el mismo código.
   * @param {object} payload - { codigo, nombre, descripcion?, requiere_set?, orden_catalogo? }
   * @returns {Promise<object>} Juego creado.
   * @throws {YaExisteError} si ya hay un juego con ese código.
   */
  async crearJuego(payload) {
    return this.juegos.crearJuego(payload);
  }

  /**
   * Actualiza campos permitidos de un juego.
   * El código y requiere_set son inmutables.
   * @param {string} juegoId
   * @param {object} cambios - { nombre?, descripcion?, orden_catalogo? }
   * @returns {Promise<object>} Juego actualizado.
   */
  async actualizarJuego(juegoId, cambios) {
    return this.juegos.actualizarJuego(juegoId, cambios);
  }

  /**
   * Desactiva un juego (activo = false).
   * @param {string} juegoId
   * @returns {Promise<object>} Juego desactivado.
   */
  async desactivarJuego(juegoId) {
    return this.juegos.desactivarJuego(juegoId);
  }
}
