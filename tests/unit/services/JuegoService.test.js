import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { JuegoService } from '../../../src/services/JuegoService.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('JuegoService', () => {
  let adapter;
  let service;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    service = new JuegoService(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearJuego', () => {
    it('crea un juego con código nuevo y activo=true', async () => {
      const juego = await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      expect(juego.id).toBeDefined();
      expect(typeof juego.id).toBe('string');
      expect(juego.id.length).toBeGreaterThan(20);
      expect(juego.codigo).toBe('TRIVIA');
      expect(juego.nombre).toBe('Trivia');
      expect(juego.requiere_set).toBe(true);
      expect(juego.activo).toBe(true);
    });

    it('rechaza si el código ya existe', async () => {
      await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      await expect(
        service.crearJuego({
          codigo: 'TRIVIA',
          nombre: 'Trivia Duplicada',
          requiere_set: false
        })
      ).rejects.toThrow();
    });
  });

  describe('obtenerJuego', () => {
    it('obtiene un juego por ID', async () => {
      const creado = await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      const obtenido = await service.obtenerJuego(creado.id);
      expect(obtenido.id).toBe(creado.id);
      expect(obtenido.codigo).toBe('TRIVIA');
    });
  });

  describe('obtenerJuegoPorCodigo', () => {
    it('obtiene un juego por código', async () => {
      await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      const obtenido = await service.obtenerJuegoPorCodigo('TRIVIA');
      expect(obtenido).not.toBeNull();
      expect(obtenido.codigo).toBe('TRIVIA');
    });

    it('retorna null si el código no existe', async () => {
      const obtenido = await service.obtenerJuegoPorCodigo('NO_EXISTE');
      expect(obtenido).toBeNull();
    });
  });

  describe('listarJuegos', () => {
    it('lista solo activos por defecto', async () => {
      await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });
      await service.crearJuego({
        codigo: 'Pictionary',
        nombre: 'Pictionary',
        requiere_set: false
      });

      const lista = await service.listarJuegos();
      expect(lista.length).toBe(2);
      expect(lista.every((j) => j.activo === true)).toBe(true);
    });

    it('incluye inactivos cuando se pide', async () => {
      const c1 = await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });
      const c2 = await service.crearJuego({
        codigo: 'Pictionary',
        nombre: 'Pictionary',
        requiere_set: false
      });
      await service.desactivarJuego(c2.id);

      const todos = await service.listarJuegos({ incluirInactivos: true });
      expect(todos.length).toBe(2);

      const soloActivos = await service.listarJuegos();
      expect(soloActivos.length).toBe(1);
      expect(soloActivos[0].codigo).toBe('TRIVIA');
    });
  });

  describe('actualizarJuego', () => {
    it('cambia el nombre', async () => {
      const c = await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      const actualizado = await service.actualizarJuego(c.id, {
        nombre: 'Trivia Plus'
      });
      expect(actualizado.nombre).toBe('Trivia Plus');
      expect(actualizado.codigo).toBe('TRIVIA');
    });
  });

  describe('desactivarJuego', () => {
    it('pone activo=false', async () => {
      const c = await service.crearJuego({
        codigo: 'TRIVIA',
        nombre: 'Trivia',
        requiere_set: true
      });

      const desactivado = await service.desactivarJuego(c.id);
      expect(desactivado.activo).toBe(false);

      const obtenido = await service.obtenerJuego(c.id);
      expect(obtenido.activo).toBe(false);
    });
  });
});
