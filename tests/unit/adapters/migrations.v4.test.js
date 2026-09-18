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

/** Crea la DB en v3 con datos de prueba en participante_partidas. */
function crearDBv3() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const def of STORES) {
        if (def.nombre === 'mensajes_publicos' || def.nombre === 'fotos_publicas' || def.nombre === 'archivos_publicos') {
          const store = db.createObjectStore(def.nombre, {
            keyPath: def.keyPath,
            autoIncrement: false
          });
          for (const idx of def.indexes) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
          }
        } else if (def.nombre === 'participante_partidas') {
          const store = db.createObjectStore(def.nombre, {
            keyPath: def.keyPath,
            autoIncrement: false
          });
          for (const idx of def.indexes) {
            if (idx.name === 'participante_partida_session_token') continue;
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
          }
        } else {
          const store = db.createObjectStore(def.nombre, {
            keyPath: def.keyPath,
            autoIncrement: false
          });
          for (const idx of def.indexes) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
          }
        }
      }
      const tx = event.target.transaction;
      const store = tx.objectStore('participante_partidas');
      store.add({
        id: 'pp-1',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'Juan',
        ha_participado: false,
        session_token: 'token-aaa'
      });
      store.add({
        id: 'pp-2',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'Ana',
        ha_participado: true,
        session_token: 'token-bbb'
      });
      store.add({
        id: 'pp-3',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'SinToken',
        ha_participado: false,
        session_token: 'token-ccc'
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Abre la DB en v4 usando aplicarMigraciones real. */
function abrirDBv4() {
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

describe('Migración V4 — session_token index', () => {
  let db;

  beforeEach(async () => {
    await borrarBase();
  });

  afterEach(async () => {
    if (db) db.close();
    await borrarBase();
  });

  it('crea el índice participante_partida_session_token al migrar de v3 a v4', async () => {
    db = await crearDBv3();
    db.close();

    db = await abrirDBv4();

    const tx = db.transaction('participante_partidas', 'readonly');
    const store = tx.objectStore('participante_partidas');
    expect(Array.from(store.indexNames)).toContain('participante_partida_session_token');
  });

  it('el índice es único', async () => {
    db = await crearDBv3();
    db.close();

    db = await abrirDBv4();

    const tx = db.transaction('participante_partidas', 'readonly');
    const store = tx.objectStore('participante_partidas');
    const idx = store.index('participante_partida_session_token');
    expect(idx.unique).toBe(true);
  });

  it('es idempotente: aplicar v4 dos veces no rompe', async () => {
    db = await crearDBv3();
    db.close();

    db = await abrirDBv4();
    db.close();

    db = await abrirDBv4();

    const tx = db.transaction('participante_partidas', 'readonly');
    const store = tx.objectStore('participante_partidas');
    expect(Array.from(store.indexNames)).toContain('participante_partida_session_token');
  });

  it('insertar dos filas con el mismo session_token falla', async () => {
    db = await crearDBv3();
    db.close();

    db = await abrirDBv4();

    await new Promise((resolve, reject) => {
      const tx = db.transaction('participante_partidas', 'readwrite');
      const store = tx.objectStore('participante_partidas');
      store.add({
        id: 'pp-dup',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'Dup',
        ha_participado: false,
        session_token: 'token-aaa'
      });
      tx.onabort = () => resolve();
      tx.oncomplete = () => reject(new Error('Debería haber fallado'));
    });

    const txRead = db.transaction('participante_partidas', 'readonly');
    const storeRead = txRead.objectStore('participante_partidas');
    const registros = await new Promise((resolve) => {
      const req = storeRead.getAll();
      req.onsuccess = () => resolve(req.result);
    });
    expect(registros).toHaveLength(3);
  });

  it('datos preexistentes conservan sus session_token', async () => {
    db = await crearDBv3();
    db.close();

    db = await abrirDBv4();

    const tx = db.transaction('participante_partidas', 'readonly');
    const store = tx.objectStore('participante_partidas');
    const registros = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });

    const porId = Object.fromEntries(registros.map((r) => [r.id, r]));
    expect(porId['pp-1'].session_token).toBe('token-aaa');
    expect(porId['pp-2'].session_token).toBe('token-bbb');
    expect(porId['pp-3'].session_token).toBeDefined();
  });
});
