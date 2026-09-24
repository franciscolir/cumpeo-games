/* =============================================================
   EnlacesGameDefinition — definición del juego Enlaces.

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Juego de asociación 1:1: columna A (fija) + columna B
   (desordenada). El conductor arrastra elementos de B para
   alinearlos con A.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_SET',
  'PREPARANDO_TABLERO',
  'ORDENANDO',
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

function paresDeConfig(config) {
  return config?.pares_por_turno || 8;
}

function tiempoDeConfig(config) {
  return config?.tiempo_turno_seg || 60;
}

function puntosDeConfig(config) {
  return config?.puntos_por_acierto ?? 10;
}

/**
 * Baraja un array (Fisher-Yates). No muta el original.
 * @param {Array} arr
 * @param {Function} [rng=Math.random]
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

function esFaseTerminal(fase) {
  return fase === 'FIN_DE_RONDA' || fase === 'FIN_DE_JUEGO';
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const EnlacesGameDefinition = {
  codigo: 'ENLACES',
  nombre: 'Enlaces',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    pares_por_turno: 8,
    tiempo_turno_seg: 60,
    puntos_por_acierto: 10
  }),

  /**
   * Valida la configuración de Enlaces.
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

    if (!esEnteroMayorQue(config.pares_por_turno, 1)) {
      throw new ValidacionError('pares_por_turno debe ser un entero >= 1');
    }

    if (!esEnteroMayorQue(config.tiempo_turno_seg, 1)) {
      throw new ValidacionError('tiempo_turno_seg debe ser un entero >= 1');
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
   * Valida el contenido de un set de Enlaces.
   * @param {object} contenido - { items: [...] }
   * @param {object} config - configuración con pares_por_turno
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarContenidoSet(contenido, config) {
    const paresPorTurno = paresDeConfig(config);

    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('El contenido debe ser un objeto');
    }

    if (!Array.isArray(contenido.items)) {
      throw new ValidacionError('items debe ser un array');
    }

    if (contenido.items.length === 0) {
      throw new ValidacionError('items no puede estar vacío');
    }

    if (contenido.items.length < paresPorTurno) {
      throw new ValidacionError(
        `items debe tener al menos ${paresPorTurno} items (pares_por_turno)`
      );
    }

    if (contenido.items.length > 10) {
      throw new ValidacionError(
        'items no puede tener más de 10 items (máximo 10)'
      );
    }

    const conceptosA = new Set();
    const conceptosB = new Set();

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        throw new ValidacionError(`items[${i}] debe ser un objeto`);
      }

      if (typeof item.concepto_a !== 'string' || item.concepto_a.trim() === '') {
        throw new ValidacionError(`items[${i}].concepto_a debe ser un string no vacío`);
      }

      if (typeof item.concepto_b !== 'string' || item.concepto_b.trim() === '') {
        throw new ValidacionError(`items[${i}].concepto_b debe ser un string no vacío`);
      }

      if (conceptosA.has(item.concepto_a)) {
        throw new ValidacionError(
          `concepto_a duplicado: "${item.concepto_a}"`
        );
      }
      conceptosA.add(item.concepto_a);

      if (conceptosB.has(item.concepto_b)) {
        throw new ValidacionError(
          `concepto_b duplicado: "${item.concepto_b}"`
        );
      }
      conceptosB.add(item.concepto_b);

      if (item.categoria !== undefined && typeof item.categoria !== 'string') {
        throw new ValidacionError(`items[${i}].categoria debe ser un string`);
      }

      if (
        item.dificultad !== undefined &&
        item.dificultad !== 1 &&
        item.dificultad !== 2 &&
        item.dificultad !== 3
      ) {
        throw new ValidacionError(`items[${i}].dificultad debe ser 1, 2 o 3`);
      }
    }

    return true;
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea el estado inicial de una partida de Enlaces.
   * @param {object} config
   * @returns {object}
   */
  estadoInicial(config) {
    return {
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      ronda_actual: 1,
      total_rondas: config?.rondas || 1,
      set_equipo_1: null,
      set_equipo_2: null,
      items: [],
      columna_a: [],
      columna_b: [],
      pares_correctos: {},
      movimientos: [],
      validado: false,
      resultado_turno: null,
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
   * Selecciona un set para el equipo activo y carga sus items.
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

    const paresPorTurno = paresDeConfig(config);

    if (set.items.length < paresPorTurno) {
      throw new ValidacionError(
        `El set debe tener al menos ${paresPorTurno} items (pares_por_turno)`
      );
    }

    const equipo = estado.equipo_actual;
    const keySet = `set_equipo_${equipo}`;

    return {
      ...estado,
      [keySet]: set.id || null,
      items: [...set.items],
      columna_a: [],
      columna_b: [],
      pares_correctos: {},
      movimientos: [],
      validado: false,
      resultado_turno: null,
      tiempo_agotado: false,
      fase: 'PREPARANDO_TABLERO'
    };
  },

  /**
   * Genera el tablero: columna_a fija, columna_b aleatoria,
   * mapa de pares correctos. Transiciona a ORDENANDO con timer.
   * @param {object} estado
   * @param {Array} [items] - items a usar; si se omite usa estado.items
   * @param {object} config
   * @param {object} [opts] - { shuffle: Function }
   * @returns {object} nuevo estado
   */
  prepararTablero(estado, items, config, opts) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'PREPARANDO_TABLERO') {
      throw new ValidacionError('Solo se puede preparar tablero en fase PREPARANDO_TABLERO');
    }

    const paresPorTurno = paresDeConfig(config);
    const fuente = Array.isArray(items) && items.length > 0 ? items : estado.items;

    if (!Array.isArray(fuente) || fuente.length < paresPorTurno) {
      throw new ValidacionError(
        `Se necesitan al menos ${paresPorTurno} items (pares_por_turno)`
      );
    }

    // Tomar pares_por_turno items al azar si hay más
    const elegidos = fuente.length > paresPorTurno
      ? barajar(fuente, opts?.shuffle).slice(0, paresPorTurno)
      : fuente.slice(0, paresPorTurno);

    const columna_a = elegidos.map((it) => it.concepto_a);
    const columna_b = barajar(
      elegidos.map((it) => it.concepto_b),
      opts?.shuffle
    );
    const pares_correctos = {};
    for (const it of elegidos) {
      pares_correctos[it.concepto_a] = it.concepto_b;
    }

    return {
      ...estado,
      items: elegidos,
      columna_a,
      columna_b,
      pares_correctos,
      movimientos: [],
      validado: false,
      resultado_turno: null,
      fase: 'ORDENANDO',
      timer_activo: true,
      tiempo_restante_seg: tiempoDeConfig(config),
      tiempo_agotado: false
    };
  },

  /**
   * Mueve un elemento de la columna B de una posición a otra.
   * @param {object} estado
   * @param {number} desdeIdx
   * @param {number} hastaIdx
   * @returns {object} nuevo estado
   */
  moverElemento(estado, desdeIdx, hastaIdx) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'ORDENANDO') {
      throw new ValidacionError('Solo se puede mover un elemento en fase ORDENANDO');
    }

    if (!Number.isInteger(desdeIdx) || desdeIdx < 0 || desdeIdx >= estado.columna_b.length) {
      throw new ValidacionError('desdeIdx fuera de rango');
    }

    if (!Number.isInteger(hastaIdx) || hastaIdx < 0 || hastaIdx >= estado.columna_b.length) {
      throw new ValidacionError('hastaIdx fuera de rango');
    }

    if (desdeIdx === hastaIdx) {
      return { ...estado };
    }

    const nueva = [...estado.columna_b];
    const [elem] = nueva.splice(desdeIdx, 1);
    nueva.splice(hastaIdx, 0, elem);

    return {
      ...estado,
      columna_b: nueva,
      movimientos: [...estado.movimientos, { desde: desdeIdx, hasta: hastaIdx }]
    };
  },

  /**
   * Revierte el último movimiento registrado.
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  deshacerMovimiento(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'ORDENANDO') {
      throw new ValidacionError('Solo se puede deshacer en fase ORDENANDO');
    }

    if (estado.movimientos.length === 0) {
      return { ...estado };
    }

    const ultimo = estado.movimientos[estado.movimientos.length - 1];
    const nueva = [...estado.columna_b];
    const [elem] = nueva.splice(ultimo.hasta, 1);
    nueva.splice(ultimo.desde, 0, elem);

    return {
      ...estado,
      columna_b: nueva,
      movimientos: estado.movimientos.slice(0, -1)
    };
  },

  /**
   * Valida la columna B contra los pares correctos.
   * Calcula resultado_turno y asigna puntos.
   * @param {object} estado
   * @param {object} config
   * @returns {object} nuevo estado
   */
  validar(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (
      estado.fase !== 'ORDENANDO' &&
      estado.fase !== 'ESPERA_VALIDACION'
    ) {
      throw new ValidacionError(
        'Solo se puede validar en ORDENANDO o ESPERA_VALIDACION'
      );
    }

    const total = estado.columna_a.length;
    let aciertos = 0;
    for (let i = 0; i < total; i++) {
      if (estado.pares_correctos[estado.columna_a[i]] === estado.columna_b[i]) {
        aciertos++;
      }
    }

    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const puntos = aciertos * puntosDeConfig(config);

    return {
      ...estado,
      [keyPuntos]: (estado[keyPuntos] || 0) + puntos,
      resultado_turno: { aciertos, total },
      validado: true,
      fase: 'MOSTRANDO_RESULTADO',
      timer_activo: false
    };
  },

  /**
   * Transiciona de MOSTRANDO_RESULTADO a CAMBIO_TURNO.
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  siguienteTurno(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'MOSTRANDO_RESULTADO') {
      throw new ValidacionError(
        'Solo se puede pasar de turno desde MOSTRANDO_RESULTADO'
      );
    }

    return {
      ...estado,
      fase: 'CAMBIO_TURNO',
      timer_activo: false
    };
  },

  /**
   * Transiciona de CAMBIO_TURNO al siguiente equipo o FIN_DE_RONDA.
   * Eq1 → Eq2 (SELECCIONANDO_SET). Eq2 → FIN_DE_RONDA.
   * @param {object} estado
   * @param {object} [config]
   * @returns {object} nuevo estado
   */
  iniciarSiguienteTurno(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'CAMBIO_TURNO') {
      throw new ValidacionError('Solo se puede iniciar siguiente turno desde CAMBIO_TURNO');
    }

    if (estado.equipo_actual === 1) {
      return {
        ...estado,
        equipo_actual: 2,
        items: [],
        columna_a: [],
        columna_b: [],
        pares_correctos: {},
        movimientos: [],
        validado: false,
        resultado_turno: null,
        fase: 'SELECCIONANDO_SET',
        timer_activo: false,
        tiempo_restante_seg: tiempoDeConfig(config),
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
      items: [],
      columna_a: [],
      columna_b: [],
      pares_correctos: {},
      movimientos: [],
      validado: false,
      resultado_turno: null,
      fase: 'INICIO_RONDA',
      timer_activo: false,
      tiempo_restante_seg: tiempoDeConfig(config),
      tiempo_agotado: false
    };
  },

  /**
   * Finaliza el juego.
   * @param {object} estado
   * @returns {object} nuevo estado
   */
  finalizarJuego(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    return {
      ...estado,
      fase: 'FIN_DE_JUEGO',
      timer_activo: false
    };
  },

  /**
   * Aplica time-up. Determinista (INV-066).
   * Si fase terminal → null.
   * Si fase ORDENANDO con timer → ESPERA_VALIDACION + tiempo_agotado.
   * @param {object} estado
   * @returns {object|null}
   */
  aplicarTimeUp(estado) {
    if (!estado || typeof estado !== 'object') return null;

    if (esFaseTerminal(estado.fase)) {
      return null;
    }

    if (estado.fase !== 'ORDENANDO' || !estado.timer_activo) {
      return { ...estado };
    }

    return {
      ...estado,
      fase: 'ESPERA_VALIDACION',
      timer_activo: false,
      tiempo_restante_seg: 0,
      tiempo_agotado: true
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

    if (!FASES.includes(estado.fase)) {
      throw new ValidacionError(`fase inválida: ${estado.fase}`);
    }

    if (estado.equipo_actual !== 1 && estado.equipo_actual !== 2) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }

    if (!esEnteroMayorQue(estado.ronda_actual, 1)) {
      throw new ValidacionError('ronda_actual debe ser un entero >= 1');
    }

    if (!Array.isArray(estado.columna_a)) {
      throw new ValidacionError('columna_a debe ser un array');
    }

    if (!Array.isArray(estado.columna_b)) {
      throw new ValidacionError('columna_b debe ser un array');
    }

    if (!Array.isArray(estado.items)) {
      throw new ValidacionError('items debe ser un array');
    }

    if (!Array.isArray(estado.movimientos)) {
      throw new ValidacionError('movimientos debe ser un array');
    }

    if (!estado.pares_correctos || typeof estado.pares_correctos !== 'object') {
      throw new ValidacionError('pares_correctos debe ser un objeto');
    }

    if (typeof estado.validado !== 'boolean') {
      throw new ValidacionError('validado debe ser booleano');
    }

    if (
      estado.resultado_turno !== null &&
      (typeof estado.resultado_turno !== 'object' ||
        typeof estado.resultado_turno.aciertos !== 'number' ||
        typeof estado.resultado_turno.total !== 'number')
    ) {
      throw new ValidacionError('resultado_turno debe ser null o { aciertos, total }');
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

    if (
      typeof estado.tiempo_restante_seg !== 'number' ||
      !Number.isFinite(estado.tiempo_restante_seg)
    ) {
      throw new ValidacionError('tiempo_restante_seg debe ser un número finito');
    }

    return true;
  }
};
