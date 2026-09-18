/* =============================================================
   StorageAdapter — contrato abstracto para persistencia de archivos.
   Cada implementación concreta (Local, Supabase) extiende esta
   clase y provee los 4 métodos del contrato.
   ============================================================= */

import { NotImplementedError } from '../errors.js';

export class StorageAdapter {
  /**
   * Sube un archivo (Blob) y devuelve un identificador único (storageRef).
   *
   * @param {string} path - Ruta informativa del archivo (en Local es metadata,
   *                        en Supabase es el path real del bucket).
   * @param {Blob} blob - Contenido del archivo.
   * @param {string} mimeType - Tipo MIME del archivo (ej: 'image/jpeg').
   * @returns {Promise<string>} storageRef — identificador para operaciones futuras.
   * @abstract
   */
  async subirArchivo(_path, _blob, _mimeType) {
    throw new NotImplementedError('StorageAdapter.subirArchivo');
  }

  /**
   * Obtiene un archivo por su storageRef.
   *
   * @param {string} storageRef - Identificador devuelto por subirArchivo.
   * @returns {Promise<Blob|null>} El Blob del archivo, o null si no existe.
   * @abstract
   */
  async obtenerArchivo(_storageRef) {
    throw new NotImplementedError('StorageAdapter.obtenerArchivo');
  }

  /**
   * Elimina un archivo por su storageRef.
   * No falla si el archivo no existe.
   *
   * @param {string} storageRef - Identificador del archivo a eliminar.
   * @returns {Promise<void>}
   * @abstract
   */
  async eliminarArchivo(_storageRef) {
    throw new NotImplementedError('StorageAdapter.eliminarArchivo');
  }

  /**
   * Devuelve una URL pública para usar en <img src> u otros elementos.
   * En dev retorna un blob URL; en prod será una URL firmada de Supabase.
   *
   * @param {string} storageRef - Identificador del archivo.
   * @returns {Promise<string|null>} URL usable, o null si no existe.
   * @abstract
   */
  async obtenerUrlPublica(_storageRef) {
    throw new NotImplementedError('StorageAdapter.obtenerUrlPublica');
  }
}
