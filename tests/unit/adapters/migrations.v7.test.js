import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DB_NAME, DB_VERSION, STORES } from '../../../src/adapters/schema.js';
import { aplicarMigraciones } from '../../../src/adapters/migrations.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function crearDBv6() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 6);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const def of STORES) {
        if (def.nombre === 'ajustes_globales') continue;
        if (!db.objectStoreNames.contains(def.nombre)) {
          const store = db.createObjectStore(def.nombre, {
            keyPath: def.keyPath,
            autoIncrement: false
          });
          for (const idx of def.indexes) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function abrirDBv7() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      try {
        aplicarMigraciones(event.target.result, event.oldVersion, event.target.transaction);
      } catch (err) {
        event.target.transaction.abort();
        reject(err);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

describe('Migracion V7 — ajustes_globales', () => {
  let db;

  beforeEach(async () => {
    await borrarBase();
  });

  afterEach(async () => {
    if (db) db.close();
    await borrarBase();
  });

  it('DB_VERSION del schema es 7', () => {
    expect(DB_VERSION).toBe(7);
  });

  it('migra de v6 a v7 y crea el store ajustes_globales', async () => {
    db = await crearDBv6();
    db.close();

    db = await abrirDBv7();

    expect(db.version).toBe(7);
    expect(db.objectStoreNames.contains('ajustes_globales')).toBe(true);
    expect(db.objectStoreNames.contains('juegos')).toBe(true);
    expect(db.objectStoreNames.contains('respuestas_encuesta')).toBe(true);
  });

  it('migracionV7 es idempotente (no falla si el store ya existe)', async () => {
    db = await crearDBv6();
    db.close();

    db = await abrirDBv7();
    db.close();

    db = await abrirDBv7();

    expect(db.version).toBe(7);
    expect(db.objectStoreNames.contains('ajustes_globales')).toBe(true);
  });

  it('el store ajustes_globales usa keyPath id sin índices', async () => {
    const def = STORES.find((s) => s.nombre === 'ajustes_globales');
    expect(def).toBeDefined();
    expect(def.keyPath).toBe('id');
    expect(def.indexes).toEqual([]);
  });
});
