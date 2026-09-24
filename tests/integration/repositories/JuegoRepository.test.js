import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JuegoRepository } from '../../../src/repositories/JuegoRepository.js';
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
  repo = new JuegoRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of creados) {
    try {
      await adapter.delete('juegos', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

describeSiCredenciales('JuegoRepository (integración Supabase)', () => {
  it('agrega un juego y lo obtiene por id', async () => {
    const codigo = uniqueId('JR_TEST');
    const creado = await repo.crearJuego({ codigo, nombre: 'Trivia Test' });
    expect(creado.id).toBeTruthy();
    expect(creado.codigo).toBe(codigo);
    expect(creado.activo).toBe(true);
    creados.push(creado.id);

    const obtenido = await repo.obtenerJuego(creado.id);
    expect(obtenido.id).toBe(creado.id);
    expect(obtenido.nombre).toBe('Trivia Test');
  });

  it('obtiene un juego por código', async () => {
    const codigo = uniqueId('JR_CODIGO');
    const creado = await repo.crearJuego({ codigo, nombre: 'Por Código' });
    creados.push(creado.id);

    const encontrado = await repo.obtenerJuegoPorCodigo(codigo);
    expect(encontrado).toBeTruthy();
    expect(encontrado.id).toBe(creado.id);
  });

  it('lista todos los juegos', async () => {
    const c1 = await repo.crearJuego({ codigo: uniqueId('JR_LISTA1'), nombre: 'Lista 1' });
    const c2 = await repo.crearJuego({ codigo: uniqueId('JR_LISTA2'), nombre: 'Lista 2' });
    creados.push(c1.id, c2.id);

    const todos = await repo.listarJuegos({ incluirInactivos: true });
    expect(todos.length).toBeGreaterThanOrEqual(2);
    const ids = todos.map((j) => j.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
  });

  it('filtra solo activos por defecto', async () => {
    const codigo = uniqueId('JR_ACTIVO');
    const creado = await repo.crearJuego({ codigo, nombre: 'Activo Test' });
    creados.push(creado.id);

    const activos = await repo.listarJuegos();
    const ids = activos.map((j) => j.id);
    expect(ids).toContain(creado.id);

    await repo.desactivarJuego(creado.id);

    const despues = await repo.listarJuegos();
    const idsDespues = despues.map((j) => j.id);
    expect(idsDespues).not.toContain(creado.id);
  });

  it('elimina un juego', async () => {
    const codigo = uniqueId('JR_ELIM');
    const creado = await repo.crearJuego({ codigo, nombre: 'Para Eliminar' });

    await adapter.delete('juegos', { eq: { id: creado.id } });

    const obtenido = await repo.obtenerJuego(creado.id);
    expect(obtenido).toBeNull();
  });

  it('crearJuego con configuracion → persiste y se lee', async () => {
    const codigo = uniqueId('JR_CFG');
    const creado = await repo.crearJuego({
      codigo,
      nombre: 'Con Config',
      configuracion: { tiempo: 30, opciones: ['a', 'b'] }
    });
    creados.push(creado.id);

    const obtenido = await repo.obtenerJuego(creado.id);
    expect(obtenido.configuracion).toEqual({ tiempo: 30, opciones: ['a', 'b'] });
  });

  it('actualizarConfiguracion → persiste', async () => {
    const codigo = uniqueId('JR_CFG_UP');
    const creado = await repo.crearJuego({ codigo, nombre: 'Cfg Update' });
    creados.push(creado.id);

    const up = await repo.actualizarConfiguracion(creado.id, { colores: [{ color: 'ROJO' }] });
    expect(up.configuracion.colores[0].color).toBe('ROJO');

    const recargado = await repo.obtenerJuego(creado.id);
    expect(recargado.configuracion.colores[0].color).toBe('ROJO');
  });

  it('obtenerConfiguracion → devuelve el JSON', async () => {
    const codigo = uniqueId('JR_CFG_GET');
    const creado = await repo.crearJuego({
      codigo,
      nombre: 'Cfg Get',
      configuracion: { bancos: ['cond1'] }
    });
    creados.push(creado.id);

    const cfg = await repo.obtenerConfiguracion(creado.id);
    expect(cfg).toEqual({ bancos: ['cond1'] });
  });
});
