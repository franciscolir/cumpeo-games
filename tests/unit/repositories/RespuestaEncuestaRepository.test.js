import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { RespuestaEncuestaRepository } from '../../../src/repositories/RespuestaEncuestaRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';
import {
  ValidacionError,
  YaExisteError
} from '../../../src/repositories/errors.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('RespuestaEncuestaRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new RespuestaEncuestaRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearRespuesta', () => {
    it('crea respuesta A con todos los campos', async () => {
      const resp = await repo.crearRespuesta({
        partidaId: 'p1',
        juegoEjecutadoId: 'je1',
        participanteId: 'pp1',
        preguntaIndex: 0,
        opcion: 'A'
      });

      expect(resp.id).toBeTruthy();
      expect(resp.partida_id).toBe('p1');
      expect(resp.juego_ejecutado_id).toBe('je1');
      expect(resp.participante_id).toBe('pp1');
      expect(resp.pregunta_index).toBe(0);
      expect(resp.opcion).toBe('A');
      expect(resp.created_at).toBeTruthy();
    });

    it('crea respuesta B', async () => {
      const resp = await repo.crearRespuesta({
        partidaId: 'p1',
        juegoEjecutadoId: 'je1',
        participanteId: 'pp1',
        preguntaIndex: 0,
        opcion: 'B'
      });

      expect(resp.opcion).toBe('B');
    });

    it('opcion invalida lanza ValidacionError', async () => {
      await expect(
        repo.crearRespuesta({
          partidaId: 'p1',
          juegoEjecutadoId: 'je1',
          participanteId: 'pp1',
          preguntaIndex: 0,
          opcion: 'C'
        })
      ).rejects.toThrow(ValidacionError);
    });

    it('duplicado lanza YaExisteError', async () => {
      await repo.crearRespuesta({
        partidaId: 'p1',
        juegoEjecutadoId: 'je1',
        participanteId: 'pp1',
        preguntaIndex: 0,
        opcion: 'A'
      });

      await expect(
        repo.crearRespuesta({
          partidaId: 'p1',
          juegoEjecutadoId: 'je1',
          participanteId: 'pp1',
          preguntaIndex: 0,
          opcion: 'B'
        })
      ).rejects.toThrow(YaExisteError);
    });

    it('mismo participante puede responder pregunta diferente', async () => {
      await repo.crearRespuesta({
        partidaId: 'p1',
        juegoEjecutadoId: 'je1',
        participanteId: 'pp1',
        preguntaIndex: 0,
        opcion: 'A'
      });

      const resp2 = await repo.crearRespuesta({
        partidaId: 'p1',
        juegoEjecutadoId: 'je1',
        participanteId: 'pp1',
        preguntaIndex: 1,
        opcion: 'B'
      });

      expect(resp2.pregunta_index).toBe(1);
    });

    it('participante invalido lanza error', async () => {
      await expect(
        repo.crearRespuesta({
          partidaId: 'p1',
          juegoEjecutadoId: 'je1',
          participanteId: '',
          preguntaIndex: 0,
          opcion: 'A'
        })
      ).rejects.toThrow();
    });

    it('preguntaIndex negativo lanza ValidacionError', async () => {
      await expect(
        repo.crearRespuesta({
          partidaId: 'p1',
          juegoEjecutadoId: 'je1',
          participanteId: 'pp1',
          preguntaIndex: -1,
          opcion: 'A'
        })
      ).rejects.toThrow(ValidacionError);
    });
  });

  describe('contarRespuestasDeJuego', () => {
    it('cuenta correctamente A y B', async () => {
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp1', preguntaIndex: 0, opcion: 'A' });
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp2', preguntaIndex: 0, opcion: 'A' });
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp3', preguntaIndex: 0, opcion: 'B' });

      const resultado = await repo.contarRespuestasDeJuego('je1', 0);
      expect(resultado.a).toBe(2);
      expect(resultado.b).toBe(1);
      expect(resultado.total).toBe(3);
    });

    it('sin respuestas devuelve ceros', async () => {
      const resultado = await repo.contarRespuestasDeJuego('je1', 0);
      expect(resultado.a).toBe(0);
      expect(resultado.b).toBe(0);
      expect(resultado.total).toBe(0);
    });
  });

  describe('listarRespuestasDeJuego', () => {
    it('lista respuestas de una pregunta', async () => {
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp1', preguntaIndex: 0, opcion: 'A' });
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp2', preguntaIndex: 0, opcion: 'B' });
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp3', preguntaIndex: 1, opcion: 'A' });

      const respuestas = await repo.listarRespuestasDeJuego('je1', 0);
      expect(respuestas).toHaveLength(2);
    });
  });

  describe('existeRespuestaDeParticipante', () => {
    it('devuelve true si ya respondio', async () => {
      await repo.crearRespuesta({ partidaId: 'p1', juegoEjecutadoId: 'je1', participanteId: 'pp1', preguntaIndex: 0, opcion: 'A' });

      const existe = await repo.existeRespuestaDeParticipante('je1', 'pp1', 0);
      expect(existe).toBe(true);
    });

    it('devuelve false si no respondio', async () => {
      const existe = await repo.existeRespuestaDeParticipante('je1', 'pp1', 0);
      expect(existe).toBe(false);
    });
  });
});
