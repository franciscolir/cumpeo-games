/* =============================================================
   RoscoGameDefinition — definición del juego Rosco.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Rosco es un juego de preguntas y respuestas asociadas a letras
   de un rosco alfabético. 27 letras fijas A–Z + Ñ.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Alfabeto canónico
   ============================================================= */

export const ALFABETO = Object.freeze([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
]);

const SET_LETRAS = new Set(ALFABETO);

/* =============================================================
   Estados de letra
   ============================================================= */

export const ESTADO_LETRA = Object.freeze({
  PENDIENTE: 'pendiente',
  CORRECTA: 'correcta',
  INCORRECTA: 'incorrecta',
  PASADA: 'pasada'
});

/* =============================================================
   Estados de turno
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'TURNO_ACTIVO',
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

export const RoscoGameDefinition = {
  codigo: 'ROSCO',
  nombre: 'Rosco',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    segundos_por_equipo: 60,
    puntos_por_acierto: 10,
    penalizacion_puntos: 5
  }),

  /**
   * Valida la configuración de Rosco.
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

    if (!esEnteroMayorQue(config.segundos_por_equipo, 1)) {
      throw new ValidacionError('segundos_por_equipo debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(config.penalizacion_puntos)) {
      throw new ValidacionError('penalizacion_puntos debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida que un set tenga la estructura correcta para Rosco.
   * 1 set = 27 letras (A–Z + Ñ), exactamente 1 definición + 1 respuesta por letra.
   * @param {object} contenido - { items: [...] }
   * @param {object} [config] - no usado para rondas (compatibilidad de contrato)
   * @returns {{ ok: boolean, errores: string[] }}
   */
  validarContenidoSet(contenido, config) {
    const errores = [];

    if (!contenido || typeof contenido !== 'object') {
      return { ok: false, errores: ['El contenido debe ser un objeto'] };
    }

    if (!Array.isArray(contenido.items)) {
      return { ok: false, errores: ['items debe ser un array'] };
    }

    if (contenido.items.length !== 27) {
      errores.push('El set debe tener exactamente 27 items (1 por letra)');
    }

    const itemsPorLetra = {};
    for (const letra of ALFABETO) {
      itemsPorLetra[letra] = [];
    }

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        errores.push(`items[${i}] debe ser un objeto`);
        continue;
      }

      if (typeof item.letra !== 'string' || item.letra.trim() === '') {
        errores.push(`items[${i}].letra debe ser un string no vacío`);
        continue;
      }

      if (!SET_LETRAS.has(item.letra)) {
        errores.push(`items[${i}].letra "${item.letra}" no es válida. Debe ser A-Z o Ñ`);
        continue;
      }

      if (typeof item.definicion !== 'string' || item.definicion.trim() === '') {
        errores.push(`items[${i}].definicion debe ser un string no vacío`);
        continue;
      }

      if (typeof item.respuesta !== 'string' || item.respuesta.trim() === '') {
        errores.push(`items[${i}].respuesta debe ser un string no vacío`);
        continue;
      }

      itemsPorLetra[item.letra].push(item);
    }

    for (const letra of ALFABETO) {
      const items = itemsPorLetra[letra];
      if (items.length === 0) {
        errores.push(`Falta la letra ${letra}`);
      } else if (items.length > 1) {
        errores.push(`La letra ${letra} tiene más de un item`);
      }
    }

    return { ok: errores.length === 0, errores };
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Rosco.
   * N rondas = N sets distintos (1 ronda = 1 set).
   * @param {object} config
   * @param {Array<{id?: string, items: object[]}>} [sets] - N sets elegidos; opcional
   * @returns {object} Estado inicial
   */
  estadoInicial(config, sets = null) {
    const totalRondas = config.rondas || 1;
    const setsPorRonda = Array.isArray(sets) && sets.length > 0
      ? sets
      : [{ id: null, items: [] }];
    const setRondaActual = setsPorRonda[0] || { id: null, items: [] };

    return {
      ronda_actual: 1,
      total_rondas: totalRondas,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      puntos_equipo_1: 0,
      puntos_equipo_2: 0,
      letras_completadas_equipo_1: 0,
      letras_completadas_equipo_2: 0,
      sets_por_ronda: setsPorRonda,
      set_ronda_actual: setRondaActual,
      rosco: ALFABETO.map((letra) => ({
        letra,
        estado: ESTADO_LETRA.PENDIENTE,
        equipo_asignado: null
      })),
      indice_actual: 0,
      tiempo_equipo_1: config.segundos_por_equipo || 60,
      tiempo_equipo_2: config.segundos_por_equipo || 60,
      turno_activo: false
    };
  },

  /* =============================================================
     Reducers puros
     ============================================================= */

  /**
   * Aplica acierto a la letra actual.
   * @param {object} estado
   * @param {string} letra
   * @param {object} config
   * @returns {object} Nuevo estado
   */
  aplicarAcierto(estado, letra, config) {
    const idx = estado.rosco.findIndex((l) => l.letra === letra);
    if (idx < 0) return { ...estado };

    const letraActual = estado.rosco[idx];
    if (letraActual.estado !== ESTADO_LETRA.PENDIENTE &&
        letraActual.estado !== ESTADO_LETRA.PASADA) {
      return { ...estado };
    }

    const puntos = config?.puntos_por_acierto || 0;
    const equipo = estado.equipo_actual;

    const nuevoRosco = estado.rosco.map((l, i) =>
      i === idx ? { ...l, estado: ESTADO_LETRA.CORRECTA, equipo_asignado: equipo } : l
    );

    const keyPuntos = `puntos_equipo_${equipo}`;
    const keyLetras = `letras_completadas_equipo_${equipo}`;

    return {
      ...estado,
      rosco: nuevoRosco,
      [keyPuntos]: estado[keyPuntos] + puntos,
      [keyLetras]: estado[keyLetras] + 1
    };
  },

  /**
   * Aplica error a la letra actual.
   * @param {object} estado
   * @param {string} letra
   * @param {object} config
   * @returns {object} Nuevo estado
   */
  aplicarError(estado, letra, config) {
    const idx = estado.rosco.findIndex((l) => l.letra === letra);
    if (idx < 0) return { ...estado };

    const letraActual = estado.rosco[idx];
    if (letraActual.estado !== ESTADO_LETRA.PENDIENTE &&
        letraActual.estado !== ESTADO_LETRA.PASADA) {
      return { ...estado };
    }

    const penalizacion = config?.penalizacion_puntos || 0;
    const equipo = estado.equipo_actual;

    const nuevoRosco = estado.rosco.map((l, i) =>
      i === idx ? { ...l, estado: ESTADO_LETRA.INCORRECTA, equipo_asignado: equipo } : l
    );

    const keyPuntos = `puntos_equipo_${equipo}`;

    return {
      ...estado,
      rosco: nuevoRosco,
      [keyPuntos]: Math.max(0, estado[keyPuntos] - penalizacion)
    };
  },

  /**
   * Aplica pasapalabra a la letra actual.
   * @param {object} estado
   * @param {string} letra
   * @returns {object} Nuevo estado
   */
  aplicarPasapalabra(estado, letra) {
    const idx = estado.rosco.findIndex((l) => l.letra === letra);
    if (idx < 0) return { ...estado };

    const letraActual = estado.rosco[idx];
    if (letraActual.estado !== ESTADO_LETRA.PENDIENTE) {
      return { ...estado };
    }

    const nuevoRosco = estado.rosco.map((l, i) =>
      i === idx ? { ...l, estado: ESTADO_LETRA.PASADA } : l
    );

    return { ...estado, rosco: nuevoRosco };
  },

  /**
   * Avanza a la siguiente letra del rosco.
   * Prioridad: letras frescas (pendientes del turno actual),
   * luego pasadas, luego fin de ronda.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  avanzarLetra(estado) {
    const rosco = estado.rosco;

    let siguiente = -1;
    for (let i = estado.indice_actual + 1; i < rosco.length; i++) {
      if (rosco[i].estado === ESTADO_LETRA.PENDIENTE) {
        siguiente = i;
        break;
      }
    }

    if (siguiente === -1) {
      for (let i = 0; i <= estado.indice_actual; i++) {
        if (rosco[i].estado === ESTADO_LETRA.PENDIENTE) {
          siguiente = i;
          break;
        }
      }
    }

    if (siguiente === -1) {
      for (let i = 0; i < rosco.length; i++) {
        if (rosco[i].estado === ESTADO_LETRA.PASADA) {
          siguiente = i;
          break;
        }
      }
    }

    if (siguiente === -1) {
      return { ...estado, fase: 'FIN_DE_RONDA', turno_activo: false };
    }

    return { ...estado, indice_actual: siguiente };
  },

  /**
   * Cambia el turno al otro equipo.
   * @param {object} estado
   * @returns {object} Nuevo estado
   */
  cambiarTurno(estado) {
    const nuevoEquipo = estado.equipo_actual === 1 ? 2 : 1;
    return {
      ...estado,
      equipo_actual: nuevoEquipo,
      indice_actual: 0,
      fase: 'CAMBIO_TURNO',
      turno_activo: false
    };
  },

  /**
   * Limpia el rosco para una nueva ronda y carga el set de esa ronda.
   * @param {object} estado
   * @param {object} contenidoSet - set de la ronda N ({ id?, items })
   * @returns {object} Nuevo estado con rosco reiniciado y set actualizado
   */
  limpiarRoscoParaNuevaRonda(estado, contenidoSet) {
    const rosco = ALFABETO.map((letra) => ({
      letra,
      estado: ESTADO_LETRA.PENDIENTE,
      equipo_asignado: null
    }));

    const setRondaActual = contenidoSet != null
      ? contenidoSet
      : (estado.set_ronda_actual || { id: null, items: [] });

    return {
      ...estado,
      rosco,
      set_ronda_actual: setRondaActual,
      indice_actual: 0,
      ronda_actual: estado.ronda_actual + 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      turno_activo: false
    };
  },

  /* =============================================================
     Puntuación
     ============================================================= */

  /**
   * Calcula la puntuación de un equipo.
   * @param {object} estado
   * @param {number} equipo - 1 o 2
   * @returns {{ puntos: number, letras_completadas: number }}
   */
  calcularPuntuacion(estado, equipo) {
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0,
      letras_completadas: estado[`letras_completadas_equipo_${equipo}`] || 0
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
      const l1 = estadoJuego.letras_completadas_equipo_1 || 0;
      const l2 = estadoJuego.letras_completadas_equipo_2 || 0;
      if (l1 !== l2) {
        ganador = l1 > l2 ? 1 : 2;
      }
    }

    return {
      puntos_equipo_1: p1,
      puntos_equipo_2: p2,
      ganador
    };
  },

  /* =============================================================
     TimeUp
     ============================================================= */

  /**
   * Valida el estado dinámico de un juego Rosco.
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

    if (!Array.isArray(estado.rosco)) {
      throw new ValidacionError('rosco debe ser un array');
    }

    if (estado.rosco.length !== 27) {
      throw new ValidacionError('rosco debe tener 27 letras');
    }

    if (!Array.isArray(estado.sets_por_ronda)) {
      throw new ValidacionError('sets_por_ronda debe ser un array');
    }

    if (estado.sets_por_ronda.length < 1) {
      throw new ValidacionError('sets_por_ronda debe tener al menos 1 set');
    }

    if (!estado.set_ronda_actual || typeof estado.set_ronda_actual !== 'object') {
      throw new ValidacionError('set_ronda_actual debe ser un objeto');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
    }

    if (estado.equipo_actual !== 1 && estado.equipo_actual !== 2) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }

    return true;
  },

  /**
   * Valida que los sets elegidos al iniciar el juego sean coherentes
   * con la configuración (N rondas = N sets, cada uno con 27 letras).
   * @param {Array} sets - array de N sets elegidos
   * @param {object} config - con rondas
   * @returns {{ ok: boolean, errores: string[] }}
   */
  validarSetsElegidos(sets, config) {
    const errores = [];
    const rondas = config?.rondas || 1;

    if (!Array.isArray(sets)) {
      return { ok: false, errores: ['sets debe ser un array'] };
    }

    if (sets.length !== rondas) {
      errores.push(
        `Se requieren exactamente ${rondas} set(s) (1 por ronda), se recibieron ${sets.length}`
      );
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (!set || typeof set !== 'object') {
        errores.push(`sets[${i}] debe ser un objeto`);
        continue;
      }
      const resultado = this.validarContenidoSet(set, config);
      if (!resultado.ok) {
        for (const err of resultado.errores) {
          errores.push(`Set ${i + 1}: ${err}`);
        }
      }
    }

    return { ok: errores.length === 0, errores };
  },

  /**
   * Aplica el efecto de tiempo agotado.
   * @param {object} estadoJuego
   * @returns {object|null} Nuevo estado o null si ya terminó.
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

    return {
      ...estadoJuego,
      fase: 'FIN_DE_RONDA',
      turno_activo: false
    };
  }
};
