import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../src/adapters/SupabaseAdapter.js';

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

describeSiCredenciales('RLS (integración Supabase)', () => {
  // Nota: RLS está habilitado con políticas permisivas.
  // Estos tests verifican que las operaciones de anon siguen funcionando
  // (RLS no bloquea con las políticas actuales).

  it('anon puede hacer SELECT en partidas', async () => {
    const lista = await adapter.query('partidas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en juegos', async () => {
    const lista = await adapter.query('juegos', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en control_partidas', async () => {
    const lista = await adapter.query('control_partidas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en accion_procesadas', async () => {
    const lista = await adapter.query('accion_procesadas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en evento_tecnicos', async () => {
    const lista = await adapter.query('evento_tecnicos', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });
});
