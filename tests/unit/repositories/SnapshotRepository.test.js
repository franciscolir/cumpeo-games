import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { SnapshotRepository } from '../../../src/repositories/SnapshotRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('SnapshotRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new SnapshotRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  async function crearSetDePrueba(overrides = {}) {
    const set = {
      id: 'set1',
      juego_id: 'j1',
      nombre: 'Cultura General',
      version: 7,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
    await adapter.tx(['sets'], 'readwrite', (tx) => {
      tx.objectStore('sets').add(set);
    });
    return set;
  }

  async function crearCircuitoDePrueba(overrides = {}) {
    const tsViejo = new Date(Date.now() - 5000).toISOString();
    const circuito = {
      id: 'c1',
      nombre: 'Noche de Juegos',
      estado: 'BORRADOR',
      es_plantilla: false,
      version: 1,
      created_at: tsViejo,
      updated_at: tsViejo,
      ...overrides
    };
    await adapter.tx(['circuitos'], 'readwrite', (tx) => {
      tx.objectStore('circuitos').add(circuito);
    });
    return circuito;
  }

  async function crearCircuitoJuegoDePrueba(overrides = {}) {
    const cj = {
      id: 'cj1',
      circuito_id: 'c1',
      juego_id: 'j1',
      orden: 1,
      configuracion: {},
      snapshot_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
    await adapter.tx(['circuito_juegos'], 'readwrite', (tx) => {
      tx.objectStore('circuito_juegos').add(cj);
    });
    return cj;
  }

  async function leerCircuitoJuego(id) {
    return adapter.tx(['circuito_juegos'], 'readonly', (tx, resolver) => {
      const req = tx.objectStore('circuito_juegos').get(id);
      req.onsuccess = () => resolver(req.result);
    });
  }

  async function leerCircuito(id) {
    return adapter.tx(['circuitos'], 'readonly', (tx, resolver) => {
      const req = tx.objectStore('circuitos').get(id);
      req.onsuccess = () => resolver(req.result);
    });
  }

  describe('crearSnapshotDesdeSet', () => {
    it('crea un snapshot con source_set_name y source_version del Set real', async () => {
      await crearSetDePrueba({ nombre: 'Cultura General v7', version: 7 });
      const s = await repo.crearSnapshotDesdeSet('set1', 'j1', { items: [] });

      expect(s.id).toBeTruthy();
      expect(s.source_set_id).toBe('set1');
      expect(s.source_set_name).toBe('Cultura General v7');
      expect(s.source_version).toBe(7);
      expect(s.juego_id).toBe('j1');
      expect(s.contenido).toEqual({ items: [] });
    });

    it('rechaza si el Set no existe', async () => {
      await expect(
        repo.crearSnapshotDesdeSet('nope', 'j1', { items: [] })
      ).rejects.toThrow(/no encontrado/);
    });

    it('rechaza contenido no-objeto', async () => {
      await crearSetDePrueba();
      await expect(
        repo.crearSnapshotDesdeSet('set1', 'j1', null)
      ).rejects.toThrow(/contenido/);
    });

    it('NO reutiliza: dos llamadas generan dos snapshots distintos', async () => {
      await crearSetDePrueba();
      const s1 = await repo.crearSnapshotDesdeSet('set1', 'j1', { a: 1 });
      const s2 = await repo.crearSnapshotDesdeSet('set1', 'j1', { a: 1 });
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('listarSnapshotsPorSet', () => {
    it('devuelve solo los snapshots del set', async () => {
      await crearSetDePrueba({ id: 'set1', version: 7, nombre: 'A' });
      await crearSetDePrueba({ id: 'set2', version: 3, nombre: 'B', juego_id: 'j2' });

      await repo.crearSnapshotDesdeSet('set1', 'j1', { v: 7 });
      await repo.crearSnapshotDesdeSet('set2', 'j2', { v: 3 });

      const lista = await repo.listarSnapshotsPorSet('set1');
      expect(lista).toHaveLength(1);
      expect(lista[0].source_set_id).toBe('set1');
    });
  });

  describe('obtenerSnapshot', () => {
    it('devuelve el snapshot por id', async () => {
      await crearSetDePrueba();
      const s = await repo.crearSnapshotDesdeSet('set1', 'j1', { x: 1 });
      const r = await repo.obtenerSnapshot(s.id);
      expect(r.id).toBe(s.id);
    });

    it('devuelve undefined si no existe', async () => {
      expect(await repo.obtenerSnapshot('nope')).toBeUndefined();
    });
  });

  describe('actualizarSnapshotDeCircuitoJuego', () => {
    it('crea snapshot si no existe uno para esa (set, version)', async () => {
      await crearSetDePrueba({ id: 'set1', version: 7, nombre: 'Cultura' });
      await crearCircuitoDePrueba({ id: 'c1', version: 1 });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1', juego_id: 'j1' });

      const res = await repo.actualizarSnapshotDeCircuitoJuego('cj1');
      expect(res.reutilizado).toBe(false);
      expect(res.snapshot.source_set_id).toBe('set1');
      expect(res.snapshot.source_version).toBe(7);
      expect(res.snapshot.source_set_name).toBe('Cultura');
    });

    it('actualiza circuito_juego.snapshot_id', async () => {
      await crearSetDePrueba();
      await crearCircuitoDePrueba({ id: 'c1' });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1' });

      const res = await repo.actualizarSnapshotDeCircuitoJuego('cj1');
      const cj = await leerCircuitoJuego('cj1');
      expect(cj.snapshot_id).toBe(res.snapshot.id);
    });

    it('toca circuito: version+1 y updated_at distinto', async () => {
      await crearSetDePrueba();
      const c = await crearCircuitoDePrueba({ id: 'c1', version: 1 });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1' });

      await repo.actualizarSnapshotDeCircuitoJuego('cj1');
      const recargado = await leerCircuito('c1');
      expect(recargado.version).toBe(2);
      expect(recargado.updated_at).not.toBe(c.updated_at);
    });

    it('reutiliza snapshot existente con misma (set, version)', async () => {
      await crearSetDePrueba({ id: 'set1', version: 7 });
      await crearCircuitoDePrueba({ id: 'c1' });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1' });

      const r1 = await repo.actualizarSnapshotDeCircuitoJuego('cj1');
      const r2 = await repo.actualizarSnapshotDeCircuitoJuego('cj1');

      expect(r2.reutilizado).toBe(true);
      expect(r2.snapshot.id).toBe(r1.snapshot.id);
    });

    it('crea un snapshot nuevo si el Set sube de versión', async () => {
      await crearSetDePrueba({ id: 'set1', version: 7 });
      await crearCircuitoDePrueba({ id: 'c1' });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1' });

      const r1 = await repo.actualizarSnapshotDeCircuitoJuego('cj1');

      await adapter.tx(['sets'], 'readwrite', (tx) => {
        const req = tx.objectStore('sets').get('set1');
        req.onsuccess = () => {
          tx.objectStore('sets').put({ ...req.result, version: 8 });
        };
      });

      const r2 = await repo.actualizarSnapshotDeCircuitoJuego('cj1');

      expect(r2.reutilizado).toBe(false);
      expect(r2.snapshot.id).not.toBe(r1.snapshot.id);
      expect(r2.snapshot.source_version).toBe(8);
    });

    it('rechaza si circuito_juego no existe', async () => {
      await crearSetDePrueba();
      await expect(
        repo.actualizarSnapshotDeCircuitoJuego('nope')
      ).rejects.toThrow(/no encontrado/);
    });

    it('rechaza si el circuito padre no está BORRADOR', async () => {
      await crearSetDePrueba();
      await crearCircuitoDePrueba({ id: 'c1', estado: 'LISTO' });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1' });

      await expect(
        repo.actualizarSnapshotDeCircuitoJuego('cj1')
      ).rejects.toThrow(/no es editable/);
    });

    it('rechaza si no hay set activo para el juego', async () => {
      await crearCircuitoDePrueba({ id: 'c1' });
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1', juego_id: 'j1' });

      await expect(
        repo.actualizarSnapshotDeCircuitoJuego('cj1')
      ).rejects.toThrow(/Set activo/);
    });
  });

  describe('_eliminarSiNoReferenciado', () => {
    it('elimina el snapshot si no tiene referencias', async () => {
      await crearSetDePrueba();
      const s = await repo.crearSnapshotDesdeSet('set1', 'j1', {});

      const res = await repo._eliminarSiNoReferenciado(s.id);
      expect(res.eliminado).toBe(true);
      expect(await repo.obtenerSnapshot(s.id)).toBeUndefined();
    });

    it('rechaza si hay referencias desde circuito_juegos', async () => {
      await crearSetDePrueba();
      await crearCircuitoDePrueba({ id: 'c1' });
      const s = await repo.crearSnapshotDesdeSet('set1', 'j1', {});
      await crearCircuitoJuegoDePrueba({ id: 'cj1', circuito_id: 'c1', snapshot_id: s.id });

      await expect(
        repo._eliminarSiNoReferenciado(s.id)
      ).rejects.toThrow(/referencias/);

      expect(await repo.obtenerSnapshot(s.id)).toBeTruthy();
    });

    it('rechaza si el snapshot no existe', async () => {
      await expect(
        repo._eliminarSiNoReferenciado('nope')
      ).rejects.toThrow(/no encontrado/);
    });
  });
});
