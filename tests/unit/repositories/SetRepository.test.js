import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { SetRepository } from '../../../src/repositories/SetRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('SetRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new SetRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearSet', () => {
    it('crea un set con version=1 y activo=true', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'Cultura General' });
      expect(s.id).toBeTruthy();
      expect(s.version).toBe(1);
      expect(s.activo).toBe(true);
    });

    it('rechaza si falta juego_id', async () => {
      await expect(repo.crearSet({ nombre: 'X' })).rejects.toThrow(/juego_id/);
    });

    it('rechaza si falta nombre', async () => {
      await expect(repo.crearSet({ juego_id: 'j1', nombre: '' })).rejects.toThrow(/nombre/);
    });

    it('crearSet con es_predeterminado: true → true', async () => {
      const s = await repo.crearSet({
        juego_id: 'j1',
        nombre: 'Predeterminado',
        es_predeterminado: true
      });
      expect(s.es_predeterminado).toBe(true);
    });

    it('crearSet sin es_predeterminado → false', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'Normal' });
      expect(s.es_predeterminado).toBe(false);
    });
  });

  describe('actualizarSet', () => {
    it('incrementa version en cada modificación', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const up1 = await repo.actualizarSet(s.id, { nombre: 'A v2' });
      expect(up1.version).toBe(2);
      const up2 = await repo.actualizarSet(s.id, { descripcion: 'algo' });
      expect(up2.version).toBe(3);
    });

    it('rechaza si el set no existe', async () => {
      await expect(repo.actualizarSet('nope', { nombre: 'X' })).rejects.toThrow(/no encontrado/);
    });
  });

  describe('desactivarSet', () => {
    it('NO incrementa version', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const d = await repo.desactivarSet(s.id);
      expect(d.activo).toBe(false);
      expect(d.version).toBe(1);
    });
  });

  describe('listarSetsPorJuego / Activos', () => {
    it('filtra por juego', async () => {
      await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.crearSet({ juego_id: 'j1', nombre: 'B' });
      await repo.crearSet({ juego_id: 'j2', nombre: 'C' });
      const lista = await repo.listarSetsPorJuego('j1');
      expect(lista).toHaveLength(2);
    });

    it('listarSetsActivosPorJuego excluye inactivos', async () => {
      await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const b = await repo.crearSet({ juego_id: 'j1', nombre: 'B' });
      await repo.desactivarSet(b.id);
      const lista = await repo.listarSetsActivosPorJuego('j1');
      expect(lista).toHaveLength(1);
      expect(lista[0].nombre).toBe('A');
    });
  });

  describe('eliminarSet', () => {
    it('elimina el set y sus items', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.agregarItem(s.id, { texto: 'q1' });
      await repo.agregarItem(s.id, { texto: 'q2' });

      await repo.eliminarSet(s.id);

      expect(await repo.obtenerSet(s.id)).toBeUndefined();
      expect(await repo.listarItemsDeSet(s.id)).toHaveLength(0);
    });

    it('rechaza eliminar set con es_predeterminado: true', async () => {
      const s = await repo.crearSet({
        juego_id: 'j1',
        nombre: 'Pred',
        es_predeterminado: true
      });
      await expect(repo.eliminarSet(s.id)).rejects.toThrow(/predeterminado/);
      expect(await repo.obtenerSet(s.id)).toBeTruthy();
    });

    it('permite eliminar set con es_predeterminado: false', async () => {
      const s = await repo.crearSet({
        juego_id: 'j1',
        nombre: 'No pred',
        es_predeterminado: false
      });
      await repo.eliminarSet(s.id);
      expect(await repo.obtenerSet(s.id)).toBeUndefined();
    });

    it('pone source_set_id=NULL en snapshots huérfanos', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });

      await adapter.tx(['set_snapshots'], 'readwrite', (tx) => {
        tx.objectStore('set_snapshots').add({
          id: 'snap1',
          source_set_id: s.id,
          source_set_name: 'A',
          source_version: 1,
          juego_id: 'j1',
          contenido: {},
          created_at: new Date().toISOString()
        });
      });

      await repo.eliminarSet(s.id);

      const snap = await adapter.tx(['set_snapshots'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('set_snapshots').get('snap1');
        req.onsuccess = () => resolver(req.result);
      });
      expect(snap).toBeTruthy();
      expect(snap.source_set_id).toBeNull();
      expect(snap.source_set_name).toBe('A');
    });
  });

  describe('agregarItem', () => {
    it('agrega item al final con orden=1', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const it = await repo.agregarItem(s.id, { texto: 'q1' });
      expect(it.orden).toBe(1);
    });

    it('agrega item al final con orden=max+1', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.agregarItem(s.id, { texto: 'q1' });
      await repo.agregarItem(s.id, { texto: 'q2' });
      const it3 = await repo.agregarItem(s.id, { texto: 'q3' });
      expect(it3.orden).toBe(3);
    });

    it('inserta en posición específica y desplaza los demás', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.agregarItem(s.id, { texto: 'q1' });
      await repo.agregarItem(s.id, { texto: 'q2' });
      const it = await repo.agregarItem(s.id, { texto: 'nuevo' }, { posicion: 1 });

      const items = await repo.listarItemsDeSet(s.id);
      expect(items.map((i) => i.contenido.texto)).toEqual(['nuevo', 'q1', 'q2']);
      expect(items.map((i) => i.orden)).toEqual([1, 2, 3]);
      expect(it.orden).toBe(1);
    });

    it('rechaza posición inválida', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await expect(
        repo.agregarItem(s.id, { texto: 'x' }, { posicion: 5 })
      ).rejects.toBeTruthy();
    });

    it('incrementa version del set', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.agregarItem(s.id, { texto: 'x' });
      const recargado = await repo.obtenerSet(s.id);
      expect(recargado.version).toBe(2);
    });
  });

  describe('actualizarItem', () => {
    it('actualiza contenido e incrementa version del set', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const it = await repo.agregarItem(s.id, { texto: 'viejo' });

      const up = await repo.actualizarItem(it.id, { texto: 'nuevo' });
      expect(up.contenido.texto).toBe('nuevo');

      const recargado = await repo.obtenerSet(s.id);
      expect(recargado.version).toBe(3);
    });

    it('rechaza si el item no existe', async () => {
      await expect(repo.actualizarItem('nope', { texto: 'x' })).rejects.toThrow(/no encontrado/);
    });
  });

  describe('eliminarItem', () => {
    it('elimina y renumera los siguientes', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await repo.agregarItem(s.id, { texto: 'a' });
      const b = await repo.agregarItem(s.id, { texto: 'b' });
      await repo.agregarItem(s.id, { texto: 'c' });

      await repo.eliminarItem(b.id);

      const items = await repo.listarItemsDeSet(s.id);
      expect(items.map((i) => i.contenido.texto)).toEqual(['a', 'c']);
      expect(items.map((i) => i.orden)).toEqual([1, 2]);
    });

    it('incrementa version del set', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const a = await repo.agregarItem(s.id, { texto: 'a' });
      await repo.eliminarItem(a.id);
      const recargado = await repo.obtenerSet(s.id);
      expect(recargado.version).toBe(3);
    });
  });

  describe('reordenarItems', () => {
    it('renumera 1..N', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const a = await repo.agregarItem(s.id, { texto: 'a' });
      const b = await repo.agregarItem(s.id, { texto: 'b' });
      const c = await repo.agregarItem(s.id, { texto: 'c' });

      await repo.reordenarItems(s.id, [
        { id: c.id, orden: 1 },
        { id: a.id, orden: 2 },
        { id: b.id, orden: 3 }
      ]);

      const items = await repo.listarItemsDeSet(s.id);
      expect(items.map((i) => i.contenido.texto)).toEqual(['c', 'a', 'b']);
      expect(items.map((i) => i.orden)).toEqual([1, 2, 3]);
    });

    it('rechaza si la lista no es permutación completa', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const a = await repo.agregarItem(s.id, { texto: 'a' });
      await repo.agregarItem(s.id, { texto: 'b' });

      await expect(
        repo.reordenarItems(s.id, [{ id: a.id, orden: 1 }])
      ).rejects.toBeTruthy();
    });

    it('incrementa version del set', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      const a = await repo.agregarItem(s.id, { texto: 'a' });
      const b = await repo.agregarItem(s.id, { texto: 'b' });
      const vAntes = (await repo.obtenerSet(s.id)).version;

      await repo.reordenarItems(s.id, [
        { id: b.id, orden: 1 },
        { id: a.id, orden: 2 }
      ]);

      const vDespues = (await repo.obtenerSet(s.id)).version;
      expect(vDespues).toBe(vAntes + 1);
    });
  });

  describe('submodo', () => {
    it('crearSet sin submodo → submodo = null', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      expect(s.submodo).toBeNull();
    });

    it('crearSet con submodo GESTOS → persiste', async () => {
      const s = await repo.crearSet({
        juego_id: 'j-pic',
        nombre: 'Gestos',
        submodo: 'GESTOS'
      });
      expect(s.submodo).toBe('GESTOS');

      const recargado = await repo.obtenerSet(s.id);
      expect(recargado.submodo).toBe('GESTOS');
    });

    it('crearSetCompleto con submodo → persiste (modo IndexedDB)', async () => {
      const s = await repo.crearSetCompleto({
        juego_id: 'j-pic',
        nombre: 'Palabras',
        items: [{ contenido: { palabra: 'gato' } }],
        actionId: 'act-1',
        submodo: 'PALABRAS'
      });
      expect(s.submodo).toBe('PALABRAS');
    });

    it('actualizarSet con submodo → persiste', async () => {
      const s = await repo.crearSet({ juego_id: 'j-pic', nombre: 'Dibujo' });
      expect(s.submodo).toBeNull();

      const up = await repo.actualizarSet(s.id, { submodo: 'DIBUJO' });
      expect(up.submodo).toBe('DIBUJO');

      const recargado = await repo.obtenerSet(s.id);
      expect(recargado.submodo).toBe('DIBUJO');
    });

    it('actualizarSet rechaza submodo no-string (excepto null)', async () => {
      const s = await repo.crearSet({ juego_id: 'j1', nombre: 'A' });
      await expect(repo.actualizarSet(s.id, { submodo: 123 })).rejects.toThrow(/string o null/);
      await expect(repo.actualizarSet(s.id, { submodo: {} })).rejects.toThrow(/string o null/);
      await expect(repo.actualizarSet(s.id, { submodo: null })).resolves.toBeTruthy();
    });

    it('listar sets devuelve submodo', async () => {
      await repo.crearSet({ juego_id: 'j-pic', nombre: 'Palabras', submodo: 'PALABRAS' });
      await repo.crearSet({ juego_id: 'j-pic', nombre: 'Gestos', submodo: 'GESTOS' });
      await repo.crearSet({ juego_id: 'j-pic', nombre: 'Normal' });

      const lista = await repo.listarSetsPorJuego('j-pic');
      expect(lista).toHaveLength(3);
      const porNombre = Object.fromEntries(lista.map((s) => [s.nombre, s.submodo]));
      expect(porNombre['Palabras']).toBe('PALABRAS');
      expect(porNombre['Gestos']).toBe('GESTOS');
      expect(porNombre['Normal']).toBeNull();
    });
  });
});
