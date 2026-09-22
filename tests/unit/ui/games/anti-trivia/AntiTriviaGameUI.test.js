import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AntiTriviaGameUI } from '../../../../../src/ui/games/anti-trivia/AntiTriviaGameUI.js';

function crearContainer() {
  const cache = {};
  const getOrCreate = (sel) => {
    if (!cache[sel]) {
      cache[sel] = {
        addEventListener: vi.fn((evt, cb) => {
          cache[sel]._handlers = cache[sel]._handlers || {};
          cache[sel]._handlers[evt] = cb;
        }),
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-set-id') return 's1';
          return null;
        }),
        textContent: ''
      };
    }
    return cache[sel];
  };
  return {
    innerHTML: '',
    querySelector: vi.fn((sel) => getOrCreate(sel)),
    querySelectorAll: vi.fn((sel) => {
      if (sel === '[data-set-id]') {
        return [getOrCreate('[data-set-id=s1]')];
      }
      return [];
    }),
    _cache: cache
  };
}

function contextoBase(overrides = {}) {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'ANTI_TRIVIA',
      configuracion_congelada: {
        rondas: 1,
        preguntas_por_turno: 5,
        tiempo_respuesta_seg: 30,
        penalizacion_por_error: 0,
        puntos_por_acierto: 10
      }
    },
    equipos: [{ nombre: 'Alfa', puntaje: 0 }, { nombre: 'Beta', puntaje: 0 }],
    puedeControlar: true,
    itemsDelJuego: [],
    setsDisponibles: [],
    ...overrides
  };
}

function preguntasBase(n = 5) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      pregunta: `¿Pregunta ${i + 1}?`,
      respuestas_correctas: [`Correcta A${i + 1}`, `Correcta B${i + 1}`],
      categoria: `Cat ${i + 1}`
    });
  }
  return items;
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
    respuestas: [],
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    timer_activo: false,
    tiempo_restante_seg: 30,
    tiempo_agotado: false,
    ...overrides
  };
}

describe('AntiTriviaGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { AntiTriviaGameUI.cleanup(); });

  /* =============================================================
     Grupo 1 — Contrato (5 tests)
     ============================================================= */

  describe('contrato', () => {
    it('tiene codigo ANTI_TRIVIA', () => {
      expect(AntiTriviaGameUI.codigo).toBe('ANTI_TRIVIA');
    });

    it('tiene renderizarAreaJuego como funcion', () => {
      expect(typeof AntiTriviaGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como funcion', () => {
      expect(typeof AntiTriviaGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como funcion', () => {
      expect(typeof AntiTriviaGameUI.cleanup).toBe('function');
    });

    it('no tiene renderizarEstadoPublico (5.8c)', () => {
      expect(typeof AntiTriviaGameUI.renderizarEstadoPublico).toBe('undefined');
    });
  });

  /* =============================================================
     Grupo 2 — Área: placeholder sin fase / INICIO_RONDA (3 tests)
     ============================================================= */

  describe('renderizarAreaJuego — placeholder', () => {
    it('muestra Anti-Trivia cuando no hay fase', () => {
      AntiTriviaGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Anti-Trivia');
      expect(container.innerHTML).toContain('Iniciá la partida');
    });

    it('muestra placeholder en INICIO_RONDA', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).toContain('Anti-Trivia');
    });

    it('no muestra timer en placeholder', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).not.toContain('antitrivia-timer');
    });
  });

  /* =============================================================
     Grupo 3 — Área: fases de flujo (6 tests)
     ============================================================= */

  describe('renderizarAreaJuego — fases de flujo', () => {
    it('SELECCIONANDO_SET muestra mensaje de espera', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando selección de set');
    });

    it('CAMBIO_TURNO muestra turno de equipo', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Turno de Beta');
    });

    it('FIN_DE_RONDA muestra fin de ronda y marcador', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_RONDA', puntos_equipo_1: 30, puntos_equipo_2: 20 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Fin de ronda');
      expect(container.innerHTML).toContain('30');
      expect(container.innerHTML).toContain('20');
    });

    it('FIN_DE_JUEGO muestra ganador', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 40, puntos_equipo_2: 10 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Alfa gana');
    });

    it('FIN_DE_JUEGO empate muestra empate técnico', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 10, puntos_equipo_2: 10 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Empate técnico');
    });

    it('header muestra ronda y fase', () => {
      AntiTriviaGameUI.renderizarAreaJuego(estadoBase({ fase: 'SELECCIONANDO_SET', ronda_actual: 2, total_rondas: 3 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('Seleccionando set');
    });
  });

  /* =============================================================
     Grupo 4 — Área: pregunta + respuestas correctas (6 tests)
     ============================================================= */

  describe('renderizarAreaJuego — pregunta y respuestas correctas', () => {
    it('MOSTRANDO_PREGUNTA muestra pregunta', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('¿Pregunta 1?');
      expect(container.innerHTML).toContain('Pregunta 1 / 5');
    });

    it('MOSTRANDO_PREGUNTA muestra lista de respuestas correctas a evitar', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Respuestas correctas a evitar');
      expect(container.innerHTML).toContain('Correcta A1');
      expect(container.innerHTML).toContain('Correcta B1');
    });

    it('muestra equipo activo en la card', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        equipo_actual: 1,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Equipo: Alfa');
    });

    it('equipo 2 usa preguntas_equipo_2', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        equipo_actual: 2,
        preguntas_equipo_2: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Equipo: Beta');
      expect(container.innerHTML).toContain('¿Pregunta 1?');
    });

    it('muestra marcador con ambos equipos', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        puntos_equipo_1: 25,
        puntos_equipo_2: 15,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
      expect(container.innerHTML).toContain('Alfa');
      expect(container.innerHTML).toContain('Beta');
    });

    it('pregunta_actual_index 2 muestra Pregunta 3', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        pregunta_actual_index: 2,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Pregunta 3 / 5');
      expect(container.innerHTML).toContain('¿Pregunta 3?');
    });
  });

  /* =============================================================
     Grupo 5 — Área: timer y tiempo agotado (6 tests)
     ============================================================= */

  describe('renderizarAreaJuego — timer', () => {
    it('RESPONDIENDO muestra timer', () => {
      const estado = estadoBase({
        fase: 'RESPONDIENDO',
        timer_activo: true,
        tiempo_restante_seg: 30,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('antitrivia-timer');
      expect(container.innerHTML).toContain('Tiempo restante');
      expect(container.innerHTML).toContain('30s');
    });

    it('RESPONDIENDO con tiempo_agotado muestra indicador', () => {
      const estado = estadoBase({
        fase: 'RESPONDIENDO',
        timer_activo: false,
        tiempo_agotado: true,
        tiempo_restante_seg: 0,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Tiempo agotado');
      expect(container.innerHTML).not.toContain('antitrivia-timer');
    });

    it('RESPONDIENDO sin tiempo_agotado no muestra Tiempo agotado', () => {
      const estado = estadoBase({
        fase: 'RESPONDIENDO',
        timer_activo: true,
        tiempo_agotado: false,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('Tiempo agotado');
    });

    it('ESPERA_VALIDACION muestra validando y no timer', () => {
      const estado = estadoBase({
        fase: 'ESPERA_VALIDACION',
        tiempo_agotado: true,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('El conductor está validando');
      expect(container.innerHTML).not.toContain('antitrivia-timer');
    });

    it('MOSTRANDO_PREGUNTA no muestra timer', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_PREGUNTA',
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('antitrivia-timer');
    });

    it('MOSTRANDO_RESULTADO no muestra timer', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        preguntas_equipo_1: preguntasBase(5),
        respuestas: [{ equipo: 1, pregunta_index: 0, resultado: 'acierto', puntos: 10, tiempo_agotado: false }]
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('antitrivia-timer');
    });
  });

  /* =============================================================
     Grupo 6 — Área: indicador de resultado (4 tests)
     ============================================================= */

  describe('renderizarAreaJuego — resultado', () => {
    it('MOSTRANDO_RESULTADO acierto muestra indicador verde', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        preguntas_equipo_1: preguntasBase(5),
        respuestas: [{ equipo: 1, pregunta_index: 0, resultado: 'acierto', puntos: 10, tiempo_agotado: false }]
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-antitrivia-resultado="acierto"');
      expect(container.innerHTML).toContain('¡Acierto!');
      expect(container.innerHTML).toContain('bg-tertiary');
    });

    it('MOSTRANDO_RESULTADO error muestra indicador rojo', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        preguntas_equipo_1: preguntasBase(5),
        respuestas: [{ equipo: 1, pregunta_index: 0, resultado: 'error', puntos: 0, tiempo_agotado: false }]
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-antitrivia-resultado="error"');
      expect(container.innerHTML).toContain('Error');
      expect(container.innerHTML).toContain('bg-error');
    });

    it('MOSTRANDO_RESULTADO sin_respuesta muestra Sin respuesta', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        preguntas_equipo_1: preguntasBase(5),
        respuestas: [{ equipo: 1, pregunta_index: 0, resultado: 'sin_respuesta', puntos: 0, tiempo_agotado: true }]
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-antitrivia-resultado="sin_respuesta"');
      expect(container.innerHTML).toContain('Sin respuesta');
    });

    it('MOSTRANDO_RESULTADO muestra pregunta y lista', () => {
      const estado = estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        preguntas_equipo_1: preguntasBase(5),
        respuestas: [{ equipo: 1, pregunta_index: 0, resultado: 'acierto', puntos: 10, tiempo_agotado: false }]
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('¿Pregunta 1?');
      expect(container.innerHTML).toContain('Respuestas correctas a evitar');
    });
  });

  /* =============================================================
     Grupo 7 — Panel conductor por fase (10 tests)
     ============================================================= */

  describe('renderizarPanelConductor — por fase', () => {
    it('sin fase muestra Iniciar juego', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar juego');
      expect(container.innerHTML).toContain('btn-antitrivia-iniciar-juego');
    });

    it('INICIO_RONDA muestra Comenzar ronda', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Comenzar ronda');
      expect(container.innerHTML).toContain('btn-antitrivia-iniciar-ronda');
    });

    it('SELECCIONANDO_SET muestra cards de sets', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }, { id: 's2', nombre: 'Set 2' }] });
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Set 1');
      expect(container.innerHTML).toContain('Set 2');
      expect(container.innerHTML).toContain('btn-antitrivia-elegir-set-s1');
    });

    it('SELECCIONANDO_SET sin sets muestra mensaje', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('No hay sets disponibles');
    });

    it('MOSTRANDO_PREGUNTA muestra Iniciar respuesta', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_PREGUNTA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar respuesta');
      expect(container.innerHTML).toContain('btn-antitrivia-iniciar-respuesta');
    });

    it('RESPONDIENDO sin tiempo agotado muestra Acierto y Error', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO', timer_activo: true }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-antitrivia-acierto');
      expect(container.innerHTML).toContain('btn-antitrivia-error');
      expect(container.innerHTML).not.toContain('btn-antitrivia-jugador-respondio');
      expect(container.innerHTML).not.toContain('btn-antitrivia-no-respondio');
    });

    it('RESPONDIENDO con tiempo agotado muestra respondio / no respondio', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO', tiempo_agotado: true }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-antitrivia-jugador-respondio');
      expect(container.innerHTML).toContain('btn-antitrivia-no-respondio');
      expect(container.innerHTML).toContain('Tiempo agotado');
      expect(container.innerHTML).not.toContain('btn-antitrivia-acierto');
      expect(container.innerHTML).not.toContain('btn-antitrivia-error');
    });

    it('ESPERA_VALIDACION muestra Acierto y Error', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'ESPERA_VALIDACION', tiempo_agotado: true }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-antitrivia-acierto');
      expect(container.innerHTML).toContain('btn-antitrivia-error');
      expect(container.innerHTML).not.toContain('btn-antitrivia-jugador-respondio');
    });

    it('MOSTRANDO_RESULTADO muestra Siguiente pregunta', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_RESULTADO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente pregunta');
      expect(container.innerHTML).toContain('btn-antitrivia-siguiente-pregunta');
    });

    it('CAMBIO_TURNO muestra Iniciar turno de <equipo>', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar turno de Beta');
      expect(container.innerHTML).toContain('btn-antitrivia-iniciar-turno');
    });

    it('FIN_DE_RONDA muestra Siguiente ronda', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente ronda');
      expect(container.innerHTML).toContain('btn-antitrivia-siguiente-ronda');
    });

    it('FIN_DE_JUEGO no muestra botones', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_JUEGO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-antitrivia');
    });

    it('panel muestra nombre de fase', () => {
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Panel Anti-Trivia');
      expect(container.innerHTML).toContain('Respondiendo');
    });
  });

  /* =============================================================
     Grupo 8 — Emisión de acciones (9 tests)
     ============================================================= */

  describe('emisión de acciones', () => {
    it('iniciar-juego-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-iniciar-juego');
      expect(btn).toBeTruthy();
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('iniciar-juego-antitrivia');
    });

    it('iniciar-ronda-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-iniciar-ronda');
      expect(btn).toBeTruthy();
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('iniciar-ronda-antitrivia');
    });

    it('seleccionar-set-antitrivia incluye set', () => {
      const onAccion = vi.fn();
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }] });
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion });
      const btns = container.querySelectorAll('[data-set-id]');
      expect(btns).toHaveLength(1);
      btns[0].addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('seleccionar-set-antitrivia', { set: { id: 's1', nombre: 'Set 1' } });
    });

    it('iniciar-respuesta-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_PREGUNTA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-iniciar-respuesta');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('iniciar-respuesta-antitrivia');
    });

    it('marcar-acierto-antitrivia en RESPONDIENDO', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO', timer_activo: true }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-acierto');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('marcar-acierto-antitrivia');
    });

    it('marcar-error-antitrivia en RESPONDIENDO', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO', timer_activo: true }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-error');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('marcar-error-antitrivia');
    });

    it('jugador-respondio-antitrivia y no-respondio-antitrivia tras time-up', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'RESPONDIENDO', tiempo_agotado: true }), container, contextoBase(), { onAccion });
      const btnR = container.querySelector('#btn-antitrivia-jugador-respondio');
      const btnN = container.querySelector('#btn-antitrivia-no-respondio');
      expect(btnR).toBeTruthy();
      expect(btnN).toBeTruthy();
      btnR.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('jugador-respondio-antitrivia');
      btnN.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('no-respondio-antitrivia');
    });

    it('marcar-acierto-antitrivia en ESPERA_VALIDACION', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'ESPERA_VALIDACION', tiempo_agotado: true }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-acierto');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('marcar-acierto-antitrivia');
    });

    it('siguiente-pregunta-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_RESULTADO' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-siguiente-pregunta');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('siguiente-pregunta-antitrivia');
    });

    it('iniciar-turno-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-iniciar-turno');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('iniciar-turno-antitrivia');
    });

    it('iniciar-siguiente-ronda-antitrivia', () => {
      const onAccion = vi.fn();
      AntiTriviaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-antitrivia-siguiente-ronda');
      btn.addEventListener.mock.calls[0][1]();
      expect(onAccion).toHaveBeenCalledWith('iniciar-siguiente-ronda-antitrivia');
    });
  });

  /* =============================================================
     Grupo 9 — Cleanup (2 tests)
     ============================================================= */

  describe('cleanup', () => {
    it('no falla', () => {
      expect(() => AntiTriviaGameUI.cleanup()).not.toThrow();
    });

    it('no falla con timer activo', () => {
      const estado = estadoBase({
        fase: 'RESPONDIENDO',
        timer_activo: true,
        preguntas_equipo_1: preguntasBase(5)
      });
      AntiTriviaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(() => AntiTriviaGameUI.cleanup()).not.toThrow();
    });
  });
});
