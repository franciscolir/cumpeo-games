import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const describeSiCredenciales = TIENE_CREDENCIALES ? describe : describe.skip;

let adapter;

beforeAll(async () => {
  if (!TIENE_CREDENCIALES) return;
  adapter = new SupabaseAdapter();
  await adapter.abrir();
});

afterAll(async () => {
  if (adapter) await adapter.cerrar();
});

describeSiCredenciales('SupabaseAdapter — integración con Supabase Cloud', () => {
  beforeEach(async () => {
    await adapter.delete('accion_procesadas', {
      eq: { tipo_accion: 'TEST_INTEGRACION' }
    });
    await adapter.delete('extras', {
      eq: { codigo: 'TEST_EXTRA_INTEG' }
    });
  });

  it('insert y query retourna la fila insertada', async () => {
    const filas = await adapter.insert('extras', {
      codigo: 'TEST_EXTRA_INTEG',
      nombre: 'Extra de Prueba',
      descripcion: null,
      configuracion_default: null,
      orden_catalogo: 9999,
      activo: true
    }, { returning: 'id, codigo, nombre' });

    expect(filas).toBeDefined();
    expect(Array.isArray(filas)).toBe(true);
    expect(filas.length).toBe(1);
    expect(filas[0].codigo).toBe('TEST_EXTRA_INTEG');

    const resultado = await adapter.query('extras', {
      select: 'id, codigo',
      eq: { codigo: 'TEST_EXTRA_INTEG' },
      single: true
    });

    expect(resultado).toBeDefined();
    expect(resultado.codigo).toBe('TEST_EXTRA_INTEG');
  });

  it('update modifica la fila', async () => {
    await adapter.insert('extras', {
      codigo: 'TEST_EXTRA_INTEG',
      nombre: 'Original',
      activo: true
    });

    const actualizado = await adapter.update('extras',
      { eq: { codigo: 'TEST_EXTRA_INTEG' } },
      { nombre: 'Modificado' },
      { returning: 'nombre' }
    );

    expect(actualizado).toBeDefined();
    expect(Array.isArray(actualizado)).toBe(true);
    expect(actualizado[0].nombre).toBe('Modificado');
  });

  it('delete elimina la fila', async () => {
    await adapter.insert('extras', {
      codigo: 'TEST_EXTRA_INTEG',
      nombre: 'Para Eliminar',
      activo: true
    });

    await adapter.delete('extras', {
      eq: { codigo: 'TEST_EXTRA_INTEG' }
    });

    const resultado = await adapter.query('extras', {
      eq: { codigo: 'TEST_EXTRA_INTEG' }
    });

    expect(resultado).toEqual([]);
  });

  it('query sin resultados retorna array vacío', async () => {
    const resultado = await adapter.query('extras', {
      eq: { codigo: 'NO_EXISTE_INTEG' }
    });
    expect(resultado).toEqual([]);
  });

  it('query single retorna null si no hay filas', async () => {
    const resultado = await adapter.query('extras', {
      eq: { codigo: 'NO_EXISTE_INTEG' },
      single: true
    });
    expect(resultado).toBeNull();
  });

  it('insert múltiples filas', async () => {
    const filas = await adapter.insert('extras', [
      { codigo: 'TEST_EXTRA_INTEG_A', nombre: 'A', activo: true },
      { codigo: 'TEST_EXTRA_INTEG_B', nombre: 'B', activo: true }
    ], { returning: 'codigo' });

    expect(filas.length).toBe(2);
    expect(filas.map(f => f.codigo).sort()).toEqual([
      'TEST_EXTRA_INTEG_A',
      'TEST_EXTRA_INTEG_B'
    ]);
  });

  it('rpc ejecuta una función plpgsql', async () => {
    const resultado = await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_INTEG_ACTION_001',
      p_partida_id: null,
      p_tipo_accion: 'TEST_INTEGRACION'
    });

    expect(resultado).toBeDefined();
    expect(resultado.ok).toBe(true);
    expect(resultado.yaProcesada).toBe(false);
  });

  it('rpc idempotente devuelve yaProcesada=true en segundo intento', async () => {
    await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_INTEG_ACTION_IDEMP',
      p_partida_id: null,
      p_tipo_accion: 'TEST_INTEGRACION'
    });

    const segunda = await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_INTEG_ACTION_IDEMP',
      p_partida_id: null,
      p_tipo_accion: 'TEST_INTEGRACION'
    });

    expect(segunda.yaProcesada).toBe(true);
  });

  it('tx lanza NotImplementedError', () => {
    expect(() => adapter.tx([], 'readwrite', () => {})).toThrow('no implementado');
  });

  it('suscribir lanza NotImplementedError', () => {
    expect(() => adapter.suscribir('extras', {}, () => {})).toThrow('no implementado');
  });
});
