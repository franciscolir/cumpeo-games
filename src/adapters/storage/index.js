/* =============================================================
   Storage — exports y factory.
   ============================================================= */

export { StorageAdapter } from './StorageAdapter.js';
export { LocalStorageAdapter } from './LocalStorageAdapter.js';

/**
 * Devuelve una instancia de StorageAdapter según la configuración.
 *
 * @param {import('../LocalAdapter.js').LocalAdapter} adapterLocal
 *        LocalAdapter ya abierto (se usa para LocalStorageAdapter).
 * @returns {import('./StorageAdapter.js').StorageAdapter}
 */
export function crearStorageAdapter(adapterLocal) {
  return new LocalStorageAdapter(adapterLocal);
}
