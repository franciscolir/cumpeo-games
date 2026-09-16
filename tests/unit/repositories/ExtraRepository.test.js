import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { ExtraRepository } from '../../../src/repositories/ExtraRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('ExtraRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new ExtraRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  it('crea un extra con defaults', async () => {
    const e = await repo.crearExtra({ codigo: 'TOMBOLA', nombre: 'Tómbola' });
    expect(e.activo).toBe(true);
    expect(e.configuracion_default).toBeNull();
  });

  it('falla si el código ya existe', async () => {
    await repo.crearExtra({ codigo: 'X', nombre: 'X' });
    await expect(repo.crearExtra({ codigo: 'X', nombre: 'Y' })).rejects.toThrow(/ya existe/);
  });

  it('obtenerExtraPorCodigo devuelve el extra', async () => {
    const creado = await repo.crearExtra({ codigo: 'X', nombre: 'X' });
    const e = await repo.obtenerExtraPorCodigo('X');
    expect(e.id).toBe(creado.id);
  });

  it('actualiza nombre y configuracion_default', async () => {
    const e = await repo.crearExtra({ codigo: 'X', nombre: 'X' });
    const up = await repo.actualizarExtra(e.id, {
      nombre: 'X v2',
      configuracion_default: { segundos: 20 }
    });
    expect(up.nombre).toBe('X v2');
    expect(up.configuracion_default).toEqual({ segundos: 20 });
  });

  it('rechaza cambiar el código', async () => {
    const e = await repo.crearExtra({ codigo: 'X', nombre: 'X' });
    await expect(repo.actualizarExtra(e.id, { codigo: 'Y' })).rejects.toThrow(/inmutable/);
  });

  it('desactivarExtra marca activo=false', async () => {
    const e = await repo.crearExtra({ codigo: 'X', nombre: 'X' });
    const d = await repo.desactivarExtra(e.id);
    expect(d.activo).toBe(false);
  });

  it('listarExtras solo devuelve activos por defecto', async () => {
    await repo.crearExtra({ codigo: 'A', nombre: 'A' });
    const b = await repo.crearExtra({ codigo: 'B', nombre: 'B' });
    await repo.desactivarExtra(b.id);
    const lista = await repo.listarExtras();
    expect(lista).toHaveLength(1);
    expect(lista[0].codigo).toBe('A');
  });

  it('listarExtras incluye inactivos si se pide', async () => {
    await repo.crearExtra({ codigo: 'A', nombre: 'A' });
    const b = await repo.crearExtra({ codigo: 'B', nombre: 'B' });
    await repo.desactivarExtra(b.id);
    const lista = await repo.listarExtras({ incluirInactivos: true });
    expect(lista).toHaveLength(2);
  });

  it('reordenarExtras renumera', async () => {
    const a = await repo.crearExtra({ codigo: 'A', nombre: 'A' });
    const b = await repo.crearExtra({ codigo: 'B', nombre: 'B' });
    await repo.reordenarExtras([
      { id: b.id, orden: 1 },
      { id: a.id, orden: 2 }
    ]);
    const lista = await repo.listarExtras();
    expect(lista.map((e) => e.codigo)).toEqual(['B', 'A']);
  });
});
