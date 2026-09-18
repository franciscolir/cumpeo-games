import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SetRepository } from '../../../src/repositories/SetRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;
let juegoIdReal;
const setsCreados = [];
const itemsCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new SetRepository(adapter);

  const juegos = await adapter.query('juegos', { limit: 1 });
  if (juegos.length > 0) {
    juegoIdReal = juegos[0].id;
  }
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of itemsCreados) {
    try {
      await adapter.delete('item_sets', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const id of setsCreados) {
    try {
      await adapter.delete('item_sets', { eq: { set_id: id } });
    } catch (_) { /* cleanup best-effort */ }
    try {
      await adapter.delete('sets', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

describeSiCredenciales('SetRepository (integración Supabase)', () => {
  it('crea un set simple', async () => {
    if (!juegoIdReal) {
      console.warn('Saltando test: no hay juegos en la BD');
      return;
    }

    const set = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST'),
      descripcion: 'Set de integración'
    });

    expect(set.id).toBeTruthy();
    expect(set.nombre).toBeTruthy();
    expect(set.version).toBe(1);
    expect(set.activo).toBe(true);
    setsCreados.push(set.id);
  });

  it('obtiene un set por id', async () => {
    if (!juegoIdReal) return;

    const creado = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST')
    });
    setsCreados.push(creado.id);

    const obtenido = await repo.obtenerSet(creado.id);
    expect(obtenido).toBeTruthy();
    expect(obtenido.id).toBe(creado.id);
  });

  it('retorna null si el set no existe', async () => {
    const obtenido = await repo.obtenerSet('00000000-0000-0000-0000-000000000000');
    expect(obtenido).toBeNull();
  });

  it('lista sets por juego', async () => {
    if (!juegoIdReal) return;

    const creado = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST')
    });
    setsCreados.push(creado.id);

    const lista = await repo.listarSetsPorJuego(juegoIdReal);
    expect(lista.length).toBeGreaterThanOrEqual(1);
    const ids = lista.map((s) => s.id);
    expect(ids).toContain(creado.id);
  });

  it('actualiza un set incrementando versión', async () => {
    if (!juegoIdReal) return;

    const creado = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST')
    });
    setsCreados.push(creado.id);

    const actualizado = await repo.actualizarSet(creado.id, {
      nombre: 'Nombre Actualizado'
    });

    expect(actualizado.nombre).toBe('Nombre Actualizado');
    expect(actualizado.version).toBe(2);
  });

  it('agrega item a un set', async () => {
    if (!juegoIdReal) return;

    const set = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST')
    });
    setsCreados.push(set.id);

    const item = await repo.agregarItem(set.id, { pregunta: 'P1', respuesta: 'R1' });
    expect(item.id).toBeTruthy();
    expect(item.orden).toBe(1);
    itemsCreados.push(item.id);

    const setActualizado = await repo.obtenerSet(set.id);
    expect(setActualizado.version).toBe(2);
  });

  it('elimina un set', async () => {
    if (!juegoIdReal) return;

    const set = await repo.crearSet({
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST')
    });

    const eliminado = await repo.eliminarSet(set.id);
    expect(eliminado).toBeUndefined();

    const obtenido = await repo.obtenerSet(set.id);
    expect(obtenido).toBeNull();
  });
});
