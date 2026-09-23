import { describe, it, expect } from 'vitest';
import fs from 'fs';

const SHELL = fs.readFileSync('src/ui/publica/shell-publica.js', 'utf8');

describe('Memoricé — UI pública', () => {
  describe('detección', () => {
    it('detecta el juego por codigo MEMORIA', () => {
      expect(SHELL).toContain("juegoActivo?.juego_codigo === 'MEMORIA'");
    });

    it('tiene variable esMemoria', () => {
      expect(SHELL).toContain('esMemoria');
    });

    it('llama a _renderEscenarioMemoria cuando corresponde', () => {
      expect(SHELL).toContain('_renderEscenarioMemoria(juegoActivo, fase, contexto)');
    });
  });

  describe('función de render', () => {
    it('está definida', () => {
      expect(SHELL).toContain('function _renderEscenarioMemoria');
    });

    it('lee elementos del estado', () => {
      expect(SHELL).toMatch(/elementos.*estadoJuego\.elementos/s);
    });

    it('lee elementos_volteados como Set', () => {
      expect(SHELL).toContain('new Set(estadoJuego.elementos_volteados');
    });

    it('lee elementos_descubiertos como Set', () => {
      expect(SHELL).toContain('new Set(estadoJuego.elementos_descubiertos');
    });
  });

  describe('render por fase', () => {
    function getFn() {
      const match = SHELL.match(/function _renderEscenarioMemoria[\s\S]*?\n\}/);
      return match ? match[0] : '';
    }

    it('maneja INICIO_RONDA', () => {
      expect(getFn()).toContain('INICIO_RONDA');
    });

    it('maneja SELECCIONANDO_SET', () => {
      expect(getFn()).toContain('SELECCIONANDO_SET');
    });

    it('maneja PREPARANDO_GRILLA', () => {
      expect(getFn()).toContain('PREPARANDO_GRILLA');
    });

    it('maneja JUGANDO', () => {
      expect(getFn()).toContain('JUGANDO');
    });

    it('maneja CAMBIO_TURNO', () => {
      expect(getFn()).toContain('CAMBIO_TURNO');
    });

    it('maneja FIN_DE_RONDA', () => {
      expect(getFn()).toContain('FIN_DE_RONDA');
    });

    it('maneja FIN_DE_JUEGO', () => {
      expect(getFn()).toContain('FIN_DE_JUEGO');
    });
  });

  describe('grilla', () => {
    it('renderiza grilla con grid template', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?grid-template-columns/);
    });

    it('muestra número en elementos boca abajo', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?text-background/);
    });

    it('muestra contenido en elementos volteados/descubiertos', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?el\.contenido/);
    });

    it('distingue descubierto vs volteado por color', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?estaDescubierto/);
    });
  });

  describe('marcador', () => {
    it('muestra puntos de ambos equipos', () => {
      const fn = SHELL.match(/function _renderEscenarioMemoria[\s\S]*?\n\}/);
      expect(fn[0]).toContain('puntos_equipo_1');
      expect(fn[0]).toContain('puntos_equipo_2');
    });

    it('muestra ronda actual y total', () => {
      const fn = SHELL.match(/function _renderEscenarioMemoria[\s\S]*?\n\}/);
      expect(fn[0]).toContain('ronda_actual');
      expect(fn[0]).toContain('total_rondas');
    });

    it('muestra parejas encontradas', () => {
      const fn = SHELL.match(/function _renderEscenarioMemoria[\s\S]*?\n\}/);
      expect(fn[0]).toContain('parejas_encontradas');
    });
  });

  describe('modal CAMBIO_TURNO', () => {
    it('muestra overlay con nombre del equipo', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?Turno de/);
    });

    it('usa fixed inset-0 para el overlay', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?fixed inset-0/);
    });
  });

  describe('timer', () => {
    it('muestra timer en JUGANDO cuando timer_activo', () => {
      expect(SHELL).toContain('memoria-timer-publico');
    });
  });

  describe('resolución de storageRef → URL', () => {
    it('resuelve refs antes de renderizar Memoricé', () => {
      expect(SHELL).toContain('_resolverUrlsImagenesMemoria(app, juegoActivo?.estado_juego)');
      expect(SHELL).toContain('contexto.urlsImagenes');
    });

    it('el helper extrae imagen_url únicos y llama a obtenerUrlPublica', () => {
      expect(SHELL).toMatch(/function _resolverUrlsImagenesMemoria[\s\S]*?imagen_url/);
      expect(SHELL).toMatch(/function _resolverUrlsImagenesMemoria[\s\S]*?obtenerUrlPublica/);
    });

    it('grilla usa mapa con fallback al ref crudo', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?urlsImagenes\[el\.imagen_url\] \|\| el\.imagen_url/);
    });

    it('el helper salta refs con prefijo emoji:', () => {
      expect(SHELL).toMatch(/function _resolverUrlsImagenesMemoria[\s\S]*?!ref\.startsWith\('emoji:'\)/);
    });
  });

  describe('render de emojis (prefijo emoji:)', () => {
    it('detecta esEmoji en _renderEscenarioMemoria', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?esEmoji/);
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?url\.startsWith\('emoji:'\)/);
    });

    it('renderiza span con el emoji (slice(6))', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?url\.slice\(6\)/);
    });

    it('no renderiza img para refs emoji:', () => {
      expect(SHELL).toMatch(/function _renderEscenarioMemoria[\s\S]*?esEmoji\s*\n?\s*\? `<span/);
    });
  });
});
