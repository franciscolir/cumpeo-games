import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { CircuitoService } from '../../../src/services/CircuitoService.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function payloadCircuitoValido(overrides = {}) {
  return {
    nombre: 'Noche de Juegos',
    juegos: [
      { juego_id: 'j1' },
      { juego_id: 'j2' }
    ],
    equipos: [
      { posicion: 1, nombre: 'Los Rojos', color: '#E53E3E' },
      { posicion: 2, nombre: 'Los Amarillos', color: '#F6E05E' }
    ],
    ...overrides
  };
}

describe('CircuitoService', () => {
  let adapter;
  let service;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    service = new CircuitoService(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('obtenerCircuito', () => {
    it('delega al repo', async () => {
      const c1 = await service.crearCircuito(payloadCircuitoValido());
      const c2 = await service.obtenerCircuito(c1.id);
      expect(c2.id).toBe(c1.id);
      expect(c2.nombre).toBe('Noche de Juegos');
    });
  });

  describe('obtenerCircuitoCompleto', () => {
    it('delega al repo con shape correcto', async () => {
      const c = await service.crearCircuito(payloadCircuitoValido());
      const completo = await service.obtenerCircuitoCompleto(c.id);
      expect(completo.circuito.id).toBe(c.id);
      expect(completo.juegos.length).toBe(2);
      expect(completo.equipos.length).toBe(2);
    });
  });

  describe('listarCircuitos', () => {
    it('delega al repo', async () => {
      await service.crearCircuito(payloadCircuitoValido({ nombre: 'C1' }));
      await service.crearCircuito(payloadCircuitoValido({ nombre: 'C2' }));
      const lista = await service.listarCircuitos();
      expect(lista.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('listarPlantillas', () => {
    it('delega al repo', async () => {
      await service.crearCircuito(payloadCircuitoValido({ nombre: 'Normal' }));
      const plantilla = await service.crearCircuito(payloadCircuitoValido({ nombre: 'Plantilla' }));
      await service.actualizarCircuito(plantilla.id, plantilla.version, {
        ...payloadCircuitoValido({ nombre: 'Plantilla' }),
        estado: 'LISTO',
        es_plantilla: true
      });
      const plantillas = await service.listarPlantillas();
      expect(plantillas.length).toBe(1);
      expect(plantillas[0].nombre).toBe('Plantilla');
    });
  });

  describe('crearCircuito', () => {
    it('delega al repo', async () => {
      const c = await service.crearCircuito(payloadCircuitoValido());
      expect(c.estado).toBe('BORRADOR');
      expect(c.version).toBe(1);
      expect(c.es_plantilla).toBe(false);
    });
  });

  describe('actualizarCircuito', () => {
    it('delega al repo con version check', async () => {
      const c = await service.crearCircuito(payloadCircuitoValido());
      const actualizado = await service.actualizarCircuito(c.id, c.version, {
        ...payloadCircuitoValido(),
        nombre: 'Nombre Actualizado'
      });
      expect(actualizado.nombre).toBe('Nombre Actualizado');
      expect(actualizado.version).toBe(c.version + 1);
    });
  });

  describe('eliminarCircuito', () => {
    it('delega al repo', async () => {
      const c = await service.crearCircuito(payloadCircuitoValido());
      await service.eliminarCircuito(c.id);
      const resultado = await service.obtenerCircuito(c.id);
      expect(resultado).toBeFalsy();
    });
  });

  describe('flujo crear → actualizar → eliminar', () => {
    it('funciona end-to-end', async () => {
      const c = await service.crearCircuito(payloadCircuitoValido({ nombre: 'Original' }));
      expect(c.nombre).toBe('Original');

      const actualizado = await service.actualizarCircuito(c.id, c.version, {
        ...payloadCircuitoValido(),
        nombre: 'Modificado'
      });
      expect(actualizado.nombre).toBe('Modificado');

      await service.eliminarCircuito(c.id);
      const eliminado = await service.obtenerCircuito(c.id);
      expect(eliminado).toBeFalsy();
    });
  });
});
