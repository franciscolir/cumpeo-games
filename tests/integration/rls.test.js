import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from '../../src/adapters/SupabaseAdapter.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from './_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_CREDENCIALES ? describe : describe.skip;
const describeSiAuth = TIENE_AUTH ? describe : describe.skip;

let adapterAnon;
let adapterAuth;

beforeAll(async () => {
  if (!TIENE_CREDENCIALES) return;

  const clientAnon = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  adapterAnon = new SupabaseAdapter({ client: clientAnon });
  await adapterAnon.abrir();

  if (TIENE_AUTH) {
    adapterAuth = await crearAdapterAutenticado();
  }
});

afterAll(async () => {
  if (adapterAnon) await adapterAnon.cerrar();
  if (adapterAuth) await adapterAuth.cerrar();
});

describeSiCredenciales('RLS — anon SELECT en tablas permitidas', () => {
  it('anon puede hacer SELECT en partidas', async () => {
    const lista = await adapterAnon.query('partidas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en juegos', async () => {
    const lista = await adapterAnon.query('juegos', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en equipo_partidas', async () => {
    const lista = await adapterAnon.query('equipo_partidas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('anon puede hacer SELECT en juego_ejecutados', async () => {
    const lista = await adapterAnon.query('juego_ejecutados', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });
});

describeSiCredenciales('RLS — anon NO puede en tablas restringidas', () => {
  it('anon NO puede hacer SELECT en control_partidas', async () => {
    await expect(
      adapterAnon.query('control_partidas', { limit: 1 })
    ).rejects.toThrow();
  });

  it('anon NO puede hacer SELECT en accion_procesadas', async () => {
    await expect(
      adapterAnon.query('accion_procesadas', { limit: 1 })
    ).rejects.toThrow();
  });

  it('anon NO puede hacer SELECT en evento_tecnicos', async () => {
    await expect(
      adapterAnon.query('evento_tecnicos', { limit: 1 })
    ).rejects.toThrow();
  });
});

describeSiAuth('RLS — authenticated puede en tablas restringidas', () => {
  it('authenticated puede hacer SELECT en control_partidas', async () => {
    const lista = await adapterAuth.query('control_partidas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('authenticated puede hacer SELECT en accion_procesadas', async () => {
    const lista = await adapterAuth.query('accion_procesadas', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });

  it('authenticated puede hacer SELECT en evento_tecnicos', async () => {
    const lista = await adapterAuth.query('evento_tecnicos', { limit: 1 });
    expect(Array.isArray(lista)).toBe(true);
  });
});
