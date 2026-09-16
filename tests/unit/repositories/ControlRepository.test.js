import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { ControlRepository } from '../../../src/repositories/ControlRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('ControlRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new ControlRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  async function crearControl(partidaId, overrides = {}) {
    await adapter.tx(['control_partidas'], 'readwrite', (tx) => {
      tx.objectStore('control_partidas').add({
        partida_id: partidaId,
        session_id: null,
        usuario_id: null,
        acquired_at: null,
        expires_at: null,
        heartbeat_at: null,
        ...overrides
      });
    });
  }

  describe('tomarControl', () => {
    it('adquiere si está libre', async () => {
      await crearControl('p1');
      const r = await repo.tomarControl('p1', 's1');
      expect(r.adquirido).toBe(true);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBe('s1');
    });

    it('falla si otra sesión lo tiene vigente', async () => {
      await crearControl('p1', {
        session_id: 's2',
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30000).toISOString()
      });

      const r = await repo.tomarControl('p1', 's1');
      expect(r.adquirido).toBe(false);
    });

    it('adquiere si el lease está expirado', async () => {
      await crearControl('p1', {
        session_id: 's2',
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        heartbeat_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 30000).toISOString()
      });

      const r = await repo.tomarControl('p1', 's1');
      expect(r.adquirido).toBe(true);
    });

    it('renueva si es la misma sesión', async () => {
      await crearControl('p1', {
        session_id: 's1',
        acquired_at: new Date(Date.now() - 10000).toISOString(),
        heartbeat_at: new Date(Date.now() - 10000).toISOString(),
        expires_at: new Date(Date.now() + 20000).toISOString()
      });

      const r = await repo.tomarControl('p1', 's1');
      expect(r.adquirido).toBe(true);
    });

    it('considera expirado un lease en su instante límite', async () => {
      await crearControl('p1', {
        session_id: 's2',
        acquired_at: new Date(Date.now() - 30000).toISOString(),
        heartbeat_at: new Date(Date.now() - 30000).toISOString(),
        expires_at: new Date(Date.now() - 1).toISOString()
      });

      const r = await repo.tomarControl('p1', 's1');

      expect(r.adquirido).toBe(true);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBe('s1');
    });


    it('falla si el control no existe', async () => {
      const r = await repo.tomarControl('nope', 's1');
      expect(r.adquirido).toBe(false);
    });
  });

  describe('renovarControl', () => {
    it('renueva si es la sesión dueña', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');

      const antes = (await repo.obtenerControl('p1')).expires_at;
      await new Promise((r) => setTimeout(r, 5));
      const r = await repo.renovarControl('p1', 's1');
      expect(r.renovado).toBe(true);

      const despues = (await repo.obtenerControl('p1')).expires_at;
      expect(despues >= antes).toBe(true);
    });

    it('falla si es otra sesión', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');
      const r = await repo.renovarControl('p1', 's2');
      expect(r.renovado).toBe(false);
    });
  });

  describe('renovación con lease expirado', () => {
    it('rechaza renovar si el lease de la sesión ya expiró', async () => {
      await crearControl('p1', {
        session_id: 's1',
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        heartbeat_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString()
      });

      const r = await repo.renovarControl('p1', 's1');

      expect(r.renovado).toBe(false);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBe('s1');
      expect(c.expires_at).toBeTruthy();
    });
  });

  describe('tomarControl sobre lease expirado', () => {
    it('permite que otra sesión tome el control cuando el lease expiró', async () => {
      await crearControl('p1', {
        session_id: 's1',
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        heartbeat_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString()
      });

      const r = await repo.tomarControl('p1', 's2');

      expect(r.adquirido).toBe(true);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBe('s2');
      expect(c.heartbeat_at).toBeTruthy();
      expect(c.expires_at).toBeTruthy();
    });
  });

  describe('verificarControl', () => {
    it('devuelve false cuando expires_at es exactamente el momento actual o ya pasó', async () => {
      await crearControl('p1', {
        session_id: 's1',
        acquired_at: new Date(Date.now() - 30000).toISOString(),
        heartbeat_at: new Date(Date.now() - 30000).toISOString(),
        expires_at: new Date(Date.now() - 1).toISOString()
      });

      expect(
        await repo.verificarControl('p1', 's1')
      ).toBe(false);
    });
  });


  describe('liberarControl', () => {
    it('libera si es la sesión dueña', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');
      const r = await repo.liberarControl('p1', 's1');
      expect(r.liberado).toBe(true);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBeNull();
    });

    it('no-op si es otra sesión', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');
      const r = await repo.liberarControl('p1', 's2');
      expect(r.liberado).toBe(false);

      const c = await repo.obtenerControl('p1');
      expect(c.session_id).toBe('s1');
    });
  });

  describe('verificarControl', () => {
    it('devuelve true si la sesión tiene lease vigente', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');
      expect(await repo.verificarControl('p1', 's1')).toBe(true);
    });

    it('devuelve false si otra sesión tiene el lease', async () => {
      await crearControl('p1');
      await repo.tomarControl('p1', 's1');
      expect(await repo.verificarControl('p1', 's2')).toBe(false);
    });

    it('devuelve false si el lease expiró', async () => {
      await crearControl('p1', {
        session_id: 's1',
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        heartbeat_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 30000).toISOString()
      });
      expect(await repo.verificarControl('p1', 's1')).toBe(false);
    });
  });

  describe('listarControlesPorSesion', () => {
    it('devuelve las partidas controladas por la sesión', async () => {
      await crearControl('p1');
      await crearControl('p2');
      await repo.tomarControl('p1', 's1');
      await repo.tomarControl('p2', 's2');

      const lista = await repo.listarControlesPorSesion('s1');
      expect(lista).toHaveLength(1);
      expect(lista[0].partida_id).toBe('p1');
    });
  });
});
