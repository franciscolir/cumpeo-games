import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TriviaGameUI } from '../../../../../src/ui/games/trivia/TriviaGameUI.js';
import { TriviaGameDefinition } from '../../../../../src/games/trivia/TriviaGameDefinition.js';

function crearContainer() {
  const listeners = {};
  return {
    innerHTML: '',
    querySelector: vi.fn((sel) => {
      return {
        addEventListener: vi.fn((evt, cb) => { listeners[sel] = listeners[sel] || {}; listeners[sel][evt] = cb; }),
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-opcion-index') return '0';
          if (attr === 'data-set-id') return 's1';
          return null;
        })
      };
    }),
    querySelectorAll: vi.fn((sel) => {
      if (sel === '[data-opcion-index]') {
        return [{ getAttribute: vi.fn(() => '0'), addEventListener: vi.fn() }];
      }
      if (sel === '[data-set-id]') {
        return [{ getAttribute: vi.fn(() => 's1'), addEventListener: vi.fn() }];
      }
      return [];
    }),
    _listeners: listeners
  };
}

function contextoBase(overrides = {}) {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'TRIVIA',
      configuracion_congelada: {
        rondas: 1,
        preguntas_por_turno: 5,
        tiempo_por_pregunta_seg: 30,
        puntos_por_acierto: 10,
        penalizacion_por_error: 0,
        penalizacion_por_pasar: 0
      }
    },
    equipos: [{ nombre: 'Alfa', puntaje: 0 }, { nombre: 'Beta', puntaje: 0 }],
    puedeControlar: true,
    itemsDelJuego: [],
    setsDisponibles: [],
    ...overrides
  };
}

function estadoBase(overrides = {}) {
  return {
    ronda_actual: 1,
    total_rondas: 1,
    fase: 'INICIO_RONDA',
    equipo_actual: 1,
    set_equipo_1: null,
    set_equipo_2: null,
    preguntas_equipo_1: [],
    preguntas_equipo_2: [],
    pregunta_actual_index: 0,
    opcion_seleccionada: null,
    respuestas: [],
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    ...overrides
  };
}

describe('TriviaGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { TriviaGameUI.cleanup(); });

  describe('contrato', () => {
    it('tiene codigo TRIVIA', () => {
      expect(TriviaGameUI.codigo).toBe('TRIVIA');
    });

    it('tiene renderizarAreaJuego como función', () => {
      expect(typeof TriviaGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como función', () => {
      expect(typeof TriviaGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como función', () => {
      expect(typeof TriviaGameUI.cleanup).toBe('function');
    });
  });

  describe('renderizarAreaJuego — sin fase', () => {
    it('muestra placeholder cuando no hay fase', () => {
      TriviaGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Trivia');
      expect(container.innerHTML).toContain('Iniciá la partida');
    });

    it('muestra placeholder en INICIO_RONDA', () => {
      TriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).toContain('Trivia');
    });
  });

  describe('renderizarAreaJuego — con fase', () => {
    it('muestra header con ronda, fase y equipo', () => {
      const estado = estadoBase({ fase: 'MOSTRANDO_PREGUNTA', ronda_actual: 2, total_rondas: 3, equipo_actual: 1 });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('Mostrando pregunta');
      expect(container.innerHTML).toContain('Equipo: Alfa');
    });

    it('muestra marcador de ambos equipos', () => {
      const estado = estadoBase({ fase: 'MOSTRANDO_PREGUNTA', puntos_equipo_1: 25, puntos_equipo_2: 15 });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
    });

    it('SELECCIONANDO_SET muestra mensaje de espera', () => {
      const estado = estadoBase({ fase: 'SELECCIONANDO_SET' });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando selección de set');
    });

    it('MOSTRANDO_PREGUNTA muestra pregunta y opciones', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        equipo_actual: 1,
        preguntas_equipo_1: [{ pregunta: '¿Capital?', opciones: ['París', 'Madrid'], respuesta_correcta_index: 0 }]
      });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('¿Capital?');
      expect(container.innerHTML).toContain('París');
      expect(container.innerHTML).toContain('Madrid');
    });

    it('SELECCIONANDO_RESPUESTA muestra opciones clickeables', () => {
      const estado = estadoBase({
        fase: 'SELECCIONANDO_RESPUESTA',
        equipo_actual: 1,
        preguntas_equipo_1: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 0 }]
      });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-opcion-index');
    });

    it('MOSTRANDO_RESULTADO muestra opción correcta destacada', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        equipo_actual: 1,
        opcion_seleccionada: 1,
        preguntas_equipo_1: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 0 }]
      });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('bg-tertiary/20');
    });

    it('CAMBIO_TURNO muestra nombre del equipo', () => {
      const estado = estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Turno de Beta');
    });

    it('FIN_DE_JUEGO muestra ganador', () => {
      const estado = estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 30, puntos_equipo_2: 20 });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Alfa gana');
    });

    it('FIN_DE_JUEGO empate muestra empate técnico', () => {
      const estado = estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 10, puntos_equipo_2: 10 });
      TriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Empate técnico');
    });
  });

  describe('renderizarPanelConductor — sin fase', () => {
    it('muestra "Iniciar juego"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar juego');
    });
  });

  describe('renderizarPanelConductor — con fase', () => {
    it('INICIO_RONDA muestra "Comenzar ronda"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Comenzar ronda');
    });

    it('SELECCIONANDO_SET muestra cards de sets', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }, { id: 's2', nombre: 'Set 2' }] });
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Set 1');
      expect(container.innerHTML).toContain('Set 2');
    });

    it('SELECCIONANDO_SET sin sets muestra mensaje', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('No hay sets disponibles');
    });

    it('MOSTRANDO_PREGUNTA muestra "Iniciar respuesta"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_PREGUNTA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar respuesta');
    });

    it('SELECCIONANDO_RESPUESTA muestra "Validar" y "Pasar"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_RESPUESTA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Validar');
      expect(container.innerHTML).toContain('Pasar');
    });

    it('SELECCIONANDO_RESPUESTA con opción seleccionada habilita Validar', () => {
      const estado = estadoBase({ fase: 'SELECCIONANDO_RESPUESTA', opcion_seleccionada: 0 });
      TriviaGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Validar');
    });

    it('SELECCIONANDO_RESPUESTA sin opción deshabilita Validar', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_RESPUESTA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('disabled');
    });

    it('MOSTRANDO_RESULTADO muestra "Siguiente pregunta"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_RESULTADO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente pregunta');
    });

    it('CAMBIO_TURNO muestra "Iniciar turno de <equipo>"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar turno de Beta');
    });

    it('FIN_DE_RONDA muestra "Siguiente ronda"', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente ronda');
    });

    it('FIN_DE_JUEGO no muestra botones', () => {
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_JUEGO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-trivia');
    });
  });

  describe('emisión de acciones', () => {
    it('botón iniciar-juego emite acción correcta', () => {
      const onAccion = vi.fn();
      TriviaGameUI.renderizarPanelConductor(estadoBase(), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-trivia-iniciar-juego');
      expect(btn).toBeTruthy();
    });

    it('botón iniciar-ronda emite acción correcta', () => {
      const onAccion = vi.fn();
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-trivia-iniciar-ronda');
      expect(btn).toBeTruthy();
    });

    it('seleccionar-set-trivia incluye set', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }] });
      const onAccion = vi.fn();
      TriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion });
      const btn = container.querySelector('#btn-trivia-set-s1');
      expect(btn).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    it('no falla', () => {
      expect(() => TriviaGameUI.cleanup()).not.toThrow();
    });
  });
});
