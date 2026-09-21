import { describe, it, expect } from 'vitest';

import { QuePiensaElPublicoGameDefinition } from '../../../../src/games/que-piensa-el-publico/QuePiensaElPublicoGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

function configuracionValida(overrides = {}) {
  return {
    tiempo_por_pregunta_seg: 30,
    puntos_por_acierto: 10,
    rondas: 2,
    ...overrides
  };
}

function contenidoValido(overrides = {}) {
  return {
    items: [
      {
        pregunta: 'Pizza o empanadas?',
        opcion_a: 'Pizza',
        opcion_b: 'Empanadas'
      },
      {
        pregunta: 'Fernet o fernu?',
        opcion_a: 'Fernet',
        opcion_b: 'Fernu'
      }
    ],
    ...overrides
  };
}

function estadoValido(overrides = {}) {
  return {
    ronda_actual: 1,
    pregunta_actual_index: 0,
    fase: 'SELECCIONANDO_PREGUNTA',
    respuestas_publico: { a: 0, b: 0 },
    total_respuestas: 0,
    pronostico_equipo_1: null,
    pronostico_equipo_2: null,
    pronosticador_equipo_1: null,
    pronosticador_equipo_2: null,
    resultado_publico: null,
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    ...overrides
  };
}

describe('QuePiensaElPublicoGameDefinition', () => {
  /* =============================================================
     validarConfiguracion
     ============================================================= */

  describe('validarConfiguracion', () => {
    it('config valida -> true', () => {
      expect(QuePiensaElPublicoGameDefinition.validarConfiguracion(configuracionValida())).toBe(true);
    });

    it('falta tiempo_por_pregunta_seg -> error', () => {
      const config = configuracionValida({ tiempo_por_pregunta_seg: undefined });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('tiempo_por_pregunta_seg = 0 -> error', () => {
      const config = configuracionValida({ tiempo_por_pregunta_seg: 0 });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('puntos_por_acierto negativo -> error', () => {
      const config = configuracionValida({ puntos_por_acierto: -1 });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('puntos_por_acierto = 0 -> OK (sin puntos)', () => {
      expect(QuePiensaElPublicoGameDefinition.validarConfiguracion(configuracionValida({ puntos_por_acierto: 0 }))).toBe(true);
    });

    it('config null -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(null)).toThrow(ValidacionError);
    });

    it('rondas = 1 -> OK', () => {
      expect(QuePiensaElPublicoGameDefinition.validarConfiguracion(configuracionValida({ rondas: 1 }))).toBe(true);
    });

    it('rondas = 0 -> error', () => {
      const config = configuracionValida({ rondas: 0 });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('rondas negativo -> error', () => {
      const config = configuracionValida({ rondas: -1 });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('rondas no entero -> error', () => {
      const config = configuracionValida({ rondas: 1.5 });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('rondas undefined -> error', () => {
      const config = configuracionValida({ rondas: undefined });
      expect(() => QuePiensaElPublicoGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     validarContenidoSet
     ============================================================= */

  describe('validarContenidoSet', () => {
    it('contenido valido -> true', () => {
      expect(QuePiensaElPublicoGameDefinition.validarContenidoSet(contenidoValido())).toBe(true);
    });

    it('items vacio -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet({ items: [] })).toThrow(ValidacionError);
    });

    it('items no es array -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet({ items: 'no' })).toThrow(ValidacionError);
    });

    it('falta pregunta -> error', () => {
      const c = contenidoValido({ items: [{ opcion_a: 'A', opcion_b: 'B' }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('falta opcion_a -> error', () => {
      const c = contenidoValido({ items: [{ pregunta: 'Q?', opcion_b: 'B' }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('falta opcion_b -> error', () => {
      const c = contenidoValido({ items: [{ pregunta: 'Q?', opcion_a: 'A' }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('pregunta vacia -> error', () => {
      const c = contenidoValido({ items: [{ pregunta: '', opcion_a: 'A', opcion_b: 'B' }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('tiempo_seg invalido -> error', () => {
      const c = contenidoValido({ items: [{ pregunta: 'Q?', opcion_a: 'A', opcion_b: 'B', tiempo_seg: 0 }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('puntos_acierto negativo -> error', () => {
      const c = contenidoValido({ items: [{ pregunta: 'Q?', opcion_a: 'A', opcion_b: 'B', puntos_acierto: -5 }] });
      expect(() => QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toThrow(ValidacionError);
    });

    it('tiempo_seg opcional valido -> OK', () => {
      const c = contenidoValido({ items: [{ pregunta: 'Q?', opcion_a: 'A', opcion_b: 'B', tiempo_seg: 15 }] });
      expect(QuePiensaElPublicoGameDefinition.validarContenidoSet(c)).toBe(true);
    });
  });

  /* =============================================================
     validarEstadoJuego
     ============================================================= */

  describe('validarEstadoJuego', () => {
    it('estado valido -> true', () => {
      expect(QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido())).toBe(true);
    });

    it('fase invalida -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ fase: 'OTRA' }))).toThrow(ValidacionError);
    });

    it('ronda_actual = 0 -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ ronda_actual: 0 }))).toThrow(ValidacionError);
    });

    it('pronostico_equipo_1 invalido -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ pronostico_equipo_1: 'X' }))).toThrow(ValidacionError);
    });

    it('pronostico_equipo_1 null -> OK', () => {
      expect(QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ pronostico_equipo_1: null }))).toBe(true);
    });

    it('pronostico_equipo_1 = EMPATE -> OK', () => {
      expect(QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ pronostico_equipo_1: 'EMPATE' }))).toBe(true);
    });

    it('puntos_equipo_1 no es numero -> error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ puntos_equipo_1: 'abc' }))).toThrow(ValidacionError);
    });

    it('todas las fases validas son aceptadas', () => {
      const fases = [
        'SELECCIONANDO_PREGUNTA', 'ENCUESTA_ACTIVA', 'ENCUESTA_CERRADA',
        'REVELANDO', 'FIN_DE_JUEGO'
      ];
      for (const fase of fases) {
        expect(QuePiensaElPublicoGameDefinition.validarEstadoJuego(estadoValido({ fase }))).toBe(true);
      }
    });
  });

  /* =============================================================
     calcularResultado
     ============================================================= */

  describe('calcularResultado', () => {
    it('devuelve puntos correctos', () => {
      const estado = estadoValido({ puntos_equipo_1: 30, puntos_equipo_2: 20 });
      const resultado = QuePiensaElPublicoGameDefinition.calcularResultado(estado);
      expect(resultado.puntos_equipo_1).toBe(30);
      expect(resultado.puntos_equipo_2).toBe(20);
    });

    it('sin puntos devuelve ceros', () => {
      const resultado = QuePiensaElPublicoGameDefinition.calcularResultado({});
      expect(resultado.puntos_equipo_1).toBe(0);
      expect(resultado.puntos_equipo_2).toBe(0);
    });

    it('estado null lanza error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.calcularResultado(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     aplicarTimeUp
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('ENCUESTA_ACTIVA -> ENCUESTA_CERRADA', () => {
      const estado = estadoValido({ fase: 'ENCUESTA_ACTIVA' });
      const nuevo = QuePiensaElPublicoGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('ENCUESTA_CERRADA');
    });

    it('ENCUESTA_CERRADA -> sigue igual', () => {
      const estado = estadoValido({ fase: 'ENCUESTA_CERRADA' });
      const nuevo = QuePiensaElPublicoGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('ENCUESTA_CERRADA');
    });

    it('FIN_DE_JUEGO -> null', () => {
      const estado = estadoValido({ fase: 'FIN_DE_JUEGO' });
      expect(QuePiensaElPublicoGameDefinition.aplicarTimeUp(estado)).toBeNull();
    });

    it('estado null lanza error', () => {
      expect(() => QuePiensaElPublicoGameDefinition.aplicarTimeUp(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Integracion con GameDefinitionRegistry
     ============================================================= */

  describe('integracion con GameDefinitionRegistry', () => {
    it('se registra correctamente', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(QuePiensaElPublicoGameDefinition);
      expect(registry.existe('QUE_PIENSA_EL_PUBLICO')).toBe(true);
      expect(registry.obtener('QUE_PIENSA_EL_PUBLICO')).toBe(QuePiensaElPublicoGameDefinition);
    });

    it('cumple el contrato completo', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(QuePiensaElPublicoGameDefinition);
      expect(registry.listarCodigos()).toContain('QUE_PIENSA_EL_PUBLICO');
    });
  });
});
