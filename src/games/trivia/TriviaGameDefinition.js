/* =============================================================
   TriviaGameDefinition — definición del juego Trivia.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Trivia es un juego de preguntas y respuestas múltiples.
   Cada set contiene items con pregunta, opciones y respuesta correcta.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

const FASES = Object.freeze([
  'MOSTRANDO_PREGUNTA',
  'SELECCIONANDO_RESPUESTA',
  'MOSTRANDO_RESULTADO',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;
const DIFICULTAD_MIN = 1;
const DIFICULTAD_MAX = 3;

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

function validarArrayNoVacio(valor, nombre) {
  if (!Array.isArray(valor)) {
    throw new ValidacionError(`${nombre} debe ser un array`);
  }
  if (valor.length === 0) {
    throw new ValidacionError(`${nombre} no puede estar vacío`);
  }
}

export const TriviaGameDefinition = {
  codigo: 'TRIVIA',
  nombre: 'Trivia',
  requiere_set: true,

  /**
   * Valida la configuración de Trivia para un CircuitoJuego.
   * @param {object} config
   * @returns {true} si la configuración es válida.
   * @throws {ValidacionError} si falta algún campo o tiene valor inválido.
   */
  validarConfiguracion(config) {
    if (!config || typeof config !== 'object') {
      throw new ValidacionError('La configuración debe ser un objeto');
    }

    if (!esEnteroMayorQue(config.rondas, 1)) {
      throw new ValidacionError('rondas debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.preguntas_por_ronda, 1)) {
      throw new ValidacionError('preguntas_por_ronda debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }

    if (typeof config.penalizacion_activa !== 'boolean') {
      throw new ValidacionError('penalizacion_activa debe ser booleano');
    }

    if (!esEnteroNoNegativo(config.penalizacion_puntos)) {
      throw new ValidacionError('penalizacion_puntos debe ser un entero >= 0');
    }

    if (config.penalizacion_activa === true && config.penalizacion_puntos <= 0) {
      throw new ValidacionError(
        'Si penalizacion_activa es true, penalizacion_puntos debe ser > 0'
      );
    }

    if (!esEnteroMayorQue(config.tiempo_por_pregunta_seg, 1)) {
      throw new ValidacionError('tiempo_por_pregunta_seg debe ser un entero >= 1');
    }

    return true;
  },

  /**
   * Valida el contenido de un set de Trivia (snapshot).
   * @param {object} contenido - { items: [...] }
   * @returns {true} si el contenido es válido.
   * @throws {ValidacionError} si algún item tiene formato inválido.
   */
  validarContenidoSet(contenido) {
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('El contenido debe ser un objeto');
    }

    validarArrayNoVacio(contenido.items, 'items');

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        throw new ValidacionError(`items[${i}] debe ser un objeto`);
      }

      if (typeof item.pregunta !== 'string' || item.pregunta.trim() === '') {
        throw new ValidacionError(`items[${i}].pregunta debe ser un string no vacío`);
      }

      if (!Array.isArray(item.opciones)) {
        throw new ValidacionError(`items[${i}].opciones debe ser un array`);
      }

      if (item.opciones.length < MIN_OPCIONES) {
        throw new ValidacionError(
          `items[${i}].opciones debe tener al menos ${MIN_OPCIONES} opciones`
        );
      }

      if (item.opciones.length > MAX_OPCIONES) {
        throw new ValidacionError(
          `items[${i}].opciones debe tener como máximo ${MAX_OPCIONES} opciones`
        );
      }

      if (!Number.isInteger(item.respuesta_correcta_index)) {
        throw new ValidacionError(
          `items[${i}].respuesta_correcta_index debe ser un entero`
        );
      }

      if (
        item.respuesta_correcta_index < 0 ||
        item.respuesta_correcta_index >= item.opciones.length
      ) {
        throw new ValidacionError(
          `items[${i}].respuesta_correcta_index fuera de rango [0, ${item.opciones.length - 1}]`
        );
      }

      if (item.dificultad !== undefined) {
        if (!Number.isInteger(item.dificultad)) {
          throw new ValidacionError(`items[${i}].dificultad debe ser un entero`);
        }
        if (item.dificultad < DIFICULTAD_MIN || item.dificultad > DIFICULTAD_MAX) {
          throw new ValidacionError(
            `items[${i}].dificultad fuera de rango [${DIFICULTAD_MIN}, ${DIFICULTAD_MAX}]`
          );
        }
      }
    }

    return true;
  },

  /**
   * Valida el estado dinámico de un juego Trivia.
   * @param {object} estado
   * @returns {true} si el estado es válido.
   * @throws {ValidacionError} si el estado tiene formato inválido.
   */
  validarEstadoJuego(estado) {
    if (!estado || typeof estado !== 'object') {
      throw new ValidacionError('El estado debe ser un objeto');
    }

    if (!esEnteroMayorQue(estado.ronda_actual, 1)) {
      throw new ValidacionError('ronda_actual debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(estado.pregunta_actual_index)) {
      throw new ValidacionError('pregunta_actual_index debe ser un entero >= 0');
    }

    if (typeof estado.fase !== 'string' || !FASES.includes(estado.fase)) {
      throw new ValidacionError(
        `fase inválida. Debe ser una de: ${FASES.join(', ')}`
      );
    }

    if (!Array.isArray(estado.respuestas)) {
      throw new ValidacionError('respuestas debe ser un array');
    }

    for (let i = 0; i < estado.respuestas.length; i++) {
      const r = estado.respuestas[i];
      if (!r || typeof r !== 'object') {
        throw new ValidacionError(`respuestas[${i}] debe ser un objeto`);
      }
      if (r.equipo !== 1 && r.equipo !== 2 && r.equipo !== 0) {
        throw new ValidacionError(
          `respuestas[${i}].equipo inválido. Debe ser 0, 1 o 2`
        );
      }
      if (!Number.isInteger(r.opcion_index) && r.opcion_index !== null) {
        throw new ValidacionError(
          `respuestas[${i}].opcion_index debe ser un entero o null`
        );
      }
      if (typeof r.correcta !== 'boolean') {
        throw new ValidacionError(
          `respuestas[${i}].correcta debe ser booleano`
        );
      }
      if (typeof r.puntos !== 'number' || !Number.isFinite(r.puntos)) {
        throw new ValidacionError(
          `respuestas[${i}].puntos debe ser un número finito`
        );
      }
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
    }

    return true;
  },

  /**
   * Calcula el resultado final de un juego Trivia.
   * @param {object} estadoJuego
   * @returns {{ puntos_equipo_1: number, puntos_equipo_2: number }}
   * @throws {ValidacionError} si el estado no contiene los campos de puntos.
   */
  calcularResultado(estadoJuego) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }

    const p1 = typeof estadoJuego.puntos_equipo_1 === 'number'
      ? estadoJuego.puntos_equipo_1
      : 0;
    const p2 = typeof estadoJuego.puntos_equipo_2 === 'number'
      ? estadoJuego.puntos_equipo_2
      : 0;

    return {
      puntos_equipo_1: p1,
      puntos_equipo_2: p2
    };
  },

  /**
   * Aplica el efecto de tiempo agotado para la pregunta actual.
   * Devuelve un nuevo objeto (no muta el original).
   * @param {object} estadoJuego
   * @returns {object|null} Nuevo estado o null si ya terminó el juego.
   * @throws {ValidacionError} si el estado es inválido.
   */
  aplicarTimeUp(estadoJuego) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }

    if (estadoJuego.fase === 'FIN_DE_JUEGO') {
      return null;
    }

    if (estadoJuego.fase === 'FIN_DE_RONDA') {
      return { ...estadoJuego };
    }

    if (estadoJuego.fase === 'MOSTRANDO_RESULTADO') {
      return { ...estadoJuego };
    }

    const respuestaTimeUp = {
      equipo: 0,
      opcion_index: null,
      correcta: false,
      puntos: 0
    };

    return {
      ...estadoJuego,
      fase: 'MOSTRANDO_RESULTADO',
      respuestas: [...estadoJuego.respuestas, respuestaTimeUp]
    };
  }
};
