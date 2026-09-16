import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { SetService } from '../../../src/services/SetService.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function payloadSetValido(overrides = {}) {
  return {
    juego_id: 'j1',
    nombre: 'Cultura General',
    descripcion: 'Preguntas varias',
    ...overrides
  };
}

describe('SetService', () => {
  let adapter;
  let service;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    service = new SetService(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  /* =============================================================
     Sets — 7 tests
     ============================================================= */

  describe('crearSet', () => {
    it('crea set con version=1 y activo=true', async () => {
      const set = await service.crearSet(payloadSetValido());
      expect(set.version).toBe(1);
      expect(set.activo).toBe(true);
      expect(set.nombre).toBe('Cultura General');
      expect(set.juego_id).toBe('j1');
    });
  });

  describe('obtenerSet', () => {
    it('obtiene set por ID', async () => {
      const creado = await service.crearSet(payloadSetValido());
      const obtenido = await service.obtenerSet(creado.id);
      expect(obtenido.id).toBe(creado.id);
      expect(obtenido.nombre).toBe('Cultura General');
    });
  });

  describe('listarSetsPorJuego', () => {
    it('lista solo sets del juego indicado', async () => {
      await service.crearSet(payloadSetValido({ nombre: 'Set 1' }));
      await service.crearSet(payloadSetValido({ nombre: 'Set 2' }));
      await service.crearSet(payloadSetValido({ juego_id: 'j2', nombre: 'Set otro' }));
      const lista = await service.listarSetsPorJuego('j1');
      expect(lista.length).toBe(2);
    });
  });

  describe('listarSetsActivosPorJuego', () => {
    it('excluye sets inactivos', async () => {
      const s1 = await service.crearSet(payloadSetValido({ nombre: 'Activo' }));
      await service.crearSet(payloadSetValido({ nombre: 'Otro' }));
      await service.desactivarSet(s1.id);
      const activos = await service.listarSetsActivosPorJuego('j1');
      expect(activos.length).toBe(1);
      expect(activos[0].nombre).toBe('Otro');
    });
  });

  describe('actualizarSet', () => {
    it('actualiza nombre e incrementa version', async () => {
      const set = await service.crearSet(payloadSetValido());
      const actualizado = await service.actualizarSet(set.id, { nombre: 'Nuevo Nombre' });
      expect(actualizado.nombre).toBe('Nuevo Nombre');
      expect(actualizado.version).toBe(set.version + 1);
    });
  });

  describe('desactivarSet', () => {
    it('desactiva sin cambiar version', async () => {
      const set = await service.crearSet(payloadSetValido());
      const desactivado = await service.desactivarSet(set.id);
      expect(desactivado.activo).toBe(false);
      expect(desactivado.version).toBe(set.version);
    });
  });

  describe('eliminarSet', () => {
    it('elimina set y sus items', async () => {
      const set = await service.crearSet(payloadSetValido());
      await service.agregarItem(set.id, { texto: 'Pregunta 1' });
      await service.agregarItem(set.id, { texto: 'Pregunta 2' });
      await service.eliminarSet(set.id);
      const resultado = await service.obtenerSet(set.id);
      expect(resultado).toBeFalsy();
    });
  });

  /* =============================================================
     Items — 7 tests
     ============================================================= */

  describe('obtenerItem', () => {
    it('obtiene item por ID', async () => {
      const set = await service.crearSet(payloadSetValido());
      const item = await service.agregarItem(set.id, { texto: '¿Capital de Francia?' });
      const obtenido = await service.obtenerItem(item.id);
      expect(obtenido.id).toBe(item.id);
      expect(obtenido.contenido.texto).toBe('¿Capital de Francia?');
    });
  });

  describe('listarItemsDeSet', () => {
    it('lista items ordenados por orden', async () => {
      const set = await service.crearSet(payloadSetValido());
      await service.agregarItem(set.id, { texto: 'Pregunta 1' });
      await service.agregarItem(set.id, { texto: 'Pregunta 2' });
      await service.agregarItem(set.id, { texto: 'Pregunta 3' });
      const items = await service.listarItemsDeSet(set.id);
      expect(items.length).toBe(3);
      expect(items[0].orden).toBe(1);
      expect(items[1].orden).toBe(2);
      expect(items[2].orden).toBe(3);
    });
  });

  describe('agregarItem', () => {
    it('agrega item al final e incrementa version del set', async () => {
      const set = await service.crearSet(payloadSetValido());
      const item = await service.agregarItem(set.id, { texto: 'Pregunta 1' });
      expect(item.orden).toBe(1);
      const setRefrescado = await service.obtenerSet(set.id);
      expect(setRefrescado.version).toBe(set.version + 1);
    });

    it('agrega item en posición específica y reordena', async () => {
      const set = await service.crearSet(payloadSetValido());
      await service.agregarItem(set.id, { texto: 'Primera' });
      await service.agregarItem(set.id, { texto: 'Segunda' });
      const insertada = await service.agregarItem(set.id, { texto: 'Insertada' }, { posicion: 1 });
      expect(insertada.orden).toBe(1);
      const items = await service.listarItemsDeSet(set.id);
      expect(items.length).toBe(3);
      expect(items[0].contenido.texto).toBe('Insertada');
      expect(items[1].contenido.texto).toBe('Primera');
      expect(items[2].contenido.texto).toBe('Segunda');
    });
  });

  describe('actualizarItem', () => {
    it('actualiza contenido e incrementa version del set', async () => {
      const set = await service.crearSet(payloadSetValido());
      const item = await service.agregarItem(set.id, { texto: 'Original' });
      const actualizado = await service.actualizarItem(item.id, { texto: 'Modificado' });
      expect(actualizado.contenido.texto).toBe('Modificado');
      const setRefrescado = await service.obtenerSet(set.id);
      expect(setRefrescado.version).toBe(set.version + 2);
    });
  });

  describe('eliminarItem', () => {
    it('elimina item y renumera los siguientes', async () => {
      const set = await service.crearSet(payloadSetValido());
      const i1 = await service.agregarItem(set.id, { texto: 'Primera' });
      const i2 = await service.agregarItem(set.id, { texto: 'Segunda' });
      await service.agregarItem(set.id, { texto: 'Tercera' });
      await service.eliminarItem(i2.id);
      const items = await service.listarItemsDeSet(set.id);
      expect(items.length).toBe(2);
      expect(items[0].id).toBe(i1.id);
      expect(items[0].orden).toBe(1);
      expect(items[1].orden).toBe(2);
    });
  });

  describe('reordenarItems', () => {
    it('reordena items según el array dado', async () => {
      const set = await service.crearSet(payloadSetValido());
      const i1 = await service.agregarItem(set.id, { texto: 'A' });
      const i2 = await service.agregarItem(set.id, { texto: 'B' });
      const i3 = await service.agregarItem(set.id, { texto: 'C' });
      await service.reordenarItems(set.id, [
        { id: i3.id, orden: 1 },
        { id: i1.id, orden: 2 },
        { id: i2.id, orden: 3 }
      ]);
      const items = await service.listarItemsDeSet(set.id);
      expect(items[0].id).toBe(i3.id);
      expect(items[0].orden).toBe(1);
      expect(items[1].id).toBe(i1.id);
      expect(items[1].orden).toBe(2);
      expect(items[2].id).toBe(i2.id);
      expect(items[2].orden).toBe(3);
    });
  });

  /* =============================================================
     Integración — 2 tests
     ============================================================= */

  describe('flujo crearSet → agregarItem × 3 → reordenarItems → eliminarItem', () => {
    it('mantiene consistencia', async () => {
      const set = await service.crearSet(payloadSetValido());
      const i1 = await service.agregarItem(set.id, { texto: 'P1' });
      const i2 = await service.agregarItem(set.id, { texto: 'P2' });
      const i3 = await service.agregarItem(set.id, { texto: 'P3' });

      await service.reordenarItems(set.id, [
        { id: i3.id, orden: 1 },
        { id: i1.id, orden: 2 },
        { id: i2.id, orden: 3 }
      ]);
      const itemsMedio = await service.listarItemsDeSet(set.id);
      expect(itemsMedio.length).toBe(3);
      expect(itemsMedio[0].id).toBe(i3.id);

      await service.eliminarItem(i3.id);
      const itemsFinal = await service.listarItemsDeSet(set.id);
      expect(itemsFinal.length).toBe(2);
      expect(itemsFinal[0].orden).toBe(1);
      expect(itemsFinal[1].orden).toBe(2);
    });
  });

  describe('flujo crearSet → desactivar → listarActivos → eliminar', () => {
    it('excluye inactivos y limpia correctamente', async () => {
      const set = await service.crearSet(payloadSetValido({ nombre: 'Test' }));
      await service.desactivarSet(set.id);
      const activos = await service.listarSetsActivosPorJuego('j1');
      expect(activos.length).toBe(0);
      await service.eliminarSet(set.id);
      const resultado = await service.obtenerSet(set.id);
      expect(resultado).toBeFalsy();
    });
  });
});
