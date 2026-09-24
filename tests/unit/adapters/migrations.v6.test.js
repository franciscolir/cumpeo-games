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

function crearDBv5() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 5);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const def of STORES) {
        const store = db.createObjectStore(def.nombre, {
          keyPath: def.keyPath,
          autoIncrement: false
        });
        for (const idx of def.indexes) {
          store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function abrirDBv6() {
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

describe('Migracion V6 — configuracion + submodo', () => {
  let db;

  beforeEach(async () => {
    await borrarBase();
  });

  afterEach(async () => {
    if (db) db.close();
    await borrarBase();
  });

  it('DB_VERSION del schema es 6', () => {
    expect(DB_VERSION).toBe(6);
  });

  it('migra de v5 a v6 sin romper (no-op)', async () => {
    db = await crearDBv5();
    db.close();

    db = await abrirDBv6();

    expect(db.version).toBe(6);
    expect(db.objectStoreNames.contains('juegos')).toBe(true);
    expect(db.objectStoreNames.contains('sets')).toBe(true);
    expect(db.objectStoreNames.contains('respuestas_encuesta')).toBe(true);
  });

  it('es idempotente: aplicar v6 dos veces no rompe', async () => {
    db = await crearDBv5();
    db.close();

    db = await abrirDBv6();
    db.close();

    db = await abrirDBv6();

    expect(db.version).toBe(6);
  });
});
