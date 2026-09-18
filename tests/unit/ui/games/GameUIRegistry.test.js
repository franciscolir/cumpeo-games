import { describe, it, expect, beforeEach } from 'vitest';

import { GameUIRegistry } from '../../../../src/ui/games/GameUIRegistry.js';
import {
  ValidacionError,
  YaExisteError
} from '../../../../src/repositories/errors.js';

function gameUIDummy(overrides = {}) {
  return {
    codigo: 'DUMMY',
    renderizarAreaJuego: () => {},
    renderizarPanelConductor: () => {},
    ...overrides
  };
}

describe('GameUIRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new GameUIRegistry();
  });

  /* =============================================================
     Grupo 1 — registrar (7 tests)
     ============================================================= */

  describe('registrar', () => {
    it('registra un GameUI válido', () => {
      const ui = gameUIDummy();
      const resultado = registry.registrar(ui);
      expect(resultado).toBe(ui);
      expect(registry.cantidad()).toBe(1);
    });

    it('rechaza duplicado (mismo código)', () => {
      registry.registrar(gameUIDummy());
      expect(() => registry.registrar(gameUIDummy())).toThrow(YaExisteError);
    });

    it('rechaza si falta código', () => {
      const ui = gameUIDummy({ codigo: undefined });
      expect(() => registry.registrar(ui)).toThrow(ValidacionError);
    });

    it('rechaza si código está vacío', () => {
      const ui = gameUIDummy({ codigo: '   ' });
      expect(() => registry.registrar(ui)).toThrow(ValidacionError);
    });

    it('rechaza si falta renderizarAreaJuego', () => {
      const ui = gameUIDummy({ renderizarAreaJuego: undefined });
      expect(() => registry.registrar(ui)).toThrow(ValidacionError);
    });

    it('rechaza si falta renderizarPanelConductor', () => {
      const ui = gameUIDummy({ renderizarPanelConductor: undefined });
      expect(() => registry.registrar(ui)).toThrow(ValidacionError);
    });

   it('acepta renderizarEstadoPublico (opcional)', () => {
      const ui = gameUIDummy({ renderizarEstadoPublico: () => {} });
      const resultado = registry.registrar(ui);
      expect(resultado.renderizarEstadoPublico).toBeTypeOf('function');
      expect(registry.cantidad()).toBe(1);
    });
  });

  /* =============================================================
     Grupo 2 — obtener / existe (3 tests)
     ============================================================= */

  describe('obtener', () => {
    it('devuelve el GameUI registrado', () => {
      const ui = gameUIDummy();
      registry.registrar(ui);
      expect(registry.obtener('DUMMY')).toBe(ui);
    });

    it('devuelve undefined si no existe', () => {
      expect(registry.obtener('NOEXISTE')).toBeUndefined();
    });
  });

  describe('existe', () => {
    it('devuelve true/false correctamente', () => {
      registry.registrar(gameUIDummy());
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

    it('devuelve copia defensiva', () => {
      registry.registrar(gameUIDummy());
      const lista = registry.listar();
      lista.push(gameUIDummy({ codigo: 'FALSO' }));
      expect(registry.cantidad()).toBe(1);
    });
  });

  describe('listarCodigos', () => {
    it('devuelve los códigos', () => {
      registry.registrar(gameUIDummy({ codigo: 'A' }));
      registry.registrar(gameUIDummy({ codigo: 'B' }));
      expect(registry.listarCodigos()).toEqual(['A', 'B']);
    });
  });

  /* =============================================================
     Grupo 4 — desregistrar / limpiar / cantidad (3 tests)
     ============================================================= */

  describe('desregistrar', () => {
    it('elimina y devuelve true', () => {
      registry.registrar(gameUIDummy());
      expect(registry.desregistrar('DUMMY')).toBe(true);
      expect(registry.cantidad()).toBe(0);
    });

    it('devuelve false si no existe', () => {
      expect(registry.desregistrar('NOEXISTE')).toBe(false);
    });
  });

  describe('limpiar', () => {
    it('vacía el registro', () => {
      registry.registrar(gameUIDummy({ codigo: 'A' }));
      registry.registrar(gameUIDummy({ codigo: 'B' }));
      registry.limpiar();
      expect(registry.cantidad()).toBe(0);
      expect(registry.listar()).toEqual([]);
    });
  });

  /* =============================================================
     Grupo 5 — cantidad (1 test)
     ============================================================= */

  describe('cantidad', () => {
    it('devuelve el número correcto', () => {
      expect(registry.cantidad()).toBe(0);
      registry.registrar(gameUIDummy({ codigo: 'A' }));
      expect(registry.cantidad()).toBe(1);
      registry.registrar(gameUIDummy({ codigo: 'B' }));
      expect(registry.cantidad()).toBe(2);
    });
  });
});
