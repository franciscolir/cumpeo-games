import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnlacesGameUI } from '../../../../../src/ui/games/enlaces/EnlacesGameUI.js';
import { EnlacesGameDefinition } from '../../../../../src/games/enlaces/EnlacesGameDefinition.js';
import { GameUIRegistry } from '../../../../../src/ui/games/GameUIRegistry.js';
import { registrarGameUIs } from '../../../../../src/ui/games/registro.js';

function crearItemDrag(idx) {
  const item = {
    dataset: { idx: String(idx) },
    _handlers: {},
    getAttribute: vi.fn((attr) => (attr === 'draggable' ? 'true' : null)),
    addEventListener: vi.fn((evt, cb) => {
      item._handlers[evt] = cb;
    })
  };
  return item;
}

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

  const dragItems = [crearItemDrag(0), crearItemDrag(1), crearItemDrag(2)];
  const setEl = {
    addEventListener: vi.fn((evt, cb) => {
      setEl._handlers = setEl._handlers || {};
      setEl._handlers[evt] = cb;
    }),
    getAttribute: vi.fn((attr) => (attr === 'data-set-id' ? 's1' : null))
  };

  return {
    innerHTML: '',
    querySelector: vi.fn((sel) => getOrCreate(sel)),
    querySelectorAll: vi.fn((sel) => {
      if (sel === '[data-set-id]') return [setEl];
      if (sel === '.enlaces-columna-b-item') return dragItems;
      return [];
    }),
    _cache: cache,
    _dragItems: dragItems,
    _setEl: setEl
  };
}

function contextoBase(overrides = {}) {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'ENLACES',
      configuracion_congelada: {
        rondas: 1,
        pares_por_turno: 8,
        tiempo_turno_seg: 60,
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

function estadoBase(overrides = {}) {
  return {
    fase: 'INICIO_RONDA',
    equipo_actual: 1,
    ronda_actual: 1,
    total_rondas: 1,
    set_equipo_1: null,
    set_equipo_2: null,
    items: [],
    columna_a: [],
    columna_b: [],
    pares_correctos: {},
    movimientos: [],
    validado: false,
    resultado_turno: null,
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    timer_activo: false,
    tiempo_restante_seg: 60,
    tiempo_agotado: false,
    ...overrides
  };
}

function tableroBase() {
  return {
    columna_a: ['A1', 'A2', 'A3'],
    columna_b: ['B2', 'B1', 'B3'],
    pares_correctos: { A1: 'B1', A2: 'B2', A3: 'B3' }
  };
}

describe('EnlacesGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { EnlacesGameUI.cleanup(); });

  /* =============================================================
     Grupo 1 — Contrato (5 tests)
     ============================================================= */

  describe('contrato', () => {
    it('tiene codigo ENLACES', () => {
      expect(EnlacesGameUI.codigo).toBe('ENLACES');
    });

    it('tiene renderizarAreaJuego como funcion', () => {
      expect(typeof EnlacesGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como funcion', () => {
      expect(typeof EnlacesGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como funcion', () => {
      expect(typeof EnlacesGameUI.cleanup).toBe('function');
    });

    it('no tiene renderizarEstadoPublico (5.9c)', () => {
      expect(typeof EnlacesGameUI.renderizarEstadoPublico).toBe('undefined');
    });
  });

  /* =============================================================
     Grupo 2 — Área: placeholder (3 tests)
     ============================================================= */

  describe('renderizarAreaJuego — placeholder', () => {
    it('muestra Enlaces cuando no hay fase', () => {
      EnlacesGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Enlaces');
      expect(container.innerHTML).toContain('Iniciar juego');
    });

    it('muestra placeholder en INICIO_RONDA', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).toContain('Enlaces');
    });

    it('no muestra timer en placeholder', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).not.toContain('enlaces-timer');
    });
  });

  /* =============================================================
     Grupo 3 — Área: fases de flujo (8 tests)
     ============================================================= */

  describe('renderizarAreaJuego — fases de flujo', () => {
    it('SELECCIONANDO_SET muestra mensaje de espera', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando selección de set');
    });

    it('PREPARANDO_TABLERO muestra mensaje de preparación', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'PREPARANDO_TABLERO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Preparando tablero');
    });

    it('CAMBIO_TURNO muestra turno de equipo', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Turno de Beta');
    });

    it('FIN_DE_RONDA muestra fin de ronda y marcador', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_RONDA', puntos_equipo_1: 30, puntos_equipo_2: 20 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Fin de ronda');
      expect(container.innerHTML).toContain('30');
      expect(container.innerHTML).toContain('20');
    });

    it('FIN_DE_JUEGO muestra ganador via calcularResultado', () => {
      const spy = vi.spyOn(EnlacesGameDefinition, 'calcularResultado');
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 40, puntos_equipo_2: 10 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.results[0].value.ganador).toBe(1);
      expect(container.innerHTML).toContain('Alfa gana');
      spy.mockRestore();
    });

    it('FIN_DE_JUEGO equipo 2 gana via calcularResultado', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 10, puntos_equipo_2: 40 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Beta gana');
    });

    it('FIN_DE_JUEGO empate muestra empate técnico', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 10, puntos_equipo_2: 10 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Empate técnico');
    });

    it('header muestra ronda y fase', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoBase({ fase: 'SELECCIONANDO_SET', ronda_actual: 2, total_rondas: 3 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('Seleccionando set');
    });
  });

  /* =============================================================
     Grupo 4 — Área: tablero ORDENANDO (8 tests)
     ============================================================= */

  describe('renderizarAreaJuego — tablero ORDENANDO', () => {
    function estadoOrdenando(overrides = {}) {
      return estadoBase({ fase: 'ORDENANDO', timer_activo: true, ...tableroBase(), ...overrides });
    }

    it('muestra columna A con conceptos', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-columna-a');
      expect(container.innerHTML).toContain('A1');
      expect(container.innerHTML).toContain('A2');
      expect(container.innerHTML).toContain('A3');
    });

    it('muestra columna B con conceptos', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-columna-b');
      expect(container.innerHTML).toContain('B1');
      expect(container.innerHTML).toContain('B2');
      expect(container.innerHTML).toContain('B3');
    });

    it('elementos de B son draggable=true', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('draggable="true"');
      expect(container.innerHTML).toContain('enlaces-columna-b-item');
    });

    it('elementos de B llevan data-idx', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-idx="0"');
      expect(container.innerHTML).toContain('data-idx="1"');
      expect(container.innerHTML).toContain('data-idx="2"');
    });

    it('muestra timer con tiempo restante', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando({ tiempo_restante_seg: 45 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('enlaces-timer');
      expect(container.innerHTML).toContain('45s');
      expect(container.innerHTML).toContain('Tiempo restante');
    });

    it('muestra equipo activo en el tablero', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando({ equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Equipo: Beta');
    });

    it('muestra cantidad de pares', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Pares: 3');
    });

    it('muestra marcador con ambos equipos', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoOrdenando({ puntos_equipo_1: 25, puntos_equipo_2: 15 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
      expect(container.innerHTML).toContain('Alfa');
      expect(container.innerHTML).toContain('Beta');
    });
  });

  /* =============================================================
     Grupo 5 — Área: ESPERA_VALIDACION (4 tests)
     ============================================================= */

  describe('renderizarAreaJuego — ESPERA_VALIDACION', () => {
    function estadoEspera(overrides = {}) {
      return estadoBase({
        fase: 'ESPERA_VALIDACION',
        tiempo_agotado: true,
        timer_activo: false,
        ...tableroBase(),
        ...overrides
      });
    }

    it('muestra tablero congelado', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoEspera(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-columna-b');
      expect(container.innerHTML).toContain('B1');
    });

    it('columna B NO es draggable', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoEspera(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('draggable="false"');
      expect(container.innerHTML).not.toContain('draggable="true"');
    });

    it('muestra mensaje de tiempo agotado / esperando validación', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoEspera(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Tiempo agotado. Esperando validación.');
      expect(container.innerHTML).toContain('data-enlaces-mensaje');
    });

    it('no muestra timer en ESPERA_VALIDACION', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoEspera(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('enlaces-timer');
    });
  });

  /* =============================================================
     Grupo 6 — Área: MOSTRANDO_RESULTADO (6 tests)
     ============================================================= */

  describe('renderizarAreaJuego — MOSTRANDO_RESULTADO', () => {
    function estadoResultado(overrides = {}) {
      return estadoBase({
        fase: 'MOSTRANDO_RESULTADO',
        resultado_turno: { aciertos: 2, total: 3 },
        ...tableroBase(),
        ...overrides
      });
    }

    it('muestra indicador de acierto (✓)', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoResultado(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-indicador="acierto"');
      expect(container.innerHTML).toContain('✓');
    });

    it('muestra indicador de error (✗)', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoResultado(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-indicador="error"');
      expect(container.innerHTML).toContain('✗');
    });

    it('evalúa filas: A1-B1 acierto y A2-B2 acierto, A3-B3 error', () => {
      const estado = estadoResultado({
        columna_b: ['B1', 'B2', 'B3'],
        pares_correctos: { A1: 'B1', A2: 'B2', A3: 'X3' }
      });
      EnlacesGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-fila="0" data-enlaces-indicador="acierto"');
      expect(container.innerHTML).toContain('data-enlaces-fila="1" data-enlaces-indicador="acierto"');
      expect(container.innerHTML).toContain('data-enlaces-fila="2" data-enlaces-indicador="error"');
    });

    it('muestra resultado_turno aciertos/total', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoResultado(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-enlaces-resultado');
      expect(container.innerHTML).toContain('Aciertos: 2 / 3');
    });

    it('columna B NO es draggable en resultado', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoResultado(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('draggable="false"');
      expect(container.innerHTML).not.toContain('draggable="true"');
    });

    it('no muestra timer en MOSTRANDO_RESULTADO', () => {
      EnlacesGameUI.renderizarAreaJuego(estadoResultado(), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('enlaces-timer');
    });
  });

  /* =============================================================
     Grupo 7 — Drag-and-drop (7 tests)
     ============================================================= */

  describe('drag-and-drop', () => {
    function renderOrdenando(onAccion) {
      const estado = estadoBase({ fase: 'ORDENANDO', timer_activo: true, ...tableroBase() });
      EnlacesGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion });
    }

    it('dragstart + drop en otra posición emite mover-elemento-enlaces', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const items = container._dragItems;
      items[0]._handlers.dragstart({ dataTransfer: { effectAllowed: '' } });
      items[1]._handlers.drop({ preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } });
      expect(onAccion).toHaveBeenCalledWith('mover-elemento-enlaces', { desdeIdx: 0, hastaIdx: 1 });
    });

    it('drop en la misma posición NO emite', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const items = container._dragItems;
      items[0]._handlers.dragstart({ dataTransfer: { effectAllowed: '' } });
      items[0]._handlers.drop({ preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } });
      expect(onAccion).not.toHaveBeenCalled();
    });

    it('dragend resetea el origen (drop posterior no emite)', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const items = container._dragItems;
      items[0]._handlers.dragstart({ dataTransfer: { effectAllowed: '' } });
      items[0]._handlers.dragend();
      items[1]._handlers.drop({ preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } });
      expect(onAccion).not.toHaveBeenCalled();
    });

    it('dragstart setea effectAllowed = move', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const dt = { effectAllowed: '' };
      container._dragItems[2]._handlers.dragstart({ dataTransfer: dt });
      expect(dt.effectAllowed).toBe('move');
    });

    it('dragover llama preventDefault y setea dropEffect', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const evento = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } };
      container._dragItems[1]._handlers.dragover(evento);
      expect(evento.preventDefault).toHaveBeenCalled();
      expect(evento.dataTransfer.dropEffect).toBe('move');
    });

    it('drop llama preventDefault', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      const evento = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } };
      container._dragItems[0]._handlers.dragstart({ dataTransfer: { effectAllowed: '' } });
      container._dragItems[2]._handlers.drop(evento);
      expect(evento.preventDefault).toHaveBeenCalled();
      expect(onAccion).toHaveBeenCalledWith('mover-elemento-enlaces', { desdeIdx: 0, hastaIdx: 2 });
    });

    it('se registran listeners dragstart/dragover/drop/dragend en cada item', () => {
      const onAccion = vi.fn();
      renderOrdenando(onAccion);
      for (const item of container._dragItems) {
        expect(item.addEventListener).toHaveBeenCalledWith('dragstart', expect.any(Function));
        expect(item.addEventListener).toHaveBeenCalledWith('dragover', expect.any(Function));
        expect(item.addEventListener).toHaveBeenCalledWith('drop', expect.any(Function));
        expect(item.addEventListener).toHaveBeenCalledWith('dragend', expect.any(Function));
      }
    });
  });

  /* =============================================================
     Grupo 8 — Panel conductor por fase (12 tests)
     ============================================================= */

  describe('renderizarPanelConductor — por fase', () => {
    it('sin fase muestra Iniciar juego', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar juego');
      expect(container.innerHTML).toContain('btn-enlaces-iniciar-juego');
    });

    it('INICIO_RONDA muestra Comenzar ronda', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Comenzar ronda');
      expect(container.innerHTML).toContain('btn-enlaces-iniciar-ronda');
    });

    it('SELECCIONANDO_SET muestra cards de sets', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }, { id: 's2', nombre: 'Set 2' }] });
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Set 1');
      expect(container.innerHTML).toContain('Set 2');
      expect(container.innerHTML).toContain('btn-enlaces-elegir-set-s1');
    });

    it('SELECCIONANDO_SET sin sets muestra mensaje', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('No hay sets disponibles');
    });

    it('PREPARANDO_TABLERO no muestra botones', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'PREPARANDO_TABLERO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-enlaces');
    });

    it('ORDENANDO muestra Validar y Deshacer', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ORDENANDO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-enlaces-validar');
      expect(container.innerHTML).toContain('btn-enlaces-deshacer');
    });

    it('ESPERA_VALIDACION muestra Validar sin Deshacer', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ESPERA_VALIDACION', tiempo_agotado: true }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-enlaces-validar');
      expect(container.innerHTML).not.toContain('btn-enlaces-deshacer');
    });

    it('MOSTRANDO_RESULTADO muestra Siguiente turno', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_RESULTADO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente turno');
      expect(container.innerHTML).toContain('btn-enlaces-siguiente-turno');
    });

    it('CAMBIO_TURNO muestra Iniciar turno de <equipo>', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar turno de Beta');
      expect(container.innerHTML).toContain('btn-enlaces-iniciar-turno');
    });

    it('FIN_DE_RONDA muestra Siguiente ronda', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente ronda');
      expect(container.innerHTML).toContain('btn-enlaces-siguiente-ronda');
    });

    it('FIN_DE_JUEGO no muestra botones', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_JUEGO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-enlaces');
    });

    it('panel muestra nombre de fase', () => {
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ORDENANDO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Panel Enlaces');
      expect(container.innerHTML).toContain('Ordenando');
    });
  });

  /* =============================================================
     Grupo 9 — Emisión de acciones (10 tests)
     ============================================================= */

  describe('emisión de acciones', () => {
    it('iniciar-juego-enlaces', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-iniciar-juego');
      expect(btn).toBeTruthy();
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('iniciar-juego-enlaces');
    });

    it('iniciar-ronda-enlaces', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-iniciar-ronda');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('iniciar-ronda-enlaces');
    });

    it('seleccionar-set-enlaces incluye set', () => {
      const onAccion = vi.fn();
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }] });
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion });
      container._setEl._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('seleccionar-set-enlaces', { set: { id: 's1', nombre: 'Set 1' } });
    });

    it('validar-enlaces en ORDENANDO', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ORDENANDO' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-validar');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('validar-enlaces');
    });

    it('deshacer-enlaces en ORDENANDO', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ORDENANDO' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-deshacer');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('deshacer-enlaces');
    });

    it('validar-enlaces en ESPERA_VALIDACION', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'ESPERA_VALIDACION', tiempo_agotado: true }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-validar');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('validar-enlaces');
    });

    it('siguiente-turno-enlaces', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'MOSTRANDO_RESULTADO' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-siguiente-turno');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('siguiente-turno-enlaces');
    });

    it('iniciar-turno-enlaces', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-iniciar-turno');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('iniciar-turno-enlaces');
    });

    it('iniciar-siguiente-ronda-enlaces', () => {
      const onAccion = vi.fn();
      EnlacesGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-siguiente-ronda');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('iniciar-siguiente-ronda-enlaces');
    });

    it('validar en ORDENANDO cancela el timer antes de emitir', () => {
      const onAccion = vi.fn();
      const estado = estadoBase({ fase: 'ORDENANDO', timer_activo: true, ...tableroBase() });
      EnlacesGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion });
      EnlacesGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-enlaces-validar');
      btn._handlers.click();
      expect(onAccion).toHaveBeenCalledWith('validar-enlaces');
    });
  });

  /* =============================================================
     Grupo 10 — Registro (2 tests)
     ============================================================= */

  describe('registro', () => {
    it('registrarGameUIs incluye ENLACES', () => {
      const registry = new GameUIRegistry();
      const codigos = registrarGameUIs(registry);
      expect(codigos).toContain('ENLACES');
    });

    it('registry.obtener(ENLACES) devuelve EnlacesGameUI', () => {
      const registry = new GameUIRegistry();
      registrarGameUIs(registry);
      expect(registry.obtener('ENLACES')).toBe(EnlacesGameUI);
    });
  });

  /* =============================================================
     Grupo 11 — Cleanup (2 tests)
     ============================================================= */

  describe('cleanup', () => {
    it('no falla', () => {
      expect(() => EnlacesGameUI.cleanup()).not.toThrow();
    });

    it('no falla con timer activo', () => {
      const estado = estadoBase({ fase: 'ORDENANDO', timer_activo: true, ...tableroBase() });
      EnlacesGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(() => EnlacesGameUI.cleanup()).not.toThrow();
    });
  });
});
