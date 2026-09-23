import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoscoGameUI } from '../../../../../src/ui/games/rosco/RoscoGameUI.js';
import { ALFABETO, ESTADO_LETRA, RoscoGameDefinition } from '../../../../../src/games/rosco/RoscoGameDefinition.js';

const CONFIG = { rondas: 2, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 };

function crearContainer() {
  return { innerHTML: '', querySelector: vi.fn(() => null), querySelectorAll: vi.fn(() => []) };
}

function crearContainerDom() {
  const elems = new Map();
  const getEl = (sel) => {
    if (!elems.has(sel)) {
      elems.set(sel, {
        value: '',
        listeners: {},
        addEventListener(ev, fn) { this.listeners[ev] = fn; },
        click() { this.listeners.click?.(); },
        change() { this.listeners.change?.(); }
      });
    }
    return elems.get(sel);
  };
  return {
    innerHTML: '',
    querySelector: (sel) => getEl(sel),
    querySelectorAll: () => []
  };
}

function contextoBase(setsDisponibles = []) {
  return {
    partida: { id: 'p1', estado: 'EN_CURSO' },
    juegoEjecutado: {
      id: 'j1',
      juego_codigo: 'ROSCO',
      configuracion_congelada: CONFIG
    },
    equipos: [{ nombre: 'Alfa', puntaje: 0 }, { nombre: 'Beta', puntaje: 0 }],
    puedeControlar: true,
    setsDisponibles
  };
}

function estadoInicial(sets = null) {
  return RoscoGameDefinition.estadoInicial(CONFIG, sets);
}

function iniciarDeshabilitado(html) {
  const tag = html.match(/<button[^>]*id="btn-rosco-modal-iniciar"[^>]*>/);
  return tag ? /\bdisabled\b/.test(tag[0]) : null;
}

describe('RoscoGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { RoscoGameUI.cleanup(); });

  describe('contrato', () => {
    it('tiene codigo ROSCO', () => {
      expect(RoscoGameUI.codigo).toBe('ROSCO');
    });

    it('tiene renderizarAreaJuego como función', () => {
      expect(typeof RoscoGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como función', () => {
      expect(typeof RoscoGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como función', () => {
      expect(typeof RoscoGameUI.cleanup).toBe('function');
    });
  });

  describe('renderizarAreaJuego — sin fase', () => {
    it('muestra placeholder cuando no hay fase', () => {
      RoscoGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Rosco');
      expect(container.innerHTML).toContain('Iniciar juego');
    });
  });

  describe('renderizarAreaJuego — con fase', () => {
    it('renderiza 27 letras del rosco', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      for (const letra of ALFABETO) {
        expect(container.innerHTML).toContain(`data-letra="${letra}"`);
      }
    });

    it('muestra la definición de la letra actual desde set_ronda_actual', () => {
      const items = ALFABETO.map((letra) => ({
        letra, definicion: `Def ${letra}`, respuesta: `Resp ${letra}`
      }));
      const estado = estadoInicial([{ id: 's1', items }]);
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Def A');
    });

    it('muestra Sin definición si el set actual no trae items', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Sin definición');
    });

    it('muestra marcador de ambos equipos', () => {
      const estado = { ...estadoInicial(), puntos_equipo_1: 25, puntos_equipo_2: 15, fase: 'TURNO_ACTIVO' };
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
    });

    it('muestra ronda actual y total', () => {
      const estado = { ...estadoInicial(), ronda_actual: 2, total_rondas: 3, fase: 'INICIO_RONDA' };
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
    });
  });

  describe('renderizarPanelConductor — botones por fase', () => {
    it('sin fase: muestra Iniciar juego', () => {
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, container, contextoBase(), callbacks);
      expect(container.innerHTML).toContain('btn-rosco-iniciar-juego');
    });

    it('INICIO_RONDA: muestra Iniciar turno', () => {
      const estado = { ...estadoInicial(), fase: 'INICIO_RONDA' };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-rosco-iniciar-turno');
    });

    it('TURNO_ACTIVO: muestra OK, X, Pasapalabra, Saltar, Siguiente equipo', () => {
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-rosco-acierto');
      expect(container.innerHTML).toContain('btn-rosco-error');
      expect(container.innerHTML).toContain('btn-rosco-pasapalabra');
      expect(container.innerHTML).toContain('btn-rosco-saltar');
      expect(container.innerHTML).toContain('btn-rosco-siguiente-equipo');
    });

    it('CAMBIO_TURNO: muestra Iniciar turno para el otro equipo', () => {
      const estado = { ...estadoInicial(), fase: 'CAMBIO_TURNO', equipo_actual: 1 };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-rosco-iniciar-turno');
      expect(container.innerHTML).toContain('Beta');
    });

    it('FIN_DE_RONDA: muestra siguiente ronda o finalizar', () => {
      const estado = { ...estadoInicial(), fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-rosco-siguiente-ronda');
    });

    it('FIN_DE_RONDA usa total_rondas del estado aunque config diga otra cosa', () => {
      const estado = { ...estadoInicial(), fase: 'FIN_DE_RONDA', ronda_actual: 2, total_rondas: 3 };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('btn-rosco-siguiente-ronda');
      expect(container.innerHTML).toContain('Iniciar siguiente ronda');
    });

    it('FIN_DE_JUEGO: no muestra botones', () => {
      const estado = { ...estadoInicial(), fase: 'FIN_DE_JUEGO' };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-rosco-');
    });
  });

  describe('renderizarPanelConductor — emisión de acciones', () => {
    it('OK emite marcar-acierto-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-acierto') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-acierto-rosco');
    });

    it('X emite marcar-error-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-error') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('marcar-error-rosco');
    });

    it('Pasapalabra emite pasapalabra-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-pasapalabra') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('pasapalabra-rosco');
    });

    it('Saltar letra emite saltar-letra-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-saltar') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('saltar-letra-rosco');
    });

    it('Siguiente equipo emite siguiente-equipo-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-siguiente-equipo') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-equipo-rosco');
    });

    it('Siguiente ronda emite siguiente-ronda-rosco', () => {
      const callbacks = { onAccion: vi.fn() };
      const estado = { ...estadoInicial(), fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      container.querySelector = vi.fn((sel) => {
        if (sel === '#btn-rosco-siguiente-ronda') return { addEventListener: vi.fn((_, fn) => fn()) };
        return null;
      });
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), callbacks);
      expect(callbacks.onAccion).toHaveBeenCalledWith('siguiente-ronda-rosco');
    });
  });

  describe('modal de inicio', () => {
    const sets2 = [
      { id: 's1', nombre: 'Set Uno' },
      { id: 's2', nombre: 'Set Dos' }
    ];

    it('Iniciar juego abre el modal con selector de rondas y dropdown de set', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      expect(c.innerHTML).not.toContain('rosco-modal-inicio');
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      expect(c.innerHTML).toContain('rosco-select-rondas');
      expect(c.innerHTML).toContain('rosco-select-set-0');
    });

    it('sin sets disponibles: muestra mensaje y deshabilita Iniciar', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase([]), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      expect(c.innerHTML).toContain('No hay sets disponibles');
      expect(iniciarDeshabilitado(c.innerHTML)).toBe(true);
    });

    it('sin seleccionar set: Iniciar deshabilitado', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(iniciarDeshabilitado(c.innerHTML)).toBe(true);
    });

    it('seleccionar un set habilita Iniciar', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      const sel0 = c.querySelector('#rosco-select-set-0');
      sel0.value = 's1';
      sel0.change();
      expect(iniciarDeshabilitado(c.innerHTML)).toBe(false);
    });

    it('cambiar rondas a 2 muestra dos dropdowns de set', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      const selectRondas = c.querySelector('#rosco-select-rondas');
      selectRondas.value = '2';
      selectRondas.change();
      expect(c.innerHTML).toContain('rosco-select-set-0');
      expect(c.innerHTML).toContain('rosco-select-set-1');
      expect(c.innerHTML).toContain('Ronda 2');
    });

    it('el selector de rondas no ofrece más rondas que sets disponibles', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('<option value="2"');
      expect(c.innerHTML).not.toContain('<option value="3"');
    });

    it('selección duplicada muestra error y no emite la acción', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      c.querySelector('#rosco-select-rondas').value = '2';
      c.querySelector('#rosco-select-rondas').change();
      c.querySelector('#rosco-select-set-0').value = 's1';
      c.querySelector('#rosco-select-set-0').change();
      c.querySelector('#rosco-select-set-1').value = 's1';
      c.querySelector('#rosco-select-set-1').change();
      c.querySelector('#btn-rosco-modal-iniciar').click();
      expect(callbacks.onAccion).not.toHaveBeenCalled();
      expect(c.innerHTML).toContain('No podés repetir el mismo set en dos rondas');
    });

    it('Iniciar emite iniciar-juego-rosco-con-sets con el set elegido', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      c.querySelector('#rosco-select-set-0').value = 's1';
      c.querySelector('#rosco-select-set-0').change();
      c.querySelector('#btn-rosco-modal-iniciar').click();
      expect(callbacks.onAccion).toHaveBeenCalledWith(
        'iniciar-juego-rosco-con-sets',
        { sets: [{ id: 's1' }] }
      );
    });

    it('Iniciar con 2 rondas emite los 2 sets en orden', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      c.querySelector('#rosco-select-rondas').value = '2';
      c.querySelector('#rosco-select-rondas').change();
      c.querySelector('#rosco-select-set-0').value = 's2';
      c.querySelector('#rosco-select-set-0').change();
      c.querySelector('#rosco-select-set-1').value = 's1';
      c.querySelector('#rosco-select-set-1').change();
      c.querySelector('#btn-rosco-modal-iniciar').click();
      expect(callbacks.onAccion).toHaveBeenCalledWith(
        'iniciar-juego-rosco-con-sets',
        { sets: [{ id: 's2' }, { id: 's1' }] }
      );
    });

    it('Cancelar cierra el modal', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      c.querySelector('#btn-rosco-modal-cancelar').click();
      expect(c.innerHTML).not.toContain('rosco-modal-inicio');
      expect(callbacks.onAccion).not.toHaveBeenCalled();
    });

    it('cierra el modal si puedeControlar es false', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      const ctxSinControl = contextoBase(sets2);
      ctxSinControl.puedeControlar = false;
      RoscoGameUI.renderizarPanelConductor({}, c, ctxSinControl, callbacks);
      expect(c.innerHTML).not.toContain('rosco-modal-inicio');
    });

    it('cierra el modal cuando el juego tiene fase', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(sets2), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      const estado = { ...estadoInicial(), fase: 'INICIO_RONDA' };
      RoscoGameUI.renderizarPanelConductor(estado, c, contextoBase(sets2), callbacks);
      expect(c.innerHTML).not.toContain('rosco-modal-inicio');
    });
  });

  describe('renderizarAreaJuego — timer behavior', () => {
    it('TURNO_ACTIVO equipo 1 intenta iniciar timer', () => {
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO', equipo_actual: 1 };
      const containerReal = { innerHTML: '', querySelector: vi.fn((sel) => {
        if (sel === '#rosco-timer-eq1') return { textContent: '' };
        return null;
      }), querySelectorAll: vi.fn(() => []) };
      RoscoGameUI.renderizarAreaJuego(estado, containerReal, contextoBase(), { onAccion: vi.fn() });
      expect(containerReal.innerHTML).toContain('TURNO ACTIVO');
    });
  });

  describe('renderizarAreaJuego — estados de letras', () => {
    it('marca letras correctas con check', () => {
      const estado = estadoInicial();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      estado.rosco[1].estado = ESTADO_LETRA.INCORRECTA;
      estado.rosco[2].estado = ESTADO_LETRA.PASADA;
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-letra="A"');
      expect(container.innerHTML).toContain('✓');
      expect(container.innerHTML).toContain('✗');
      expect(container.innerHTML).toContain('→');
    });

    it('resalta la letra actual con la clase active', () => {
      const estado = estadoInicial();
      estado.indice_actual = 5;
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('letter-btn rounded-full active');
    });
  });

  describe('renderizarAreaJuego — rosco circular', () => {
    it('renderiza .rosco-circular con tamaño md', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('rosco-circular');
      expect(container.innerHTML).toContain('rosco-size-md');
    });

    it('cada letter-node tiene posición inline en el círculo', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      const nodes = container.innerHTML.match(/data-letra="[^"]+"[\s\S]*?style="left: [\d.-]+%; top: [\d.-]+%;"/g) || [];
      expect(nodes.length).toBe(27);
    });

    it('incluye el anillo SVG de progreso', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('<svg id="rosco-progress"');
      expect(container.innerHTML).toContain('rotate(-90 200 200)');
    });

    it('renderiza la tarjeta central con letra y definición', () => {
      const items = ALFABETO.map((letra) => ({ letra, definicion: `Def ${letra}`, respuesta: `Resp ${letra}` }));
      const estado = estadoInicial([{ id: 's1', items }]);
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('rosco-central');
      expect(container.innerHTML).toContain('rosco-letter-badge');
      expect(container.innerHTML).toContain('rosco-definition');
    });

    it('el conductor no ve la respuesta en la tarjeta central', () => {
      const items = ALFABETO.map((letra) => ({ letra, definicion: `Def ${letra}`, respuesta: `Resp ${letra}` }));
      const estado = estadoInicial([{ id: 's1', items }]);
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('rosco-respuesta');
      expect(container.innerHTML).not.toContain('Resp A');
    });

    it('renderiza la leyenda con conteos', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('rosco-legend');
      expect(container.innerHTML).toContain('0 Verdes • 0 Rojas • 27 Restantes');
    });

    it('ya no renderiza la card de definición vieja (Letra X)', () => {
      const estado = estadoInicial();
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('>Letra A<');
    });
  });

  describe('cleanup', () => {
    it('cleanup no lanza error sin timers', () => {
      expect(() => RoscoGameUI.cleanup()).not.toThrow();
    });

    it('cleanup cierra el modal de inicio', () => {
      const c = crearContainerDom();
      const callbacks = { onAccion: vi.fn() };
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(setsDePrueba()), callbacks);
      c.querySelector('#btn-rosco-iniciar-juego').click();
      expect(c.innerHTML).toContain('rosco-modal-inicio');
      RoscoGameUI.cleanup();
      RoscoGameUI.renderizarPanelConductor({}, c, contextoBase(setsDePrueba()), callbacks);
      expect(c.innerHTML).not.toContain('rosco-modal-inicio');
    });
  });

  describe('regresión — conductor no puede retroceder letras', () => {
    it('letras marcadas como correcta/incorrecta tienen clase green/red', () => {
      const estado = estadoInicial();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      estado.rosco[1].estado = ESTADO_LETRA.INCORRECTA;
      RoscoGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('letter-btn rounded-full green');
      expect(container.innerHTML).toContain('letter-btn rounded-full red');
      expect(container.innerHTML).not.toContain('opacity-70');
    });
  });

  describe('renderizarPanelConductor — card RESPUESTA', () => {
    function estadoConSet(fase) {
      const items = ALFABETO.map((letra) => ({ letra, definicion: `Def ${letra}`, respuesta: `Resp ${letra}` }));
      return { ...estadoInicial([{ id: 's1', items }]), fase };
    }

    it('TURNO_ACTIVO muestra RESPUESTA con la respuesta de la letra actual', () => {
      const estado = estadoConSet('TURNO_ACTIVO');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('rosco-panel-respuesta');
      expect(container.innerHTML).toContain('RESPUESTA');
      expect(container.innerHTML).toContain('Resp A');
    });

    it('TURNO_ACTIVO sin items muestra placeholder —', () => {
      const estado = { ...estadoInicial(), fase: 'TURNO_ACTIVO' };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('RESPUESTA');
      expect(container.innerHTML).toContain('—');
    });

    it('la card RESPUESTA va arriba de los botones de turno', () => {
      const estado = estadoConSet('TURNO_ACTIVO');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      const idxResp = container.innerHTML.indexOf('rosco-panel-respuesta');
      const idxOk = container.innerHTML.indexOf('btn-rosco-acierto');
      expect(idxResp).toBeGreaterThan(-1);
      expect(idxOk).toBeGreaterThan(-1);
      expect(idxResp).toBeLessThan(idxOk);
    });

    it('INICIO_RONDA no muestra RESPUESTA', () => {
      const estado = estadoConSet('INICIO_RONDA');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('RESPUESTA');
    });

    it('CAMBIO_TURNO no muestra RESPUESTA', () => {
      const estado = estadoConSet('CAMBIO_TURNO');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('RESPUESTA');
    });

    it('FIN_DE_RONDA no muestra RESPUESTA', () => {
      const estado = estadoConSet('FIN_DE_RONDA');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('RESPUESTA');
    });

    it('FIN_DE_JUEGO no muestra RESPUESTA', () => {
      const estado = estadoConSet('FIN_DE_JUEGO');
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('RESPUESTA');
    });
  });

  describe('renderizarPanelConductor —_CAMBIO_TURNO', () => {
    it('muestra nombre del equipo destino', () => {
      const estado = { ...estadoInicial(), fase: 'CAMBIO_TURNO', equipo_actual: 1 };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Beta');
    });
  });

  describe('renderizarPanelConductor — FIN_DE_RONDA última ronda', () => {
    it('muestra Finalizar juego en última ronda', () => {
      const estado = { ...estadoInicial(), fase: 'FIN_DE_RONDA', ronda_actual: 2, total_rondas: 2 };
      RoscoGameUI.renderizarPanelConductor(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Finalizar juego');
    });
  });
});

function setsDePrueba() {
  return [{ id: 's1', nombre: 'Set Uno' }];
}
