/* =============================================================
   HistoriaEnredadaGameDefinition — definición del juego Historia Enredada.

   Implementa el contrato GameDefinition.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

/* =============================================================
   Constantes
   ============================================================= */

export const FASES = Object.freeze([
  'INICIO_RONDA',
  'SELECCIONANDO_HISTORIA',
  'PREPARANDO',
  'ACTUANDO',
  'VOTANDO',
  'FIN_DE_RONDA',
  'FIN_DE_JUEGO'
]);

export const EQUIPOS = Object.freeze([1, 2]);

/* =============================================================
   Helpers internos
   ============================================================= */

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

function esEnteroMayorQue(valor, minimo) {
  return Number.isInteger(valor) && valor >= minimo;
}

function esStringNoVacio(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/* =============================================================
   GameDefinition
   ============================================================= */

export const HistoriaEnredadaGameDefinition = {
  codigo: 'HISTORIA_ENREDADA',
  nombre: 'Historia Enredada',
  requiere_set: true,

  /* =============================================================
     Configuración
     ============================================================= */

  defaultConfig: Object.freeze({
    rondas: 1,
    puntos_por_historia: 10
  }),

  /**
   * Valida la configuración.
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

    if (!esEnteroNoNegativo(config.puntos_por_historia)) {
      throw new ValidacionError('puntos_por_historia debe ser un entero >= 0');
    }

    return true;
  },

  /* =============================================================
     Validación de set
     ============================================================= */

  /**
   * Valida contenido del set.
   * @param {object} contenido - { items: [...] }
   * @param {object} config
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

    if (contenido.items.length === 0) {
      return { ok: false, errores: ['items no puede estar vacío'] };
    }

    for (let i = 0; i < contenido.items.length; i++) {
      const item = contenido.items[i];

      if (!item || typeof item !== 'object') {
        errores.push(`items[${i}] debe ser un objeto`);
        continue;
      }

      if (!esStringNoVacio(item.titulo)) {
        errores.push(`items[${i}].titulo debe ser un string no vacío`);
      }

      if (!esStringNoVacio(item.descripcion)) {
        errores.push(`items[${i}].descripcion debe ser un string no vacío`);
      }

      if (!esStringNoVacio(item.guion)) {
        errores.push(`items[${i}].guion debe ser un string no vacío`);
      }

      if (item.dibujo !== undefined && item.dibujo !== null) {
        if (typeof item.dibujo !== 'string' || item.dibujo.trim() === '') {
          errores.push(`items[${i}].dibujo debe ser un string no vacío si está presente`);
        }
      }
      // dibujo es opcional (storageRef)
    }

    return { ok: errores.length === 0, errores };
  },

  /* =============================================================
     Estado inicial
     ============================================================= */

  /**
   * Crea estado inicial.
   * @param {object} config
   * @returns {object}
   */
  estadoInicial(config) {
    return {
      ronda_actual: 1,
      total_rondas: config?.rondas || 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      historia_elegida_id: null,
      historias_usadas: [],
      puntos_equipo_1: 0,
      puntos_equipo_2: 0
    };
  },

  /* =============================================================
     Reducers puros
     ============================================================= */

  iniciarRonda(estado) {
    if (!estado || typeof estado !== 'object') return estado;
    return { ...estado, fase: 'SELECCIONANDO_HISTORIA' };
  },

  seleccionarHistoria(estado, historiaId, set) {
    if (!estado || typeof estado !== 'object') return estado;

    if (!set || !Array.isArray(set.items)) {
      throw new ValidacionError('El set debe tener items');
    }

    const historia = set.items.find((i) => i.id === historiaId || i.titulo === historiaId);
    if (!historia) {
      throw new ValidacionError(`Historia ${historiaId} no existe en el set`);
    }

    if (estado.historias_usadas.includes(historiaId)) {
      throw new ValidacionError(`Historia ${historiaId} ya fue usada`);
    }

    return {
      ...estado,
      historia_elegida_id: historiaId,
      historias_usadas: [...estado.historias_usadas, historiaId],
      fase: 'PREPARANDO'
    };
  },

  empezarActuacion(estado) {
    if (!estado || typeof estado !== 'object') return estado;
    return { ...estado, fase: 'ACTUANDO' };
  },

  empezarVotacion(estado) {
    if (!estado || typeof estado !== 'object') return estado;
    return { ...estado, fase: 'VOTANDO' };
  },

  asignarPuntos(estado, config, puntos) {
    if (!estado || typeof estado !== 'object') return estado;

    if (!esEnteroNoNegativo(puntos)) {
      throw new ValidacionError('puntos debe ser un entero >= 0');
    }

    const equipo = estado.equipo_actual;
    const keyPuntos = `puntos_equipo_${equipo}`;
    const nuevoPuntos = (estado[keyPuntos] || 0) + puntos;

    const nuevoEstado = {
      ...estado,
      [keyPuntos]: nuevoPuntos,
      historia_elegida_id: null
    };

    if (equipo === 1) {
      return {
        ...nuevoEstado,
        equipo_actual: 2,
        fase: 'SELECCIONANDO_HISTORIA'
      };
    } else {
      return {
        ...nuevoEstado,
        fase: 'FIN_DE_RONDA'
      };
    }
  },

  avanzarEquipo(estado) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.equipo_actual === 1) {
      return { ...estado, equipo_actual: 2, fase: 'SELECCIONANDO_HISTORIA' };
    } else {
      return { ...estado, fase: 'FIN_DE_RONDA' };
    }
  },

  iniciarSiguienteRonda(estado, config) {
    if (!estado || typeof estado !== 'object') return estado;

    if (estado.fase !== 'FIN_DE_RONDA') {
      throw new ValidacionError('No se puede iniciar siguiente ronda si la fase no es FIN_DE_RONDA');
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
      fase: 'INICIO_RONDA',
      historia_elegida_id: null
    };
  },

  calcularPuntuacion(estado, equipo) {
    if (!estado || typeof estado !== 'object') return { puntos: 0 };
    return {
      puntos: estado[`puntos_equipo_${equipo}`] || 0
    };
  },

  calcularResultado(estado, config) {
    if (!estado || typeof estado !== 'object') {
      throw new ValidacionError('El estado debe ser un objeto');
    }

    const p1 = estado.puntos_equipo_1 || 0;
    const p2 = estado.puntos_equipo_2 || 0;

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

    if (!esEnteroMayorQue(estado.ronda_actual, 0)) {
      throw new ValidacionError('ronda_actual debe ser un entero >= 1');
    }

    if (!FASES.includes(estado.fase)) {
      throw new ValidacionError(`fase inválida: ${estado.fase}`);
    }

    if (!EQUIPOS.includes(estado.equipo_actual)) {
      throw new ValidacionError('equipo_actual debe ser 1 o 2');
    }

    if (!Array.isArray(estado.historias_usadas)) {
      throw new ValidacionError('historias_usadas debe ser un array');
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
    // No aplica timer
    return null;
  }
};
