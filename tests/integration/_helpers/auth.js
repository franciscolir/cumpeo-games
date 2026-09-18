/* =============================================================
   Auth Helper — crea un SupabaseAdapter autenticado para tests.
   ============================================================= */

import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';
import { getSupabaseClient } from '../../../src/adapters/supabase/client.js';

const TEST_EMAIL = import.meta.env.VITE_TEST_USER_EMAIL;
const TEST_PASSWORD = import.meta.env.VITE_TEST_USER_PASSWORD;

/**
 * Crea un SupabaseAdapter autenticado con el test user.
 * @returns {Promise<SupabaseAdapter>} Adapter listo para usar.
 */
export async function crearAdapterAutenticado() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Faltan VITE_TEST_USER_EMAIL o VITE_TEST_USER_PASSWORD en .env');
  }

  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (error) {
    throw new Error(`Login falló: ${error.message}`);
  }

  const adapter = new SupabaseAdapter({ client });
  await adapter.abrir();
  return adapter;
}

/**
 * Verifica si las credenciales de test están disponibles.
 * @returns {boolean}
 */
export function tieneCredencialesAuth() {
  return !!TEST_EMAIL && !!TEST_PASSWORD;
}
