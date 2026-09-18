import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExtraRepository } from '../../../src/repositories/ExtraRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;
const creados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new ExtraRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of creados) {
    try {
      await adapter.delete('extras', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

describeSiCredenciales('ExtraRepository (integración Supabase)', () => {
  it('agrega un extra y lo obtiene por id', async () => {
    const codigo = uniqueId('ER_TEST');
    const creado = await repo.crearExtra({ codigo, nombre: 'Extra Test' });
    expect(creado.id).toBeTruthy();
    expect(creado.codigo).toBe(codigo);
    expect(creado.activo).toBe(true);
    creados.push(creado.id);

    const obtenido = await repo.obtenerExtra(creado.id);
    expect(obtenido.id).toBe(creado.id);
    expect(obtenido.nombre).toBe('Extra Test');
  });

  it('obtiene un extra por código', async () => {
    const codigo = uniqueId('ER_CODIGO');
    const creado = await repo.crearExtra({ codigo, nombre: 'Por Código' });
    creados.push(creado.id);

    const encontrado = await repo.obtenerExtraPorCodigo(codigo);
    expect(encontrado).toBeTruthy();
    expect(encontrado.id).toBe(creado.id);
  });

  it('lista todos los extras', async () => {
    const c1 = await repo.crearExtra({ codigo: uniqueId('ER_LISTA1'), nombre: 'Lista 1' });
    const c2 = await repo.crearExtra({ codigo: uniqueId('ER_LISTA2'), nombre: 'Lista 2' });
    creados.push(c1.id, c2.id);

    const todos = await repo.listarExtras({ incluirInactivos: true });
    expect(todos.length).toBeGreaterThanOrEqual(2);
    const ids = todos.map((e) => e.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
  });

  it('filtra solo activos por defecto', async () => {
    const codigo = uniqueId('ER_ACTIVO');
    const creado = await repo.crearExtra({ codigo, nombre: 'Activo Test' });
    creados.push(creado.id);

    const activos = await repo.listarExtras();
    const ids = activos.map((e) => e.id);
    expect(ids).toContain(creado.id);

    await repo.desactivarExtra(creado.id);

    const despues = await repo.listarExtras();
    const idsDespues = despues.map((e) => e.id);
    expect(idsDespues).not.toContain(creado.id);
  });

  it('elimina un extra', async () => {
    const codigo = uniqueId('ER_ELIM');
    const creado = await repo.crearExtra({ codigo, nombre: 'Para Eliminar' });

    await adapter.delete('extras', { eq: { id: creado.id } });

    const obtenido = await repo.obtenerExtra(creado.id);
    expect(obtenido).toBeNull();
  });
});
