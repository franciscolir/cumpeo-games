/* =============================================================
   PictionaryGameDefinition — definición del juego Pictionary.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Pictionary usa 4 submodos de representación en orden fijo:
   PALABRAS → GESTOS → PREGUNTAS → DIBUJO.
   Cada turno = 1 submodo = 1 set. 1 ronda = 4 submodos × 2 equipos.

   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const SUBMODOS = Object.freeze(['PALABRAS', 'GESTOS', 'PREGUNTAS', 'DIBUJO']);

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_SUBMODO',
  'SELECCIONANDO_SET',
  'MOSTRANDO_PALABRA',
  'ADIVINANDO',
  'ESPERA_VALIDACION',
  'CAMBIO_TURNO',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

export const ESTADO_TURNO = Object.freeze({
  PENDIENTE: 'pendiente',
  CORRECTO: 'correcto',
  INCORRECTO: 'incorrecto',
  PASADO: 'pasado'
});

/* =============================================================
   Helpers internos
   ============================================================= */

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

function indiceSubmodo(submodo) {
  return SUBMODOS.indexOf(submodo);
}

function limpiarTurno(estado) {
  return {
    ...estado,
    set_actual: null,
    palabra_actual: null,
    prohibidas_actuales: [],
    palabra_actual_index: 0,
    palabras_del_turno: 0
  };
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const PictionaryGameDefinition = {
  codigo: 'PICTIONARY',
  nombre: 'Pictionary',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    palabras_por_turno: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 0,
    penalizacion_por_pasar: 0,
    bonus_puntos: 0
  }),

  /**
   * Valida la configuración de Pictionary.
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

    if (!esEnteroMayorQue(config.palabras_por_turno, 1)) {
      throw new ValidacionError('palabras_por_turno debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.segundos_por_modo, 1)) {
      throw new ValidacionError('segundos_por_modo debe ser un entero >= 1');
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

    if (!esEnteroNoNegativo(config.bonus_puntos)) {
      throw new ValidacionError('bonus_puntos debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida que un set tenga la estructura correcta para Pictionary.
   * @param {object} contenido - { items: [...] }
   * @param {object} config - configuración con palabras_por_turno
   * @param {string} submodo - 'PALABRAS' | 'GESTOS' | 'PREGUNTAS' | 'DIBUJO' (requerido)
   * @returns {{ ok: boolean, errores: string[] }}
   */
  validarContenidoSet(contenido, config, submodo) {
    const errores = [];

    const sub = submodo;
    if (!SUBMODOS.includes(sub)) {
      return { ok: false, errores: ['submodo inválido'] };
    }

    if (!contenido || typeof contenido !== 'object') {
      return { ok: false, errores: ['El contenido debe ser un objeto'] };
    }

    if (!Array.isArray(contenido.items)) {
      return { ok: false, errores: ['items debe ser un array'] };
    }

    if (contenido.items.length === 0) {
      return { ok: false, errores: ['items no puede estar vacío'] };
    }

    const palabrasPorTurno = config?.palabras_por_turno || 1;

    if (contenido.items.length < palabrasPorTurno) {
      errores.push(
        `items tiene ${contenido.items.length}, se necesitan al menos ${palabrasPorTurno}`
      );
    }

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        errores.push(`items[${i}] debe ser un objeto`);
        continue;
      }

      if (typeof item.concepto !== 'string' || item.concepto.trim() === '') {
        errores.push(`items[${i}].concepto debe ser un string no vacío`);
        continue;
      }

      const tieneProhibidas =
        Array.isArray(item.prohibidas) && item.prohibidas.length > 0;

      if (sub === 'PALABRAS') {
        if (!tieneProhibidas) {
          errores.push(`items[${i}].prohibidas debe ser un array no vacío`);
          continue;
        }
      } else {
        if (item.prohibidas !== undefined && item.prohibidas.length !== 0) {
          errores.push(`items[${i}].prohibidas debe estar ausente o vacío para ${sub}`);
          continue;
        }
      }

      if (item.dificultad !== undefined) {
        if (!Number.isInteger(item.dificultad) || ![1, 2, 3].includes(item.dificultad)) {
          errores.push(`items[${i}].dificultad debe ser un entero 1, 2 o 3`);
        }
      }
    }

    return { ok: errores.length === 0, errores };
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Pictionary.
   * @param {object} config
   * @returns {object} Estado inicial
   */
  estadoInicial(config) {
    const cfg = config || this.defaultConfig;
    const submodo = 'PALABRAS';
    return {
      ronda_actual: 1,
      total_rondas: cfg.rondas || 1,
      submodo_actual: submodo,
      set_actual: null,
      equipo_actual: 1,
      palabra_actual_index: 0,
      palabras_del_turno: 0,
      puntos_equipo_1: 0,
      puntos_equipo_2: 0,
      fase: 'INICIO_RONDA',
      turnos_completados_equipo_1: 0,
      turnos_completados_equipo_2: 0,
      timer_corriendo: false,
      tiempo_restante_seg: cfg.segundos_por_modo || 60,
      turno_activo: false,
      palabra_actual: null,
      prohibidas_actuales: []
    };
  },

  /* =============================================================
     Reducers puros — API de submodos
     ============================================================= */

  /**
   * SELECCIONANDO_SUBMODO → SELECCIONANDO_SET.
   * @param {object} estado
   * @param {string} submodo
   * @returns {object} Nuevo estado
   * @throws {ValidacionError}
   */
  seleccionarSubmodo(estado, submodo) {
    if (estado.fase !== 'SELECCIONANDO_SUBMODO') return { ...estado };
    if (!SUBMODOS.includes(submodo)) {
      throw new ValidacionError('submodo inválido');
    }
    return {
      ...estado,
      submodo_actual: submodo,
      fase: 'SELECCIONANDO_SET'
    };
  },

  /**
   * SELECCIONANDO_SET → MOSTRANDO_PALABRA.
   * @param {object} estado
   * @param {object} set - { submodo, items: [...] }
   * @returns {object} Nuevo estado
   * @throws {ValidacionError}
   */
  seleccionarSet(estado, set) {
    if (estado.fase !== 'SELECCIONANDO_SET') return { ...estado };
    if (!set || typeof set !== 'object' || !Array.isArray(set.items) || set.items.length === 0) {
      throw new ValidacionError('set debe ser un objeto con items no vacío');
    }
    if (set.submodo !== estado.submodo_actual) {
      throw new ValidacionError('set.submodo debe coincidir con submodo_actual');
    }
    return {
      ...estado,
      set_actual: set,
      palabra_actual_index: 0,
      palabras_del_turno: 0,
      fase: 'MOSTRANDO_PALABRA'
    };
  },

  /**
   * MOSTRANDO_PALABRA — carga palabra_actual desde set_actual.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  mostrarPalabra(estado) {
    if (estado.fase !== 'MOSTRANDO_PALABRA') return { ...estado };

    const set = estado.set_actual;

    if (!set || !Array.isArray(set.items) || set.items.length === 0) {
      return { ...estado };
    }

    const index = estado.palabra_actual_index || 0;
    const item = set.items[index % set.items.length];

    return {
      ...estado,
      set_actual: set,
      palabra_actual: item,
      prohibidas_actuales: item?.prohibidas || []
    };
  },

  /**
   * MOSTRANDO_PALABRA → ADIVINANDO.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  iniciarTiempo(estado) {
    if (estado.fase !== 'MOSTRANDO_PALABRA') return { ...estado };
    return {
      ...estado,
      fase: 'ADIVINANDO',
      timer_corriendo: true,
      turno_activo: true
    };
  },

  /**
   * ADIVINANDO → ESPERA_VALIDACION.
   * @param {object} estado
   * @param {number} segundosRestantes
   * @returns {object}
   */
  detenerTiempo(estado, segundosRestantes) {
    if (estado.fase !== 'ADIVINANDO') return { ...estado };
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
   * ESPERA_VALIDACION — suma puntos por acierto y avanza.
   * @param {object} estado
   * @param {object} config
   * @returns {object} Nuevo estado
   */
  aplicarAcierto(estado, config) {
    if (estado.fase !== 'ESPERA_VALIDACION') return { ...estado };

    const puntos = config?.puntos_por_acierto || 0;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos
    };

    return this.avanzarTurno(nuevoEstado, config);
  },

  /**
   * ESPERA_VALIDACION — penaliza por error y avanza.
   * @param {object} estado
   * @param {object} config
   * @returns {object} Nuevo estado
   */
  aplicarError(estado, config) {
    if (estado.fase !== 'ESPERA_VALIDACION') return { ...estado };

    const penalizacion = config?.penalizacion_por_error || 0;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: Math.max(0, (estado[keyPuntos] || 0) - penalizacion)
    };

    return this.avanzarTurno(nuevoEstado, config);
  },

  /**
   * ESPERA_VALIDACION — penaliza por pasar y avanza.
   * @param {object} estado
   * @param {object} config
   * @returns {object} Nuevo estado
   */
  aplicarPasar(estado, config) {
    if (estado.fase !== 'ESPERA_VALIDACION') return { ...estado };

    const penalizacion = config?.penalizacion_por_pasar || 0;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: Math.max(0, (estado[keyPuntos] || 0) - penalizacion)
    };

    return this.avanzarTurno(nuevoEstado, config);
  },

  /**
   * Bonus manual a un equipo. No cambia de fase.
   * @param {object} estado
   * @param {object} config
   * @param {number} equipo - 1 o 2
   * @returns {object} Nuevo estado
   */
  aplicarBonus(estado, config, equipo) {
    if (equipo !== 1 && equipo !== 2) return { ...estado };

    const puntos = config?.bonus_puntos || 0;
    const keyPuntos = `puntos_equipo_${equipo}`;

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos
    };
  },

  /**
   * Time up: penalización por error y queda en ESPERA_VALIDACION.
   * @param {object} estado
   * @param {object} config
   * @returns {object} Nuevo estado o null si ya terminó
   */
  aplicarTimeUp(estado, config) {
    if (!estado || typeof estado !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }

    if (estado.fase === 'FIN_DE_JUEGO' || estado.fase === 'FIN_DE_RONDA') {
      return null;
    }

    if (estado.fase !== 'ADIVINANDO') return { ...estado };

    const penalizacion = config?.penalizacion_por_error || 0;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;

    return {
      ...estado,
      [keyPuntos]: Math.max(0, (estado[keyPuntos] || 0) - penalizacion),
      timer_corriendo: false,
      tiempo_restante_seg: 0,
      fase: 'ESPERA_VALIDACION',
      turno_activo: false
    };
  },

  /**
   * Incrementa palabras_del_turno; si no quedan, llama a cambiarTurno.
   * @param {object} estado
   * @param {object} [config]
   * @returns {object} Nuevo estado
   */
  avanzarTurno(estado, config) {
    const palabrasPorTurno =
      config?.palabras_por_turno || estado.palabras_por_turno_config || 1;
    const siguienteIndex = (estado.palabra_actual_index || 0) + 1;
    const palabrasDelTurno = (estado.palabras_del_turno || 0) + 1;

    if (palabrasDelTurno < palabrasPorTurno) {
      return {
        ...estado,
        palabra_actual_index: siguienteIndex,
        palabras_del_turno: palabrasDelTurno,
        fase: 'MOSTRANDO_PALABRA',
        timer_corriendo: false,
        turno_activo: false,
        palabra_actual: null,
        prohibidas_actuales: []
      };
    }

    return this.cambiarTurno({
      ...estado,
      palabra_actual_index: 0,
      palabras_del_turno: 0
    });
  },

  /**
   * Eq1 → Eq2 (mismo submodo) o Eq2 → Eq1 (siguiente submodo).
   * Tras DIBUJO de Eq2 → FIN_DE_RONDA.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  cambiarTurno(estado) {
    const equipo = estado.equipo_actual;
    const keyTurnos = `turnos_completados_equipo_${equipo}`;
    const turnosCompletados = (estado[keyTurnos] || 0) + 1;

    const base = limpiarTurno({
      ...estado,
      [keyTurnos]: turnosCompletados,
      timer_corriendo: false,
      turno_activo: false
    });

    if (equipo === 1) {
      return {
        ...base,
        equipo_actual: 2,
        fase: 'INICIO_RONDA'
      };
    }

    const idx = indiceSubmodo(estado.submodo_actual);
    const eraUltimo = idx === SUBMODOS.length - 1;

    if (eraUltimo) {
      return {
        ...base,
        equipo_actual: 1,
        submodo_actual: SUBMODOS[0],
        fase: 'FIN_DE_RONDA'
      };
    }

    const siguiente = SUBMODOS[idx + 1];
    return {
      ...base,
      equipo_actual: 1,
      submodo_actual: siguiente,
      fase: 'INICIO_RONDA'
    };
  },

  /**
   * FIN_DE_RONDA → INICIO_RONDA o FIN_DE_JUEGO.
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  iniciarSiguienteRonda(estado, config) {
    if (estado.fase !== 'FIN_DE_RONDA') return { ...estado };
    const cfg = config || this.defaultConfig;

    if ((estado.ronda_actual || 1) >= (estado.total_rondas || 1)) {
      return {
        ...estado,
        fase: 'FIN_DE_JUEGO',
        timer_corriendo: false,
        turno_activo: false
      };
    }

    return limpiarTurno({
      ...estado,
      ronda_actual: (estado.ronda_actual || 1) + 1,
      submodo_actual: SUBMODOS[0],
      equipo_actual: 1,
      fase: 'INICIO_RONDA',
      timer_corriendo: false,
      tiempo_restante_seg: cfg.segundos_por_modo || 60,
      turno_activo: false
    });
  },

  /* =============================================================
     Puntuación
     ============================================================= */

  /**
   * Calcula la puntuación de un equipo.
   * @param {object} estado
   * @param {number} equipo - 1 o 2
   * @returns {{ puntos: number }}
   */
  calcularPuntuacion(estado, equipo) {
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0
    };
  },

  /**
   * Calcula el resultado final con desempate por turnos.
   * @param {object} estadoJuego
   * @returns {{ puntos_equipo_1: number, puntos_equipo_2: number, ganador: number|null }}
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
    if (p1 !== p2) {
      ganador = p1 > p2 ? 1 : 2;
    } else {
      const t1 = estadoJuego.turnos_completados_equipo_1 || 0;
      const t2 = estadoJuego.turnos_completados_equipo_2 || 0;
      if (t1 !== t2) {
        ganador = t1 > t2 ? 1 : 2;
      }
    }

    return {
      puntos_equipo_1: p1,
      puntos_equipo_2: p2,
      ganador
    };
  },

  /* =============================================================
     Validación de estado
     ============================================================= */

  /**
   * Valida el estado dinámico de un juego Pictionary.
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

    if (!esEnteroMayorQue(estado.total_rondas, 1)) {
      throw new ValidacionError('total_rondas debe ser un entero >= 1');
    }

    if (!SUBMODOS.includes(estado.submodo_actual)) {
      throw new ValidacionError('submodo_actual inválido');
    }

    if (estado.equipo_actual !== 1 && estado.equipo_actual !== 2) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
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
  }
};
