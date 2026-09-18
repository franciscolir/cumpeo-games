/* =============================================================
   SupabaseStorageAdapter — implementación del StorageAdapter
   para producción usando Supabase Storage.

   Bucket: 'cumpeo-publico' (privado, requiere autenticación).

   Decisiones:
   - obtenerUrlPublica genera signed URLs con expiración de 1 hora
     (3600 segundos). Esto es suficiente para visualización en móvil
     y evita URLs expuestas permanentemente.
   - eliminarArchivo no falla si el archivo no existe (idempotente).
   - obtenerArchivo devuelve null si el archivo no existe.
   ============================================================= */

import { StorageAdapter } from './StorageAdapter.js';

const BUCKET = 'cumpeo-publico';
const SIGNED_URL_EXPIRY = 3600;

export class SupabaseStorageAdapter extends StorageAdapter {
  /**
   * @param {import('../SupabaseAdapter.js').SupabaseAdapter} supabaseAdapter
   *        SupabaseAdapter ya abierto (con this.client disponible).
   */
  constructor(supabaseAdapter) {
    super();
    this.supabaseAdapter = supabaseAdapter;
  }

  /** @returns {object} Cliente Supabase. */
  get client() {
    return this.supabaseAdapter.client;
  }

  /**
   * Sube un archivo al bucket 'cumpeo-publico'.
   *
   * @param {string} path - Ruta del archivo dentro del bucket.
   * @param {Blob} blob - Contenido del archivo.
   * @param {string} mimeType - Tipo MIME.
   * @returns {Promise<string>} El path como storageRef.
   */
  async subirArchivo(path, blob, mimeType) {
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: mimeType });

    if (error) throw error;
    return path;
  }

  /**
   * Descarga un archivo del bucket.
   *
   * @param {string} storageRef - Path del archivo.
   * @returns {Promise<Blob|null>} El Blob o null si no existe.
   */
  async obtenerArchivo(storageRef) {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .download(storageRef);

    if (error) {
      if (error.message?.includes('not found') || error.status === 404) {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Elimina un archivo del bucket. No falla si no existe.
   *
   * @param {string} storageRef - Path del archivo.
   * @returns {Promise<void>}
   */
  async eliminarArchivo(storageRef) {
    const { error } = await this.client.storage
      .from(BUCKET)
      .remove([storageRef]);

    if (error) throw error;
  }

  /**
   * Genera una URL firmada (signed URL) con expiración de 1 hora.
   *
   * @param {string} storageRef - Path del archivo.
   * @returns {Promise<string|null>} URL firmada o null si no existe.
   */
  async obtenerUrlPublica(storageRef) {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(storageRef, SIGNED_URL_EXPIRY);

    if (error) {
      if (error.message?.includes('not found') || error.status === 404) {
        return null;
      }
      throw error;
    }

    return data?.signedUrl || null;
  }
}
