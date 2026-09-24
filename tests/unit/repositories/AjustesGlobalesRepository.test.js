import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { AjustesGlobalesRepository } from '../../../src/repositories/AjustesGlobalesRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('AjustesGlobalesRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new AjustesGlobalesRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('obtener', () => {
    it('primera vez → crea con defaults (tiempo_max_pausa_seg = 120)', async () => {
      const a = await repo.obtener();
      expect(a.id).toBe('default');
      expect(a.tiempo_max_pausa_seg).toBe(120);
      expect(a.created_at).toBeTruthy();
      expect(a.updated_at).toBeTruthy();
    });

    it('segunda vez → devuelve el existente sin recrear', async () => {
      const a1 = await repo.obtener();
      const a2 = await repo.obtener();
      expect(a2.id).toBe(a1.id);
      expect(a2.created_at).toBe(a1.created_at);
      expect(a2.tiempo_max_pausa_seg).toBe(120);
    });
  });

  describe('actualizar', () => {
    it('cambia tiempo_max_pausa_seg', async () => {
      const a = await repo.actualizar({ tiempo_max_pausa_seg: 60 });
      expect(a.tiempo_max_pausa_seg).toBe(60);
      expect(a.id).toBe('default');
    });

    it('persiste el cambio entre llamadas', async () => {
      await repo.actualizar({ tiempo_max_pausa_seg: 300 });
      const a = await repo.obtener();
      expect(a.tiempo_max_pausa_seg).toBe(300);
    });

    it('rechaza no-integer', async () => {
      await expect(
        repo.actualizar({ tiempo_max_pausa_seg: 12.5 })
      ).rejects.toThrow(/entero/);
    });

    it('rechaza <= 0', async () => {
      await expect(
        repo.actualizar({ tiempo_max_pausa_seg: 0 })
      ).rejects.toThrow(/entero/);
      await expect(
        repo.actualizar({ tiempo_max_pausa_seg: -10 })
      ).rejects.toThrow(/entero/);
    });

    it('ignora campos no permitidos', async () => {
      const a = await repo.actualizar({ tiempo_max_pausa_seg: 90, hacker: true });
      expect(a.tiempo_max_pausa_seg).toBe(90);
      expect(a.hacker).toBeUndefined();
    });

    it('actualiza updated_at', async () => {
      const antes = await repo.obtener();
      await new Promise((r) => setTimeout(r, 5));
      const despues = await repo.actualizar({ tiempo_max_pausa_seg: 45 });
      expect(despues.updated_at >= antes.updated_at).toBe(true);
      expect(despues.updated_at).toBeTruthy();
    });

    it('rechaza undefined si el campo está presente', async () => {
      await expect(
        repo.actualizar({ tiempo_max_pausa_seg: undefined })
      ).rejects.toThrow(/entero/);
    });
  });
});
