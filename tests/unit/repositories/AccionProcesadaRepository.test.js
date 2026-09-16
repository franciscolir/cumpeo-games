import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { AccionProcesadaRepository } from '../../../src/repositories/AccionProcesadaRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('AccionProcesadaRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new AccionProcesadaRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('reservarEnTx', () => {
    it('reserva un action_id nuevo', async () => {
      const r = await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', 'p1', 'FINALIZAR_JUEGO', resolver);
      });
      expect(r.yaProcesada).toBe(false);

      const reg = await repo.obtenerPorActionId('a1');
      expect(reg).toBeTruthy();
      expect(reg.partida_id).toBe('p1');
      expect(reg.tipo_accion).toBe('FINALIZAR_JUEGO');
      expect(reg.resultado).toBeNull();
    });

    it('devuelve yaProcesada:true con el resultado si el action_id existe', async () => {
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', 'p1', 'FINALIZAR_JUEGO', resolver);
      });

      // Actualizamos el resultado para simular que la operación terminó
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx) => {
        repo.actualizarResultadoEnTx(tx, 'a1', { puntos: 100 });
      });

      const r = await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', 'p1', 'FINALIZAR_JUEGO', resolver);
      });
      expect(r.yaProcesada).toBe(true);
      expect(r.resultado).toEqual({ puntos: 100 });
    });

    it('permite partida_id null', async () => {
      const r = await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', null, 'TOMAR_CONTROL', resolver);
      });
      expect(r.yaProcesada).toBe(false);

      const reg = await repo.obtenerPorActionId('a1');
      expect(reg.partida_id).toBeNull();
    });

    it('rechaza actionId vacío', async () => {
      await expect(
        adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
          repo.reservarEnTx(tx, '', 'p1', 'X', resolver);
        })
      ).rejects.toThrow(/actionId/);
    });

    it('rechaza tipoAccion vacío', async () => {
      await expect(
        adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
          repo.reservarEnTx(tx, 'a1', 'p1', '', resolver);
        })
      ).rejects.toThrow(/tipoAccion/);
    });

    it('rechaza onResult que no es función', async () => {
      await expect(
        adapter.tx(['accion_procesadas'], 'readwrite', (tx) => {
          repo.reservarEnTx(tx, 'a1', 'p1', 'X', 'no-fn');
        })
      ).rejects.toThrow(/función/);
    });
  });

  describe('actualizarResultadoEnTx', () => {
    it('actualiza el resultado de una acción reservada', async () => {
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', 'p1', 'X', resolver);
      });

      await adapter.tx(['accion_procesadas'], 'readwrite', (tx) => {
        repo.actualizarResultadoEnTx(tx, 'a1', { ok: true });
      });

      const reg = await repo.obtenerPorActionId('a1');
      expect(reg.resultado).toEqual({ ok: true });
    });

    it('no-op si el actionId no existe', async () => {
      // No debería lanzar
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx) => {
        repo.actualizarResultadoEnTx(tx, 'no-existe', { x: 1 });
      });
      const reg = await repo.obtenerPorActionId('no-existe');
      expect(reg).toBeUndefined();
    });
  });

  describe('consultas', () => {
    it('listarPorPartida devuelve las acciones de una partida', async () => {
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a1', 'p1', 'X', resolver);
      });
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a2', 'p1', 'Y', resolver);
      });
      await adapter.tx(['accion_procesadas'], 'readwrite', (tx, resolver) => {
        repo.reservarEnTx(tx, 'a3', 'p2', 'Z', resolver);
      });

      const lista = await repo.listarPorPartida('p1');
      expect(lista).toHaveLength(2);
    });

    it('obtenerPorActionId devuelve undefined si no existe', async () => {
      expect(await repo.obtenerPorActionId('nope')).toBeUndefined();
    });
  });
});
