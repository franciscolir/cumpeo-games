/* =============================================================
   Queries helpers — construyen queries de PostgREST sobre
   la librería de supabase-js. Funciones puras, testeables
   sin cliente real.
   ============================================================= */

/**
 * Aplica filtros a una query de supabase-js.
 * @param {object} query - Query builder de supabase-js.
 * @param {object} [filtros={}] - Filtros a aplicar.
 *   - `eq`: { columna: valor } — igualdad.
 *   - `neq`: { columna: valor } — desigualdad.
 *   - `in`: { columna: array } — valor en lista.
 * @returns {object} Query con filtros aplicados.
 */
export function aplicarFiltros(query, filtros = {}) {
  if (filtros.eq) {
    for (const [col, val] of Object.entries(filtros.eq)) {
      query = query.eq(col, val);
    }
  }

  if (filtros.neq) {
    for (const [col, val] of Object.entries(filtros.neq)) {
      query = query.neq(col, val);
    }
  }

  if (filtros.in) {
    for (const [col, valores] of Object.entries(filtros.in)) {
      query = query.in(col, valores);
    }
  }

  return query;
}

/**
 * Aplica opciones de selección, orden y límite a una query.
 * @param {object} query - Query builder de supabase-js.
 * @param {object} [opciones={}] - Opciones a aplicar.
 *   - `select`: string — columnas a seleccionar.
 *   - `order`: { columna, asc } — ordenamiento.
 *   - `limit`: number — límite de filas.
 *   - `single`: boolean — devolver una sola fila.
 * @returns {object} Query con opciones aplicadas.
 */
export function aplicarOpciones(query, opciones = {}) {
  if (opciones.select) {
    query = query.select(opciones.select);
  }

  if (opciones.order) {
    const { columna, asc = true } = opciones.order;
    query = query.order(columna, { ascending: asc });
  }

  if (opciones.limit != null) {
    query = query.limit(opciones.limit);
  }

  if (opciones.single) {
    query = query.single();
  }

  return query;
}

/**
 * Normaliza la respuesta de supabase-js.
 * Extrae `data` o lanza el error si la operación falló.
 * @param {object} respuesta - Respuesta de supabase-js { data, error }.
 * @param {boolean} [single=false] - Si se espera una sola fila.
 * @returns {Array|Object|null} Datos de la respuesta.
 * @throws {Error} Si la respuesta contiene un error.
 */
export function normalizarRespuesta(respuesta, single = false) {
  const { data, error } = respuesta;

  if (error) {
    const err = new Error(error.message || 'Error en operación Supabase');
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    throw err;
  }

  if (single && data === null) {
    return null;
  }

  return data;
}
