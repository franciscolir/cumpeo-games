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

function crearDBv4() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 4);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const def of STORES) {
        if (def.nombre === 'respuestas_encuesta') continue;
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

function abrirDBv5() {
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

describe('Migracion V5 — respuestas_encuesta', () => {
  let db;

  beforeEach(async () => {
    await borrarBase();
  });

  afterEach(async () => {
    if (db) db.close();
    await borrarBase();
  });

  it('crea el store respuestas_encuesta al migrar de v4 a v5', async () => {
    db = await crearDBv4();
    db.close();

    db = await abrirDBv5();

    expect(db.objectStoreNames.contains('respuestas_encuesta')).toBe(true);
  });

  it('crea los 3 indices correctos', async () => {
    db = await crearDBv4();
    db.close();

    db = await abrirDBv5();

    const tx = db.transaction('respuestas_encuesta', 'readonly');
    const store = tx.objectStore('respuestas_encuesta');
    const indexNames = Array.from(store.indexNames);
    expect(indexNames).toContain('respuesta_encuesta_juego_ejecutado_id');
    expect(indexNames).toContain('respuesta_encuesta_partida_id');
    expect(indexNames).toContain('respuesta_encuesta_juego_participante');
  });

  it('el indice compuesto es unico', async () => {
    db = await crearDBv4();
    db.close();

    db = await abrirDBv5();

    const tx = db.transaction('respuestas_encuesta', 'readonly');
    const store = tx.objectStore('respuestas_encuesta');
    const idx = store.index('respuesta_encuesta_juego_participante');
    expect(idx.unique).toBe(true);
  });

  it('es idempotente: aplicar v5 dos veces no rompe', async () => {
    db = await crearDBv4();
    db.close();

    db = await abrirDBv5();
    db.close();

    db = await abrirDBv5();

    expect(db.objectStoreNames.contains('respuestas_encuesta')).toBe(true);
  });

  it('insertar dos filas con el mismo (juego, participante, pregunta) falla', async () => {
    db = await crearDBv4();
    db.close();

    db = await abrirDBv5();

    await new Promise((resolve, reject) => {
      const tx = db.transaction('respuestas_encuesta', 'readwrite');
      const store = tx.objectStore('respuestas_encuesta');
      store.add({
        id: 'r1',
        partida_id: 'p1',
        juego_ejecutado_id: 'je1',
        participante_id: 'pp1',
        pregunta_index: 0,
        opcion: 'A',
        created_at: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });

    await new Promise((resolve) => {
      const tx = db.transaction('respuestas_encuesta', 'readwrite');
      const store = tx.objectStore('respuestas_encuesta');
      store.add({
        id: 'r2',
        partida_id: 'p1',
        juego_ejecutado_id: 'je1',
        participante_id: 'pp1',
        pregunta_index: 0,
        opcion: 'B',
        created_at: new Date().toISOString()
      });
      tx.onabort = () => resolve();
      tx.oncomplete = () => resolve();
    });

    const txRead = db.transaction('respuestas_encuesta', 'readonly');
    const storeRead = txRead.objectStore('respuestas_encuesta');
    const registros = await new Promise((resolve) => {
      const req = storeRead.getAll();
      req.onsuccess = () => resolve(req.result);
    });
    expect(registros).toHaveLength(1);
  });
});
