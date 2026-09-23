import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoriaGameUI } from '../../../../../src/ui/games/memoria/MemoriaGameUI.js';

function crearContainer() {
  const listeners = {};
  return {
    innerHTML: '',
    querySelector: vi.fn((sel) => {
      return {
        addEventListener: vi.fn((evt, cb) => { listeners[sel] = listeners[sel] || {}; listeners[sel][evt] = cb; }),
        getAttribute: vi.fn((attr) => {
          if (attr === 'data-elemento-index') return '0';
          if (attr === 'data-set-id') return 's1';
          return null;
        })
      };
    }),
    querySelectorAll: vi.fn((sel) => {
      if (sel === '[data-elemento-index]') {
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
      juego_codigo: 'MEMORIA',
      configuracion_congelada: {
        rondas: 1,
        parejas_por_ronda: 6,
        tiempo_turno_seg: 20,
        tiempo_modal_cambio_turno_seg: 2,
        puntos_por_pareja: 10
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
    set_id: null,
    elementos: [],
    elementos_volteados: [],
    elementos_descubiertos: [],
    parejas_encontradas: 0,
    parejas_equipo_1: 0,
    parejas_equipo_2: 0,
    puntos_equipo_1: 0,
    puntos_equipo_2: 0,
    timer_activo: false,
    tiempo_restante_seg: 20,
    ...overrides
  };
}

function elementosGrilla() {
  return [
    { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
    { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false },
    { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
    { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false }
  ];
}

describe('MemoriaGameUI', () => {
  let container;

  beforeEach(() => { container = crearContainer(); });
  afterEach(() => { MemoriaGameUI.cleanup(); });

  describe('contrato', () => {
    it('tiene codigo MEMORIA', () => {
      expect(MemoriaGameUI.codigo).toBe('MEMORIA');
    });

    it('tiene renderizarAreaJuego como funcion', () => {
      expect(typeof MemoriaGameUI.renderizarAreaJuego).toBe('function');
    });

    it('tiene renderizarPanelConductor como funcion', () => {
      expect(typeof MemoriaGameUI.renderizarPanelConductor).toBe('function');
    });

    it('tiene cleanup como funcion', () => {
      expect(typeof MemoriaGameUI.cleanup).toBe('function');
    });
  });

  describe('renderizarAreaJuego — sin fase', () => {
    it('muestra placeholder cuando no hay fase', () => {
      MemoriaGameUI.renderizarAreaJuego({}, container, contextoBase(), null);
      expect(container.innerHTML).toContain('Memoricé');
      expect(container.innerHTML).toContain('Iniciá la partida');
    });

    it('muestra placeholder en INICIO_RONDA', () => {
      MemoriaGameUI.renderizarAreaJuego(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), null);
      expect(container.innerHTML).toContain('Memoricé');
    });
  });

  describe('renderizarAreaJuego — con fase', () => {
    it('muestra header con ronda, fase y equipo', () => {
      const estado = estadoBase({ fase: 'JUGANDO', ronda_actual: 2, total_rondas: 3, equipo_actual: 1, elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Ronda 2 / 3');
      expect(container.innerHTML).toContain('Jugando');
      expect(container.innerHTML).toContain('Equipo: Alfa');
    });

    it('muestra marcador de ambos equipos', () => {
      const estado = estadoBase({ fase: 'JUGANDO', puntos_equipo_1: 25, puntos_equipo_2: 15, elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('25');
      expect(container.innerHTML).toContain('15');
    });

    it('SELECCIONANDO_SET muestra mensaje de espera', () => {
      const estado = estadoBase({ fase: 'SELECCIONANDO_SET' });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Esperando selección de set');
    });

    it('PREPARANDO_GRILLA muestra mensaje', () => {
      const estado = estadoBase({ fase: 'PREPARANDO_GRILLA' });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Preparando grilla');
    });

    it('JUGANDO renderiza grilla con elementos', () => {
      const estado = estadoBase({ fase: 'JUGANDO', elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('data-elemento-index');
    });

    it('JUGANDO muestra timer', () => {
      const estado = estadoBase({ fase: 'JUGANDO', elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('memoria-timer');
      expect(container.innerHTML).toContain('Tiempo restante');
    });

    it('JUGANDO muestra parejas encontradas', () => {
      const estado = estadoBase({ fase: 'JUGANDO', elementos: elementosGrilla(), parejas_encontradas: 2 });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Parejas: 2 / 2');
    });

    it('elementos descubiertos se muestran visibles', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosGrilla(),
        elementos_descubiertos: [0, 1]
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('bg-tertiary/20');
    });

    it('CAMBIO_TURNO muestra modal overlay', () => {
      const estado = estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2, elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Turno de Beta');
      expect(container.innerHTML).toContain('memoria-modal-cambio-turno');
    });

    it('FIN_DE_RONDA muestra fin de ronda', () => {
      const estado = estadoBase({ fase: 'FIN_DE_RONDA' });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Fin de ronda');
    });

    it('FIN_DE_JUEGO muestra ganador', () => {
      const estado = estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 30, puntos_equipo_2: 20 });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Alfa gana');
    });

    it('FIN_DE_JUEGO empate muestra empate tecnico', () => {
      const estado = estadoBase({ fase: 'FIN_DE_JUEGO', puntos_equipo_1: 10, puntos_equipo_2: 10 });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Empate técnico');
    });
  });

  describe('renderizarPanelConductor — sin fase', () => {
    it('muestra "Iniciar juego"', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: '' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar juego');
    });
  });

  describe('renderizarPanelConductor — con fase', () => {
    it('INICIO_RONDA muestra "Comenzar ronda"', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Comenzar ronda');
    });

    it('SELECCIONANDO_SET muestra cards de sets', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }, { id: 's2', nombre: 'Set 2' }] });
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Set 1');
      expect(container.innerHTML).toContain('Set 2');
    });

    it('SELECCIONANDO_SET sin sets muestra mensaje', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('No hay sets disponibles');
    });

    it('PREPARANDO_GRILLA muestra "Iniciar turno"', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'PREPARANDO_GRILLA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar turno');
    });

    it('JUGANDO muestra selector de equipo', () => {
      const ctx = contextoBase();
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'JUGANDO' }), container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Alfa');
      expect(container.innerHTML).toContain('Beta');
    });

    it('CAMBIO_TURNO muestra "Iniciar turno de <equipo>"', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'CAMBIO_TURNO', equipo_actual: 2 }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Iniciar turno de Beta');
    });

    it('FIN_DE_RONDA muestra "Siguiente ronda"', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_RONDA' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('Siguiente ronda');
    });

    it('FIN_DE_JUEGO no muestra botones', () => {
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'FIN_DE_JUEGO' }), container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).not.toContain('btn-memoria');
    });
  });

  describe('emisión de acciones', () => {
    it('botón iniciar-juego emite acción correcta', () => {
      const onAccion = vi.fn();
      MemoriaGameUI.renderizarPanelConductor(estadoBase(), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-memoria-iniciar-juego');
      expect(btn).toBeTruthy();
    });

    it('botón iniciar-ronda emite acción correcta', () => {
      const onAccion = vi.fn();
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'INICIO_RONDA' }), container, contextoBase(), { onAccion });
      const btn = container.querySelector('#btn-memoria-iniciar-ronda');
      expect(btn).toBeTruthy();
    });

    it('seleccionar-set-memoria incluye set', () => {
      const ctx = contextoBase({ setsDisponibles: [{ id: 's1', nombre: 'Set 1' }] });
      const onAccion = vi.fn();
      MemoriaGameUI.renderizarPanelConductor(estadoBase({ fase: 'SELECCIONANDO_SET' }), container, ctx, { onAccion });
      const btn = container.querySelector('#btn-memoria-set-s1');
      expect(btn).toBeTruthy();
    });

    it('voltear-elemento-memoria se emite al clickear elemento', () => {
      const onAccion = vi.fn();
      const estado = estadoBase({ fase: 'JUGANDO', elementos: elementosGrilla() });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion });
      expect(container.innerHTML).toContain('data-elemento-index');
    });
  });

  describe('resolución de storageRef → URL', () => {
    function elementosConImagen() {
      return [
        { id_pareja: 'p1', contenido: '', imagen_url: 'ref-a', descubierto: false },
        { id_pareja: 'p2', contenido: '', imagen_url: 'ref-b', descubierto: false },
        { id_pareja: 'p1', contenido: '', imagen_url: 'ref-a', descubierto: false },
        { id_pareja: 'p2', contenido: '', imagen_url: 'ref-b', descubierto: false }
      ];
    }

    it('JUGANDO usa URL resuelta del mapa cuando está disponible', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosConImagen(),
        elementos_descubiertos: [0, 1, 2, 3]
      });
      const ctx = contextoBase({
        urlsImagenes: { 'ref-a': 'https://cdn.example/a.png', 'ref-b': 'https://cdn.example/b.png' }
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('src="https://cdn.example/a.png"');
      expect(container.innerHTML).toContain('src="https://cdn.example/b.png"');
    });

    it('JUGANDO hace fallback al ref crudo si no está en el mapa', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosConImagen(),
        elementos_descubiertos: [0, 1, 2, 3]
      });
      const ctx = contextoBase({ urlsImagenes: {} });
      MemoriaGameUI.renderizarAreaJuego(estado, container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('src="ref-a"');
      expect(container.innerHTML).toContain('src="ref-b"');
    });

    it('JUGANDO sin urlsImagenes en contexto hace fallback al ref crudo', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosConImagen(),
        elementos_descubiertos: [0, 1, 2, 3]
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('src="ref-a"');
      expect(container.innerHTML).toContain('src="ref-b"');
    });

    it('CAMBIO_TURNO usa URL resuelta del mapa', () => {
      const estado = estadoBase({
        fase: 'CAMBIO_TURNO',
        elementos: elementosConImagen()
      });
      const ctx = contextoBase({
        urlsImagenes: { 'ref-a': 'https://cdn.example/a.png', 'ref-b': 'https://cdn.example/b.png' }
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('src="https://cdn.example/a.png"');
      expect(container.innerHTML).toContain('src="https://cdn.example/b.png"');
    });

    it('elemento sin imagen_url renderiza texto, no img', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosGrilla(),
        elementos_descubiertos: [0]
      });
      const ctx = contextoBase({ urlsImagenes: { 'ref-x': 'https://cdn.example/x.png' } });
      MemoriaGameUI.renderizarAreaJuego(estado, container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('>A<');
      expect(container.innerHTML).not.toContain('src="ref-x"');
    });
  });

  describe('render de emojis (prefijo emoji:)', () => {
    function elementosEmoji() {
      return [
        { id_pareja: 'p1', contenido: '', imagen_url: 'emoji:🐶', descubierto: false },
        { id_pareja: 'p2', contenido: '', imagen_url: 'emoji:⭐', descubierto: false },
        { id_pareja: 'p1', contenido: '', imagen_url: 'emoji:🐶', descubierto: false },
        { id_pareja: 'p2', contenido: '', imagen_url: 'emoji:⭐', descubierto: false }
      ];
    }

    it('JUGANDO con imagen_url emoji: renderiza <span> con el emoji', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: elementosEmoji(),
        elementos_descubiertos: [0, 1, 2, 3]
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('<span class="font-display-hero text-4xl text-on-surface">🐶</span>');
      expect(container.innerHTML).toContain('<span class="font-display-hero text-4xl text-on-surface">⭐</span>');
      expect(container.innerHTML).not.toContain('<img src="emoji:');
    });

    it('JUGANDO con imagen_url URL renderiza <img>', () => {
      const estado = estadoBase({
        fase: 'JUGANDO',
        elementos: [
          { id_pareja: 'p1', contenido: '', imagen_url: 'ref-a', descubierto: false },
          { id_pareja: 'p2', contenido: '', imagen_url: 'ref-b', descubierto: false },
          { id_pareja: 'p1', contenido: '', imagen_url: 'ref-a', descubierto: false },
          { id_pareja: 'p2', contenido: '', imagen_url: 'ref-b', descubierto: false }
        ],
        elementos_descubiertos: [0, 1, 2, 3]
      });
      const ctx = contextoBase({
        urlsImagenes: { 'ref-a': 'https://cdn.example/a.png', 'ref-b': 'https://cdn.example/b.png' }
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, ctx, { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('<img src="https://cdn.example/a.png"');
      expect(container.innerHTML).toContain('<img src="https://cdn.example/b.png"');
    });

    it('CAMBIO_TURNO con imagen_url emoji: renderiza <span>', () => {
      const estado = estadoBase({
        fase: 'CAMBIO_TURNO',
        elementos: elementosEmoji()
      });
      MemoriaGameUI.renderizarAreaJuego(estado, container, contextoBase(), { onAccion: vi.fn() });
      expect(container.innerHTML).toContain('>🐶<');
      expect(container.innerHTML).toContain('>⭐<');
      expect(container.innerHTML).not.toContain('<img src="emoji:');
    });
  });

  describe('cleanup', () => {
    it('no falla', () => {
      expect(() => MemoriaGameUI.cleanup()).not.toThrow();
    });
  });
});
