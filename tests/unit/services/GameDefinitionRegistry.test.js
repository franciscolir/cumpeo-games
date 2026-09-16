import { describe, it, expect, beforeEach } from 'vitest';

import { GameDefinitionRegistry } from '../../../src/services/GameDefinitionRegistry.js';
import {
  ValidacionError,
  NoEncontradoError,
  YaExisteError,
  OperacionInvalidaError
} from '../../../src/repositories/errors.js';

function defDummy(overrides = {}) {
  return {
    codigo: 'DUMMY',
    nombre: 'Juego Dummy',
    requiere_set: false,
    validarConfiguracion: () => true,
    validarContenidoSet: () => true,
    validarEstadoJuego: () => true,
    calcularResultado: () => ({ puntos_equipo_1: 0, puntos_equipo_2: 0 }),
    aplicarTimeUp: () => null,
    ...overrides
  };
}

describe('GameDefinitionRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new GameDefinitionRegistry();
  });

  /* =============================================================
     Grupo 1 — registrar (5 tests)
     ============================================================= */

  describe('registrar', () => {
    it('registra una definición válida', () => {
      const def = defDummy();
      const resultado = registry.registrar(def);
      expect(resultado).toBe(def);
      expect(registry.cantidad()).toBe(1);
    });

    it('rechaza si falta código', () => {
      const def = defDummy({ codigo: undefined });
      expect(() => registry.registrar(def)).toThrow(ValidacionError);
    });

    it('rechaza si falta nombre', () => {
      const def = defDummy({ nombre: undefined });
      expect(() => registry.registrar(def)).toThrow(ValidacionError);
    });

    it('rechaza si falta un método del contrato', () => {
      const def = defDummy({ calcularResultado: undefined });
      expect(() => registry.registrar(def)).toThrow(ValidacionError);
    });

    it('rechaza duplicado (mismo código)', () => {
      registry.registrar(defDummy());
      expect(() => registry.registrar(defDummy())).toThrow(YaExisteError);
    });
  });

  /* =============================================================
     Grupo 2 — obtener / existe (3 tests)
     ============================================================= */

  describe('obtener', () => {
    it('devuelve la definición registrada', () => {
      const def = defDummy();
      registry.registrar(def);
      expect(registry.obtener('DUMMY')).toBe(def);
    });

    it('devuelve undefined si no existe', () => {
      expect(registry.obtener('NOEXISTE')).toBeUndefined();
    });
  });

  describe('existe', () => {
    it('devuelve true/false correctamente', () => {
      registry.registrar(defDummy());
      expect(registry.existe('DUMMY')).toBe(true);
      expect(registry.existe('OTRO')).toBe(false);
    });
  });

  /* =============================================================
     Grupo 3 — listar / listarCodigos (3 tests)
     ============================================================= */

  describe('listar', () => {
    it('devuelve array vacío si no hay registros', () => {
      expect(registry.listar()).toEqual([]);
    });

    it('devuelve todas las definiciones', () => {
      registry.registrar(defDummy({ codigo: 'A' }));
      registry.registrar(defDummy({ codigo: 'B' }));
      const lista = registry.listar();
      expect(lista.length).toBe(2);
    });

    it('devuelve copia defensiva', () => {
      registry.registrar(defDummy());
      const lista = registry.listar();
      lista.push(defDummy({ codigo: 'FALSO' }));
      expect(registry.cantidad()).toBe(1);
    });
  });

  /* =============================================================
     Grupo 4 — desregistrar / limpiar / cantidad (3 tests)
     ============================================================= */

  describe('desregistrar', () => {
    it('elimina y devuelve true', () => {
      registry.registrar(defDummy());
      expect(registry.desregistrar('DUMMY')).toBe(true);
      expect(registry.cantidad()).toBe(0);
    });

    it('devuelve false si no existe', () => {
      expect(registry.desregistrar('NOEXISTE')).toBe(false);
    });
  });

  describe('limpiar', () => {
    it('vacía el registro', () => {
      registry.registrar(defDummy({ codigo: 'A' }));
      registry.registrar(defDummy({ codigo: 'B' }));
      registry.limpiar();
      expect(registry.cantidad()).toBe(0);
      expect(registry.listar()).toEqual([]);
    });
  });

  /* =============================================================
     Grupo 5 — validarRequerimientos (4 tests)
     ============================================================= */

  describe('validarRequerimientos', () => {
    it('con requiere_set: false → siempre OK', () => {
      registry.registrar(defDummy({ requiere_set: false }));
      expect(registry.validarRequerimientos('DUMMY', {})).toBe(true);
    });

    it('con requiere_set: true y contexto con snapshot_id → OK', () => {
      registry.registrar(defDummy({ requiere_set: true }));
      expect(registry.validarRequerimientos('DUMMY', { snapshot_id: 's1' })).toBe(true);
    });

    it('con requiere_set: true y contexto sin snapshot_id → lanza OperacionInvalidaError', () => {
      registry.registrar(defDummy({ requiere_set: true }));
      expect(() => registry.validarRequerimientos('DUMMY', {})).toThrow(OperacionInvalidaError);
    });

    it('con código inexistente → lanza NoEncontradoError', () => {
      expect(() => registry.validarRequerimientos('NOEXISTE', {})).toThrow(NoEncontradoError);
    });
  });
});
