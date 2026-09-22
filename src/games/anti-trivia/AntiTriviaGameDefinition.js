/* =============================================================
   AntiTriviaGameDefinition — definición del juego Anti-Trivia.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Anti-juego de preguntas y respuestas: el jugador debe dar una
   respuesta INCORRECTA (que NO esté en la lista de respuestas
   correctas mostradas en pantalla).
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_SET',
  'MOSTRANDO_PREGUNTA',
  'RESPONDIENDO',
  'ESPERA_VALIDACION',
  'MOSTRANDO_RESULTADO',
  'CAMBIO_TURNO',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

/* =============================================================
   Helpers internos
   ============================================================= */

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

function tiempoDeConfig(config) {
  return config?.tiempo_respuesta_seg || 30;
}

function preguntasDeConfig(config) {
  return config?.preguntas_por_turno || 5;
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const AntiTriviaGameDefinition = {
  codigo: 'ANTI_TRIVIA',
  nombre: 'Anti-Trivia',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    preguntas_por_turno: 5,
    tiempo_respuesta_seg: 30,
    penalizacion_por_error: 0,
    puntos_por_acierto: 10
  }),

  /**
   * Valida la configuración de Anti-Trivia.
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

    if (!esEnteroMayorQue(config.tiempo_respuesta_seg, 1)) {
      throw new ValidacionError('tiempo_respuesta_seg debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.penalizacion_por_error)) {
      throw new ValidacionError('penalizacion_por_error debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida el contenido de un set de Anti-Trivia.
   * @param {object} contenido - { items: [...] }
   * @param {object} config - configuración con preguntas_por_turno
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarContenidoSet(contenido, config) {
    const preguntasPorTurno = preguntasDeConfig(config);

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

      if (!Array.isArray(item.respuestas_correctas)) {
        throw new ValidacionError(`items[${i}].respuestas_correctas debe ser un array`);
      }

      if (item.respuestas_correctas.length === 0) {
        throw new ValidacionError(
          `items[${i}].respuestas_correctas no puede estar vacío`
        );
      }

      for (let j = 0; j < item.respuestas_correctas.length; j++) {
        const respuesta = item.respuestas_correctas[j];
        if (typeof respuesta !== 'string' || respuesta.trim() === '') {
          throw new ValidacionError(
            `items[${i}].respuestas_correctas[${j}] debe ser un string no vacío`
          );
        }
      }

      if (item.categoria !== undefined && typeof item.categoria !== 'string') {
        throw new ValidacionError(`items[${i}].categoria debe ser un string`);
      }
    }

    return true;
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Anti-Trivia.
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
      respuestas: [],
      puntos_equipo_1: 0,
      puntos_equipo_2: 0,
      timer_activo: false,
      tiempo_restante_seg: tiempoDeConfig(config),
      tiempo_agotado: false
    };
  },

  /* =============================================================
     Reducers puros
     ============================================================= */

  /**
   * Selecciona un set para el equipo activo.
   * @param {object} estado
   * @param {object} set - { id, items: [...] }
   * @param {object} config
   * @returns {object} nuevo estado
   */
  seleccionarSet(estado, set, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_SET') {
      throw new ValidacionError('Solo se puede seleccionar set en fase SELECCIONANDO_SET');
    }

    if (!set || !Array.isArray(set.items) || set.items.length === 0) {
      throw new ValidacionError('El set debe tener items');
    }

    const preguntasPorTurno = preguntasDeConfig(config);

    if (set.items.length < preguntasPorTurno) {
      throw new ValidacionError(
        `El set debe tener al menos ${preguntasPorTurno} items (preguntas_por_turno)`
      );
    }

    const equipo = estado.equipo_actual;
    const keySet = `set_equipo_${equipo}`;
    const keyPreguntas = `preguntas_equipo_${equipo}`;

    return {
      ...estado,
      [keySet]: set.id || null,
      [keyPreguntas]: [...set.items],
      pregunta_actual_index: 0,
      tiempo_agotado: false,
      fase: 'MOSTRANDO_PREGUNTA'
    };
  },

  /**
   * Pasa de MOSTRANDO_PREGUNTA a RESPONDIENDO e inicia el timer.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  iniciarRespuesta(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'MOSTRANDO_PREGUNTA') {
      throw new ValidacionError('Solo se puede iniciar respuesta desde MOSTRANDO_PREGUNTA');
    }

    return {
      ...estado,
      fase: 'RESPONDIENDO',
      timer_activo: true,
      tiempo_restante_seg: tiempoDeConfig(config),
      tiempo_agotado: false
    };
  },

  /**
   * El conductor marca Acierto (respuesta incorrecta válida).
   * Permitido en RESPONDIENDO (caso A) o ESPERA_VALIDACION.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  marcarAcierto(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'RESPONDIENDO' && estado.fase !== 'ESPERA_VALIDACION') {
      throw new ValidacionError(
        'Solo se puede marcar acierto en RESPONDIENDO o ESPERA_VALIDACION'
      );
    }

    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const puntos = config?.puntos_por_acierto ?? 10;

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      resultado: 'acierto',
      puntos,
      tiempo_agotado: estado.tiempo_agotado
    };

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos,
      respuestas: [...estado.respuestas, respuesta],
      fase: 'MOSTRANDO_RESULTADO',
      timer_activo: false
    };
  },

  /**
   * El conductor marca Error (dijo una respuesta de la lista).
   * Permitido en RESPONDIENDO (caso A) o ESPERA_VALIDACION.
   * Penalización nunca baja de 0.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  marcarError(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'RESPONDIENDO' && estado.fase !== 'ESPERA_VALIDACION') {
      throw new ValidacionError(
        'Solo se puede marcar error en RESPONDIENDO o ESPERA_VALIDACION'
      );
    }

    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const penalizacion = Math.max(0, config?.penalizacion_por_error ?? 0);
    const puntos = penalizacion === 0 ? 0 : -penalizacion;

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      resultado: 'error',
      puntos,
      tiempo_agotado: estado.tiempo_agotado
    };

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos,
      respuestas: [...estado.respuestas, respuesta],
      fase: 'MOSTRANDO_RESULTADO',
      timer_activo: false
    };
  },

  /**
   * El timer llega a 0. NO es error automático: detiene el timer
   * y deja que el conductor decida (confirmar respondió / no respondió,
   * o marcar acierto/error directamente).
   * @param {object} estado
   * @returns {object|null} nuevo estado, o null si no aplica
   */
  aplicarTimeUp(estado) {
    if (!estado || typeof estado !== 'object') return null;

    if (estado.fase === 'FIN_DE_JUEGO') {
      return null;
    }

    if (estado.fase !== 'RESPONDIENDO' || !estado.timer_activo) {
      return { ...estado };
    }

    return {
      ...estado,
      fase: 'RESPONDIENDO',
      timer_activo: false,
      tiempo_restante_seg: 0,
      tiempo_agotado: true
    };
  },

  /**
   * Caso C: tras time-up, el conductor confirma que el jugador SÍ respondió.
   * → ESPERA_VALIDACION (timer detenido).
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  confirmarRespuestaMencionada(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'RESPONDIENDO') {
      throw new ValidacionError(
        'Solo se puede confirmar respuesta mencionada en fase RESPONDIENDO'
      );
    }

    if (estado.timer_activo) {
      throw new ValidacionError(
        'El timer sigue corriendo: confirmar solo después de time-up'
      );
    }

    if (!estado.tiempo_agotado) {
      throw new ValidacionError(
        'Solo se puede confirmar respuesta mencionada después de time-up'
      );
    }

    return {
      ...estado,
      fase: 'ESPERA_VALIDACION',
      timer_activo: false
    };
  },

  /**
   * Caso B: tras time-up, el conductor confirma que el jugador NO respondió.
   * → MOSTRANDO_RESULTADO sin puntaje.
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  confirmarSinRespuesta(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'RESPONDIENDO') {
      throw new ValidacionError(
        'Solo se puede confirmar sin respuesta en fase RESPONDIENDO'
      );
    }

    if (estado.timer_activo) {
      throw new ValidacionError(
        'El timer sigue corriendo: confirmar solo después de time-up'
      );
    }

    if (!estado.tiempo_agotado) {
      throw new ValidacionError(
        'Solo se puede confirmar sin respuesta después de time-up'
      );
    }

    const equipo = estado.equipo_actual;

    const respuesta = {
      equipo,
      pregunta_index: estado.pregunta_actual_index,
      resultado: 'sin_respuesta',
      puntos: 0,
      tiempo_agotado: true
    };

    return {
      ...estado,
      respuestas: [...estado.respuestas, respuesta],
      fase: 'MOSTRANDO_RESULTADO',
      timer_activo: false
    };
  },

  /**
   * Avanza desde MOSTRANDO_RESULTADO a la siguiente pregunta,
   * o cierra el turno/ronda si no quedan preguntas.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  siguientePregunta(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'MOSTRANDO_RESULTADO') {
      throw new ValidacionError(
        'Solo se puede avanzar pregunta desde MOSTRANDO_RESULTADO'
      );
    }

    const preguntasPorTurno = preguntasDeConfig(config);
    const siguiente = estado.pregunta_actual_index + 1;

    if (siguiente < preguntasPorTurno) {
      return {
        ...estado,
        pregunta_actual_index: siguiente,
        fase: 'MOSTRANDO_PREGUNTA',
        timer_activo: false,
        tiempo_restante_seg: tiempoDeConfig(config),
        tiempo_agotado: false
      };
    }

    if (estado.equipo_actual === 1) {
      return {
        ...estado,
        fase: 'CAMBIO_TURNO',
        equipo_actual: 2,
        pregunta_actual_index: 0,
        timer_activo: false,
        tiempo_agotado: false
      };
    }

    return {
      ...estado,
      fase: 'FIN_DE_RONDA',
      timer_activo: false,
      tiempo_agotado: false
    };
  },

  /**
   * Transiciona de CAMBIO_TURNO a SELECCIONANDO_SET para el
   * equipo activo (Eq2).
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  cambiarTurno(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'CAMBIO_TURNO') {
      throw new ValidacionError('Solo se puede cambiar turno desde CAMBIO_TURNO');
    }

    return {
      ...estado,
      equipo_actual: estado.equipo_actual === 1 ? 2 : estado.equipo_actual,
      pregunta_actual_index: 0,
      fase: 'SELECCIONANDO_SET',
      timer_activo: false,
      tiempo_agotado: false
    };
  },

  /**
   * Inicia la siguiente ronda desde FIN_DE_RONDA.
   * Última ronda → FIN_DE_JUEGO.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
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
      fase: 'INICIO_RONDA',
      timer_activo: false,
      tiempo_restante_seg: tiempoDeConfig(config),
      tiempo_agotado: false
    };
  },

  /* =============================================================
     Cálculos de resultado
     ============================================================= */

  /**
   * Calcula el resultado del juego.
   * @param {object} estadoJuego
   * @returns {{ puntos_equipo_1: number, puntos_equipo_2: number, ganador: 1|2|null }}
   */
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

  /**
   * Calcula la puntuación de un equipo.
   * @param {object} estado
   * @param {number} equipo - 1 o 2
   * @returns {{ puntos: number }}
   */
  calcularPuntuacion(estado, equipo) {
    if (!estado || typeof estado !== 'object') return { puntos: 0 };
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0
    };
  },

  /* =============================================================
     Validación de estado
     ============================================================= */

  /**
   * Valida que un estado de juego sea consistente.
   * @param {object} estado
   * @returns {true}
   * @throws {ValidacionError}
   */
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

    if (!Array.isArray(estado.preguntas_equipo_1)) {
      throw new ValidacionError('preguntas_equipo_1 debe ser un array');
    }

    if (!Array.isArray(estado.preguntas_equipo_2)) {
      throw new ValidacionError('preguntas_equipo_2 debe ser un array');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
    }

    if (typeof estado.timer_activo !== 'boolean') {
      throw new ValidacionError('timer_activo debe ser booleano');
    }

    if (typeof estado.tiempo_agotado !== 'boolean') {
      throw new ValidacionError('tiempo_agotado debe ser booleano');
    }

    return true;
  }
};
