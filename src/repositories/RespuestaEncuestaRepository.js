/* =============================================================
   RespuestaEncuestaRepository — respuestas del publico a
   encuestas binarias (A/B) en "Que piensa el publico?".

   INV-189: opcion in { A, B }
   INV-190: UNIQUE (juego_ejecutado_id, participante_id, pregunta_index)
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  ValidacionError,
  YaExisteError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'respuestas_encuesta';

const OPCIONES_VALIDAS = ['A', 'B'];

export class RespuestaEncuestaRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  /* =============================================================
     Consultas
     ============================================================= */

  /**
   * Cuenta respuestas de un juego ejecutado para una pregunta especifica.
   * @param {string} juegoEjecutadoId
   * @param {number} preguntaIndex
   * @returns {Promise<{a: number, b: number, total: number}>}
   */
  async contarRespuestasDeJuego(juegoEjecutadoId, preguntaIndex) {
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');

    if (!Number.isInteger(preguntaIndex) || preguntaIndex < 0) {
      throw new ValidacionError('preguntaIndex debe ser un entero >= 0');
    }

    const respuestas = await this.listarRespuestasDeJuego(juegoEjecutadoId, preguntaIndex);
    const a = respuestas.filter((r) => r.opcion === 'A').length;
    const b = respuestas.filter((r) => r.opcion === 'B').length;
    return { a, b, total: a + b };
  }

  /**
   * Lista todas las respuestas de un juego ejecutado para una pregunta.
   * @param {string} juegoEjecutadoId
   * @param {number} preguntaIndex
   * @returns {Promise<Array>}
   */
  async listarRespuestasDeJuego(juegoEjecutadoId, preguntaIndex) {
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');

    if (!Number.isInteger(preguntaIndex) || preguntaIndex < 0) {
      throw new ValidacionError('preguntaIndex debe ser un entero >= 0');
    }

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { juego_ejecutado_id: juegoEjecutadoId, pregunta_index: preguntaIndex }
      });
    }

    const todas = await this.listarPorIndice('respuesta_encuesta_juego_ejecutado_id', juegoEjecutadoId);
    return todas.filter((r) => r.pregunta_index === preguntaIndex);
  }

  /**
   * Verifica si un participante ya respondio una pregunta en un juego.
   * @param {string} juegoEjecutadoId
   * @param {string} participanteId
   * @param {number} preguntaIndex
   * @returns {Promise<boolean>}
   */
  async existeRespuestaDeParticipante(juegoEjecutadoId, participanteId, preguntaIndex) {
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(participanteId, 'participanteId');

    if (!Number.isInteger(preguntaIndex) || preguntaIndex < 0) {
      throw new ValidacionError('preguntaIndex debe ser un entero >= 0');
    }

    if (this.modo === 'supabase') {
      const filas = await this.adapter.query(this.storeName, {
        eq: {
          juego_ejecutado_id: juegoEjecutadoId,
          participante_id: participanteId,
          pregunta_index: preguntaIndex
        },
        limit: 1
      });
      return filas.length > 0;
    }

    const todas = await this.listarPorIndice('respuesta_encuesta_juego_participante', [juegoEjecutadoId, participanteId, preguntaIndex]);
    return todas.length > 0;
  }

  /* =============================================================
     Escritura
     ============================================================= */

  /**
   * Crea una respuesta a una encuesta.
   *
   * @param {object} params
   * @param {string} params.partidaId
   * @param {string} params.juegoEjecutadoId
   * @param {string} params.participanteId
   * @param {number} params.preguntaIndex
   * @param {string} params.opcion - 'A' o 'B'
   * @returns {Promise<object>} La respuesta creada.
   */
  async crearRespuesta({ partidaId, juegoEjecutadoId, participanteId, preguntaIndex, opcion }) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(participanteId, 'participanteId');

    if (!Number.isInteger(preguntaIndex) || preguntaIndex < 0) {
      throw new ValidacionError('preguntaIndex debe ser un entero >= 0');
    }

    if (!OPCIONES_VALIDAS.includes(opcion)) {
      throw new ValidacionError(`opcion debe ser 'A' o 'B' (INV-189). Recibido: ${opcion}`);
    }

    const existente = await this.existeRespuestaDeParticipante(juegoEjecutadoId, participanteId, preguntaIndex);
    if (existente) {
      throw new YaExisteError('RespuestaEncuesta', `${juegoEjecutadoId}:${participanteId}:${preguntaIndex}`);
    }

    const respuesta = {
      id: nuevoId(),
      partida_id: partidaId,
      juego_ejecutado_id: juegoEjecutadoId,
      participante_id: participanteId,
      pregunta_index: preguntaIndex,
      opcion,
      created_at: ahora()
    };

    await this.agregarRegistro(respuesta);
    return respuesta;
  }
}
