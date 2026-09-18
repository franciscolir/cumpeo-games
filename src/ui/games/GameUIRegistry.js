/* =============================================================
   GameUIRegistry — registro central de interfaces de juego.

   Cada GameUI declara cómo renderizar un juego concreto
   (área de juego, panel conductor, estado público).
   El registro permite registrar, obtener, listar y validar
   GameUIs.

   NO renderiza DOM real. Solo valida contratos.
   Sin persistencia. El registry es 100% en memoria.
   Sin actionId. No es una operación de ejecución.
   ============================================================= */

import {
  ValidacionError,
  YaExisteError
} from '../../repositories/errors.js';

const METODOS_OBLIGATORIOS = [
  'renderizarAreaJuego',
  'renderizarPanelConductor'
];

export class GameUIRegistry {
  constructor() {
    this.gameUIs = new Map();
  }

  /* =============================================================
     Grupo 1 — Escritura
     ============================================================= */

  /**
   * Registra un GameUI.
   * Valida campos mínimos del contrato.
   * Rechaza si ya existe uno con el mismo código.
   * @param {object} gameUI
   * @returns {object} El GameUI registrado.
   * @throws {ValidacionError} si el contrato mínimo no se cumple.
   * @throws {YaExisteError} si ya hay un GameUI con el mismo código.
   */
  registrar(gameUI) {
    this._validarContrato(gameUI);

    if (this.gameUIs.has(gameUI.codigo)) {
      throw new YaExisteError('GameUI', gameUI.codigo);
    }

    this.gameUIs.set(gameUI.codigo, gameUI);
    return gameUI;
  }

  /**
   * Elimina un GameUI.
   * @param {string} codigo
   * @returns {boolean} true si existía y fue eliminado.
   */
  desregistrar(codigo) {
    return this.gameUIs.delete(codigo);
  }

  /**
   * Vacía el registro.
   * @returns {void}
   */
  limpiar() {
    this.gameUIs.clear();
  }

  /* =============================================================
     Grupo 2 — Lecturas
     ============================================================= */

  /**
   * Obtiene un GameUI por código.
   * @param {string} codigo
   * @returns {object|undefined}
   */
  obtener(codigo) {
    return this.gameUIs.get(codigo);
  }

  /**
   * Verifica si existe un GameUI con ese código.
   * @param {string} codigo
   * @returns {boolean}
   */
  existe(codigo) {
    return this.gameUIs.has(codigo);
  }

  /**
   * Devuelve un array con todos los GameUIs registrados.
   * Es una copia defensiva: mutar el array no afecta al registry.
   * @returns {object[]}
   */
  listar() {
    return Array.from(this.gameUIs.values());
  }

  /**
   * Devuelve un array con todos los códigos registrados.
   * @returns {string[]}
   */
  listarCodigos() {
    return Array.from(this.gameUIs.keys());
  }

  /**
   * Cantidad de GameUIs registrados.
   * @returns {number}
   */
  cantidad() {
    return this.gameUIs.size;
  }

  /* =============================================================
     Validación interna del contrato mínimo
     ============================================================= */

  _validarContrato(gameUI) {
    if (!gameUI || typeof gameUI !== 'object') {
      throw new ValidacionError('El GameUI debe ser un objeto');
    }

    if (typeof gameUI.codigo !== 'string' || gameUI.codigo.trim() === '') {
      throw new ValidacionError('codigo debe ser un string no vacío');
    }

    for (const metodo of METODOS_OBLIGATORIOS) {
      if (typeof gameUI[metodo] !== 'function') {
        throw new ValidacionError(`Método obligatorio faltante: ${metodo}`);
      }
    }
  }
}
