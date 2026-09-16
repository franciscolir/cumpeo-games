import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { ParticipanteRepository } from '../../../src/repositories/ParticipanteRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('ParticipanteRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new ParticipanteRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  async function crearPartidaYEquipos(partidaId = 'p1', estado = 'CONFIGURANDO') {
    await adapter.tx(['partidas', 'equipo_partidas'], 'readwrite', (tx) => {
      tx.objectStore('partidas').add({
        id: partidaId,
        estado,
        circuito_nombre: 'X',
        version: 1,
        created_at: new Date().toISOString()
      });
      tx.objectStore('equipo_partidas').add({
        id: 'eq1',
        partida_id: partidaId,
        posicion: 1,
        nombre: 'A',
        color: '#000000',
        puntaje: 0,
        version: 1
      });
      tx.objectStore('equipo_partidas').add({
        id: 'eq2',
        partida_id: partidaId,
        posicion: 2,
        nombre: 'B',
        color: '#FFFFFF',
        puntaje: 0,
        version: 1
      });
    });
  }

  describe('agregarParticipante', () => {
    it('agrega un participante con ha_participado=false', async () => {
      await crearPartidaYEquipos();
      const p = await repo.agregarParticipante('p1', 'eq1', 'Juan');
      expect(p.id).toBeTruthy();
      expect(p.partida_id).toBe('p1');
      expect(p.equipo_partida_id).toBe('eq1');
      expect(p.ha_participado).toBe(false);
    });

    it('rechaza si el equipo pertenece a otra partida (INV-070)', async () => {
      await crearPartidaYEquipos('p1');
      await adapter.tx(['equipo_partidas'], 'readwrite', (tx) => {
        tx.objectStore('equipo_partidas').put({
          id: 'eq_x',
          partida_id: 'p2',
          posicion: 1,
          nombre: 'X',
          color: '#000000',
          puntaje: 0,
          version: 1
        });
      });

      await expect(
        repo.agregarParticipante('p1', 'eq_x', 'Juan')
      ).rejects.toThrow(/INV-070/);
    });

    it('rechaza si la partida está en estado terminal', async () => {
      await crearPartidaYEquipos('p1', 'FINALIZADA');
      await expect(
        repo.agregarParticipante('p1', 'eq1', 'Juan')
      ).rejects.toThrow(/FINALIZADA/);
    });

    it('rechaza si la partida no existe', async () => {
      await expect(
        repo.agregarParticipante('nope', 'eq1', 'Juan')
      ).rejects.toThrow(/no encontrado/);
    });

    it('rechaza si el equipo no existe', async () => {
      await crearPartidaYEquipos();
      await expect(
        repo.agregarParticipante('p1', 'nope', 'Juan')
      ).rejects.toThrow(/no encontrado/);
    });

    it('rechaza si el nombre está vacío', async () => {
      await crearPartidaYEquipos();
      await expect(
        repo.agregarParticipante('p1', 'eq1', '')
      ).rejects.toThrow(/nombre/);
    });
  });

  describe('listarParticipantesDePartida / DeEquipo', () => {
    it('lista participantes de una partida ordenados por nombre', async () => {
      await crearPartidaYEquipos();
      await repo.agregarParticipante('p1', 'eq1', 'Zeta');
      await repo.agregarParticipante('p1', 'eq2', 'Alfa');

      const lista = await repo.listarParticipantesDePartida('p1');
      expect(lista.map((p) => p.nombre)).toEqual(['Alfa', 'Zeta']);
    });

    it('lista participantes de un equipo', async () => {
      await crearPartidaYEquipos();
      await repo.agregarParticipante('p1', 'eq1', 'Juan');
      await repo.agregarParticipante('p1', 'eq1', 'Pedro');
      await repo.agregarParticipante('p1', 'eq2', 'María');

      const eq1 = await repo.listarParticipantesDeEquipo('eq1');
      expect(eq1).toHaveLength(2);
    });
  });

  describe('eliminarParticipante', () => {
    it('elimina si ha_participado = false', async () => {
      await crearPartidaYEquipos();
      const p = await repo.agregarParticipante('p1', 'eq1', 'Juan');
      await repo.eliminarParticipante(p.id);
      expect(await repo.obtenerParticipante(p.id)).toBeUndefined();
    });

    it('rechaza si ha_participado = true (INV-159)', async () => {
      await crearPartidaYEquipos();
      const p = await repo.agregarParticipante('p1', 'eq1', 'Juan');
      await repo.marcarParticipacion(p.id);

      await expect(repo.eliminarParticipante(p.id)).rejects.toThrow(/INV-159/);
      expect(await repo.obtenerParticipante(p.id)).toBeTruthy();
    });

    it('rechaza si no existe', async () => {
      await expect(repo.eliminarParticipante('nope')).rejects.toThrow(/no encontrado/);
    });
  });

  describe('marcarParticipacion', () => {
    it('marca ha_participado = true', async () => {
      await crearPartidaYEquipos();
      const p = await repo.agregarParticipante('p1', 'eq1', 'Juan');
      const actualizado = await repo.marcarParticipacion(p.id);
      expect(actualizado.ha_participado).toBe(true);
    });

    it('es idempotente si ya está marcado', async () => {
      await crearPartidaYEquipos();
      const p = await repo.agregarParticipante('p1', 'eq1', 'Juan');
      await repo.marcarParticipacion(p.id);
      const r = await repo.marcarParticipacion(p.id);
      expect(r.ha_participado).toBe(true);
    });

    it('rechaza si no existe', async () => {
      await expect(repo.marcarParticipacion('nope')).rejects.toThrow(/no encontrado/);
    });
  });
});
