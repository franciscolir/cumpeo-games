import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AjustesGlobalesRepository } from '../../../src/repositories/AjustesGlobalesRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new AjustesGlobalesRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  await adapter.cerrar();
});

describeSiCredenciales('AjustesGlobalesRepository (integración Supabase)', () => {
  it('obtener devuelve el singleton con defaults', async () => {
    const a = await repo.obtener();
    expect(a.id).toBe('default');
    expect(a.tiempo_max_pausa_seg).toBeGreaterThan(0);
    expect(a.created_at).toBeTruthy();
    expect(a.updated_at).toBeTruthy();
  });

  it('actualizar cambia tiempo_max_pausa_seg y persiste', async () => {
    await repo.actualizar({ tiempo_max_pausa_seg: 60 });
    const a = await repo.obtener();
    expect(a.tiempo_max_pausa_seg).toBe(60);

    await repo.actualizar({ tiempo_max_pausa_seg: 120 });
  });

  it('rechaza tiempo_max_pausa_seg no entero o <= 0', async () => {
    await expect(
      repo.actualizar({ tiempo_max_pausa_seg: 12.5 })
    ).rejects.toThrow();
    await expect(
      repo.actualizar({ tiempo_max_pausa_seg: 0 })
    ).rejects.toThrow();
  });
});
