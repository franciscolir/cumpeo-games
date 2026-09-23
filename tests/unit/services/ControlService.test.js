import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { ControlService } from '../../../src/services/ControlService.js';
import { DB_NAME } from '../../../src/adapters/schema.js';
import { SinControlError } from '../../../src/repositories/errors.js';

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

  describe('heartbeat', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      service.detenerTodosLosHeartbeats();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('1. iniciarHeartbeat agenda un interval', () => {
      service.iniciarHeartbeat('p1', 's1');
      expect(service._heartbeats.size).toBe(1);
      expect(service._heartbeats.has('p1')).toBe(true);
    });

    it('2. Tras 10s, llama a renovarControl(partidaId, sessionId)', async () => {
      const spy = vi.spyOn(service, 'renovarControl').mockResolvedValue({ renovado: true });
      service.iniciarHeartbeat('p1', 's1');
      await vi.advanceTimersByTimeAsync(10000);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('p1', 's1');
    });

    it('3. Tras 20s, llama dos veces', async () => {
      const spy = vi.spyOn(service, 'renovarControl').mockResolvedValue({ renovado: true });
      service.iniciarHeartbeat('p1', 's1');
      await vi.advanceTimersByTimeAsync(20000);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('4. Si renovarControl lanza, llama a tomarControl', async () => {
      vi.spyOn(service, 'renovarControl').mockRejectedValue(new SinControlError('p1'));
      const tomar = vi.spyOn(service, 'tomarControl').mockResolvedValue({ adquirido: true });
      service.iniciarHeartbeat('p1', 's1');
      await vi.advanceTimersByTimeAsync(10000);
      expect(tomar).toHaveBeenCalledTimes(1);
      expect(tomar).toHaveBeenCalledWith('p1', 's1');
    });

    it('5. Si ambos lanzan, no rompe', async () => {
      vi.spyOn(service, 'renovarControl').mockRejectedValue(new Error('renovar fail'));
      vi.spyOn(service, 'tomarControl').mockRejectedValue(new Error('tomar fail'));
      service.iniciarHeartbeat('p1', 's1');
      await vi.advanceTimersByTimeAsync(30000);
      expect(service._heartbeats.has('p1')).toBe(true);
    });

    it('6. detenerHeartbeat cancela el interval', () => {
      service.iniciarHeartbeat('p1', 's1');
      service.detenerHeartbeat('p1');
      expect(service._heartbeats.size).toBe(0);
      expect(service._heartbeats.has('p1')).toBe(false);
    });

    it('7. Tras detener, no hay más llamadas', async () => {
      const spy = vi.spyOn(service, 'renovarControl').mockResolvedValue({ renovado: true });
      service.iniciarHeartbeat('p1', 's1');
      service.detenerHeartbeat('p1');
      await vi.advanceTimersByTimeAsync(50000);
      expect(spy).not.toHaveBeenCalled();
    });

    it('8. Llamar dos veces iniciarHeartbeat no duplica el interval', () => {
      service.iniciarHeartbeat('p1', 's1');
      service.iniciarHeartbeat('p1', 's1');
      expect(service._heartbeats.size).toBe(1);
    });

    it('9. detenerTodosLosHeartbeats limpia todos', () => {
      service.iniciarHeartbeat('p1', 's1');
      service.iniciarHeartbeat('p2', 's1');
      service.iniciarHeartbeat('p3', 's1');
      expect(service._heartbeats.size).toBe(3);
      service.detenerTodosLosHeartbeats();
      expect(service._heartbeats.size).toBe(0);
    });

    it('10. Diferentes partidaIds tienen intervals independientes', async () => {
      const spy = vi.spyOn(service, 'renovarControl').mockResolvedValue({ renovado: true });
      service.iniciarHeartbeat('p1', 's1');
      service.iniciarHeartbeat('p2', 's1');
      service.detenerHeartbeat('p1');
      await vi.advanceTimersByTimeAsync(10000);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('p2', 's1');
      expect(service._heartbeats.has('p1')).toBe(false);
      expect(service._heartbeats.has('p2')).toBe(true);
    });
  });
});
