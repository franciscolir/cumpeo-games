import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { FotoPublicaRepository } from '../../../src/repositories/FotoPublicaRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';
import {
  ValidacionError,
  NoEncontradoError,
  OperacionInvalidaError
} from '../../../src/repositories/errors.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function crearStorageMock() {
  return {
    subirArchivo: vi.fn(async () => 'refs/foto.jpg'),
    obtenerArchivo: vi.fn(async () => new Blob(['x'])),
    eliminarArchivo: vi.fn(async () => {}),
    obtenerUrlPublica: vi.fn(async () => 'https://storage.example.com/foto.jpg')
  };
}

function crearBlob(size = 100) {
  return new Blob(['x'.repeat(size)], { type: 'image/jpeg' });
}

describe('FotoPublicaRepository', () => {
  let adapter;
  let storage;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    storage = crearStorageMock();
    repo = new FotoPublicaRepository(adapter, storage);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  /* ===== crearFoto ===== */

  describe('crearFoto', () => {
    it('crea con estado PENDIENTE, id generado, created_at seteado', async () => {
      const foto = await repo.crearFoto({
        partidaId: 'p1',
        participanteId: 'pp1',
        blob: crearBlob(),
        mimeType: 'image/jpeg'
      });

      expect(foto.id).toBeTruthy();
      expect(foto.partida_id).toBe('p1');
      expect(foto.participante_id).toBe('pp1');
      expect(foto.estado).toBe('PENDIENTE');
      expect(foto.created_at).toBeTruthy();
      expect(foto.moderado_at).toBeNull();
      expect(foto.moderado_por).toBeNull();
      expect(foto.mime_type).toBe('image/jpeg');
      expect(foto.tamano_bytes).toBe(100);
    });

    it('llama a storage.subirArchivo con (path, blob, mimeType)', async () => {
      const blob = crearBlob(256);
      await repo.crearFoto({
        partidaId: 'p1',
        participanteId: 'pp1',
        blob,
        mimeType: 'image/png'
      });

      expect(storage.subirArchivo).toHaveBeenCalledOnce();
      const [path, b, mime] = storage.subirArchivo.mock.calls[0];
      expect(path).toContain('p1/fotos/');
      expect(path).toMatch(/\.png$/);
      expect(b).toBe(blob);
      expect(mime).toBe('image/png');
    });

    it('guarda el storageRef devuelto por storage', async () => {
      storage.subirArchivo.mockResolvedValueOnce('refs/mi-foto.jpg');
      const foto = await repo.crearFoto({
        partidaId: 'p1',
        participanteId: 'pp1',
        blob: crearBlob(),
        mimeType: 'image/jpeg'
      });

      expect(foto.storage_ref).toBe('refs/mi-foto.jpg');
    });

    it('mimeType inválido lanza ValidacionError', async () => {
      await expect(
        repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'text/plain' })
      ).rejects.toThrow(ValidacionError);
    });

    it('blob null lanza ValidacionError', async () => {
      await expect(
        repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: null, mimeType: 'image/jpeg' })
      ).rejects.toThrow(ValidacionError);
    });

    it('blob.size = 0 lanza ValidacionError', async () => {
      await expect(
        repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: new Blob([], { type: 'image/jpeg' }), mimeType: 'image/jpeg' })
      ).rejects.toThrow(ValidacionError);
    });
  });

  /* ===== obtenerFoto ===== */

  describe('obtenerFoto', () => {
    it('devuelve entidad existente', async () => {
      const foto = await repo.crearFoto({
        partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg'
      });
      const obtenida = await repo.obtenerFoto(foto.id);
      expect(obtenida.id).toBe(foto.id);
    });

    it('devuelve undefined si no existe', async () => {
      const obtenida = await repo.obtenerFoto('id-inexistente');
      expect(obtenida).toBeUndefined();
    });
  });

  /* ===== listarFotosDePartida ===== */

  describe('listarFotosDePartida', () => {
    it('filtra por partida y ordena por created_at', async () => {
      await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.crearFoto({ partidaId: 'p2', participanteId: 'pp2', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });

      const fotos = await repo.listarFotosDePartida('p1');
      expect(fotos).toHaveLength(2);
      expect(fotos.every((f) => f.partida_id === 'p1')).toBe(true);
    });
  });

  /* ===== listarPendientesDePartida ===== */

  describe('listarPendientesDePartida', () => {
    it('filtra por estado PENDIENTE', async () => {
      const f1 = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(f1.id, 's1');

      const pendientes = await repo.listarPendientesDePartida('p1');
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].id).not.toBe(f1.id);
    });
  });

  /* ===== listarAprobadasDePartida ===== */

  describe('listarAprobadasDePartida', () => {
    it('filtra por estado APROBADO', async () => {
      const f1 = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(f1.id, 's1');

      const aprobadas = await repo.listarAprobadasDePartida('p1');
      expect(aprobadas).toHaveLength(1);
      expect(aprobadas[0].id).toBe(f1.id);
    });
  });

  /* ===== aprobarFoto ===== */

  describe('aprobarFoto', () => {
    it('cambia estado, setea moderado_at y moderado_por', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      const aprobada = await repo.aprobarFoto(foto.id, 'sess_conductor');

      expect(aprobada.estado).toBe('APROBADO');
      expect(aprobada.moderado_at).toBeTruthy();
      expect(aprobada.moderado_por).toBe('sess_conductor');
    });

    it('foto inexistente lanza NoEncontradoError', async () => {
      await expect(repo.aprobarFoto('no-existe', 'sess1')).rejects.toThrow(NoEncontradoError);
    });

    it('foto ya APROBADA devuelve sin cambio (idempotente)', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(foto.id, 'sess1');
      const resultado = await repo.aprobarFoto(foto.id, 'sess1');
      expect(resultado.estado).toBe('APROBADO');
    });

    it('foto RECHAZADA lanza OperacionInvalidaError', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.rechazarFoto(foto.id, 'sess1');
      await expect(repo.aprobarFoto(foto.id, 'sess1')).rejects.toThrow(OperacionInvalidaError);
    });
  });

  /* ===== rechazarFoto ===== */

  describe('rechazarFoto', () => {
    it('cambia estado correctamente', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      const rechazada = await repo.rechazarFoto(foto.id, 'sess_conductor');

      expect(rechazada.estado).toBe('RECHAZADO');
      expect(rechazada.moderado_at).toBeTruthy();
      expect(rechazada.moderado_por).toBe('sess_conductor');
    });

    it('foto ya RECHAZADA devuelve sin cambio (idempotente)', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.rechazarFoto(foto.id, 'sess1');
      const resultado = await repo.rechazarFoto(foto.id, 'sess1');
      expect(resultado.estado).toBe('RECHAZADO');
    });

    it('foto APROBADA lanza OperacionInvalidaError', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(foto.id, 'sess1');
      await expect(repo.rechazarFoto(foto.id, 'sess1')).rejects.toThrow(OperacionInvalidaError);
    });
  });

  /* ===== eliminarFoto ===== */

  describe('eliminarFoto', () => {
    it('elimina solo si RECHAZADA', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.rechazarFoto(foto.id, 'sess1');
      await repo.eliminarFoto(foto.id);

      const obtenida = await repo.obtenerFoto(foto.id);
      expect(obtenida).toBeUndefined();
    });

    it('llama a storage.eliminarArchivo con storage_ref correcto', async () => {
      storage.subirArchivo.mockResolvedValueOnce('refs/mi-foto.jpg');
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.rechazarFoto(foto.id, 'sess1');
      await repo.eliminarFoto(foto.id);

      expect(storage.eliminarArchivo).toHaveBeenCalledWith('refs/mi-foto.jpg');
    });

    it('si storage falla, NO elimina el registro', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.rechazarFoto(foto.id, 'sess1');

      storage.eliminarArchivo.mockRejectedValueOnce(new Error('Storage error'));

      await expect(repo.eliminarFoto(foto.id)).rejects.toThrow('Storage error');

      const obtenida = await repo.obtenerFoto(foto.id);
      expect(obtenida).toBeTruthy();
      expect(obtenida.id).toBe(foto.id);
    });

    it('PENDIENTE lanza OperacionInvalidaError', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await expect(repo.eliminarFoto(foto.id)).rejects.toThrow(OperacionInvalidaError);
    });

    it('APROBADA lanza OperacionInvalidaError', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(foto.id, 'sess1');
      await expect(repo.eliminarFoto(foto.id)).rejects.toThrow(OperacionInvalidaError);
    });

    it('inexistente lanza NoEncontradoError', async () => {
      await expect(repo.eliminarFoto('no-existe')).rejects.toThrow(NoEncontradoError);
    });
  });

  /* ===== obtenerUrlPublica ===== */

  describe('obtenerUrlPublica', () => {
    it('devuelve null si no existe', async () => {
      const url = await repo.obtenerUrlPublica('id-inexistente');
      expect(url).toBeNull();
    });

    it('devuelve null si no está APROBADA', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      const url = await repo.obtenerUrlPublica(foto.id);
      expect(url).toBeNull();
      expect(storage.obtenerUrlPublica).not.toHaveBeenCalled();
    });

    it('delega al storage si APROBADA', async () => {
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(foto.id, 'sess1');

      const url = await repo.obtenerUrlPublica(foto.id);
      expect(url).toBe('https://storage.example.com/foto.jpg');
      expect(storage.obtenerUrlPublica).toHaveBeenCalledOnce();
    });

    it('llama al storage con storage_ref correcto', async () => {
      storage.subirArchivo.mockResolvedValueOnce('refs/mi-foto.jpg');
      const foto = await repo.crearFoto({ partidaId: 'p1', participanteId: 'pp1', blob: crearBlob(), mimeType: 'image/jpeg' });
      await repo.aprobarFoto(foto.id, 'sess1');

      await repo.obtenerUrlPublica(foto.id);
      expect(storage.obtenerUrlPublica).toHaveBeenCalledWith('refs/mi-foto.jpg');
    });
  });
});
