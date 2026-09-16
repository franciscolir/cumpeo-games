/* =============================================================
   Utilidades compartidas por los repositorios.
   ============================================================= */

export function ahora() {
  return new Date().toISOString();
}

export function nuevoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function esperadoVersion(entidad) {
  if (!entidad || typeof entidad.version !== 'number') {
    throw new Error('esperadoVersion: la entidad no tiene campo version');
  }
  return entidad.version;
}

export function validarNoVacio(valor, campo) {
  if (valor == null || String(valor).trim() === '') {
    throw new Error(`Campo requerido vacío: ${campo}`);
  }
}
