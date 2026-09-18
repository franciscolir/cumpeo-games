import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../../src/adapters/LocalAdapter.js';
import { LocalStorageAdapter } from '../../../../src/adapters/storage/LocalStorageAdapter.js';
import { DB_NAME } from '../../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function crearBlob(texto = 'contenido de prueba') {
  return new Blob([texto], { type: 'text/plain' });
}

describe('LocalStorageAdapter', () => {
  let localAdapter;
  let storage;

  beforeEach(async () => {
    await borrarBase();
    localAdapter = new LocalAdapter();
    await localAdapter.abrir();
    storage = new LocalStorageAdapter(localAdapter);
  });

  afterEach(async () => {
    await localAdapter.cerrar();
    await borrarBase();
  });

  describe('subirArchivo', () => {
    it('devuelve un string no vacío (storageRef)', async () => {
      const blob = crearBlob();
      const ref = await storage.subirArchivo('/fotos/test.jpg', blob, 'image/jpeg');
      expect(typeof ref).toBe('string');
      expect(ref.length).toBeGreaterThan(0);
    });

    it('guarda el blob en el store archivos_publicos', async () => {
      const blob = crearBlob();
      const ref = await storage.subirArchivo('/fotos/a.jpg', blob, 'image/jpeg');

      const leido = await localAdapter.tx(['archivos_publicos'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('archivos_publicos').get(ref);
        req.onsuccess = () => resolver(req.result);
      });

      expect(leido).toBeTruthy();
      expect(leido.id).toBe(ref);
      expect(leido.blob.size).toBe(blob.size);
      expect(leido.blob.type).toBe(blob.type);
    });

    it('genera ids únicos (dos subidas → dos refs distintos)', async () => {
      const ref1 = await storage.subirArchivo('/a.jpg', crearBlob('a'), 'image/jpeg');
      const ref2 = await storage.subirArchivo('/b.jpg', crearBlob('b'), 'image/png');
      expect(ref1).not.toBe(ref2);
    });

    it('guarda mime_type y path como metadata', async () => {
      const ref = await storage.subirArchivo('/fotos/foto.png', crearBlob(), 'image/png');

      const leido = await localAdapter.tx(['archivos_publicos'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('archivos_publicos').get(ref);
        req.onsuccess = () => resolver(req.result);
      });

      expect(leido.path).toBe('/fotos/foto.png');
      expect(leido.mime_type).toBe('image/png');
      expect(leido.created_at).toBeTruthy();
    });
  });

  describe('obtenerArchivo', () => {
    it('devuelve el Blob correcto', async () => {
      const blob = crearBlob('dato real');
      const ref = await storage.subirArchivo('/test.txt', blob, 'text/plain');

      const obtenido = await storage.obtenerArchivo(ref);
      expect(obtenido).toBeTruthy();
      expect(obtenido.size).toBe(blob.size);
      expect(obtenido.type).toBe(blob.type);
    });

    it('devuelve null si no existe', async () => {
      const obtenido = await storage.obtenerArchivo('id-inexistente');
      expect(obtenido).toBeNull();
    });
  });

  describe('eliminarArchivo', () => {
    it('borra el registro', async () => {
      const ref = await storage.subirArchivo('/test.jpg', crearBlob(), 'image/jpeg');
      await storage.eliminarArchivo(ref);

      const leido = await localAdapter.tx(['archivos_publicos'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('archivos_publicos').get(ref);
        req.onsuccess = () => resolver(req.result);
      });

      expect(leido).toBeUndefined();
    });

    it('no falla si no existe', async () => {
      await expect(
        storage.eliminarArchivo('id-fantasma')
      ).resolves.toBeUndefined();
    });

    it('hace que obtenerArchivo devuelva null después', async () => {
      const ref = await storage.subirArchivo('/test.jpg', crearBlob(), 'image/jpeg');
      await storage.eliminarArchivo(ref);

      const obtenido = await storage.obtenerArchivo(ref);
      expect(obtenido).toBeNull();
    });
  });

  describe('obtenerUrlPublica', () => {
    it('devuelve un string no vacío', async () => {
      const ref = await storage.subirArchivo('/test.jpg', crearBlob(), 'image/jpeg');

      const url = await storage.obtenerUrlPublica(ref);
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });

    it('devuelve null si el archivo no existe', async () => {
      const url = await storage.obtenerUrlPublica('id-fantasma');
      expect(url).toBeNull();
    });
  });
});
