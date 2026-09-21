/* =============================================================
   CancionIncompletaGameDefinition — definición del juego Canción Incompleta.

   Implementa el contrato GameDefinition.
   No usa set. El conductor elige canción a discreción con reproductor externo.
   Ronda = 2 canciones (1 por equipo). Sin rebote.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Fases
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'TURNO_ACTIVO',
  'ESPERA_VALIDACION',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

/* =============================================================
   Helpers
   ============================================================= */

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const CancionIncompletaGameDefinition = {
  codigo: 'CANCION_INCOMPLETA',
  nombre: 'Canción Incompleta',
  requiere_set: false,

  defaultConfig: Object.freeze({
    rondas: 1,
    segundos_por_cancion: 60,
    puntos_por_acierto: 10,
    penalizacion_puntos: 0
  }),

  /**
   * Valida configuración.
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
    if (!esEnteroMayorQue(config.segundos_por_cancion, 1)) {
      throw new ValidacionError('segundos_por_cancion debe ser un entero >= 1');
    }
    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }
    if (!esEnteroNoNegativo(config.penalizacion_puntos)) {
      throw new ValidacionError('penalizacion_puntos debe ser un entero >= 0');
    }
    return true;
  },

  /**
   * Validación de contenido de set — no aplica.
   * @param {object} contenido
   * @param {object} config
   * @returns {{ok:true, errores:[]}}
   */
  validarContenidoSet(contenido, config) {
    return { ok: true, errores: [] };
  },

  /**
   * Estado inicial.
   * @param {object} config
   * @returns {object}
   */
  estadoInicial(config) {
    const cfg = config || this.defaultConfig;
    const segundos = cfg.segundos_por_cancion || 60;
    return {
      ronda_actual: 1,
      total_rondas: cfg.rondas || 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      cancion_actual: 1,
      puntos_equipo_1: 0,
      puntos_equipo_2: 0,
      timer_corriendo: false,
      tiempo_restante_seg: segundos,
      turno_activo: false
    };
  },

  /**
   * Inicia turno actual.
   * @param {object} estado
   * @returns {object}
   */
  iniciarTurno(estado) {
    return {
      ...estado,
      fase: 'TURNO_ACTIVO',
      timer_corriendo: false,
      turno_activo: true
    };
  },

  /**
   * Inicia el tiempo de la canción.
   * @param {object} estado
   * @returns {object}
   */
  iniciarTiempo(estado) {
    if (estado.fase !== 'TURNO_ACTIVO') return estado;
    return { ...estado, timer_corriendo: true };
  },

  /**
   * Detiene el tiempo y pasa a espera de validación.
   * @param {object} estado
   * @param {number} segundosRestantes
   * @returns {object}
   */
  detenerTiempo(estado, segundosRestantes) {
    if (estado.fase !== 'TURNO_ACTIVO') return estado;
    const restante = Math.max(0, Number(segundosRestantes) || 0);
    return {
      ...estado,
      fase: 'ESPERA_VALIDACION',
      timer_corriendo: false,
      tiempo_restante_seg: restante,
      turno_activo: false
    };
  },

  /**
   * Aplica acierto.
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  aplicarAcierto(estado, config) {
    const puntos = config?.puntos_por_acierto || 0;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos,
      fase: 'ESPERA_VALIDACION',
      turno_activo: false
    };

    return this.avanzarCancion(nuevoEstado, config);
  },

  /**
   * Aplica error.
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  aplicarError(estado, config) {
    const equipo = estado.equipo_actual;
    const penalizacion = config?.penalizacion_puntos || 0;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: Math.max(0, (estado[keyPuntos] || 0) - penalizacion),
      fase: 'ESPERA_VALIDACION',
      turno_activo: false
    };

    return this.avanzarCancion(nuevoEstado, config);
  },

  /**
   * Avanza a próxima canción / equipo / ronda.
   * 2 canciones por ronda (1 por equipo).
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  avanzarCancion(estado, config) {
    const cfg = config || this.defaultConfig;
    const segundos = cfg?.segundos_por_cancion || 60;
    let cancion = estado.cancion_actual || 1;
    let equipo = estado.equipo_actual || 1;
    let ronda = estado.ronda_actual || 1;
    const totalRondas = estado.total_rondas || 1;

    if (cancion === 1) {
      cancion = 2;
      equipo = 2;
      return {
        ...estado,
        cancion_actual: cancion,
        equipo_actual: equipo,
        fase: 'INICIO_RONDA',
        timer_corriendo: false,
        tiempo_restante_seg: segundos,
        turno_activo: false
      };
    } else if (cancion === 2) {
      if (ronda >= totalRondas) {
        return {
          ...estado,
          fase: 'FIN_DE_JUEGO',
          timer_corriendo: false,
          tiempo_restante_seg: segundos,
          turno_activo: false
        };
      }
      ronda += 1;
      cancion = 1;
      equipo = 1;
      return {
        ...estado,
        ronda_actual: ronda,
        cancion_actual: cancion,
        equipo_actual: equipo,
        fase: 'FIN_DE_RONDA',
        timer_corriendo: false,
        tiempo_restante_seg: segundos,
        turno_activo: false
      };
    }

    return {
      ...estado,
      cancion_actual: cancion,
      equipo_actual: equipo,
      fase: 'INICIO_RONDA',
      timer_corriendo: false,
      tiempo_restante_seg: segundos,
      turno_activo: false
    };
  },

  /**
   * Inicia la siguiente ronda desde FIN_DE_RONDA.
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  iniciarSiguienteRonda(estado, config) {
    if (estado.fase !== 'FIN_DE_RONDA') return estado;
    const cfg = config || this.defaultConfig;
    const segundos = cfg?.segundos_por_cancion || 60;
    return {
      ...estado,
      ronda_actual: (estado.ronda_actual || 1) + 1,
      cancion_actual: 1,
      equipo_actual: 1,
      fase: 'INICIO_RONDA',
      timer_corriendo: false,
      tiempo_restante_seg: segundos,
      turno_activo: false
    };
  },

  /**
   * Calcula puntuación.
   * @param {object} estado
   * @param {number} equipo
   * @returns {{puntos:number}}
   */
  calcularPuntuacion(estado, equipo) {
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0
    };
  },

  /**
   * Calcula resultado final con desempate por puntos.
   * @param {object} estadoJuego
   * @returns {{puntos_equipo_1:number, puntos_equipo_2:number, ganador:number|null}}
   */
  calcularResultado(estadoJuego) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }
    const p1 = estadoJuego.puntos_equipo_1 || 0;
    const p2 = estadoJuego.puntos_equipo_2 || 0;
    let ganador = null;
    if (p1 !== p2) ganador = p1 > p2 ? 1 : 2;
    return {
      puntos_equipo_1: p1,
      puntos_equipo_2: p2,
      ganador
    };
  },

  /**
   * Valida estado dinámico.
   * @param {object} estado
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarEstadoJuego(estado) {
    if (!estado || typeof estado !== 'object') {
      throw new ValidacionError('El estado debe ser un objeto');
    }
    if (!esEnteroMayorQue(estado.ronda_actual, 1)) {
      throw new ValidacionError('ronda_actual debe ser >= 1');
    }
    if (!esEnteroMayorQue(estado.total_rondas, 1)) {
      throw new ValidacionError('total_rondas debe ser >= 1');
    }
    if (estado.equipo_actual !== 1 && estado.equipo_actual !== 2) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }
    if (estado.cancion_actual !== 1 && estado.cancion_actual !== 2) {
      throw new ValidacionError('cancion_actual debe ser 1 o 2');
    }
    if (typeof estado.timer_corriendo !== 'boolean') {
      throw new ValidacionError('timer_corriendo debe ser booleano');
    }
    if (!esEnteroNoNegativo(estado.tiempo_restante_seg)) {
      throw new ValidacionError('tiempo_restante_seg debe ser entero >= 0');
    }
    if (!FASES.includes(estado.fase)) {
      throw new ValidacionError('fase inválida');
    }
    return true;
  },

  /**
   * Aplica time up.
   * @param {object} estadoJuego
   * @param {object} config
   * @returns {object|null}
   */
  aplicarTimeUp(estadoJuego, config) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }
    if (estadoJuego.fase === 'FIN_DE_JUEGO' || estadoJuego.fase === 'FIN_DE_RONDA') {
      return null;
    }
    const cfg = config || this.defaultConfig;
    const equipo = estadoJuego.equipo_actual;
    const penalizacion = cfg?.penalizacion_puntos || 0;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const nuevoEstado = {
      ...estadoJuego,
      [keyPuntos]: penalizacion > 0 ? Math.max(0, (estadoJuego[keyPuntos] || 0) - penalizacion) : (estadoJuego[keyPuntos] || 0),
      timer_corriendo: false,
      tiempo_restante_seg: 0,
      fase: 'ESPERA_VALIDACION',
      turno_activo: false
    };
    return this.avanzarCancion(nuevoEstado, cfg);
  }
};
