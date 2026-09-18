/* =============================================================
   Storage — exports y factory.
   ============================================================= */

export { StorageAdapter } from './StorageAdapter.js';
export { LocalStorageAdapter } from './LocalStorageAdapter.js';
export { SupabaseStorageAdapter } from './SupabaseStorageAdapter.js';

/**
 * Devuelve una instancia de StorageAdapter según el adapter principal.
 *
 * - Si adapter.modo === 'supabase' → SupabaseStorageAdapter.
 * - Si adapter.modo === 'indexeddb' → LocalStorageAdapter.
 *
 * @param {import('../LocalAdapter.js').LocalAdapter|import('../SupabaseAdapter.js').SupabaseAdapter} adapter
 *        Adapter principal ya abierto.
 * @returns {import('./StorageAdapter.js').StorageAdapter}
 */
export function crearStorageAdapter(adapter) {
  if (adapter.modo === 'supabase') {
    return new SupabaseStorageAdapter(adapter);
  }
  return new LocalStorageAdapter(adapter);
}
