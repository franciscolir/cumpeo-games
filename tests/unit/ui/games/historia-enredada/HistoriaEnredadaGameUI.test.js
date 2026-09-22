import { describe, it, expect, beforeEach } from 'vitest';
import { HistoriaEnredadaGameUI } from '../../../../../src/ui/games/historia-enredada/HistoriaEnredadaGameUI.js';

/**
 * Container mock — sin DOM real.
 * innerHTML se setea pero no se parsea.
 * querySelector y querySelectorAll devuelven null/[] por defecto.
 * Los tests que necesiten botones específicos van a manejar el mock a mano.
 */
function crearContainer() {
  const clicks = {};
  const container = {
    innerHTML: '',
    _clicks: clicks,
    querySelector: (sel) => {
      // Simula devolver un boton con addEventListener que guarda el handler
      if (clicks[sel]) return clicks[sel];
      return null;
    },
    querySelectorAll: () => []
  };
  // Pre-registrar selectores conocidos
  return container;
}

/**
 * Container mock que captura addEventListener por selector.
 * Se usa despues de renderizar (innerHTML ya seteado).
 */
function crearContainerConHandlers(selectores) {
  const handlers = {};
  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (!selectores.includes(sel)) return null;
      if (!handlers[sel]) {
        handlers[sel] = {
          _handler: null,
          addEventListener: (evt, fn) => { handlers[sel]._handler = fn; },
          click: () => { if (handlers[sel]._handler) handlers[sel]._handler(); }
        };
      }
      return handlers[sel];
    },
    querySelectorAll: (sel) => {
      // Soporta data-historia-id
      if (sel === '[data-historia-id]') return container._cards || [];
      return [];
    },
    _handlers: handlers
  };
  return container;
}

const EQUIPOS = [{ nombre: 'Rojo' }, { nombre: 'Azul' }];
const ITEMS = [
  { id: 'h1', titulo: 'El robo', descripcion: 'Dos ladrones', guion: '...' },
  { id: 'h2', titulo: 'El naufragio', descripcion: 'Un barco', guion: '...' },
  { id: 'h3', titulo: 'La boda', descripcion: 'Una boda', guion: '...' }
];
const CONTEXTO = { equipos: EQUIPOS, itemsDelJuego: ITEMS };

describe('HistoriaEnredadaGameUI', () => {
  describe('contrato', () => {
    it('expone codigo HISTORIA_ENREDADA', () => {
      expect(HistoriaEnredadaGameUI.codigo).toBe('HISTORIA_ENREDADA');
    });
    it('tiene renderizarAreaJuego', () => {
      expect(typeof HistoriaEnredadaGameUI.renderizarAreaJuego).toBe('function');
    });
    it('tiene renderizarPanelConductor', () => {
      expect(typeof HistoriaEnredadaGameUI.renderizarPanelConductor).toBe('function');
    });
    it('tiene cleanup', () => {
      expect(typeof HistoriaEnredadaGameUI.cleanup).toBe('function');
    });
  });

  describe('area de juego sin fase', () => {
    it('muestra placeholder si no hay fase', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarAreaJuego(null, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('Historia Enredada');
      expect(c.innerHTML).toContain('Iniciá la partida');
    });
    it('muestra placeholder si estado vacio', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarAreaJuego({}, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('Historia Enredada');
    });
  });

  describe('area de juego con fase', () => {
    const estado = {
      fase: 'INICIO_RONDA',
      ronda_actual: 1,
      total_rondas: 2,
      equipo_actual: 1,
      puntos_equipo_1: 5,
      puntos_equipo_2: 10,
      historia_elegida_id: null,
      historias_usadas: []
    };

    it('muestra ronda y equipo', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarAreaJuego(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('Ronda 1 / 2');
      expect(c.innerHTML).toContain('Rojo');
    });
    it('muestra marcador', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarAreaJuego(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('5');
      expect(c.innerHTML).toContain('10');
    });
    it('sin historia muestra esperando', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarAreaJuego(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('Esperando selección');
    });
    it('con historia muestra titulo y descripcion', () => {
      const c = crearContainer();
      const estadoConHistoria = { ...estado, historia_elegida_id: 'h1' };
      HistoriaEnredadaGameUI.renderizarAreaJuego(estadoConHistoria, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('El robo');
      expect(c.innerHTML).toContain('Dos ladrones');
    });
  });

  describe('panel sin fase', () => {
    it('renderiza el boton Iniciar juego', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(null, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-iniciar-juego');
      expect(c.innerHTML).toContain('Iniciar juego');
    });

    it('emite iniciar-juego-historia al hacer click', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-iniciar-juego']);
      HistoriaEnredadaGameUI.renderizarPanelConductor(null, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-iniciar-juego').click();
      expect(acciones).toContain('iniciar-juego-historia');
    });
  });

  describe('panel INICIO_RONDA', () => {
    const estado = { fase: 'INICIO_RONDA', equipo_actual: 1, ronda_actual: 1, total_rondas: 1 };

    it('renderiza Comenzar ronda', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-iniciar-ronda');
      expect(c.innerHTML).toContain('Comenzar ronda');
    });

    it('emite iniciar-ronda-historia', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-iniciar-ronda']);
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-iniciar-ronda').click();
      expect(acciones).toContain('iniciar-ronda-historia');
    });
  });

  describe('panel SELECCIONANDO_HISTORIA', () => {
    const estado = { fase: 'SELECCIONANDO_HISTORIA', equipo_actual: 1, historias_usadas: [] };

    it('renderiza cards de historias disponibles', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('El robo');
      expect(c.innerHTML).toContain('El naufragio');
      expect(c.innerHTML).toContain('La boda');
      expect(c.innerHTML).toContain('data-historia-id="h1"');
    });

    it('excluye historias usadas del HTML', () => {
      const c = crearContainer();
      const estadoUsado = { ...estado, historias_usadas: ['h1'] };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estadoUsado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).not.toContain('data-historia-id="h1"');
      expect(c.innerHTML).toContain('data-historia-id="h2"');
    });

    it('muestra mensaje si no hay historias', () => {
      const c = crearContainer();
      const estadoVacio = { ...estado, historias_usadas: ['h1', 'h2', 'h3'] };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estadoVacio, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('No hay historias disponibles');
    });
  });

  describe('panel PREPARANDO', () => {
    const estado = { fase: 'PREPARANDO', equipo_actual: 1 };

    it('renderiza Empezar actuacion', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-empezar-actuacion');
    });

    it('emite empezar-actuacion-historia', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-empezar-actuacion']);
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-empezar-actuacion').click();
      expect(acciones).toContain('empezar-actuacion-historia');
    });
  });

  describe('panel ACTUANDO', () => {
    const estado = { fase: 'ACTUANDO', equipo_actual: 1 };

    it('renderiza Empezar votacion', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-empezar-votacion');
    });

    it('emite empezar-votacion-historia', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-empezar-votacion']);
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-empezar-votacion').click();
      expect(acciones).toContain('empezar-votacion-historia');
    });
  });

  describe('panel VOTANDO', () => {
    const estado = { fase: 'VOTANDO', equipo_actual: 1 };

    it('renderiza input y boton Asignar', () => {
      const c = crearContainer();
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('input-puntos-historia');
      expect(c.innerHTML).toContain('btn-he-asignar-puntos');
    });

    it('emite asignar-puntos-historia con puntos validos', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-asignar-puntos', '#input-puntos-historia', '#input-puntos-error']);
      const inputMock = { value: '7' };
      const errorMock = { textContent: '', classList: { add: () => {}, remove: () => {} } };
      const originalQS = c.querySelector;
      c.querySelector = (sel) => {
        if (sel === '#input-puntos-historia') return inputMock;
        if (sel === '#input-puntos-error') return errorMock;
        return originalQS.call(c, sel);
      };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo, payload) => acciones.push({ tipo, payload }) });
      c.querySelector('#btn-he-asignar-puntos').click();
      expect(acciones).toContainEqual({ tipo: 'asignar-puntos-historia', payload: { puntos: 7 } });
    });

    it('no emite con texto invalido', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-asignar-puntos', '#input-puntos-historia', '#input-puntos-error']);
      const inputMock = { value: 'abc' };
      const errorMock = { textContent: '', classList: { add: () => {}, remove: () => {} } };
      const originalQS = c.querySelector;
      c.querySelector = (sel) => {
        if (sel === '#input-puntos-historia') return inputMock;
        if (sel === '#input-puntos-error') return errorMock;
        return originalQS.call(c, sel);
      };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-asignar-puntos').click();
      expect(acciones).not.toContain('asignar-puntos-historia');
    });

    it('no emite con puntos negativos', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-asignar-puntos', '#input-puntos-historia', '#input-puntos-error']);
      const inputMock = { value: '-1' };
      const errorMock = { textContent: '', classList: { add: () => {}, remove: () => {} } };
      const originalQS = c.querySelector;
      c.querySelector = (sel) => {
        if (sel === '#input-puntos-historia') return inputMock;
        if (sel === '#input-puntos-error') return errorMock;
        return originalQS.call(c, sel);
      };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-asignar-puntos').click();
      expect(acciones).not.toContain('asignar-puntos-historia');
    });
  });

  describe('panel FIN_DE_RONDA', () => {
    it('renderiza Siguiente ronda si hay mas', () => {
      const c = crearContainer();
      const estado = { fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-siguiente-ronda');
      expect(c.innerHTML).toContain('Siguiente ronda');
    });

    it('renderiza Finalizar juego si es la ultima', () => {
      const c = crearContainer();
      const estado = { fase: 'FIN_DE_RONDA', ronda_actual: 2, total_rondas: 2 };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: () => {} });
      expect(c.innerHTML).toContain('btn-he-finalizar-juego');
      expect(c.innerHTML).toContain('Finalizar juego');
    });

    it('emite iniciar-siguiente-ronda-historia', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-siguiente-ronda']);
      const estado = { fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-siguiente-ronda').click();
      expect(acciones).toContain('iniciar-siguiente-ronda-historia');
    });

    it('emite finalizar-historia', () => {
      const acciones = [];
      const c = crearContainerConHandlers(['#btn-he-finalizar-juego']);
      const estado = { fase: 'FIN_DE_RONDA', ronda_actual: 2, total_rondas: 2 };
      HistoriaEnredadaGameUI.renderizarPanelConductor(estado, c, CONTEXTO, { onAccion: (tipo) => acciones.push(tipo) });
      c.querySelector('#btn-he-finalizar-juego').click();
      expect(acciones).toContain('finalizar-historia');
    });
  });

  describe('cleanup', () => {
    it('no falla', () => {
      expect(() => HistoriaEnredadaGameUI.cleanup()).not.toThrow();
    });
  });
});
