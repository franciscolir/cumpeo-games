import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DB_NAME, DB_VERSION, STORES, nombresDeStores } from '../../../src/adapters/schema.js';
import { aplicarMigraciones } from '../../../src/adapters/migrations.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/** Crea la DB en v2 con datos de prueba en participante_partidas. */
function crearDBv2() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
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
      const tx = event.target.transaction;
      const store = tx.objectStore('participante_partidas');
      store.add({
        id: 'pp-1',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'Juan',
        ha_participado: false
      });
      store.add({
        id: 'pp-2',
        partida_id: 'part-1',
        equipo_partida_id: 'ep-1',
        nombre: 'Ana',
        ha_participado: true,
        session_token: 'token-preexistente'
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Abre la DB en v3 usando aplicarMigraciones real. */
function abrirDBv3() {
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

describe('Migración V3', () => {
  let db;

  beforeEach(async () => {
    await borrarBase();
  });

  afterEach(async () => {
    if (db) db.close();
    await borrarBase();
  });

  it('crea los 3 stores nuevos al migrar de v2 a v3', async () => {
    db = await crearDBv2();
    db.close();

    db = await abrirDBv3();

    const nombres = Array.from(db.objectStoreNames);
    expect(nombres).toContain('mensajes_publicos');
    expect(nombres).toContain('fotos_publicas');
    expect(nombres).toContain('archivos_publicos');
  });

  it('keyPath de cada store nuevo es correcto', async () => {
    db = await crearDBv2();
    db.close();

    db = await abrirDBv3();

    for (const nombre of ['mensajes_publicos', 'fotos_publicas', 'archivos_publicos']) {
      const def = STORES.find((s) => s.nombre === nombre);
      const tx = db.transaction(nombre, 'readonly');
      const store = tx.objectStore(nombre);
      expect(store.keyPath).toBe(def.keyPath);
    }
  });

  it('cada store nuevo tiene los índices declarados', async () => {
    db = await crearDBv2();
    db.close();

    db = await abrirDBv3();

    for (const nombre of ['mensajes_publicos', 'fotos_publicas', 'archivos_publicos']) {
      const def = STORES.find((s) => s.nombre === nombre);
      const tx = db.transaction(nombre, 'readonly');
      const store = tx.objectStore(nombre);
      const nombresIdx = Array.from(store.indexNames).sort();
      const esperados = def.indexes.map((i) => i.name).sort();
      expect(nombresIdx).toEqual(esperados);
    }
  });

  it('participante_partidas existentes reciben session_token único', async () => {
    db = await crearDBv2();

    const txPre = db.transaction('participante_partidas', 'readonly');
    const storePre = txPre.objectStore('participante_partidas');
    const antes = await new Promise((resolve) => {
      const req = storePre.getAll();
      req.onsuccess = () => resolve(req.result);
    });
    expect(antes[0].session_token).toBeUndefined();
    expect(antes[1].session_token).toBe('token-preexistente');
    db.close();

    db = await abrirDBv3();

    const txPost = db.transaction('participante_partidas', 'readonly');
    const storePost = txPost.objectStore('participante_partidas');
    const despues = await new Promise((resolve) => {
      const req = storePost.getAll();
      req.onsuccess = () => resolve(req.result);
    });

    expect(despues[0].session_token).toBeTruthy();
    expect(despues[0].session_token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(despues[1].session_token).toBe('token-preexistente');

    const tokens = despues.map((r) => r.session_token);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('migración es idempotente: aplicar v3 dos veces no rompe', async () => {
    db = await crearDBv2();
    db.close();

    db = await abrirDBv3();
    db.close();

    db = await abrirDBv3();

    const nombres = Array.from(db.objectStoreNames);
    expect(nombres).toContain('mensajes_publicos');
    expect(nombres).toContain('fotos_publicas');
    expect(nombres).toContain('archivos_publicos');

    const tx = db.transaction('participante_partidas', 'readonly');
    const store = tx.objectStore('participante_partidas');
    const registros = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
    expect(registros.every((r) => !!r.session_token)).toBe(true);
  });

  it('stores v1/v2 siguen existiendo y funcionando', async () => {
    db = await crearDBv2();

    const txWrite = db.transaction('juegos', 'readwrite');
    txWrite.objectStore('juegos').add({
      id: 'j1',
      codigo: 'TRIVIA',
      nombre: 'Trivia',
      activo: true
    });
    await new Promise((resolve) => { txWrite.oncomplete = resolve; });
    db.close();

    db = await abrirDBv3();

    const txRead = db.transaction('juegos', 'readonly');
    const juego = await new Promise((resolve) => {
      const req = txRead.objectStore('juegos').get('j1');
      req.onsuccess = () => resolve(req.result);
    });
    expect(juego).toBeTruthy();
    expect(juego.codigo).toBe('TRIVIA');

    const nombresEsperados = nombresDeStores();
    const nombresActuales = Array.from(db.objectStoreNames);
    for (const nombre of nombresEsperados) {
      expect(nombresActuales).toContain(nombre);
    }
  });
});
