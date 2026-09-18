import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { MensajePublicoRepository } from '../../../src/repositories/MensajePublicoRepository.js';
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

describe('MensajePublicoRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new MensajePublicoRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearMensaje', () => {
    it('crea con estado PENDIENTE, id generado y created_at seteado', async () => {
      const msg = await repo.crearMensaje({
        partidaId: 'p1',
        participanteId: 'pp1',
        texto: 'Hola mundo'
      });

      expect(msg.id).toBeTruthy();
      expect(msg.partida_id).toBe('p1');
      expect(msg.participante_id).toBe('pp1');
      expect(msg.texto).toBe('Hola mundo');
      expect(msg.estado).toBe('PENDIENTE');
      expect(msg.created_at).toBeTruthy();
      expect(msg.moderado_at).toBeNull();
      expect(msg.moderado_por).toBeNull();
    });

    it('texto vacío lanza ValidacionError', async () => {
      await expect(
        repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: '' })
      ).rejects.toThrow(ValidacionError);
    });

    it('texto con solo espacios lanza ValidacionError', async () => {
      await expect(
        repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: '   ' })
      ).rejects.toThrow(ValidacionError);
    });
  });

  describe('obtenerMensaje', () => {
    it('devuelve entidad existente', async () => {
      const creado = await repo.crearMensaje({
        partidaId: 'p1',
        participanteId: 'pp1',
        texto: 'Test'
      });
      const obtenido = await repo.obtenerMensaje(creado.id);
      expect(obtenido).toBeTruthy();
      expect(obtenido.id).toBe(creado.id);
      expect(obtenido.texto).toBe('Test');
    });

    it('devuelve null si no existe', async () => {
      const obtenido = await repo.obtenerMensaje('id-inexistente');
      expect(obtenido).toBeUndefined();
    });
  });

  describe('listarMensajesDePartida', () => {
    it('devuelve solo los de la partida, ordenados por created_at asc', async () => {
      await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Primero' });
      await repo.crearMensaje({ partidaId: 'otra', participanteId: 'pp1', texto: 'Otra partida' });
      await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Segundo' });

      const lista = await repo.listarMensajesDePartida('p1');
      expect(lista).toHaveLength(2);
      expect(lista[0].texto).toBe('Primero');
      expect(lista[1].texto).toBe('Segundo');
    });
  });

  describe('listarPendientesDePartida', () => {
    it('filtra correctamente', async () => {
      const msg1 = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Pendiente' });
      const msg2 = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'A Aprobar' });
      await repo.aprobarMensaje(msg2.id, 'sess1');

      const pendientes = await repo.listarPendientesDePartida('p1');
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].id).toBe(msg1.id);
    });
  });

  describe('listarAprobadosDePartida', () => {
    it('filtra correctamente', async () => {
      const msg1 = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Pendiente' });
      const msg2 = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Aprobado' });
      await repo.aprobarMensaje(msg2.id, 'sess1');

      const aprobados = await repo.listarAprobadosDePartida('p1');
      expect(aprobados).toHaveLength(1);
      expect(aprobados[0].id).toBe(msg2.id);
    });
  });

  describe('aprobarMensaje', () => {
    it('cambia estado, setea moderado_at y moderado_por', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      const aprobado = await repo.aprobarMensaje(msg.id, 'sess_conductor');

      expect(aprobado.estado).toBe('APROBADO');
      expect(aprobado.moderado_at).toBeTruthy();
      expect(aprobado.moderado_por).toBe('sess_conductor');
    });

    it('mensaje inexistente lanza NoEncontradoError', async () => {
      await expect(
        repo.aprobarMensaje('no-existe', 'sess1')
      ).rejects.toThrow(NoEncontradoError);
    });

    it('mensaje ya APROBADO devuelve sin cambio (idempotente)', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.aprobarMensaje(msg.id, 'sess1');
      const resultado = await repo.aprobarMensaje(msg.id, 'sess1');

      expect(resultado.estado).toBe('APROBADO');
    });

    it('mensaje RECHAZADO lanza OperacionInvalidaError', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.rechazarMensaje(msg.id, 'sess1');

      await expect(
        repo.aprobarMensaje(msg.id, 'sess1')
      ).rejects.toThrow(OperacionInvalidaError);
    });
  });

  describe('rechazarMensaje', () => {
    it('cambia estado correctamente', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      const rechazado = await repo.rechazarMensaje(msg.id, 'sess_conductor');

      expect(rechazado.estado).toBe('RECHAZADO');
      expect(rechazado.moderado_at).toBeTruthy();
      expect(rechazado.moderado_por).toBe('sess_conductor');
    });

    it('mensaje ya RECHAZADO devuelve sin cambio (idempotente)', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.rechazarMensaje(msg.id, 'sess1');
      const resultado = await repo.rechazarMensaje(msg.id, 'sess1');

      expect(resultado.estado).toBe('RECHAZADO');
    });

    it('mensaje APROBADO lanza OperacionInvalidaError', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.aprobarMensaje(msg.id, 'sess1');

      await expect(
        repo.rechazarMensaje(msg.id, 'sess1')
      ).rejects.toThrow(OperacionInvalidaError);
    });
  });

  describe('eliminarMensaje', () => {
    it('elimina solo si RECHAZADO', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.rechazarMensaje(msg.id, 'sess1');
      await repo.eliminarMensaje(msg.id);

      const obtenido = await repo.obtenerMensaje(msg.id);
      expect(obtenido).toBeUndefined();
    });

    it('PENDIENTE lanza OperacionInvalidaError', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });

      await expect(repo.eliminarMensaje(msg.id)).rejects.toThrow(OperacionInvalidaError);
    });

    it('APROBADO lanza OperacionInvalidaError', async () => {
      const msg = await repo.crearMensaje({ partidaId: 'p1', participanteId: 'pp1', texto: 'Test' });
      await repo.aprobarMensaje(msg.id, 'sess1');

      await expect(repo.eliminarMensaje(msg.id)).rejects.toThrow(OperacionInvalidaError);
    });

    it('inexistente lanza NoEncontradoError', async () => {
      await expect(repo.eliminarMensaje('no-existe')).rejects.toThrow(NoEncontradoError);
    });
  });
});
