/* =============================================================
   Auth — wrappers sobre Supabase Auth (Magic Link y Password).
   ============================================================= */

import { getSupabaseClient } from '../adapters/supabase/client.js';

/**
 * Obtiene el usuario actual autenticado.
 * @returns {Promise<object|null>} Usuario de Supabase o null.
 */
export async function obtenerUsuarioActual() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Obtiene la sesión activa.
 * @returns {Promise<object|null>} Sesión o null.
 */
export async function obtenerSesion() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

/**
 * Inicia sesión con Magic Link (email).
 * @param {string} email - Email del usuario.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function loginConMagicLink(email) {
  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithOtp({ email });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Inicia sesión con email y password.
 * @param {string} email - Email del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<{ok: boolean, session?: object, error?: string}>}
 */
export async function loginConPassword(email, password) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, session: data.session };
}

/**
 * Cierra la sesión actual.
 * @returns {Promise<void>}
 */
export async function logout() {
  const client = getSupabaseClient();
  await client.auth.signOut();
}

/**
 * Suscribe a cambios en el estado de autenticación.
 * @param {function} callback - Callback con (event, session).
 * @returns {function} Función para desuscribirse.
 */
export function suscribirCambiosDeAuth(callback) {
  const client = getSupabaseClient();
  const { data: { subscription } } = client.auth.onAuthStateChange(
    (event, session) => callback(event, session)
  );
  return () => subscription.unsubscribe();
}
