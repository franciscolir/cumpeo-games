/* =============================================================
   QuePiensaElPublicoGameDefinition — definicion del juego
   "Que piensa el publico?".

   Implementa el contrato GameDefinition (ver GameDefinitionRegistry).

   Juego de encuestas binarias (A/B) al publico.
   El conductor prepara preguntas, el publico responde,
   pronosticadores predicen, y se revela todo junto.
   ============================================================= */

import { ValidacionError } from '../../repositories/errors.js';

const FASES = Object.freeze([
  'SELECCIONANDO_PREGUNTA',
  'ENCUESTA_ACTIVA',
  'ENCUESTA_CERRADA',
  'REVELANDO',
  'FIN_DE_JUEGO'
]);

const OPCIONES_PRONOSTICO = ['A', 'B', 'EMPATE'];

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
    throw new ValidacionError(`${nombre} no puede estar vacio`);
  }
}

export const QuePiensaElPublicoGameDefinition = {
  codigo: 'QUE_PIENSA_EL_PUBLICO',
  nombre: 'Que piensa el publico?',
  requiere_set: true,

  /**
   * Valida la configuracion para un CircuitoJuego.
   * @param {object} config
   * @returns {true}
   * @throws {ValidacionError}
   */
  validarConfiguracion(config) {
    if (!config || typeof config !== 'object') {
      throw new ValidacionError('La configuracion debe ser un objeto');
    }

    if (!esEnteroMayorQue(config.tiempo_por_pregunta_seg, 1)) {
      throw new ValidacionError('tiempo_por_pregunta_seg debe ser un entero >= 1');
    }

    if (!esEnteroNoNegativo(config.puntos_por_acierto)) {
      throw new ValidacionError('puntos_por_acierto debe ser un entero >= 0');
    }

    if (!esEnteroMayorQue(config.rondas, 1)) {
      throw new ValidacionError('rondas debe ser un entero >= 1');
    }

    return true;
  },

  /**
   * Valida el contenido de un set (snapshot).
   * @param {object} contenido - { items: [...] }
   * @returns {true}
   * @throws {ValidacionError}
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
        throw new ValidacionError(`items[${i}].pregunta debe ser un string no vacio`);
      }

      if (typeof item.opcion_a !== 'string' || item.opcion_a.trim() === '') {
        throw new ValidacionError(`items[${i}].opcion_a debe ser un string no vacio`);
      }

      if (typeof item.opcion_b !== 'string' || item.opcion_b.trim() === '') {
        throw new ValidacionError(`items[${i}].opcion_b debe ser un string no vacio`);
      }

      if (item.tiempo_seg !== undefined) {
        if (!esEnteroMayorQue(item.tiempo_seg, 1)) {
          throw new ValidacionError(`items[${i}].tiempo_seg debe ser un entero >= 1`);
        }
      }

      if (item.puntos_acierto !== undefined) {
        if (!esEnteroNoNegativo(item.puntos_acierto)) {
          throw new ValidacionError(`items[${i}].puntos_acierto debe ser un entero >= 0`);
        }
      }
    }

    return true;
  },

  /**
   * Valida el estado dinamico del juego.
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

    if (!esEnteroNoNegativo(estado.pregunta_actual_index)) {
      throw new ValidacionError('pregunta_actual_index debe ser un entero >= 0');
    }

    if (typeof estado.fase !== 'string' || !FASES.includes(estado.fase)) {
      throw new ValidacionError(
        `fase invalida. Debe ser una de: ${FASES.join(', ')}`
      );
    }

    if (!estado.respuestas_publico || typeof estado.respuestas_publico !== 'object') {
      throw new ValidacionError('respuestas_publico debe ser un objeto con { a, b }');
    }

    if (!esEnteroNoNegativo(estado.respuestas_publico.a)) {
      throw new ValidacionError('respuestas_publico.a debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(estado.respuestas_publico.b)) {
      throw new ValidacionError('respuestas_publico.b debe ser un entero >= 0');
    }

    if (!esEnteroNoNegativo(estado.total_respuestas)) {
      throw new ValidacionError('total_respuestas debe ser un entero >= 0');
    }

    if (estado.pronostico_equipo_1 !== null &&
        !OPCIONES_PRONOSTICO.includes(estado.pronostico_equipo_1)) {
      throw new ValidacionError('pronostico_equipo_1 debe ser null, A, B o EMPATE');
    }

    if (estado.pronostico_equipo_2 !== null &&
        !OPCIONES_PRONOSTICO.includes(estado.pronostico_equipo_2)) {
      throw new ValidacionError('pronostico_equipo_2 debe ser null, A, B o EMPATE');
    }

    if (estado.pronosticador_equipo_1 !== null &&
        typeof estado.pronosticador_equipo_1 !== 'string') {
      throw new ValidacionError('pronosticador_equipo_1 debe ser null o string');
    }

    if (estado.pronosticador_equipo_2 !== null &&
        typeof estado.pronosticador_equipo_2 !== 'string') {
      throw new ValidacionError('pronosticador_equipo_2 debe ser null o string');
    }

    if (estado.resultado_publico !== null &&
        !OPCIONES_PRONOSTICO.includes(estado.resultado_publico)) {
      throw new ValidacionError('resultado_publico debe ser null, A, B o EMPATE');
    }

    if (typeof estado.puntos_equipo_1 !== 'number' || !Number.isFinite(estado.puntos_equipo_1)) {
      throw new ValidacionError('puntos_equipo_1 debe ser un numero finito');
    }

    if (typeof estado.puntos_equipo_2 !== 'number' || !Number.isFinite(estado.puntos_equipo_2)) {
      throw new ValidacionError('puntos_equipo_2 debe ser un numero finito');
    }

    return true;
  },

  /**
   * Calcula el resultado final del juego.
   * @param {object} estadoJuego
   * @returns {{ puntos_equipo_1: number, puntos_equipo_2: number }}
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
   * Calcula aciertos y puntos ganados por el pronostico de cada
   * equipo contra el resultado del publico. Logica de dominio
   * movida desde QuePiensaElPublicoGameUI (8.5c.2b — la comparten
   * el panel legacy, el descriptor REVELANDO y el handler
   * `revelar-qpep` del shell).
   * @param {object} estadoJuego
   * @param {Array} [items] items del juego (snapshot)
   * @param {object} [config] configuracion congelada
   * @returns {{ acierto1: boolean, acierto2: boolean, puntos: number,
   *             puntosGanados1: number, puntosGanados2: number }}
   */
  calcularPuntos(estadoJuego, items, config) {
    const resultado = estadoJuego.resultado_publico;
    const idx = estadoJuego.pregunta_actual_index || 0;
    const item = (items || [])[idx];
    const puntos = item?.puntos_acierto || config?.puntos_por_acierto || 0;

    const acierto1 = estadoJuego.pronostico_equipo_1 === resultado;
    const acierto2 = estadoJuego.pronostico_equipo_2 === resultado;

    return {
      acierto1,
      acierto2,
      puntos,
      puntosGanados1: acierto1 ? puntos : 0,
      puntosGanados2: acierto2 ? puntos : 0
    };
  },

  /**
   * Aplica el efecto de tiempo agotado.
   * @param {object} estadoJuego
   * @returns {object|null} Nuevo estado o null si ya termino.
   */
  aplicarTimeUp(estadoJuego) {
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('El estado del juego debe ser un objeto');
    }

    if (estadoJuego.fase === 'FIN_DE_JUEGO') {
      return null;
    }

    if (estadoJuego.fase === 'ENCUESTA_ACTIVA') {
      return { ...estadoJuego, fase: 'ENCUESTA_CERRADA' };
    }

    if (estadoJuego.fase === 'ENCUESTA_CERRADA') {
      return { ...estadoJuego };
    }

    return { ...estadoJuego };
  }
};
