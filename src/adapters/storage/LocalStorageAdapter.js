/* =============================================================
   LocalStorageAdapter — implementación del StorageAdapter
   para desarrollo usando IndexedDB (store archivos_publicos).
   ============================================================= */

import { StorageAdapter } from './StorageAdapter.js';

const STORE_NAME = 'archivos_publicos';

export class LocalStorageAdapter extends StorageAdapter {
  /**
   * @param {import('../LocalAdapter.js').LocalAdapter} localAdapter
   *        Adapter de IndexedDB ya abierto.
   */
  constructor(localAdapter) {
    super();
    this.localAdapter = localAdapter;
  }

  /**
   * Sube un Blob a IndexedDB y devuelve un storageRef único.
   *
   * @param {string} path - Ruta informativa (se guarda como metadata).
   * @param {Blob} blob - Contenido del archivo.
   * @param {string} mimeType - Tipo MIME.
   * @returns {Promise<string>} storageRef (UUID v4).
   */
  async subirArchivo(path, blob, mimeType) {
    const id = crypto.randomUUID();
    const registro = {
      id,
      path,
      blob,
      mime_type: mimeType,
      created_at: new Date().toISOString()
    };

    await this.localAdapter.tx([STORE_NAME], 'readwrite', (tx) => {
      tx.objectStore(STORE_NAME).add(registro);
    });

    return id;
  }

  /**
   * Recupera un Blob por su storageRef.
   *
   * @param {string} storageRef - UUID del registro.
   * @returns {Promise<Blob|null>} El Blob o null si no existe.
   */
  async obtenerArchivo(storageRef) {
    const registro = await this.localAdapter.tx([STORE_NAME], 'readonly', (tx, resolver) => {
      const req = tx.objectStore(STORE_NAME).get(storageRef);
      req.onsuccess = () => resolver(req.result);
    });

    return registro ? registro.blob : null;
  }

  /**
   * Elimina un archivo por su storageRef.
   * No falla si el archivo no existe.
   *
   * @param {string} storageRef - UUID del registro.
   * @returns {Promise<void>}
   */
  async eliminarArchivo(storageRef) {
    await this.localAdapter.tx([STORE_NAME], 'readwrite', (tx) => {
      tx.objectStore(STORE_NAME).delete(storageRef);
    });
  }

  /**
   * Devuelve una URL blob para el archivo.
   *
   * Nota: URL.createObjectURL no existe en Node.js.
   * En tests debe mockearse o usarse un polyfill (ej: jest-fixed-blob).
   *
   * @param {string} storageRef - UUID del registro.
   * @returns {Promise<string|null>} blob:// URL o null si no existe.
   */
  async obtenerUrlPublica(storageRef) {
    const registro = await this.localAdapter.tx([STORE_NAME], 'readonly', (tx, resolver) => {
      const req = tx.objectStore(STORE_NAME).get(storageRef);
      req.onsuccess = () => resolver(req.result);
    });

    if (!registro) return null;

    return URL.createObjectURL(registro.blob);
  }
}
