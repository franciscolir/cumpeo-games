/* =============================================================
   MemoriaGameDefinition — definición del juego Memoricé.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Memoricé es un juego de memoria con parejas.
   Los elementos se muestran boca abajo en una grilla.
   2 equipos deben encontrar las parejas.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_SET',
  'PREPARANDO_GRILLA',
  'JUGANDO',
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

/**
 * Baraja un array (Fisher-Yates). No muta el original.
 * @param {Array} arr
 * @param {Function} [rng=Math.random] - función random opcional para tests determinísticos.
 * @returns {Array} nuevo array barajado.
 */
function barajar(arr, rng = Math.random) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const MemoriaGameDefinition = {
  codigo: 'MEMORIA',
  nombre: 'Memoricé',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    parejas_por_ronda: 6,
    tiempo_turno_seg: 20,
    tiempo_modal_cambio_turno_seg: 2,
    puntos_por_pareja: 10
  }),

  /**
   * Valida la configuración de Memoricé.
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

    if (!esEnteroMayorQue(config.parejas_por_ronda, 1)) {
      throw new ValidacionError('parejas_por_ronda debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.tiempo_turno_seg, 1)) {
      throw new ValidacionError('tiempo_turno_seg debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.tiempo_modal_cambio_turno_seg, 1)) {
      throw new ValidacionError('tiempo_modal_cambio_turno_seg debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.puntos_por_pareja)) {
      throw new ValidacionError('puntos_por_pareja debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida el contenido de un set de Memoricé.
   * @param {object} contenido - { items: [...] }
   * @param {object} config - configuración con parejas_por_ronda
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarContenidoSet(contenido, config) {
    const parejasPorRonda = config?.parejas_por_ronda || 6;

    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('El contenido debe ser un objeto');
    }

    if (!Array.isArray(contenido.items)) {
      throw new ValidacionError('items debe ser un array');
    }

    if (contenido.items.length === 0) {
      throw new ValidacionError('items no puede estar vacío');
    }

    if (contenido.items.length < parejasPorRonda) {
      throw new ValidacionError(
        `items debe tener al menos ${parejasPorRonda} items (parejas_por_ronda)`
      );
    }

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        throw new ValidacionError(`items[${i}] debe ser un objeto`);
      }

      if (typeof item.contenido !== 'string' || item.contenido.trim() === '') {
        throw new ValidacionError(`items[${i}].contenido debe ser un string no vacío`);
      }
    }

    return true;
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Memoricé.
   * @param {object} config
   * @returns {object}
   */
  estadoInicial(config) {
    return {
      ronda_actual: 1,
      total_rondas: config?.rondas || 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      set_id: null,
      elementos: [],
      elementos_volteados: [],
      elementos_descubiertos: [],
      parejas_encontradas: 0,
      parejas_equipo_1: 0,
      parejas_equipo_2: 0,
      puntos_equipo_1: 0,
      puntos_equipo_2: 0,
      timer_activo: false,
      tiempo_restante_seg: config?.tiempo_turno_seg || 20
    };
  },

  /* =============================================================
     Reducers puros
     ============================================================= */

  /**
   * Selecciona un set y prepara la grilla.
   * @param {object} estado
   * @param {object} set - { id, items: [...] }
   * @param {object} config
   * @param {object} [opts] - { shuffle: Function }
   * @returns {object} nuevo estado
   */
  seleccionarSet(estado, set, config, opts) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'SELECCIONANDO_SET') {
      throw new ValidacionError('Solo se puede seleccionar set en fase SELECCIONANDO_SET');
    }

    if (!set || !Array.isArray(set.items) || set.items.length === 0) {
      throw new ValidacionError('El set debe tener items');
    }

    const parejasPorRonda = config?.parejas_por_ronda || 6;

    if (set.items.length < parejasPorRonda) {
      throw new ValidacionError(
        `El set debe tener al menos ${parejasPorRonda} items (parejas_por_ronda)`
      );
    }

    // Duplicar cada item para formar parejas
    const elementosBase = [];
    for (let i = 0; i < set.items.length; i++) {
      const item = set.items[i];
      const idPareja = item.id || `pair-${i}`;
      const elemento = {
        id_pareja: idPareja,
        contenido: item.contenido,
        imagen_url: item.imagen_url,
        categoria: item.categoria,
        descubierto: false
      };
      elementosBase.push({ ...elemento, id_uniq: `${idPareja}-a` });
      elementosBase.push({ ...elemento, id_uniq: `${idPareja}-b` });
    }

    // Barajar
    const shuffleFn = opts?.shuffle || undefined;
    const elementos = shuffleFn
      ? barajar(elementosBase, shuffleFn)
      : barajar(elementosBase);

    return {
      ...estado,
      set_id: set.id || null,
      elementos,
      elementos_volteados: [],
      elementos_descubiertos: [],
      parejas_encontradas: 0,
      parejas_equipo_1: 0,
      parejas_equipo_2: 0,
      fase: 'JUGANDO',
      timer_activo: true,
      tiempo_restante_seg: config?.tiempo_turno_seg || 20
    };
  },

  /**
   * Voltea un elemento de la grilla. Al voltear el 2º elemento,
   * evalúa automáticamente si forman pareja.
   * @param {object} estado
   * @param {number} indice - índice del elemento en el array elementos
   * @param {object} [config] - configuración (necesaria para evaluar pareja)
   * @returns {object} nuevo estado
   */
  voltearElemento(estado, indice, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'JUGANDO') {
      throw new ValidacionError('Solo se puede voltear un elemento en fase JUGANDO');
    }

    if (!Number.isInteger(indice) || indice < 0 || indice >= estado.elementos.length) {
      throw new ValidacionError('indice fuera de rango');
    }

    if (estado.elementos_descubiertos.includes(indice)) {
      throw new ValidacionError('El elemento ya está descubierto');
    }

    if (estado.elementos_volteados.includes(indice)) {
      throw new ValidacionError('El elemento ya está volteado');
    }

    if (estado.elementos_volteados.length >= 2) {
      throw new ValidacionError('Ya hay 2 elementos volteados');
    }

    const nuevosVolteados = [...estado.elementos_volteados, indice];

    // Primer volteo: solo agrega al array
    if (nuevosVolteados.length === 1) {
      return {
        ...estado,
        elementos_volteados: nuevosVolteados
      };
    }

    // Segundo volteo: evaluar pareja automáticamente
    const [i1, i2] = nuevosVolteados;
    const el1 = estado.elementos[i1];
    const el2 = estado.elementos[i2];
    const sonPareja = el1.id_pareja === el2.id_pareja;
    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const keyParejas = `parejas_equipo_${equipo}`;
    const puntosPorPareja = config?.puntos_por_pareja || 10;

    if (sonPareja) {
      const nuevosDescubiertos = [...estado.elementos_descubiertos, i1, i2];
      const todasDescubiertas = nuevosDescubiertos.length === estado.elementos.length;

      return {
        ...estado,
        [keyPuntos]: (estado[keyPuntos] || 0) + puntosPorPareja,
        [keyParejas]: (estado[keyParejas] || 0) + 1,
        parejas_encontradas: estado.parejas_encontradas + 1,
        elementos_descubiertos: nuevosDescubiertos,
        elementos_volteados: [],
        fase: todasDescubiertas ? 'FIN_DE_RONDA' : 'JUGANDO',
        timer_activo: !todasDescubiertas,
        tiempo_restante_seg: todasDescubiertas
          ? estado.tiempo_restante_seg
          : (config?.tiempo_turno_seg || 20)
      };
    }

    // No son pareja: pasar a CAMBIO_TURNO con modal
    return {
      ...estado,
      elementos_volteados: nuevosVolteados,
      fase: 'CAMBIO_TURNO',
      timer_activo: false,
      tiempo_restante_seg: estado.tiempo_restante_seg
    };
  },

  /**
   * Inicia el turno: transiciona de CAMBIO_TURNO a JUGANDO.
   * Se llama después de que el modal de cambio de turno se cierra.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  iniciarTurno(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'CAMBIO_TURNO') {
      throw new ValidacionError('Solo se puede iniciar turno en fase CAMBIO_TURNO');
    }

    return {
      ...estado,
      equipo_actual: estado.equipo_actual === 1 ? 2 : 1,
      elementos_volteados: [],
      fase: 'JUGANDO',
      timer_activo: true,
      tiempo_restante_seg: config?.tiempo_turno_seg || 20
    };
  },

  /**
   * Cambia manualmente al otro equipo desde JUGANDO o PREPARANDO_GRILLA.
   * EquipoForzado permite saltar a un equipo específico.
   * @param {object} estado
   * @param {object} [config]
   * @param {number} [equipoForzado] - 1 o 2, si se quiere forzar un equipo
   * @returns {object} nuevo estado
   */
  cambiarTurno(estado, config, equipoForzado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'JUGANDO' && estado.fase !== 'PREPARANDO_GRILLA') {
      throw new ValidacionError('Solo se puede cambiar turno desde JUGANDO o PREPARANDO_GRILLA');
    }

    const nuevoEquipo = equipoForzado
      ? (equipoForzado === 1 || equipoForzado === 2 ? equipoForzado : estado.equipo_actual === 1 ? 2 : 1)
      : estado.equipo_actual === 1 ? 2 : 1;

    return {
      ...estado,
      equipo_actual: nuevoEquipo,
      elementos_volteados: [],
      fase: 'CAMBIO_TURNO',
      timer_activo: false
    };
  },

  /**
   * Inicia la siguiente ronda.
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
      set_id: null,
      elementos: [],
      elementos_volteados: [],
      elementos_descubiertos: [],
      parejas_encontradas: 0,
      parejas_equipo_1: 0,
      parejas_equipo_2: 0,
      fase: 'INICIO_RONDA',
      timer_activo: false,
      tiempo_restante_seg: config?.tiempo_turno_seg || 20
    };
  },

  /**
   * Aplica time-up: pasa a CAMBIO_TURNO con modal.
   * @param {object} estado
   * @param {object} config
   * @returns {object|null}
   */
  aplicarTimeUp(estado, config) {
    if (!estado || typeof estado !== 'object') return null;

    if (estado.fase === 'FIN_DE_JUEGO') {
      return null;
    }

    if (estado.fase !== 'JUGANDO' || !estado.timer_activo) {
      return { ...estado };
    }

    return {
      ...estado,
      elementos_volteados: [],
      fase: 'CAMBIO_TURNO',
      timer_activo: false
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

    if (!Array.isArray(estado.elementos)) {
      throw new ValidacionError('elementos debe ser un array');
    }

    if (!Array.isArray(estado.elementos_volteados)) {
      throw new ValidacionError('elementos_volteados debe ser un array');
    }

    if (estado.elementos_volteados.length < 0 || estado.elementos_volteados.length > 2) {
      throw new ValidacionError('elementos_volteados debe tener 0-2 elementos');
    }

    if (!Array.isArray(estado.elementos_descubiertos)) {
      throw new ValidacionError('elementos_descubiertos debe ser un array');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un número finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un número finito');
    }

    return true;
  }
};
