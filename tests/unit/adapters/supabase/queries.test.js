import { describe, it, expect, vi } from 'vitest';
import {
  aplicarFiltros,
  aplicarOpciones,
  normalizarRespuesta
} from '../../../../src/adapters/supabase/queries.js';

/* =============================================================
   Mock de query builder de supabase-js
   ============================================================= */
function crearQueryBuilder() {
  const q = {
    _metodos: [],
    eq(col, val) { q._metodos.push({ metodo: 'eq', col, val }); return q; },
    neq(col, val) { q._metodos.push({ metodo: 'neq', col, val }); return q; },
    in(col, vals) { q._metodos.push({ metodo: 'in', col, vals }); return q; },
    select(s) { q._metodos.push({ metodo: 'select', s }); return q; },
    order(col, opts) { q._metodos.push({ metodo: 'order', col, opts }); return q; },
    limit(n) { q._metodos.push({ metodo: 'limit', n }); return q; },
    single() { q._metodos.push({ metodo: 'single' }); return q; }
  };
  return q;
}

/* =============================================================
   aplicarFiltros
   ============================================================= */
describe('aplicarFiltros', () => {
  it('no modifica la query si filtros está vacío', () => {
    const q = crearQueryBuilder();
    const result = aplicarFiltros(q, {});
    expect(result).toBe(q);
    expect(result._metodos).toHaveLength(0);
  });

  it('no modifica la query si filtros es undefined', () => {
    const q = crearQueryBuilder();
    const result = aplicarFiltros(q);
    expect(result._metodos).toHaveLength(0);
  });

  it('aplica filtro eq de igualdad', () => {
    const q = crearQueryBuilder();
    aplicarFiltros(q, { eq: { id: 'abc' } });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'eq', col: 'id', val: 'abc' });
  });

  it('aplica múltiples filtros eq', () => {
    const q = crearQueryBuilder();
    aplicarFiltros(q, { eq: { id: 'abc', estado: 'ACTIVO' } });
    expect(q._metodos).toHaveLength(2);
    expect(q._metodos[0].col).toBe('id');
    expect(q._metodos[1].col).toBe('estado');
  });

  it('aplica filtro neq', () => {
    const q = crearQueryBuilder();
    aplicarFiltros(q, { neq: { estado: 'ELIMINADO' } });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'neq', col: 'estado', val: 'ELIMINADO' });
  });

  it('aplica filtro in', () => {
    const q = crearQueryBuilder();
    aplicarFiltros(q, { in: { id: ['a', 'b', 'c'] } });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'in', col: 'id', vals: ['a', 'b', 'c'] });
  });

  it('aplica filtros combinados (eq + neq + in)', () => {
    const q = crearQueryBuilder();
    aplicarFiltros(q, {
      eq: { partida_id: 'p1' },
      neq: { estado: 'CANCELADO' },
      in: { juego_id: ['j1', 'j2'] }
    });
    expect(q._metodos).toHaveLength(3);
    expect(q._metodos[0].metodo).toBe('eq');
    expect(q._metodos[1].metodo).toBe('neq');
    expect(q._metodos[2].metodo).toBe('in');
  });

  it('retorna la query encadenable', () => {
    const q = crearQueryBuilder();
    const result = aplicarFiltros(q, { eq: { x: 1 } }).select('*');
    expect(result._metodos).toHaveLength(2);
    expect(result._metodos[1].metodo).toBe('select');
  });
});

/* =============================================================
   aplicarOpciones
   ============================================================= */
describe('aplicarOpciones', () => {
  it('no modifica la query si opciones está vacío', () => {
    const q = crearQueryBuilder();
    const result = aplicarOpciones(q, {});
    expect(result._metodos).toHaveLength(0);
  });

  it('aplica select', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, { select: 'id, nombre' });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'select', s: 'id, nombre' });
  });

  it('aplica order ascendente', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, { order: { columna: 'created_at', asc: true } });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'order', col: 'created_at', opts: { ascending: true } });
  });

  it('aplica order descendente', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, { order: { columna: 'nombre', asc: false } });
    expect(q._metodos[0].opts.ascending).toBe(false);
  });

  it('aplica limit', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, { limit: 10 });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'limit', n: 10 });
  });

  it('aplica single', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, { single: true });
    expect(q._metodos).toHaveLength(1);
    expect(q._metodos[0]).toEqual({ metodo: 'single' });
  });

  it('aplica opciones combinadas (select + order + limit)', () => {
    const q = crearQueryBuilder();
    aplicarOpciones(q, {
      select: 'id, nombre',
      order: { columna: 'orden' },
      limit: 5
    });
    expect(q._metodos).toHaveLength(3);
    expect(q._metodos[0].metodo).toBe('select');
    expect(q._metodos[1].metodo).toBe('order');
    expect(q._metodos[2].metodo).toBe('limit');
  });
});

/* =============================================================
   normalizarRespuesta
   ============================================================= */
describe('normalizarRespuesta', () => {
  it('retorna data si no hay error', () => {
    const data = [{ id: 1 }];
    const result = normalizarRespuesta({ data, error: null });
    expect(result).toEqual(data);
  });

  it('retorna null si single=true y data es null', () => {
    const result = normalizarRespuesta({ data: null, error: null }, true);
    expect(result).toBeNull();
  });

  it('retorna data si single=true y data tiene valor', () => {
    const data = { id: 1 };
    const result = normalizarRespuesta({ data, error: null }, true);
    expect(result).toEqual(data);
  });

  it('lanza error si la respuesta tiene error', () => {
    expect(() => {
      normalizarRespuesta({ data: null, error: { code: '23505', message: 'duplicate' } });
    }).toThrow('duplicate');
  });

  it('el error lanzado tiene code y details', () => {
    try {
      normalizarRespuesta({
        data: null,
        error: { code: '23503', message: 'fk violation', details: 'FK fails' }
      });
    } catch (err) {
      expect(err.code).toBe('23503');
      expect(err.details).toBe('FK fails');
    }
  });

  it('maneja error sin message', () => {
    expect(() => {
      normalizarRespuesta({ data: null, error: { code: 'XXX' } });
    }).toThrow('Error en operación Supabase');
  });
});
