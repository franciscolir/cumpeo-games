import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { ControlService } from '../../../src/services/ControlService.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('ControlService', () => {
  let adapter;
  let service;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    service = new ControlService(adapter);
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
      const r = await service.tomarControl('p1', 's1');
      expect(r.adquirido).toBe(true);
    });

    it('lanza SinControlError si otra sesión lo tiene', async () => {
      await crearControl('p1', {
        session_id: 's2',
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30000).toISOString()
      });
      await expect(service.tomarControl('p1', 's1')).rejects.toThrow(/Sin control/);
    });

    it('lanza NoEncontradoError si el control no existe', async () => {
      await expect(service.tomarControl('nope', 's1')).rejects.toThrow(/no encontrado/);
    });
  });

  describe('renovarControl', () => {
    it('renueva si es la sesión dueña', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      const r = await service.renovarControl('p1', 's1');
      expect(r.renovado).toBe(true);
    });

    it('lanza SinControlError si es otra sesión', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      await expect(service.renovarControl('p1', 's2')).rejects.toThrow(/Sin control/);
    });
  });

  describe('liberarControl', () => {
    it('libera si es la sesión dueña', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      const r = await service.liberarControl('p1', 's1');
      expect(r.liberado).toBe(true);
    });

    it('no lanza si es otra sesión, devuelve liberado=false', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      const r = await service.liberarControl('p1', 's2');
      expect(r.liberado).toBe(false);
    });
  });

  describe('verificarControl', () => {
    it('true si la sesión tiene lease vigente', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      expect(await service.verificarControl('p1', 's1')).toBe(true);
    });

    it('false si es otra sesión', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      expect(await service.verificarControl('p1', 's2')).toBe(false);
    });
  });

  describe('conControl', () => {
    it('ejecuta fn si la sesión tiene control', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      let ejecutado = false;
      await service.conControl('p1', 's1', async () => {
        ejecutado = true;
      });
      expect(ejecutado).toBe(true);
    });

    it('lanza SinControlError si no tiene control', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      await expect(
        service.conControl('p1', 's2', async () => {})
      ).rejects.toThrow(/Sin control/);
    });

    it('valida que fn sea función', async () => {
      await crearControl('p1');
      await service.tomarControl('p1', 's1');
      await expect(
        service.conControl('p1', 's1', 'no-fn')
      ).rejects.toThrow(/función/);
    });
  });
});
