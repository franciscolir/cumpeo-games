import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { JuegoRepository } from '../../../src/repositories/JuegoRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('JuegoRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new JuegoRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearJuego', () => {
    it('crea un juego con valores por defecto', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      expect(j.id).toBeTruthy();
      expect(j.codigo).toBe('TRIVIA');
      expect(j.activo).toBe(true);
      expect(j.requiere_set).toBe(false);
      expect(j.created_at).toMatch(/Z$/);
    });

    it('falla si el código está vacío', async () => {
      await expect(repo.crearJuego({ codigo: '', nombre: 'X' })).rejects.toThrow(/codigo/);
    });

    it('falla si el nombre está vacío', async () => {
      await expect(repo.crearJuego({ codigo: 'X', nombre: '   ' })).rejects.toThrow(/nombre/);
    });

    it('falla si el código ya existe', async () => {
      await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await expect(repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Otra' })).rejects.toThrow(/ya existe/);
    });
  });

  describe('obtenerJuegoPorCodigo', () => {
    it('devuelve el juego por código', async () => {
      const creado = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      const encontrado = await repo.obtenerJuegoPorCodigo('TRIVIA');
      expect(encontrado.id).toBe(creado.id);
    });

    it('devuelve null si no existe', async () => {
      expect(await repo.obtenerJuegoPorCodigo('NO_EXISTE')).toBeNull();
    });
  });

  describe('actualizarJuego', () => {
    it('actualiza nombre y updated_at', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await new Promise((r) => setTimeout(r, 5));
      const up = await repo.actualizarJuego(j.id, { nombre: 'Trivia Cómic' });
      expect(up.nombre).toBe('Trivia Cómic');
      expect(up.updated_at).not.toBe(j.updated_at);
    });

    it('rechaza cambiar el código', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await expect(repo.actualizarJuego(j.id, { codigo: 'OTRO' })).rejects.toThrow(/inmutable/);
    });

    it('rechaza cambiar requiere_set', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await expect(repo.actualizarJuego(j.id, { requiere_set: true })).rejects.toThrow(/inmutable/);
    });

    it('rechaza si el juego no existe', async () => {
      await expect(repo.actualizarJuego('nope', { nombre: 'X' })).rejects.toThrow(/no encontrado/);
    });
  });

  describe('desactivarJuego', () => {
    it('marca activo=false', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      const d = await repo.desactivarJuego(j.id);
      expect(d.activo).toBe(false);
    });
  });

  describe('listarJuegos', () => {
    it('por defecto devuelve solo activos', async () => {
      await repo.crearJuego({ codigo: 'A', nombre: 'A' });
      const b = await repo.crearJuego({ codigo: 'B', nombre: 'B' });
      await repo.desactivarJuego(b.id);
      const lista = await repo.listarJuegos();
      expect(lista).toHaveLength(1);
      expect(lista[0].codigo).toBe('A');
    });

    it('incluirInactivos=true devuelve todos', async () => {
      await repo.crearJuego({ codigo: 'A', nombre: 'A' });
      const b = await repo.crearJuego({ codigo: 'B', nombre: 'B' });
      await repo.desactivarJuego(b.id);
      const lista = await repo.listarJuegos({ incluirInactivos: true });
      expect(lista).toHaveLength(2);
    });

    it('ordena por orden_catalogo y luego por nombre', async () => {
      await repo.crearJuego({ codigo: 'A', nombre: 'Zeta', orden_catalogo: 2 });
      await repo.crearJuego({ codigo: 'B', nombre: 'Alfa', orden_catalogo: 1 });
      await repo.crearJuego({ codigo: 'C', nombre: 'Beta' });
      const lista = await repo.listarJuegos();
      expect(lista.map((j) => j.nombre)).toEqual(['Alfa', 'Zeta', 'Beta']);
    });
  });

  describe('reordenarJuegos', () => {
    it('renumera los orden_catalogo 1..N', async () => {
      const a = await repo.crearJuego({ codigo: 'A', nombre: 'A' });
      const b = await repo.crearJuego({ codigo: 'B', nombre: 'B' });
      const c = await repo.crearJuego({ codigo: 'C', nombre: 'C' });

      await repo.reordenarJuegos([
        { id: c.id, orden: 1 },
        { id: a.id, orden: 2 },
        { id: b.id, orden: 3 }
      ]);

      const lista = await repo.listarJuegos();
      expect(lista.map((j) => j.codigo)).toEqual(['C', 'A', 'B']);
      expect(lista.map((j) => j.orden_catalogo)).toEqual([1, 2, 3]);
    });

    it('rechaza si la lista no es permutación completa', async () => {
      const a = await repo.crearJuego({ codigo: 'A', nombre: 'A' });
      await repo.crearJuego({ codigo: 'B', nombre: 'B' });

      await expect(
        repo.reordenarJuegos([{ id: a.id, orden: 1 }])
      ).rejects.toBeTruthy();
    });

    it('rechaza si hay ids duplicados', async () => {
      const a = await repo.crearJuego({ codigo: 'A', nombre: 'A' });
      await repo.crearJuego({ codigo: 'B', nombre: 'B' });

      await expect(
        repo.reordenarJuegos([
          { id: a.id, orden: 1 },
          { id: a.id, orden: 2 }
        ])
      ).rejects.toBeTruthy();
    });
  });

  describe('configuracion', () => {
    it('crearJuego sin configuracion → configuracion = {}', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      expect(j.configuracion).toEqual({});
    });

    it('crearJuego con configuracion → persiste el JSON', async () => {
      const j = await repo.crearJuego({
        codigo: 'PIC',
        nombre: 'Pictionary',
        configuracion: { bancos: [{ nombre: 'Condiciones', items: ['Bajo la mesa'] }] }
      });
      expect(j.configuracion.bancos).toHaveLength(1);
      expect(j.configuracion.bancos[0].nombre).toBe('Condiciones');
    });

    it('obtenerConfiguracion devuelve {} si no tiene', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      const cfg = await repo.obtenerConfiguracion(j.id);
      expect(cfg).toEqual({});
    });

    it('obtenerConfiguracion devuelve el JSON si tiene', async () => {
      const j = await repo.crearJuego({
        codigo: 'HE',
        nombre: 'Historia',
        configuracion: { colores: [{ color: 'AZUL', pregunta: 'Nombre' }] }
      });
      const cfg = await repo.obtenerConfiguracion(j.id);
      expect(cfg.colores[0].color).toBe('AZUL');
    });

    it('obtenerConfiguracion devuelve null si el juego no existe', async () => {
      const cfg = await repo.obtenerConfiguracion('nope');
      expect(cfg).toBeNull();
    });

    it('actualizarConfiguracion cambia el valor', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      const up = await repo.actualizarConfiguracion(j.id, { tiempo: 30 });
      expect(up.configuracion).toEqual({ tiempo: 30 });

      const cfg = await repo.obtenerConfiguracion(j.id);
      expect(cfg).toEqual({ tiempo: 30 });
    });

    it('actualizarConfiguracion lanza si no es objeto', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await expect(repo.actualizarConfiguracion(j.id, 'texto')).rejects.toThrow(/objeto/);
      await expect(repo.actualizarConfiguracion(j.id, [1, 2])).rejects.toThrow(/objeto/);
      await expect(repo.actualizarConfiguracion(j.id, null)).rejects.toThrow(/objeto/);
    });

    it('actualizarConfiguracion lanza si el juego no existe', async () => {
      await expect(repo.actualizarConfiguracion('nope', {})).rejects.toThrow(/no encontrado/);
    });

    it('actualizarJuego acepta configuracion en la whitelist', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      const up = await repo.actualizarJuego(j.id, { configuracion: { a: 1 } });
      expect(up.configuracion).toEqual({ a: 1 });
    });

    it('actualizarJuego rechaza configuracion que no sea objeto', async () => {
      const j = await repo.crearJuego({ codigo: 'TRIVIA', nombre: 'Trivia' });
      await expect(
        repo.actualizarJuego(j.id, { configuracion: 'texto' })
      ).rejects.toThrow(/objeto/);
      await expect(
        repo.actualizarJuego(j.id, { configuracion: [1] })
      ).rejects.toThrow(/objeto/);
    });
  });
});
