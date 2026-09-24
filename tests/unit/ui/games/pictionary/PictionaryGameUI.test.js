import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PictionaryGameUI } from '../../../../../src/ui/games/pictionary/PictionaryGameUI.js';
import { PictionaryGameDefinition, SUBMODOS, FASES } from '../../../../../src/games/pictionary/PictionaryGameDefinition.js';

function crearContainer() {
  return { innerHTML: '', querySelector: vi.fn(() => null), querySelectorAll: vi.fn(() => []) };
}

function contextoBase(overrides = {}) {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'PICTIONARY',
      configuracion_congelada: {
        rondas: 2,
        palabras_por_turno: 1,
        segundos_por_modo: 60,
        puntos_por_acierto: 10,
        penalizacion_por_error: 5,
        penalizacion_por_pasar: 3,
        bonus_puntos: 15
      }
    },
    equipos: [{ nombre: 'Alfa', puntaje: 0 }, { nombre: 'Beta', puntaje: 0 }],
    puedeControlar: true,
    setsDisponibles: [
      { id: 'set-p1', nombre: 'Banco Palabras A', submodo: 'PALABRAS' },
      { id: 'set-g1', nombre: 'Banco Gestos A', submodo: 'GESTOS' },
      { id: 'set-d1', nombre: 'Banco Dibujo A', submodo: 'DIBUJO' },
      { id: 'set-q1', nombre: 'Banco Preguntas A', submodo: 'PREGUNTAS' }
    ],
    ...overrides
  };
}

function configBase(overrides = {}) {
  return {
    rondas: 2,
    palabras_por_turno: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15,
    ...overrides
  };
}

function estadoBase(overrides = {}) {
  return PictionaryGameDefinition.estadoInicial(configBase(), overrides);
}

function estadoEn(fase, overrides = {}) {
  return { ...estadoBase(), fase, ...overrides };
}

function mockBoton(container, id) {
  container.querySelector = vi.fn((sel) => {
    if (sel === `#${id}`) return { addEventListener: vi.fn((_, fn) => fn()) };
    return null;
  });
}

describe('PictionaryGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { PictionaryGameUI.cleanup(); });

  describe('contrato', () => {
    it('tiene codigo PICTIONARY', () => {
      expect(PictionaryGameUI.codigo).toBe('PICTIONARY');
    });

    it('tiene renderizarAreaJuego como función', () => {
      expect(typeof PictionaryGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como función', () => {
      expect(typeof PictionaryGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como función', () => {
      expect(typeof PictionaryGameUI.cleanup).toBe('function');
    });
  });

  describe('renderizarAreaJuego — sin fase', () => {
    it('muestra placeholder cuando no hay fase', () => {
      PictionaryGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Pictionary');
      expect(container.innerHTML).toContain('Inicia la partida');
    });
  });

  describe('renderizarAreaJuego — header', () => {
    it('muestra header con ronda, fase, submodo y equipo', () => {
      const estado = estadoEn('INICIO_RONDA', { ronda_actual: 2, total_rondas: 3, submodo_actual: 'GESTOS', equipo_actual: 1 });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('INICIO RONDA');
      expect(container.innerHTML).toContain('Gestos');
      expect(container.innerHTML).toContain('Equipo 1');
    });

    it('muestra marcador de ambos equipos', () => {
      const estado = estadoEn('ADIVINANDO', { puntos_equipo_1: 25, puntos_equipo_2: 15 });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
    });

    it('muestra concepto cuando palabra_actual existe', () => {
      const estado = estadoEn('MOSTRANDO_PALABRA', {
        palabra_actual: { concepto: 'PERRO', prohibidas: ['mascota', 'guau'] }
      });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('PERRO');
    });

    it('muestra placeholder cuando no hay concepto', () => {
      const estado = estadoEn('MOSTRANDO_PALABRA', { palabra_actual: null });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando palabra');
    });
  });

  describe('renderizarAreaJuego — PALABRAS muestra prohibidas', () => {
    it('muestra lista de palabras prohibidas en PALABRAS', () => {
      const estado = estadoEn('ADIVINANDO', {
        submodo_actual: 'PALABRAS',
        palabra_actual: { concepto: 'GATO', prohibidas: ['felino', 'miau'] },
        prohibidas_actuales: ['felino', 'miau']
      });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Palabras prohibidas');
      expect(container.innerHTML).toContain('felino');
      expect(container.innerHTML).toContain('miau');
    });

    it('no muestra prohibidas en GESTOS', () => {
      const estado = estadoEn('ADIVINANDO', {
        submodo_actual: 'GESTOS',
        palabra_actual: { concepto: 'GATO' },
        prohibidas_actuales: []
      });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('Palabras prohibidas');
    });
  });

  describe('renderizarAreaJuego — indicadores por submodo', () => {
    it('DIBUJO muestra indicación de pizarra', () => {
      const estado = estadoEn('INICIO_RONDA', { submodo_actual: 'DIBUJO' });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Pizarra física');
    });

    it('PREGUNTAS muestra indicación de espaldas', () => {
      const estado = estadoEn('INICIO_RONDA', { submodo_actual: 'PREGUNTAS' });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Adivinador de espaldas');
    });

    it('GESTOS muestra indicación de gestos', () => {
      const estado = estadoEn('INICIO_RONDA', { submodo_actual: 'GESTOS' });
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('usa gestos');
    });
  });

  describe('renderizarPanelConductor — botones por fase', () => {
    it('sin fase: muestra Iniciar juego', () => {
      PictionaryGameUI.renderizarPanelConductor({}, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-iniciar-juego');
    });

    it('INICIO_RONDA: sin botones de control (auto-avanza)', () => {
      const estado = estadoEn('INICIO_RONDA');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-pic-submodo');
      expect(container.innerHTML).not.toContain('btn-pic-iniciar-tiempo');
      expect(container.innerHTML).toContain('Preparando turno');
    });

    it('SELECCIONANDO_SUBMODO: muestra los 4 botones de submodo', () => {
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      for (const sub of SUBMODOS) {
        expect(container.innerHTML).toContain(`btn-pic-submodo-${sub}`);
      }
    });

    it('SELECCIONANDO_SET: muestra select y botón Elegir set', () => {
      const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'PALABRAS' });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('pic-set-select');
      expect(container.innerHTML).toContain('btn-pic-elegir-set');
      expect(container.innerHTML).toContain('set-p1');
    });

    it('SELECCIONANDO_SET sin sets: muestra error', () => {
      const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'PALABRAS' });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase({ setsDisponibles: [] }), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('No hay sets disponibles');
    });

    it('MOSTRANDO_PALABRA: muestra Iniciar tiempo', () => {
      const estado = estadoEn('MOSTRANDO_PALABRA');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-iniciar-tiempo');
    });

    it('ADIVINANDO: muestra Correcto, Incorrecto, Pasar palabra', () => {
      const estado = estadoEn('ADIVINANDO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-acierto');
      expect(container.innerHTML).toContain('btn-pic-error');
      expect(container.innerHTML).toContain('btn-pic-pasar');
    });

    it('ESPERA_VALIDACION: muestra Siguiente turno', () => {
      const estado = estadoEn('ESPERA_VALIDACION');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-siguiente-turno');
    });

    it('CAMBIO_TURNO: sin botones de control (auto-avanza)', () => {
      const estado = estadoEn('CAMBIO_TURNO', { equipo_actual: 1 });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-pic-siguiente-turno');
      expect(container.innerHTML).toContain('Preparando turno');
    });

    it('FIN_DE_RONDA: muestra siguiente ronda', () => {
      const estado = estadoEn('FIN_DE_RONDA', { ronda_actual: 1, total_rondas: 2 });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase({ juegoEjecutado: { id: 'j1', configuracion_congelada: { rondas: 2 } } }), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-siguiente-ronda');
    });

    it('FIN_DE_JUEGO: no muestra botones de control', () => {
      const estado = estadoEn('FIN_DE_JUEGO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-pic-acierto');
      expect(container.innerHTML).not.toContain('btn-pic-submodo');
      expect(container.innerHTML).not.toContain('btn-pic-iniciar-tiempo');
    });
  });

  describe('renderizarPanelConductor — botón Bonus siempre visible', () => {
    it('muestra botón Bonus Eq1 y Bonus Eq2 en SELECCIONANDO_SUBMODO', () => {
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-bonus-eq1');
      expect(container.innerHTML).toContain('btn-pic-bonus-eq2');
      expect(container.innerHTML).toContain('Bonus: 15 pts');
    });

    it('muestra input numérico para bonus Eq1 y Eq2', () => {
      const estado = estadoEn('ADIVINANDO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('pic-bonus-input-eq1');
      expect(container.innerHTML).toContain('pic-bonus-input-eq2');
      expect(container.innerHTML).toContain('type="number"');
    });

    it('muestra botón Bonus en FIN_DE_JUEGO', () => {
      const estado = estadoEn('FIN_DE_JUEGO');
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-bonus-eq1');
      expect(container.innerHTML).toContain('btn-pic-bonus-eq2');
    });

    it('bonus con valor válido emite aplicar-bonus-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      const inputEl = { value: '20', trim: () => '20' };
      const btnEl = { addEventListener: vi.fn((_, fn) => fn()) };
      const errorEl = { classList: { remove: vi.fn(), add: vi.fn() }, textContent: '' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#pic-bonus-input-eq1') return inputEl;
        if (sel === '#btn-pic-bonus-eq1') return btnEl;
        if (sel === '#pic-bonus-error') return errorEl;
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('aplicar-bonus-pictionary', { equipo: 1, puntos: 20 });
    });

    it('bonus con valor inválido muestra error inline', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      const inputEl = { value: 'abc', trim: () => 'abc' };
      const btnEl = { addEventListener: vi.fn((_, fn) => fn()) };
      const errorEl = { classList: { remove: vi.fn(), add: vi.fn() }, textContent: '' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#pic-bonus-input-eq1') return inputEl;
        if (sel === '#btn-pic-bonus-eq1') return btnEl;
        if (sel === '#pic-bonus-error') return errorEl;
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).not.toHaveBeenCalled();
      expect(errorEl.textContent).toContain('mayor a 0');
    });

    it('bonus input se limpia después de aplicar', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      const inputEl = { value: '25', trim: () => '25' };
      const btnEl = { addEventListener: vi.fn((_, fn) => fn()) };
      const errorEl = { classList: { remove: vi.fn(), add: vi.fn() }, textContent: '' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#pic-bonus-input-eq1') return inputEl;
        if (sel === '#btn-pic-bonus-eq1') return btnEl;
        if (sel === '#pic-bonus-error') return errorEl;
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(inputEl.value).toBe('');
    });
  });

  describe('renderizarPanelConductor — emisión de acciones', () => {
    it('Iniciar juego emite iniciar-juego-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-iniciar-juego');
      PictionaryGameUI.renderizarPanelConductor({}, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('iniciar-juego-pictionary');
    });

    it('cada botón de submodo emite elegir-submodo-pictionary con su submodo', () => {
      for (const sub of SUBMODOS) {
        const callbacks = { onAccion: vi.fn() };
        const c = { innerHTML: '', querySelector: vi.fn((sel) => (sel === `#btn-pic-submodo-${sub}` ? { addEventListener: vi.fn((_, fn) => fn()) } : null)), querySelectorAll: vi.fn(() => []) };
        PictionaryGameUI.renderizarPanelConductor(estadoEn('SELECCIONANDO_SUBMODO'), c, contextoBase(), callbacks);
        expect(callbacks.onAccion).toHaveBeenCalledWith('elegir-submodo-pictionary', { submodo: sub });
      }
    });

    it('Elegir set emite elegir-set-pictionary con set_id del select', () => {
      const callbacks = { onAccion: vi.fn() };
      const selectEl = { value: 'set-p1' };
      const btnEl = { addEventListener: vi.fn((_, fn) => fn()) };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#pic-set-select') return selectEl;
        if (sel === '#btn-pic-elegir-set') return btnEl;
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estadoEn('SELECCIONANDO_SET', { submodo_actual: 'PALABRAS' }), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('elegir-set-pictionary', { set_id: 'set-p1' });
    });

    it('Elegir set sin selección no emite', () => {
      const callbacks = { onAccion: vi.fn() };
      const selectEl = { value: '' };
      const btnEl = { addEventListener: vi.fn((_, fn) => fn()) };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#pic-set-select') return selectEl;
        if (sel === '#btn-pic-elegir-set') return btnEl;
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estadoEn('SELECCIONANDO_SET'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).not.toHaveBeenCalled();
    });

    it('Iniciar tiempo emite iniciar-tiempo-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-iniciar-tiempo');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('MOSTRANDO_PALABRA'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('iniciar-tiempo-pictionary');
    });

    it('Correcto emite marcar-acierto-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-acierto');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('ADIVINANDO'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-acierto-pictionary');
    });

    it('Incorrecto emite marcar-error-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-error');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('ADIVINANDO'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-error-pictionary');
    });

    it('Pasar palabra emite pasar-palabra-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-pasar');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('ADIVINANDO'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('pasar-palabra-pictionary');
    });

    it('Siguiente turno emite siguiente-turno-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-siguiente-turno');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('ESPERA_VALIDACION'), container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-turno-pictionary');
    });

    it('Siguiente ronda emite siguiente-ronda-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      mockBoton(container, 'btn-pic-siguiente-ronda');
      PictionaryGameUI.renderizarPanelConductor(estadoEn('FIN_DE_RONDA', { ronda_actual: 1, total_rondas: 2 }), container, contextoBase({ juegoEjecutado: { id: 'j1', configuracion_congelada: { rondas: 2 } } }), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-ronda-pictionary');
    });

    it('no emite acciones viejas iniciar-modo / siguiente-modo / siguiente-equipo', () => {
      const callbacks = { onAccion: vi.fn() };
      PictionaryGameUI.renderizarPanelConductor(estadoEn('INICIO_RONDA'), container, contextoBase(), callbacks);
      PictionaryGameUI.renderizarPanelConductor(estadoEn('ESPERA_VALIDACION'), container, contextoBase(), callbacks);
      PictionaryGameUI.renderizarPanelConductor(estadoEn('CAMBIO_TURNO'), container, contextoBase(), callbacks);
      const tipos = callbacks.onAccion.mock.calls.map((c) => c[0]);
      expect(tipos).not.toContain('iniciar-modo-pictionary');
      expect(tipos).not.toContain('siguiente-modo-pictionary');
      expect(tipos).not.toContain('siguiente-equipo-pictionary');
    });
  });

  describe('sin dependencia de MODOS legacy', () => {
    it('FASES exportadas son las 9 de submodos', () => {
      expect(FASES).toHaveLength(9);
      expect(FASES).toContain('SELECCIONANDO_SUBMODO');
      expect(FASES).toContain('SELECCIONANDO_SET');
    });

    it('estado inicial no tiene modo_actual', () => {
      expect(estadoBase().modo_actual).toBeUndefined();
      expect(estadoBase().submodo_actual).toBe('PALABRAS');
    });
  });

  describe('cleanup', () => {
    it('cleanup no lanza error sin timers', () => {
      expect(() => PictionaryGameUI.cleanup()).not.toThrow();
    });
  });
});
