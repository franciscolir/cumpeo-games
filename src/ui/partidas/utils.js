/* =============================================================
   Utils — helpers reutilizables para la UI de partidas.
   ============================================================= */

/**
 * Genera un código público de 6 caracteres alfanuméricos mayúsculas.
 * Excluye 0, O, 1, I para evitar ambigüedad.
 * @returns {string}
 */
export function generarPublicCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
}

/**
 * Genera un actionId único.
 * @returns {string}
 */
export function nuevoActionId() {
  return crypto.randomUUID();
}

/**
 * Formatea un puntaje para mostrar.
 * @param {number} n
 * @returns {string}
 */
export function fmtPuntos(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}
