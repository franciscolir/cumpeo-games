/* =============================================================
   CircuitoService — fachada única sobre CircuitoRepository.

   NO implementa lógica de negocio. Solo delega.
   La UI consume este servicio como único punto de entrada para
   operaciones sobre circuitos.

   Las operaciones de circuito NO llevan actionId porque son de
   configuración, no de ejecución de partida.
   ============================================================= */

import { CircuitoRepository } from '../repositories/CircuitoRepository.js';

export class CircuitoService {
  constructor(adapter) {
    this.adapter = adapter;
    this.circuitos = new CircuitoRepository(adapter);
  }

  /* =============================================================
     Grupo 1 — Lecturas
     ============================================================= */

  /**
   * Obtiene un circuito por ID.
   * @param {string} circuitoId
   * @returns {Promise<object|null>}
   */
  async obtenerCircuito(circuitoId) {
    return this.circuitos.obtenerCircuito(circuitoId);
  }

  /**
   * Obtiene un circuito completo (circuito + juegos + equipos).
   * @param {string} circuitoId
   * @returns {Promise<{circuito: object|null, juegos: object[], equipos: object[]}>}
   */
  async obtenerCircuitoCompleto(circuitoId) {
    return this.circuitos.obtenerCircuitoCompleto(circuitoId);
  }

  /**
   * Lista circuitos, opcionalmente sin plantillas.
   * @param {{ incluirPlantillas?: boolean }} [opciones]
   * @returns {Promise<object[]>}
   */
  async listarCircuitos(opciones = {}) {
    return this.circuitos.listarCircuitos(opciones);
  }

  /**
   * Lista solo las plantillas (es_plantilla = true).
   * @returns {Promise<object[]>}
   */
  async listarPlantillas() {
    return this.circuitos.listarPlantillas();
  }

  /* =============================================================
     Grupo 2 — Escritura de configuración
     ============================================================= */

  /**
   * Crea un nuevo circuito (estado BORRADOR).
   * @param {object} payload - { nombre, descripcion?, juegos: [...], equipos: [...] }
   * @returns {Promise<object>} Circuito creado.
   */
  async crearCircuito(payload) {
    return this.circuitos.crearCircuito(payload);
  }

  /**
   * Actualiza un circuito con control de concurrencia por version.
   * @param {string} circuitoId
   * @param {number} expectedVersion
   * @param {object} payload
   * @returns {Promise<object>} Circuito actualizado.
   */
  async actualizarCircuito(circuitoId, expectedVersion, payload) {
    return this.circuitos.actualizarCircuito(circuitoId, expectedVersion, payload);
  }

  /**
   * Elimina un circuito (rechaza si tiene partida EN_CURSO).
   * @param {string} circuitoId
   * @returns {Promise<void>}
   */
  async eliminarCircuito(circuitoId) {
    return this.circuitos.eliminarCircuito(circuitoId);
  }
}
