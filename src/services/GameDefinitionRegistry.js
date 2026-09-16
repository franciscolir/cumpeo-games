/* =============================================================
   GameDefinitionRegistry — registro central de definiciones
   de juegos.

   Cada GameDefinition declara el comportamiento de un juego
   concreto (Trivia, Rosco, Pictionary, etc.) mediante un
   contrato. El registro permite registrar, obtener, listar
   y validar definiciones.

   NO implementa lógica de juegos reales. Solo registra
   y valida contratos.

   Sin persistencia. El registry es 100% en memoria.
   Sin actionId. No es una operación de ejecución.
   ============================================================= */

import {
  ValidacionError,
  NoEncontradoError,
  YaExisteError,
  OperacionInvalidaError
} from '../repositories/errors.js';

const METODOS_OBLIGATORIOS = [
  'validarConfiguracion',
  'validarContenidoSet',
  'validarEstadoJuego',
  'calcularResultado',
  'aplicarTimeUp'
];

export class GameDefinitionRegistry {
  constructor() {
    this.definiciones = new Map();
  }

  /* =============================================================
     Grupo 1 — Escritura
     ============================================================= */

  /**
   * Registra una definición de juego.
   * Valida campos mínimos del contrato.
   * Rechaza si ya existe una con el mismo código.
   * @param {object} definicion
   * @returns {object} La definición registrada.
   * @throws {ValidacionError} si el contrato mínimo no se cumple.
   * @throws {YaExisteError} si ya hay una definición con el mismo código.
   */
  registrar(definicion) {
    this._validarContrato(definicion);

    if (this.definiciones.has(definicion.codigo)) {
      throw new YaExisteError('GameDefinition', definicion.codigo);
    }

    this.definiciones.set(definicion.codigo, definicion);
    return definicion;
  }

  /**
   * Elimina una definición.
   * @param {string} codigo
   * @returns {boolean} true si existía y fue eliminada.
   */
  desregistrar(codigo) {
    return this.definiciones.delete(codigo);
  }

  /**
   * Vacía el registro.
   * @returns {void}
   */
  limpiar() {
    this.definiciones.clear();
  }

  /* =============================================================
     Grupo 2 — Lecturas
     ============================================================= */

  /**
   * Obtiene una definición por código.
   * @param {string} codigo
   * @returns {object|undefined}
   */
  obtener(codigo) {
    return this.definiciones.get(codigo);
  }

  /**
   * Verifica si existe una definición con ese código.
   * @param {string} codigo
   * @returns {boolean}
   */
  existe(codigo) {
    return this.definiciones.has(codigo);
  }

  /**
   * Devuelve un array con todas las definiciones registradas.
   * Es una copia defensiva: mutar el array no afecta al registry.
   * @returns {object[]}
   */
  listar() {
    return Array.from(this.definiciones.values());
  }

  /**
   * Devuelve un array con todos los códigos registrados.
   * @returns {string[]}
   */
  listarCodigos() {
    return Array.from(this.definiciones.keys());
  }

  /**
   * Cantidad de definiciones registradas.
   * @returns {number}
   */
  cantidad() {
    return this.definiciones.size;
  }

  /* =============================================================
     Grupo 3 — Validación de contexto
     ============================================================= */

  /**
   * Valida que un contexto cumpla los requisitos de un juego.
   * Ejemplo: si requiere_set === true, el contexto debe tener snapshot_id.
   * @param {string} codigo - Código del juego.
   * @param {object} contexto - { snapshot_id?, ... }
   * @returns {true} si pasa la validación.
   * @throws {NoEncontradoError} si el código no existe.
   * @throws {OperacionInvalidaError} si el contexto no cumple los requisitos.
   */
  validarRequerimientos(codigo, contexto) {
    const def = this.definiciones.get(codigo);
    if (!def) {
      throw new NoEncontradoError('GameDefinition', codigo);
    }

    if (def.requiere_set === true) {
      if (!contexto || !contexto.snapshot_id) {
        throw new OperacionInvalidaError(
          `El juego ${codigo} requiere un set (snapshot_id faltante en el contexto)`
        );
      }
    }

    return true;
  }

  /* =============================================================
     Validación interna del contrato mínimo
     ============================================================= */

  _validarContrato(definicion) {
    if (!definicion || typeof definicion !== 'object') {
      throw new ValidacionError('La definición debe ser un objeto');
    }

    const camposObligatorios = ['codigo', 'nombre', 'requiere_set'];
    for (const campo of camposObligatorios) {
      if (definicion[campo] === undefined || definicion[campo] === null) {
        throw new ValidacionError(`Campo obligatorio faltante: ${campo}`);
      }
    }

    if (typeof definicion.codigo !== 'string' || definicion.codigo.trim() === '') {
      throw new ValidacionError('codigo debe ser un string no vacío');
    }
    if (typeof definicion.nombre !== 'string' || definicion.nombre.trim() === '') {
      throw new ValidacionError('nombre debe ser un string no vacío');
    }
    if (typeof definicion.requiere_set !== 'boolean') {
      throw new ValidacionError('requiere_set debe ser booleano');
    }

    for (const metodo of METODOS_OBLIGATORIOS) {
      if (typeof definicion[metodo] !== 'function') {
        throw new ValidacionError(`Método obligatorio faltante: ${metodo}`);
      }
    }
  }
}
