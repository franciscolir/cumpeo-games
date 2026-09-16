import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { BaseRepository } from '../../../src/repositories/BaseRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

class JuegoRepo extends BaseRepository {
  constructor(adapter) {
    super(adapter, 'juegos');
  }
}

describe('BaseRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new JuegoRepo(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  it('obtener() devuelve undefined si no existe', async () => {
    const r = await repo.obtener('no-existe');
    expect(r).toBeUndefined();
  });

  it('obtener() devuelve el registro si existe', async () => {
    const juego = { id: 'j1', codigo: 'TRIVIA', nombre: 'Trivia', activo: true };
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, juego);
    });

    const r = await repo.obtener('j1');
    expect(r).toEqual(juego);
  });

  it('listar() devuelve todos los registros', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
      repo.agregar(tx, { id: 'j2', codigo: 'B', nombre: 'B', activo: true });
    });

    const todos = await repo.listar();
    expect(todos).toHaveLength(2);
  });

  it('listarPorIndice() filtra por índice', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
      repo.agregar(tx, { id: 'j2', codigo: 'B', nombre: 'B', activo: false });
      repo.agregar(tx, { id: 'j3', codigo: 'C', nombre: 'C', activo: true });
    });

    const encontrado = await repo.listarPorIndice('juego_codigo', 'B');
    expect(encontrado).toHaveLength(1);
    expect(encontrado[0].id).toBe('j2');
  });

  it('los campos booleanos (activo) no se indexan: filtrar en memoria', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
      repo.agregar(tx, { id: 'j2', codigo: 'B', nombre: 'B', activo: false });
      repo.agregar(tx, { id: 'j3', codigo: 'C', nombre: 'C', activo: true });
    });

    const todos = await repo.listar();
    const activos = todos.filter((j) => j.activo === true);
    expect(activos).toHaveLength(2);
    expect(activos.map((j) => j.id).sort()).toEqual(['j1', 'j3']);
  });

  it('contarTodos() devuelve la cantidad', async () => {
    expect(await repo.contarTodos()).toBe(0);

    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
      repo.agregar(tx, { id: 'j2', codigo: 'B', nombre: 'B', activo: true });
    });

    expect(await repo.contarTodos()).toBe(2);
  });

  it('agregar() falla si la clave ya existe', async () => {
    const juego = { id: 'j1', codigo: 'A', nombre: 'A', activo: true };
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, juego);
    });

    await expect(
      adapter.tx(['juegos'], 'readwrite', (tx) => {
        repo.agregar(tx, juego);
      })
    ).rejects.toBeTruthy();
  });

  it('insertarOActualizar() hace upsert', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
    });

    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.insertarOActualizar(tx, { id: 'j1', codigo: 'A', nombre: 'A-modificado', activo: true });
    });

    const r = await repo.obtener('j1');
    expect(r.nombre).toBe('A-modificado');
  });

  it('eliminar() borra el registro', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
    });

    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.eliminar(tx, 'j1');
    });

    expect(await repo.obtener('j1')).toBeUndefined();
    expect(await repo.contarTodos()).toBe(0);
  });

  it('permite encadenar lecturas dentro de una misma tx', async () => {
    await adapter.tx(['juegos'], 'readwrite', (tx) => {
      repo.agregar(tx, { id: 'j1', codigo: 'A', nombre: 'A', activo: true });
      repo.agregar(tx, { id: 'j2', codigo: 'B', nombre: 'B', activo: true });
    });

    const resultado = await adapter.tx(['juegos'], 'readonly', (tx, resolver) => {
      repo.leer(tx, 'j1', (j1) => {
        repo.leer(tx, 'j2', (j2) => {
          resolver({ j1, j2 });
        });
      });
    });

    expect(resultado.j1.id).toBe('j1');
    expect(resultado.j2.id).toBe('j2');
  });
});
