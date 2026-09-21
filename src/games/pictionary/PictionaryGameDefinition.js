/* =============================================================
   PictionaryGameDefinition — definición del juego Pictionary.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Pictionary es un juego de adivinanza con 4 modos de representación:
   palabras prohibidas, gestos, dibujo y preguntas sí/no.
   Orden fijo 1→2→3→4, alternando equipos.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const MODOS = Object.freeze([1, 2, 3, 4]);

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_MODO',
  'MOSTRANDO_PALABRA',
  'ADIVINANDO',
  'ESPERA_VALIDACION',
  'CAMBIO_MODO',
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

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    palabras_por_modo: 1,
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

    if (!esEnteroMayorQue(config.palabras_por_modo, 1)) {
      throw new ValidacionError('palabras_por_modo debe ser un entero >= 1');
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
   * @param {object} config - configuración con rondas y palabras_por_modo
   * @returns {{ ok: boolean, errores: string[] }}
   */
  validarContenidoSet(contenido, config) {
    const errores = [];
    const rondas = config?.rondas || 1;
    const palabrasPorModo = config?.palabras_por_modo || 1;
    const itemsRequeridos = rondas * palabrasPorModo;

    if (!contenido || typeof contenido !== 'object') {
      return { ok: false, errores: ['El contenido debe ser un objeto'] };
    }

    if (!Array.isArray(contenido.items)) {
      return { ok: false, errores: ['items debe ser un array'] };
    }

    if (contenido.items.length === 0) {
      return { ok: false, errores: ['items no puede estar vacío'] };
    }

    const itemsPorModo = { 1: [], 2: [], 3: [], 4: [] };

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        errores.push(`items[${i}] debe ser un objeto`);
        continue;
      }

      if (!MODOS.includes(item.modo)) {
        errores.push(`items[${i}].modo debe ser 1, 2, 3 o 4`);
        continue;
      }

      if (typeof item.concepto !== 'string' || item.concepto.trim() === '') {
        errores.push(`items[${i}].concepto debe ser un string no vacío`);
        continue;
      }

      if (item.modo === 1) {
        if (!Array.isArray(item.prohibidas) || item.prohibidas.length === 0) {
          errores.push(`items[${i}].prohibidas debe ser un array no vacío para modo 1`);
          continue;
        }
      }

      itemsPorModo[item.modo].push(item);
    }

    for (const modo of MODOS) {
      const items = itemsPorModo[modo];
      if (items.length === 0) {
        errores.push(`Modo ${modo} no tiene items`);
      } else if (items.length < itemsRequeridos) {
        errores.push(
          `Modo ${modo} tiene ${items.length} item(s), se necesitan al menos ${itemsRequeridos}`
        );
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
    return {
      ronda_actual: 1,
      total_rondas: cfg.rondas || 1,
      modo_actual: 1,
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
     Reducers puros
     ============================================================= */

  /**
   * Selecciona el modo actual. INICIO_RONDA → MOSTRANDO_PALABRA.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  seleccionarModo(estado) {
    if (estado.fase !== 'INICIO_RONDA') return { ...estado };
    return {
      ...estado,
      fase: 'MOSTRANDO_PALABRA'
    };
  },

  /**
   * Muestra una palabra aleatoria del modo actual del set.
   * @param {object} estado
   * @param {object} contenidoSet - { items: [...] }
   * @returns {object} Nuevo estado con palabra_actual y prohibidas_actuales
   */
  mostrarPalabra(estado, contenidoSet) {
    if (estado.fase !== 'MOSTRANDO_PALABRA') return { ...estado };

    const items = contenidoSet?.items || [];
    const modoActual = estado.modo_actual;
    const index = estado.palabra_actual_index || 0;

    const itemsDelModo = items.filter((item) => item.modo === modoActual);
    if (itemsDelModo.length === 0) return { ...estado };

    const palabra = itemsDelModo[index % itemsDelModo.length];

    return {
      ...estado,
      palabra_actual: palabra,
      prohibidas_actuales: palabra?.prohibidas || []
    };
  },

  /**
   * Inicia el tiempo. MOSTRANDO_PALABRA → ADIVINANDO.
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
   * Detiene el tiempo y pasa a espera de validación.
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
   * Aplica acierto. Suma puntos y avanza.
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

    return this.avanzarTurno(nuevoEstado);
  },

  /**
   * Aplica error. Penaliza y avanza.
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

    return this.avanzarTurno(nuevoEstado);
  },

  /**
   * Aplica pasar. Penaliza si corresponde y avanza.
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

    return this.avanzarTurno(nuevoEstado);
  },

  /**
   * Aplica bonus manual a un equipo.
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
   * Aplica time up. Error automático y avanza.
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

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: Math.max(0, (estado[keyPuntos] || 0) - penalizacion),
      timer_corriendo: false,
      tiempo_restante_seg: 0,
      fase: 'ESPERA_VALIDACION',
      turno_activo: false
    };

    return this.avanzarTurno(nuevoEstado);
  },

  /**
   * Avanza al siguiente turno (palabra, modo o equipo).
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  avanzarTurno(estado) {
    const palabrasPorModo = estado.palabras_por_modo_config || 1;
    const siguientePalabraIndex = (estado.palabra_actual_index || 0) + 1;
    const palabrasDelTurno = (estado.palabras_del_turno || 0) + 1;

    if (palabrasDelTurno < palabrasPorModo) {
      return {
        ...estado,
        palabra_actual_index: siguientePalabraIndex,
        palabras_del_turno: palabrasDelTurno,
        fase: 'INICIO_RONDA',
        timer_corriendo: false,
        tiempo_restante_seg: estado.tiempo_restante_seg,
        turno_activo: false,
        palabra_actual: null,
        prohibidas_actuales: []
      };
    }

    return this.avanzarModo({
      ...estado,
      palabra_actual_index: 0,
      palabras_del_turno: 0
    });
  },

  /**
   * Avanza al siguiente modo o cambia de equipo.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  avanzarModo(estado) {
    const modoActual = estado.modo_actual || 1;
    const equipo = estado.equipo_actual;

    if (equipo === 1) {
      return {
        ...estado,
        equipo_actual: 2,
        fase: 'INICIO_RONDA',
        timer_corriendo: false,
        tiempo_restante_seg: estado.tiempo_restante_seg,
        turno_activo: false,
        palabra_actual: null,
        prohibidas_actuales: []
      };
    }

    if (modoActual < 4) {
      return {
        ...estado,
        modo_actual: modoActual + 1,
        equipo_actual: 1,
        fase: 'INICIO_RONDA',
        timer_corriendo: false,
        tiempo_restante_seg: estado.tiempo_restante_seg,
        turno_activo: false,
        palabra_actual: null,
        prohibidas_actuales: []
      };
    }

    return this.cambiarTurno(estado);
  },

  /**
   * Cambia de turno. Alterna equipo 1↔2 o avanza ronda.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  cambiarTurno(estado) {
    const ronda = estado.ronda_actual || 1;
    const totalRondas = estado.total_rondas || 1;

    const keyTurnos = `turnos_completados_equipo_${estado.equipo_actual}`;
    const turnosCompletados = (estado[keyTurnos] || 0) + 1;

    const nuevoEstado = {
      ...estado,
      [keyTurnos]: turnosCompletados
    };

    if (ronda >= totalRondas) {
      return {
        ...nuevoEstado,
        fase: 'FIN_DE_JUEGO',
        timer_corriendo: false,
        turno_activo: false
      };
    }

    return {
      ...nuevoEstado,
      ronda_actual: ronda + 1,
      modo_actual: 1,
      equipo_actual: 1,
      fase: 'FIN_DE_RONDA',
      timer_corriendo: false,
      turno_activo: false,
      palabra_actual: null,
      prohibidas_actuales: []
    };
  },

  /**
   * Inicia la siguiente ronda desde FIN_DE_RONDA.
   * @param {object} estado
   * @param {object} config
   * @returns {object}
   */
  iniciarSiguienteRonda(estado, config) {
    if (estado.fase !== 'FIN_DE_RONDA') return { ...estado };
    const cfg = config || this.defaultConfig;
    return {
      ...estado,
      ronda_actual: (estado.ronda_actual || 1) + 1,
      modo_actual: 1,
      equipo_actual: 1,
      palabra_actual_index: 0,
      palabras_del_turno: 0,
      fase: 'INICIO_RONDA',
      timer_corriendo: false,
      tiempo_restante_seg: cfg.segundos_por_modo || 60,
      turno_activo: false,
      palabra_actual: null,
      prohibidas_actuales: []
    };
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
   * Calcula el resultado final con desempate.
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

    if (!MODOS.includes(estado.modo_actual)) {
      throw new ValidacionError('modo_actual debe ser 1, 2, 3 o 4');
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
