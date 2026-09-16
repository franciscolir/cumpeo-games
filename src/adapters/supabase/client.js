/* =============================================================
   Supabase Client — instancia singleton del cliente Supabase.
   ============================================================= */

import { createClient } from '@supabase/supabase-js';

let clientInstance = null;

/**
 * Obtiene el cliente Supabase (singleton).
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 * @throws {Error} si faltan variables de entorno.
 */
export function getSupabaseClient() {
  if (clientInstance) return clientInstance;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY'
    );
  }

  clientInstance = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  return clientInstance;
}

/**
 * Solo para tests. Resetea la instancia singleton.
 */
export function _resetSupabaseClient() {
  clientInstance = null;
}
