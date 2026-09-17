import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';

/* =============================================================
   Mock helpers — simula la API encadenable de supabase-js
   ============================================================= */
function crearMockQuery({ data = [], error = null } = {}) {
  const q = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error }))
  };
  return q;
}

function crearMockClient({ data = [], error = null } = {}) {
  return {
    from: vi.fn().mockReturnValue(crearMockQuery({ data, error })),
    rpc: vi.fn().mockResolvedValue({ data, error })
  };
}

/* =============================================================
   Tests
   ============================================================= */
describe('SupabaseAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new SupabaseAdapter();
  });

  describe('abrir()', () => {
    it('crea cliente si no hay inyectado', async () => {
      const client = crearMockClient();
      const original = await import('../../../src/adapters/supabase/client.js');
      vi.spyOn(original, 'getSupabaseClient').mockReturnValue(client);
      adapter._clientOpcional = null;
      await adapter.abrir();
      expect(adapter.client).toBeDefined();
      vi.restoreAllMocks();
    });

    it('no crea cliente si ya está abierto', async () => {
      const client = crearMockClient();
      adapter.client = client;
      await adapter.abrir();
      expect(adapter.client).toBe(client);
    });

    it('usa cliente inyectado', async () => {
      const client = crearMockClient();
      const a = new SupabaseAdapter({ client });
      await a.abrir();
      expect(a.client).toBe(client);
    });
  });

  describe('cerrar()', () => {
    it('limpia el cliente', async () => {
      adapter.client = crearMockClient();
      await adapter.cerrar();
      expect(adapter.client).toBeNull();
    });
  });

  describe('query()', () => {
    it('lanza si no está abierto', async () => {
      await expect(
        adapter.query('extras')
      ).rejects.toThrow('no está abierto');
    });

    it('lanza si tabla vacía', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.query('')
      ).rejects.toThrow('nombre de tabla requerido');
    });

    it('llama a from con la tabla correcta', async () => {
      const client = crearMockClient({ data: [{ id: 1 }] });
      adapter.client = client;
      await adapter.query('extras');
      expect(client.from).toHaveBeenCalledWith('extras');
    });

    it('devuelve null si single=true y no hay filas', async () => {
      const client = crearMockClient({
        data: null,
        error: { code: 'PGRST116', message: 'no rows' }
      });
      adapter.client = client;
      const result = await adapter.query('extras', { single: true });
      expect(result).toBeNull();
    });

    it('devuelve array si single=false', async () => {
      const client = crearMockClient({ data: [{ id: 1 }], error: null });
      adapter.client = client;
      const result = await adapter.query('extras');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('insert()', () => {
    it('lanza si filas vacío', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.insert('extras', [])
      ).rejects.toThrow('filas requeridas');
    });

    it('lanza si filas es null', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.insert('extras', null)
      ).rejects.toThrow('filas requeridas');
    });

    it('acepta opciones.single', async () => {
      const client = crearMockClient({ data: { id: 1 }, error: null });
      adapter.client = client;
      const result = await adapter.insert('extras', { codigo: 'A' }, { single: true });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('update()', () => {
    it('lanza si filtros vacío', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.update('extras', {}, { nombre: 'x' })
      ).rejects.toThrow('sin filtros');
    });

    it('lanza si cambios vacío', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.update('extras', { eq: { id: 1 } }, {})
      ).rejects.toThrow('cambios requeridos');
    });

    it('llama a from con la tabla correcta', async () => {
      const client = crearMockClient({ data: [{ id: 1 }] });
      adapter.client = client;
      await adapter.update('extras', { eq: { id: 1 } }, { nombre: 'x' });
      expect(client.from).toHaveBeenCalledWith('extras');
    });
  });

  describe('delete()', () => {
    it('lanza si filtros vacío', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.delete('extras', {})
      ).rejects.toThrow('sin filtros');
    });

    it('lanza si filtros es undefined', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.delete('extras', undefined)
      ).rejects.toThrow('sin filtros');
    });

    it('llama a from con la tabla correcta', async () => {
      const client = crearMockClient({ data: null, error: null });
      adapter.client = client;
      await adapter.delete('extras', { eq: { id: 1 } });
      expect(client.from).toHaveBeenCalledWith('extras');
    });
  });

  describe('rpc()', () => {
    it('lanza si nombre vacío', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.rpc('')
      ).rejects.toThrow('nombre de función requerido');
    });

    it('llama a client.rpc correctamente', async () => {
      const client = crearMockClient({ data: { ok: true }, error: null });
      adapter.client = client;
      const result = await adapter.rpc('reservar_accion', { p_id: '123' });
      expect(client.rpc).toHaveBeenCalledWith('reservar_accion', { p_id: '123' });
      expect(result).toEqual({ ok: true });
    });

    it('lanza si nombre es solo espacios', async () => {
      adapter.client = crearMockClient();
      await expect(
        adapter.rpc('   ')
      ).rejects.toThrow('nombre de función requerido');
    });
  });
});
