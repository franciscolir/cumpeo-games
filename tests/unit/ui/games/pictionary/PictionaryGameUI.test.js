import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PictionaryGameUI } from '../../../../../src/ui/games/pictionary/PictionaryGameUI.js';
import { PictionaryGameDefinition } from '../../../../../src/games/pictionary/PictionaryGameDefinition.js';

function crearContainer() {
  return { innerHTML: '', querySelector: vi.fn(() => null), querySelectorAll: vi.fn(() => []) };
}

function contextoBase() {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'PICTIONARY',
      configuracion_congelada: {
        rondas: 2,
        palabras_por_modo: 1,
        segundos_por_modo: 60,
        puntos_por_acierto: 10,
        penalizacion_por_error: 5,
        penalizacion_por_pasar: 3,
        bonus_puntos: 15
      }
    },
    equipos: [{ nombre: 'Alfa', puntaje: 0 }, { nombre: 'Beta', puntaje: 0 }],
    puedeControlar: true,
    itemsDelJuego: []
  };
}

function estadoBase(overrides = {}) {
  return PictionaryGameDefinition.estadoInicial({
    rondas: 2,
    palabras_por_modo: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15,
    ...overrides
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

  describe('renderizarAreaJuego — con fase', () => {
    it('muestra header con ronda, fase, modo y equipo', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA', ronda_actual: 2, total_rondas: 3, modo_actual: 2, equipo_actual: 1 };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('INICIO RONDA');
      expect(container.innerHTML).toContain('Modo 2');
      expect(container.innerHTML).toContain('Equipo 1');
    });

    it('muestra marcador de ambos equipos', () => {
      const estado = { ...estadoBase(), puntos_equipo_1: 25, puntos_equipo_2: 15, fase: 'ADIVINANDO' };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
    });

    it('muestra concepto cuando palabra_actual existe', () => {
      const estado = {
        ...estadoBase(),
        fase: 'MOSTRANDO_PALABRA',
        palabra_actual: { concepto: 'PERRO', modo: 1, prohibidas: ['mascota', 'guau'] }
      };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('PERRO');
    });

    it('muestra placeholder cuando no hay concepto', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA', palabra_actual: null };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando palabra');
    });
  });

  describe('renderizarAreaJuego — modo 1 muestra prohibidas', () => {
    it('muestra lista de palabras prohibidas en modo 1', () => {
      const estado = {
        ...estadoBase(),
        fase: 'ADIVINANDO',
        modo_actual: 1,
        palabra_actual: { concepto: 'GATO', modo: 1, prohibidas: ['felino', 'miau'] },
        prohibidas_actuales: ['felino', 'miau']
      };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Palabras prohibidas');
      expect(container.innerHTML).toContain('felino');
      expect(container.innerHTML).toContain('miau');
    });

    it('no muestra prohibidas en modo 2', () => {
      const estado = {
        ...estadoBase(),
        fase: 'ADIVINANDO',
        modo_actual: 2,
        palabra_actual: { concepto: 'GATO', modo: 2 },
        prohibidas_actuales: []
      };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('Palabras prohibidas');
    });
  });

  describe('renderizarAreaJuego — indicadores por modo', () => {
    it('modo 3 muestra indicación de pizarra', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA', modo_actual: 3 };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Pizarra física');
    });

    it('modo 4 muestra indicación de espaldas', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA', modo_actual: 4 };
      PictionaryGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Adivinador de espaldas');
    });
  });

  describe('renderizarPanelConductor — botones por fase', () => {
    it('sin fase: muestra Iniciar juego', () => {
      const callbacks = { onAccion: vi.fn() };
      PictionaryGameUI.renderizarPanelConductor({}, container, contextoBase(), callbacks);
      expect(container.innerHTML).toContain('btn-pic-iniciar-juego');
    });

    it('INICIO_RONDA: muestra Iniciar modo', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA', modo_actual: 1 };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-iniciar-modo');
    });

    it('MOSTRANDO_PALABRA: muestra Iniciar tiempo', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-iniciar-tiempo');
    });

    it('ADIVINANDO: muestra Correcto, Incorrecto, Pasar palabra', () => {
      const estado = { ...estadoBase(), fase: 'ADIVINANDO' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-acierto');
      expect(container.innerHTML).toContain('btn-pic-error');
      expect(container.innerHTML).toContain('btn-pic-pasar');
    });

    it('ESPERA_VALIDACION: muestra Siguiente modo', () => {
      const estado = { ...estadoBase(), fase: 'ESPERA_VALIDACION' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-siguiente-modo');
    });

    it('CAMBIO_MODO: muestra Siguiente equipo', () => {
      const estado = { ...estadoBase(), fase: 'CAMBIO_MODO', equipo_actual: 1 };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-siguiente-equipo');
      expect(container.innerHTML).toContain('Beta');
    });

    it('FIN_DE_RONDA: muestra siguiente ronda o finalizar', () => {
      const estado = { ...estadoBase(), fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-siguiente-ronda');
    });

    it('FIN_DE_JUEGO: no muestra botones de control', () => {
      const estado = { ...estadoBase(), fase: 'FIN_DE_JUEGO' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-pic-acierto');
      expect(container.innerHTML).not.toContain('btn-pic-iniciar-modo');
    });
  });

  describe('renderizarPanelConductor — botón Bonus siempre visible', () => {
    it('muestra botón Bonus Eq1 y Bonus Eq2 en INICIO_RONDA', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-bonus-eq1');
      expect(container.innerHTML).toContain('btn-pic-bonus-eq2');
      expect(container.innerHTML).toContain('Bonus: 15 pts');
    });

    it('muestra input numérico para bonus Eq1 y Eq2', () => {
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('pic-bonus-input-eq1');
      expect(container.innerHTML).toContain('pic-bonus-input-eq2');
      expect(container.innerHTML).toContain('type="number"');
    });

    it('muestra botón Bonus en ADIVINANDO', () => {
      const estado = { ...estadoBase(), fase: 'ADIVINANDO' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-bonus-eq1');
      expect(container.innerHTML).toContain('btn-pic-bonus-eq2');
    });

    it('muestra botón Bonus en FIN_DE_JUEGO', () => {
      const estado = { ...estadoBase(), fase: 'FIN_DE_JUEGO' };
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-pic-bonus-eq1');
      expect(container.innerHTML).toContain('btn-pic-bonus-eq2');
    });

    it('bonus con valor válido emite aplicar-bonus-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA' };
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
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA' };
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
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA' };
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
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-iniciar-juego') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor({}, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('iniciar-juego-pictionary');
    });

    it('Iniciar modo emite iniciar-modo-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'INICIO_RONDA', modo_actual: 1 };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-iniciar-modo') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('iniciar-modo-pictionary');
    });

    it('Iniciar tiempo emite iniciar-tiempo-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-iniciar-tiempo') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('iniciar-tiempo-pictionary');
    });

    it('Correcto emite marcar-acierto-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'ADIVINANDO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-acierto') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-acierto-pictionary');
    });

    it('Incorrecto emite marcar-error-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'ADIVINANDO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-error') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-error-pictionary');
    });

    it('Pasar palabra emite pasar-palabra-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'ADIVINANDO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-pasar') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('pasar-palabra-pictionary');
    });

    it('Siguiente modo emite siguiente-modo-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'ESPERA_VALIDACION' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-siguiente-modo') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-modo-pictionary');
    });

    it('Siguiente equipo emite siguiente-equipo-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'CAMBIO_MODO', equipo_actual: 1 };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-siguiente-equipo') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-equipo-pictionary');
    });

    it('Siguiente ronda emite siguiente-ronda-pictionary', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoBase(), fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-pic-siguiente-ronda') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      PictionaryGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-ronda-pictionary');
    });
  });

  describe('cleanup', () => {
    it('cleanup no lanza error sin timers', () => {
      expect(() => PictionaryGameUI.cleanup()).not.toThrow();
    });
  });
});
