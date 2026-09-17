/* =============================================================
   Errores de Supabase — traducción de códigos Postgres/PgREST
   a errores del dominio CUMPEO.
   ============================================================= */

import {
  YaExisteError,
  NoEncontradoError,
  ValidacionError,
  OperacionInvalidaError
} from '../../repositories/errors.js';

const MAPEO_CODIGOS = {
  '23505': (msg, det) => {
    const entidad = _extraerEntidad(det);
    return new YaExisteError(entidad || 'Registro', msg);
  },
  '23503': (msg) => new OperacionInvalidaError(msg),
  '23514': (msg) => new ValidacionError(msg),
  'PGRST116': (msg) => {
    return new NoEncontradoError('Registro');
  },
  '42P01': (msg) => new OperacionInvalidaError(`Tabla inexistente: ${msg}`)
};

/**
 * Traduce un error de Supabase/Postgres a un error de dominio.
 * @param {object} error - Error original de supabase-js.
 * @returns {import('../../repositories/errors.js').DataError} Error de dominio.
 */
export function traducirError(error) {
  if (!error) {
    return new OperacionInvalidaError('Error desconocido de Supabase');
  }

  const codigo = error.code || error.message?.match?.(/PGRST\d+/)?.[0];
  const mensaje = error.message || 'Error desconocido';
  const detalles = error.details;

  if (codigo && MAPEO_CODIGOS[codigo]) {
    return MAPEO_CODIGOS[codigo](mensaje, detalles);
  }

  if (error instanceof Error && error.name?.includes('Error') &&
      'entidad' in error) {
    return error;
  }

  return new OperacionInvalidaError(mensaje, { code: codigo, details: detalles });
}

/**
 * Extrae el nombre de una entidad del detalle de error de Postgres.
 * Busca el patrón "Key (column)=(value) already exists".
 * @param {string|undefined} detalles - Campo `details` del error.
 * @returns {string|null} Nombre de la entidad extraído.
 */
function _extraerEntidad(detalles) {
  if (!detalles) return null;
  const match = detalles.match(/Key \((\w+)\)=/);
  return match ? match[1] : null;
}
