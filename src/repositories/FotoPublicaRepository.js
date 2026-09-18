/* =============================================================
   FotoPublicaRepository — fotos enviadas por el público
   durante una partida (INV-166 a INV-170).

   Estados:
     PENDIENTE → APROBADO
     PENDIENTE → RECHAZADO
     (un APROBADO o RECHAZADO no puede volver a PENDIENTE)

   Operaciones:
     crearFoto              → sube blob a Storage + crea registro PENDIENTE
     obtenerFoto            → por id
     listarFotosDePartida   → todas, ordenadas por created_at asc
     listarPendientesDePartida → solo PENDIENTES
     listarAprobadasDePartida  → solo APROBADAS
     aprobarFoto            → PENDIENTE → APROBADO
     rechazarFoto           → PENDIENTE → RECHAZADO
     eliminarFoto           → solo si RECHAZADO + elimina de Storage
     obtenerUrlPublica      → URL pública solo si APROBADA
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  OperacionInvalidaError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'fotos_publicas';

const ESTADOS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO'
};

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

export class FotoPublicaRepository extends BaseRepository {
  /**
   * @param {object} adapter - LocalAdapter o SupabaseAdapter.
   * @param {object} storage - StorageAdapter para subir/obtener archivos.
   */
  constructor(adapter, storage) {
    super(adapter, STORE);
    this.storage = storage;
  }

  /* =============================================================
     Consultas
     ============================================================= */

  /**
   * Obtiene una foto por su id.
   *
   * @param {string} id - ID de la foto.
   * @returns {Promise<object|undefined>} La foto o undefined.
   */
  async obtenerFoto(id) {
    return this.obtener(id);
  }

  /**
   * Lista todas las fotos de una partida, ordenadas por created_at asc.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de fotos.
   */
  async listarFotosDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId }
      });
      return lista.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }

    const lista = await this.listarPorIndice('foto_publica_partida_id', partidaId);
    return lista.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  /**
   * Lista fotos PENDIENTES de una partida.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de fotos pendientes.
   */
  async listarPendientesDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId, estado: ESTADOS.PENDIENTE }
      });
    }

    const todas = await this.listarFotosDePartida(partidaId);
    return todas.filter((f) => f.estado === ESTADOS.PENDIENTE);
  }

  /**
   * Lista fotos APROBADAS de una partida.
   *
   * @param {string} partidaId - ID de la partida.
   * @returns {Promise<Array>} Lista de fotos aprobadas.
   */
  async listarAprobadasDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { partida_id: partidaId, estado: ESTADOS.APROBADO }
      });
    }

    const todas = await this.listarFotosDePartida(partidaId);
    return todas.filter((f) => f.estado === ESTADOS.APROBADO);
  }

  /* =============================================================
     Escritura
     ============================================================= */

  /**
   * Crea una foto: sube el blob a Storage y crea el registro en PENDIENTE.
   *
   * @param {object} params - Parámetros.
   * @param {string} params.partidaId - ID de la partida.
   * @param {string} params.participanteId - ID del participante.
   * @param {Blob} params.blob - Blob de la imagen.
   * @param {string} params.mimeType - Tipo MIME (debe empezar con 'image/').
   * @returns {Promise<object>} La foto creada.
   */
  async crearFoto({ partidaId, participanteId, blob, mimeType }) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(participanteId, 'participanteId');

    if (!blob || typeof blob.size !== 'number') {
      throw new ValidacionError('El blob es requerido (INV-170)');
    }
    if (blob.size <= 0) {
      throw new ValidacionError('El blob no puede estar vacío (INV-170)');
    }
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new ValidacionError('El mimeType debe ser un tipo de imagen (INV-170)');
    }

    const ext = MIME_TO_EXT[mimeType] || 'bin';
    const path = `${partidaId}/fotos/${nuevoId()}.${ext}`;
    const storageRef = await this.storage.subirArchivo(path, blob, mimeType);

    const foto = {
      id: nuevoId(),
      partida_id: partidaId,
      participante_id: participanteId,
      storage_ref: storageRef,
      mime_type: mimeType,
      tamano_bytes: blob.size,
      estado: ESTADOS.PENDIENTE,
      created_at: ahora(),
      moderado_at: null,
      moderado_por: null
    };

    await this.agregarRegistro(foto);
    return foto;
  }

  /**
   * Aprobar una foto pendiente.
   *
   * @param {string} id - ID de la foto.
   * @param {string} sessionId - ID de sesión del conductor.
   * @returns {Promise<object>} La foto actualizada.
   */
  async aprobarFoto(id, sessionId) {
    validarNoVacio(id, 'id');
    validarNoVacio(sessionId, 'sessionId');

    const foto = await this.obtener(id);
    if (!foto) throw new NoEncontradoError('FotoPublica', id);

    if (foto.estado === ESTADOS.APROBADO) {
      return foto;
    }

    if (foto.estado === ESTADOS.RECHAZADO) {
      throw new OperacionInvalidaError(
        'No se puede re-aprobar una foto que fue rechazada (INV-166)'
      );
    }

    const actualizada = {
      ...foto,
      estado: ESTADOS.APROBADO,
      moderado_at: ahora(),
      moderado_por: sessionId
    };

    await this.actualizarRegistro(actualizada);
    return actualizada;
  }

  /**
   * Rechazar una foto pendiente.
   *
   * @param {string} id - ID de la foto.
   * @param {string} sessionId - ID de sesión del conductor.
   * @returns {Promise<object>} La foto actualizada.
   */
  async rechazarFoto(id, sessionId) {
    validarNoVacio(id, 'id');
    validarNoVacio(sessionId, 'sessionId');

    const foto = await this.obtener(id);
    if (!foto) throw new NoEncontradoError('FotoPublica', id);

    if (foto.estado === ESTADOS.RECHAZADO) {
      return foto;
    }

    if (foto.estado === ESTADOS.APROBADO) {
      throw new OperacionInvalidaError(
        'No se puede rechazar una foto que ya fue aprobada (INV-166)'
      );
    }

    const actualizada = {
      ...foto,
      estado: ESTADOS.RECHAZADO,
      moderado_at: ahora(),
      moderado_por: sessionId
    };

    await this.actualizarRegistro(actualizada);
    return actualizada;
  }

  /**
   * Elimina una foto. Solo permitido si estado === RECHAZADO.
   * Primero elimina el archivo de Storage, luego el registro.
   * Si Storage falla, NO se elimina el registro.
   *
   * @param {string} id - ID de la foto.
   * @returns {Promise<void>}
   */
  async eliminarFoto(id) {
    validarNoVacio(id, 'id');

    const foto = await this.obtener(id);
    if (!foto) throw new NoEncontradoError('FotoPublica', id);

    if (foto.estado !== ESTADOS.RECHAZADO) {
      throw new OperacionInvalidaError(
        `No se puede eliminar una foto en estado ${foto.estado}. Solo fotos RECHAZADAS pueden eliminarse.`
      );
    }

    await this.storage.eliminarArchivo(foto.storage_ref);
    await this.eliminarRegistro(id);
  }

  /**
   * Devuelve la URL pública de una foto. Solo funciona si la foto
   * está APROBADA.
   *
   * @param {string} id - ID de la foto.
   * @returns {Promise<string|null>} URL pública o null.
   */
  async obtenerUrlPublica(id) {
    const foto = await this.obtener(id);
    if (!foto) return null;
    if (foto.estado !== ESTADOS.APROBADO) return null;

    return this.storage.obtenerUrlPublica(foto.storage_ref);
  }
}
