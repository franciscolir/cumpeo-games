/* =============================================================
   TriviaGameDefinition — definición del juego Trivia.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Trivia es un juego de preguntas y respuestas múltiples.
   Cada ronda tiene 2 turnos: Eq1 primero, Eq2 después.
   Cada turno: el equipo responde 5 preguntas de un set propio.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_SET',
  'MOSTRANDO_PREGUNTA',
  'SELECCIONANDO_RESPUESTA',
  'MOSTRANDO_RESULTADO',
  'CAMBIO_TURNO',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;
const DIFICULTAD_MIN = 1;
const DIFICULTAD_MAX = 3;

/* =============================================================
   Helpers internos
   ============================================================= */

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const TriviaGameDefinition = {
  codigo: 'TRIVIA',
  nombre: 'Trivia',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    preguntas_por_turno: 5,
    tiempo_por_pregunta_seg: 30,
    puntos_por_acierto: 10,
    penalizacion_por_error: 0,
    penalizacion_por_pasar: 0
  }),

  /**
   * Valida la configuración de Trivia.
   * @param {object} config
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarConfiguracion(config) {
    if (!config || typeof config !== 'object') {
      throw new ValidacionError('La configuración debe ser un objeto');
    }

    if (!esEnteroMayorQue(config.rondas, 1)) {
      throw new ValidacionError('rondas debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.preguntas_por_turno, 1)) {
      throw new ValidacionError('preguntas_por_turno debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.tiempo_por_pregunta_seg, 1)) {
      throw new ValidacionError('tiempo_por_pregunta_seg debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(config.penalizacion_por_error)) {
      throw new ValidacionError('penalizacion_por_error debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(config.penalizacion_por_pasar)) {
      throw new ValidacionError('penalizacion_por_pasar debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida el contenido de un set de Trivia.
   * @param {object} contenido - { items: [...] }
   * @param {object} config - configuración con preguntas_por_turno
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarContenidoSet(contenido, config) {
    const preguntasPorTurno = config?.preguntas_por_turno || 5;

    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('El contenido debe ser un objeto');
    }

    if (!Array.isArray(contenido.items)) {
      throw new ValidacionError('items debe ser un array');
    }

    if (contenido.items.length === 0) {
      throw new ValidacionError('items no puede estar vacío');
    }

    if (contenido.items.length < preguntasPorTurno) {
      throw new ValidacionError(
        `items debe tener al menos ${preguntasPorTurno} items (preguntas_por_turno)`
      );
    }

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

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Trivia.
   * @param {object} config
   * @returns {object}
   */
  estadoInicial(config) {
    return {
      ronda_actual: 1,
      total_rondas: config?.rondas || 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      set_equipo_1: null,
      set_equipo_2: null,
      preguntas_equipo_1: [],
      preguntas_equipo_2: [],
      pregunta_actual_index: 0,
      opcion_seleccionada: null,
      respuestas: [],
      puntos_equipo_1: 0,
      puntos_equipo_2: 0
    };
  },

  /* =============================================================
     Reducers puros
     ============================================================= */

  seleccionarSet(estado, set) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_SET') {
      throw new ValidacionError('Solo se puede seleccionar set en fase SELECCIONANDO_SET');
    }

    if (!set || !Array.isArray(set.items) || set.items.length === 0) {
      throw new ValidacionError('El set debe tener items');
    }

    const equipo = estado.equipo_actual;
    const keySet = `set_equipo_${equipo}`;
    const keyPreguntas = `preguntas_equipo_${equipo}`;

    return {
      ...estado,
      [keySet]: set.id || null,
      [keyPreguntas]: [...set.items],
      pregunta_actual_index: 0,
      fase: 'MOSTRANDO_PREGUNTA'
    };
  },

  iniciarSeleccion(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'MOSTRANDO_PREGUNTA') {
      throw new ValidacionError('Solo se puede iniciar selección desde MOSTRANDO_PREGUNTA');
    }

    return {
      ...estado,
      fase: 'SELECCIONANDO_RESPUESTA'
    };
  },

  seleccionarOpcion(estado, opcionIndex) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_RESPUESTA') {
      throw new ValidacionError('Solo se puede seleccionar opción en fase SELECCIONANDO_RESPUESTA');
    }

    if (!Number.isInteger(opcionIndex)) {
      throw new ValidacionError('opcionIndex debe ser un entero');
    }

    return {
      ...estado,
      opcion_seleccionada: opcionIndex
    };
  },

  validarRespuesta(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_RESPUESTA') {
      throw new ValidacionError('Solo se puede validar en fase SELECCIONANDO_RESPUESTA');
    }

    if (estado.opcion_seleccionada === null || estado.opcion_seleccionada === undefined) {
      throw new ValidacionError('Debe seleccionar una opción antes de validar');
    }

    const equipo = estado.equipo_actual;
    const keyPreguntas = `preguntas_equipo_${equipo}`;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const preguntas = estado[keyPreguntas];
    const preguntaActual = preguntas[estado.pregunta_actual_index];

    if (!preguntaActual) {
      throw new ValidacionError('No hay pregunta actual');
    }

    const correcta = estado.opcion_seleccionada === preguntaActual.respuesta_correcta_index;
    let puntos = 0;

    if (correcta) {
      puntos = config?.puntos_por_acierto || 10;
    } else {
      puntos = -(config?.penalizacion_por_error || 0);
    }

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      opcion_index: estado.opcion_seleccionada,
      correcta,
      puntos,
      paso: false
    };

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos,
      respuestas: [...estado.respuestas, respuesta],
      opcion_seleccionada: null,
      fase: 'MOSTRANDO_RESULTADO'
    };
  },

  pasarPregunta(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_RESPUESTA') {
      throw new ValidacionError('Solo se puede pasar en fase SELECCIONANDO_RESPUESTA');
    }

    const equipo = estado.equipo_actual;
    const penalizacion = config?.penalizacion_por_pasar || 0;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      opcion_index: null,
      correcta: false,
      puntos: -penalizacion,
      paso: true
    };

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) - penalizacion,
      respuestas: [...estado.respuestas, respuesta],
      opcion_seleccionada: null,
      fase: 'MOSTRANDO_RESULTADO'
    };
  },

  siguientePregunta(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'MOSTRANDO_RESULTADO') {
      throw new ValidacionError('Solo se puede avanzar pregunta desde MOSTRANDO_RESULTADO');
    }

    const preguntasPorTurno = config?.preguntas_por_turno || 5;
    const siguiente = estado.pregunta_actual_index + 1;

    if (siguiente < preguntasPorTurno) {
      return {
        ...estado,
        pregunta_actual_index: siguiente,
        fase: 'MOSTRANDO_PREGUNTA'
      };
    }

    // No quedan preguntas en este turno
    if (estado.equipo_actual === 1) {
      return {
        ...estado,
        fase: 'CAMBIO_TURNO',
        equipo_actual: 2,
        pregunta_actual_index: 0
      };
    } else {
      // Último turno de la ronda
      const siguienteRonda = estado.ronda_actual + 1;
      if (siguienteRonda <= (estado.total_rondas || 1)) {
        return {
          ...estado,
          fase: 'FIN_DE_RONDA'
        };
      } else {
        return {
          ...estado,
          fase: 'FIN_DE_JUEGO'
        };
      }
    }
  },

  cambiarTurno(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'CAMBIO_TURNO') {
      throw new ValidacionError('Solo se puede cambiar turno desde CAMBIO_TURNO');
    }

    return {
      ...estado,
      equipo_actual: 2,
      pregunta_actual_index: 0,
      fase: 'SELECCIONANDO_SET'
    };
  },

  iniciarSiguienteRonda(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'FIN_DE_RONDA') {
      throw new ValidacionError('Solo se puede iniciar siguiente ronda desde FIN_DE_RONDA');
    }

    const siguienteRonda = estado.ronda_actual + 1;
    const totalRondas = estado.total_rondas || (config?.rondas || 1);

    if (siguienteRonda > totalRondas) {
      return { ...estado, fase: 'FIN_DE_JUEGO' };
    }

    return {
      ...estado,
      ronda_actual: siguienteRonda,
      equipo_actual: 1,
      set_equipo_1: null,
      set_equipo_2: null,
      preguntas_equipo_1: [],
      preguntas_equipo_2: [],
      pregunta_actual_index: 0,
      opcion_seleccionada: null,
      fase: 'INICIO_RONDA'
    };
  },

  calcularPuntuacion(estado, equipo) {
    if (!estado || typeof estado !== 'object') return { puntos: 0 };
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0
    };
  },

  calcularResultado(estadoJuego) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }

    const p1 = typeof estadoJuego.puntos_equipo_1 === 'number'
      ? estadoJuego.puntos_equipo_1 : 0;
    const p2 = typeof estadoJuego.puntos_equipo_2 === 'number'
      ? estadoJuego.puntos_equipo_2 : 0;

    let ganador = null;
    if (p1 > p2) ganador = 1;
    else if (p2 > p1) ganador = 2;

    return {
      puntos_equipo_1: p1,
      puntos_equipo_2: p2,
      ganador
    };
  },

  /* =============================================================
     Validación de estado
     ============================================================= */

  validarEstadoJuego(estado) {
    if (!estado || typeof estado !== 'object') {
      throw new ValidacionError('El estado debe ser un objeto');
    }

    if (!esEnteroMayorQue(estado.ronda_actual, 1)) {
      throw new ValidacionError('ronda_actual debe ser un entero >= 1');
    }

    if (!FASES.includes(estado.fase)) {
      throw new ValidacionError(`fase inválida: ${estado.fase}`);
    }

    if (estado.equipo_actual !== 1 && estado.equipo_actual !== 2) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }

    if (!Array.isArray(estado.respuestas)) {
      throw new ValidacionError('respuestas debe ser un array');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
    }

    return true;
  },

  /* =============================================================
     TimeUp
     ============================================================= */

  aplicarTimeUp(estado) {
    if (!estado || typeof estado !== 'object') return null;

    if (estado.fase === 'FIN_DE_JUEGO') {
      return null;
    }

    if (estado.fase !== 'SELECCIONANDO_RESPUESTA') {
      return { ...estado };
    }

    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      opcion_index: null,
      correcta: false,
      puntos: 0,
      paso: false
    };

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0),
      respuestas: [...estado.respuestas, respuesta],
      opcion_seleccionada: null,
      fase: 'MOSTRANDO_RESULTADO'
    };
  }
};
