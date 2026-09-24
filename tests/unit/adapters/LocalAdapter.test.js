import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { DB_NAME, STORES, nombresDeStores } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('LocalAdapter', () => {
  let adapter;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('apertura', () => {
    it('abre la base con el nombre correcto', () => {
      expect(adapter.db).toBeTruthy();
      expect(adapter.db.name).toBe(DB_NAME);
    });

    it('crea los 22 object stores', () => {
      const nombres = Array.from(adapter.db.objectStoreNames);
      expect(nombres).toHaveLength(22);
      for (const nombre of nombresDeStores()) {
        expect(nombres).toContain(nombre);
      }
    });

    it('aplicar la migración V1 es idempotente al reabrir', async () => {
      await adapter.cerrar();
      const adapter2 = new LocalAdapter();
      await adapter2.abrir();
      expect(adapter2.db.objectStoreNames.length).toBe(22);
      await adapter2.cerrar();
    });
  });

  describe('keyPaths', () => {
    it('control_partidas usa partida_id como keyPath', () => {
      const tx = adapter.db.transaction('control_partidas', 'readonly');
      const store = tx.objectStore('control_partidas');
      expect(store.keyPath).toBe('partida_id');
    });

    it('el resto de stores usan id', () => {
      for (const def of STORES) {
        const tx = adapter.db.transaction(def.nombre, 'readonly');
        const store = tx.objectStore(def.nombre);
        expect(store.keyPath).toBe(def.keyPath);
      }
    });
  });

  describe('índices', () => {
    it('declara 49 índices secundarios y 8 únicos', () => {
      let total = 0;
      let unicos = 0;

      for (const def of STORES) {
        const tx = adapter.db.transaction(def.nombre, 'readonly');
        const store = tx.objectStore(def.nombre);
        const nombresIdx = Array.from(store.indexNames);
        total += nombresIdx.length;

        for (const nombre of nombresIdx) {
          if (store.index(nombre).unique) unicos += 1;
        }
      }

      expect(total).toBe(60);
      expect(unicos).toBe(10);
    });

    it('cada store tiene exactamente los índices declarados', () => {
      for (const def of STORES) {
        const tx = adapter.db.transaction(def.nombre, 'readonly');
        const store = tx.objectStore(def.nombre);
        const nombres = Array.from(store.indexNames).sort();
        const esperados = def.indexes.map((i) => i.name).sort();
        expect(nombres).toEqual(esperados);
      }
    });
  });

  describe('tx()', () => {
    it('lee un store vacío y devuelve array vacío', async () => {
      const resultado = await adapter.tx(['juegos'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('juegos').getAll();
        req.onsuccess = () => resolver(req.result);
      });
      expect(resultado).toEqual([]);
    });

    it('agrega y lee un registro en una sola transacción', async () => {
      const juego = { id: 'j1', codigo: 'TRIVIA', nombre: 'Trivia', activo: true };

      await adapter.tx(['juegos'], 'readwrite', (tx) => {
        tx.objectStore('juegos').add(juego);
      });

      const leido = await adapter.tx(['juegos'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('juegos').get('j1');
        req.onsuccess = () => resolver(req.result);
      });

      expect(leido).toEqual(juego);
    });

    it('rechaza si la base no está abierta', async () => {
      const adapterCerrado = new LocalAdapter();
      await expect(
        adapterCerrado.tx(['juegos'], 'readonly', () => {})
      ).rejects.toThrow(/no está abierta/);
    });

    it('rechaza si el callback lanza', async () => {
      await expect(
        adapter.tx(['juegos'], 'readwrite', () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
    });

    it('rechaza si la clave ya existe en add()', async () => {
      const juego = { id: 'j1', codigo: 'A', nombre: 'A', activo: true };
      await adapter.tx(['juegos'], 'readwrite', (tx) => {
        tx.objectStore('juegos').add(juego);
      });

      await expect(
        adapter.tx(['juegos'], 'readwrite', (tx) => {
          tx.objectStore('juegos').add(juego);
        })
      ).rejects.toBeTruthy();
    });

    it('rechaza si el índice único se viola', async () => {
      await adapter.tx(['juegos'], 'readwrite', (tx) => {
        tx.objectStore('juegos').add({ id: 'j1', codigo: 'X', nombre: 'A', activo: true });
      });

      await expect(
        adapter.tx(['juegos'], 'readwrite', (tx) => {
          tx.objectStore('juegos').add({ id: 'j2', codigo: 'X', nombre: 'B', activo: true });
        })
      ).rejects.toBeTruthy();
    });
  });

  describe('utilidades estáticas', () => {
    it('ahora() devuelve un ISO 8601 UTC', () => {
      const iso = LocalAdapter.ahora();
      expect(typeof iso).toBe('string');
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('nuevoId() devuelve un UUID v4', () => {
      const id = LocalAdapter.nuevoId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
