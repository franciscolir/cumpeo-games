import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EquipoRepository } from '../../../src/repositories/EquipoRepository.js';
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
  repo = new EquipoRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of creados) {
    try {
      await adapter.delete('equipos_guardados', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

describeSiCredenciales('EquipoRepository (integración Supabase)', () => {
  it('agrega un equipo y lo obtiene por id', async () => {
    const nombre = uniqueId('QR_TEST');
    const creado = await repo.crearEquipoGuardado({ nombre, color: '#FF0000' });
    expect(creado.id).toBeTruthy();
    expect(creado.nombre).toBe(nombre);
    expect(creado.color).toBe('#FF0000');
    creados.push(creado.id);

    const obtenido = await repo.obtenerEquipoGuardado(creado.id);
    expect(obtenido.id).toBe(creado.id);
    expect(obtenido.nombre).toBe(nombre);
  });

  it('actualiza un equipo existente', async () => {
    const nombre = uniqueId('QR_UPD');
    const creado = await repo.crearEquipoGuardado({ nombre, color: '#00FF00' });
    creados.push(creado.id);

    const actualizado = await repo.actualizarEquipoGuardado(creado.id, {
      nombre: `${nombre}_UPDATED`,
      color: '#0000FF'
    });
    expect(actualizado.nombre).toBe(`${nombre}_UPDATED`);
    expect(actualizado.color).toBe('#0000FF');
  });

  it('lista todos los equipos', async () => {
    const c1 = await repo.crearEquipoGuardado({ nombre: uniqueId('QR_LISTA1'), color: '#AA0000' });
    const c2 = await repo.crearEquipoGuardado({ nombre: uniqueId('QR_LISTA2'), color: '#00AA00' });
    creados.push(c1.id, c2.id);

    const todos = await repo.listarEquiposGuardados();
    expect(todos.length).toBeGreaterThanOrEqual(2);
    const ids = todos.map((e) => e.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
  });

  it('ordena por nombre al listar', async () => {
    const c1 = await repo.crearEquipoGuardado({ nombre: `ZZZ_${uniqueId('QR_ORD')}`, color: '#111111' });
    const c2 = await repo.crearEquipoGuardado({ nombre: `AAA_${uniqueId('QR_ORD')}`, color: '#222222' });
    creados.push(c1.id, c2.id);

    const todos = await repo.listarEquiposGuardados();
    const idxC2 = todos.findIndex((e) => e.id === c2.id);
    const idxC1 = todos.findIndex((e) => e.id === c1.id);
    expect(idxC2).toBeLessThan(idxC1);
  });

  it('elimina un equipo', async () => {
    const nombre = uniqueId('QR_ELIM');
    const creado = await repo.crearEquipoGuardado({ nombre, color: '#333333' });

    await repo.eliminarEquipoGuardado(creado.id);

    const obtenido = await repo.obtenerEquipoGuardado(creado.id);
    expect(obtenido).toBeNull();
  });
});
