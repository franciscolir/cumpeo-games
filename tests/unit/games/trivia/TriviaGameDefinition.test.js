import { describe, it, expect } from 'vitest';

import { TriviaGameDefinition } from '../../../../src/games/trivia/TriviaGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

function contenidoValido(overrides = {}) {
  return {
    items: [
      {
        pregunta: '¿Capital de Francia?',
        opciones: ['París', 'Madrid', 'Londres'],
        respuesta_correcta_index: 0
      },
      {
        pregunta: '¿Capital de España?',
        opciones: ['París', 'Madrid', 'Londres'],
        respuesta_correcta_index: 1
      }
    ],
    ...overrides
  };
}

function configuracionValida(overrides = {}) {
  return {
    rondas: 3,
    preguntas_por_ronda: 5,
    puntos_por_acierto: 10,
    penalizacion_activa: false,
    penalizacion_puntos: 0,
    tiempo_por_pregunta_seg: 30,
    ...overrides
  };
}

function estadoValido(overrides = {}) {
  return {
    ronda_actual: 1,
    pregunta_actual_index: 0,
    fase: 'MOSTRANDO_PREGUNTA',
    respuestas: [],
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    ...overrides
  };
}

describe('TriviaGameDefinition', () => {
  /* =============================================================
     Grupo 1 — validarConfiguracion (8 tests)
     ============================================================= */

  describe('validarConfiguracion', () => {
    it('config válida → true', () => {
      expect(TriviaGameDefinition.validarConfiguracion(configuracionValida())).toBe(true);
    });

    it('falta rondas → error', () => {
      const config = configuracionValida({ rondas: undefined });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('rondas = 0 → error', () => {
      const config = configuracionValida({ rondas: 0 });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('preguntas_por_ronda no entero → error', () => {
      const config = configuracionValida({ preguntas_por_ronda: 2.5 });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('penalizacion_activa: true pero penalizacion_puntos: 0 → error', () => {
      const config = configuracionValida({
        penalizacion_activa: true,
        penalizacion_puntos: 0
      });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('tiempo_por_pregunta_seg = 0 → error', () => {
      const config = configuracionValida({ tiempo_por_pregunta_seg: 0 });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('puntos_por_acierto negativo → error', () => {
      const config = configuracionValida({ puntos_por_acierto: -5 });
      expect(() => TriviaGameDefinition.validarConfiguracion(config)).toThrow(ValidacionError);
    });

    it('config null → error', () => {
      expect(() => TriviaGameDefinition.validarConfiguracion(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 2 — validarContenidoSet (8 tests)
     ============================================================= */

  describe('validarContenidoSet', () => {
    it('contenido válido → true', () => {
      expect(TriviaGameDefinition.validarContenidoSet(contenidoValido())).toBe(true);
    });

    it('items vacío → error', () => {
      expect(() => TriviaGameDefinition.validarContenidoSet({ items: [] })).toThrow(ValidacionError);
    });

    it('item sin pregunta → error', () => {
      const contenido = {
        items: [{ opciones: ['A', 'B'], respuesta_correcta_index: 0 }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });

    it('opciones con menos de 2 → error', () => {
      const contenido = {
        items: [{ pregunta: 'Q', opciones: ['A'], respuesta_correcta_index: 0 }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });

    it('opciones con más de 6 → error', () => {
      const contenido = {
        items: [{
          pregunta: 'Q',
          opciones: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          respuesta_correcta_index: 0
        }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });

    it('respuesta_correcta_index fuera de rango → error', () => {
      const contenido = {
        items: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 5 }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });

    it('respuesta_correcta_index no entero → error', () => {
      const contenido = {
        items: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 1.5 }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });

    it('dificultad fuera de rango → error', () => {
      const contenido = {
        items: [{
          pregunta: 'Q',
          opciones: ['A', 'B'],
          respuesta_correcta_index: 0,
          dificultad: 5
        }]
      };
      expect(() => TriviaGameDefinition.validarContenidoSet(contenido)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 3 — validarEstadoJuego (7 tests)
     ============================================================= */

  describe('validarEstadoJuego', () => {
    it('estado válido → true', () => {
      expect(TriviaGameDefinition.validarEstadoJuego(estadoValido())).toBe(true);
    });

    it('falta ronda_actual → error', () => {
      const estado = estadoValido({ ronda_actual: undefined });
      expect(() => TriviaGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('fase desconocida → error', () => {
      const estado = estadoValido({ fase: 'FASE_FALSA' });
      expect(() => TriviaGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('respuestas no array → error', () => {
      const estado = estadoValido({ respuestas: 'no-array' });
      expect(() => TriviaGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('respuesta con equipo inválido (3) → error', () => {
      const estado = estadoValido({
        respuestas: [{ equipo: 3, opcion_index: 0, correcta: true, puntos: 10 }]
      });
      expect(() => TriviaGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('puntos_equipo_1 no numérico → error', () => {
      const estado = estadoValido({ puntos_equipo_1: 'abc' });
      expect(() => TriviaGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('estado null → error', () => {
      expect(() => TriviaGameDefinition.validarEstadoJuego(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 4 — calcularResultado (3 tests)
     ============================================================= */

  describe('calcularResultado', () => {
    it('devuelve shape correcto con puntos', () => {
      const estado = estadoValido({ puntos_equipo_1: 30, puntos_equipo_2: 20 });
      const resultado = TriviaGameDefinition.calcularResultado(estado);
      expect(resultado).toEqual({
        puntos_equipo_1: 30,
        puntos_equipo_2: 20
      });
    });

    it('estado sin puntos → devuelve 0', () => {
      const resultado = TriviaGameDefinition.calcularResultado({});
      expect(resultado).toEqual({
        puntos_equipo_1: 0,
        puntos_equipo_2: 0
      });
    });

    it('estado inválido → lanza error', () => {
      expect(() => TriviaGameDefinition.calcularResultado(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 5 — aplicarTimeUp (7 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('fase MOSTRANDO_PREGUNTA → pasa a MOSTRANDO_RESULTADO con equipo: 0', () => {
      const estado = estadoValido({ fase: 'MOSTRANDO_PREGUNTA' });
      const nuevo = TriviaGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.respuestas.length).toBe(1);
      expect(nuevo.respuestas[0].equipo).toBe(0);
      expect(nuevo.respuestas[0].opcion_index).toBeNull();
      expect(nuevo.respuestas[0].correcta).toBe(false);
      expect(nuevo.respuestas[0].puntos).toBe(0);
    });

    it('fase SELECCIONANDO_RESPUESTA → mismo comportamiento', () => {
      const estado = estadoValido({ fase: 'SELECCIONANDO_RESPUESTA' });
      const nuevo = TriviaGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.respuestas.length).toBe(1);
      expect(nuevo.respuestas[0].equipo).toBe(0);
    });

    it('fase MOSTRANDO_RESULTADO → devuelve estado sin cambios', () => {
      const estado = estadoValido({ fase: 'MOSTRANDO_RESULTADO' });
      const nuevo = TriviaGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.respuestas.length).toBe(0);
    });

    it('fase FIN_DE_JUEGO → devuelve null', () => {
      const estado = estadoValido({ fase: 'FIN_DE_JUEGO' });
      expect(TriviaGameDefinition.aplicarTimeUp(estado)).toBeNull();
    });

    it('fase FIN_DE_RONDA → devuelve estado sin cambios', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA' });
      const nuevo = TriviaGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('no muta el estado original', () => {
      const estado = estadoValido({ fase: 'MOSTRANDO_PREGUNTA' });
      const original = { ...estado, respuestas: [...estado.respuestas] };
      TriviaGameDefinition.aplicarTimeUp(estado);
      expect(estado).toEqual(original);
    });

    it('no aplica penalización aunque penalizacion_activa sea true', () => {
      const estado = estadoValido({
        fase: 'SELECCIONANDO_RESPUESTA',
        puntos_equipo_1: 10,
        puntos_equipo_2: 10
      });
      const nuevo = TriviaGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.puntos_equipo_2).toBe(10);
    });
  });

  /* =============================================================
     Grupo 6 — Integración (2 tests)
     ============================================================= */

  describe('integración con GameDefinitionRegistry', () => {
    it('registrar en registry funciona', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(TriviaGameDefinition);
      expect(registry.existe('TRIVIA')).toBe(true);
      expect(registry.obtener('TRIVIA')).toBe(TriviaGameDefinition);
    });

    it('validarRequerimientos → TRIVIA requiere snapshot_id', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(TriviaGameDefinition);
      expect(() => registry.validarRequerimientos('TRIVIA', {})).toThrow();
      expect(registry.validarRequerimientos('TRIVIA', { snapshot_id: 's1' })).toBe(true);
    });
  });
});
