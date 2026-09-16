import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { EquipoRepository } from '../../../src/repositories/EquipoRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('EquipoRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new EquipoRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearEquipoGuardado', () => {
    it('crea un equipo guardado válido', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'Los Rojos',
        color: '#E53E3E'
      });

      expect(e.id).toBeTruthy();
      expect(e.nombre).toBe('Los Rojos');
      expect(e.color).toBe('#E53E3E');
      expect(e.created_at).toBeTruthy();
      expect(e.updated_at).toBeTruthy();
    });

    it('rechaza nombre vacío', async () => {
      await expect(
        repo.crearEquipoGuardado({
          nombre: '',
          color: '#E53E3E'
        })
      ).rejects.toThrow(/nombre/);
    });

    it('rechaza nombre ausente', async () => {
      await expect(
        repo.crearEquipoGuardado({
          color: '#E53E3E'
        })
      ).rejects.toThrow(/nombre/);
    });

    it('rechaza color sin formato hex', async () => {
      await expect(
        repo.crearEquipoGuardado({
          nombre: 'X',
          color: 'rojo'
        })
      ).rejects.toThrow(/color/);
    });

    it('rechaza color con hex corto', async () => {
      await expect(
        repo.crearEquipoGuardado({
          nombre: 'X',
          color: '#FFF'
        })
      ).rejects.toThrow(/color/);
    });

    it('rechaza color con caracteres no hexadecimales', async () => {
      await expect(
        repo.crearEquipoGuardado({
          nombre: 'X',
          color: '#GGGGGG'
        })
      ).rejects.toThrow(/color/);
    });

    it('acepta letras hexadecimales en mayúscula y minúscula', async () => {
      const a = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#aBcD01'
      });

      const b = await repo.crearEquipoGuardado({
        nombre: 'B',
        color: '#ABCDEF'
      });

      expect(a.color).toBe('#aBcD01');
      expect(b.color).toBe('#ABCDEF');
    });
  });

  describe('obtenerEquipoGuardado', () => {
    it('obtiene un equipo existente', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'Los Rojos',
        color: '#E53E3E'
      });

      const encontrado = await repo.obtenerEquipoGuardado(e.id);

      expect(encontrado).toEqual(e);
    });

    it('devuelve undefined si no existe', async () => {
      const encontrado = await repo.obtenerEquipoGuardado('no-existe');

      expect(encontrado).toBeUndefined();
    });
  });

  describe('actualizarEquipoGuardado', () => {
    it('actualiza nombre y color', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      const up = await repo.actualizarEquipoGuardado(
        e.id,
        {
          nombre: 'B',
          color: '#FFFFFF'
        }
      );

      expect(up.nombre).toBe('B');
      expect(up.color).toBe('#FFFFFF');
      expect(up.id).toBe(e.id);
      expect(up.created_at).toBe(e.created_at);
    });

    it('actualiza solamente el nombre', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      const up = await repo.actualizarEquipoGuardado(
        e.id,
        {
          nombre: 'B'
        }
      );

      expect(up.nombre).toBe('B');
      expect(up.color).toBe('#000000');
    });

    it('actualiza solamente el color', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      const up = await repo.actualizarEquipoGuardado(
        e.id,
        {
          color: '#FFFFFF'
        }
      );

      expect(up.nombre).toBe('A');
      expect(up.color).toBe('#FFFFFF');
    });

    it('rechaza actualización si no existe', async () => {
      await expect(
        repo.actualizarEquipoGuardado(
          'nope',
          { nombre: 'X' }
        )
      ).rejects.toThrow(/no encontrado/i);
    });

    it('rechaza nombre vacío al actualizar', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      await expect(
        repo.actualizarEquipoGuardado(
          e.id,
          { nombre: '' }
        )
      ).rejects.toThrow(/nombre/);
    });

    it('rechaza nombre ausente explícitamente como valor inválido', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      await expect(
        repo.actualizarEquipoGuardado(
          e.id,
          { nombre: null }
        )
      ).rejects.toThrow(/nombre/);
    });

    it('rechaza color inválido al actualizar', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      await expect(
        repo.actualizarEquipoGuardado(
          e.id,
          { color: 'rojo' }
        )
      ).rejects.toThrow(/color/);
    });

    it('rechaza color hex corto al actualizar', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      await expect(
        repo.actualizarEquipoGuardado(
          e.id,
          { color: '#FFF' }
        )
      ).rejects.toThrow(/color/);
    });

    it('permite cambios vacíos sin modificar los datos', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'A',
        color: '#000000'
      });

      const up = await repo.actualizarEquipoGuardado(
        e.id,
        {}
      );

      expect(up.id).toBe(e.id);
      expect(up.nombre).toBe('A');
      expect(up.color).toBe('#000000');
    });
  });

  describe('eliminarEquipoGuardado', () => {
    it('elimina un equipo guardado', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'X',
        color: '#000000'
      });

      await repo.eliminarEquipoGuardado(e.id);

      expect(
        await repo.obtenerEquipoGuardado(e.id)
      ).toBeUndefined();
    });

    it('rechaza eliminar un equipo inexistente', async () => {
      await expect(
        repo.eliminarEquipoGuardado('no-existe')
      ).rejects.toThrow(/no encontrado/i);
    });
  });

  describe('listarEquiposGuardados', () => {
    it('lista todos los equipos ordenados por nombre', async () => {
      await repo.crearEquipoGuardado({
        nombre: 'Zeta',
        color: '#000000'
      });

      await repo.crearEquipoGuardado({
        nombre: 'Alfa',
        color: '#FFFFFF'
      });

      await repo.crearEquipoGuardado({
        nombre: 'Beta',
        color: '#FF0000'
      });

      const lista = await repo.listarEquiposGuardados();

      expect(
        lista.map((e) => e.nombre)
      ).toEqual([
        'Alfa',
        'Beta',
        'Zeta'
      ]);
    });

    it('devuelve lista vacía cuando no existen equipos', async () => {
      const lista = await repo.listarEquiposGuardados();

      expect(lista).toEqual([]);
    });

    it('mantiene todos los campos de los equipos listados', async () => {
      const e = await repo.crearEquipoGuardado({
        nombre: 'Equipo',
        color: '#123456'
      });

      const lista = await repo.listarEquiposGuardados();

      expect(lista).toHaveLength(1);
      expect(lista[0]).toEqual(e);
    });
  });
});
