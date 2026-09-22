import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test de la UI pública de Historia Enredada.
 * Como _renderEscenarioHistoriaEnredada es una función interna de
 * shell-publica.js (no exportada), testeamos:
 *   1) que el archivo contiene las funciones y strings esperados
 *   2) que la deteccion y el render están conectados
 * Esto es un test de contrato estático.
 */

const SHELL = fs.readFileSync('src/ui/publica/shell-publica.js', 'utf8');

describe('Historia Enredada — UI pública', () => {
  describe('detección', () => {
    it('detecta el juego por codigo HISTORIA_ENREDADA', () => {
      expect(SHELL).toContain("juegoActivo?.juego_codigo === 'HISTORIA_ENREDADA'");
    });

    it('tiene variable esHistoriaEnredada', () => {
      expect(SHELL).toContain('esHistoriaEnredada');
    });

    it('llama a _renderEscenarioHistoriaEnredada cuando corresponde', () => {
      expect(SHELL).toContain('_renderEscenarioHistoriaEnredada(juegoActivo, fase, contexto)');
    });
  });

  describe('función de render', () => {
    it('está definida', () => {
      expect(SHELL).toContain('function _renderEscenarioHistoriaEnredada');
    });

    it('renderiza el título Historia Enredada', () => {
      expect(SHELL).toContain('Historia Enredada');
    });

    it('muestra el marcador de ambos equipos', () => {
      expect(SHELL).toContain('puntos_equipo_1');
      expect(SHELL).toContain('puntos_equipo_2');
    });

    it('muestra la ronda y el total', () => {
      expect(SHELL).toContain('ronda_actual');
      expect(SHELL).toContain('total_rondas');
    });
  });

  describe('render por fase', () => {
    it('maneja INICIO_RONDA', () => {
      expect(SHELL).toContain("fase === 'INICIO_RONDA'");
    });

    it('maneja SELECCIONANDO_HISTORIA', () => {
      expect(SHELL).toContain("fase === 'SELECCIONANDO_HISTORIA'");
    });

    it('maneja PREPARANDO', () => {
      expect(SHELL).toContain("fase === 'PREPARANDO'");
    });

    it('maneja ACTUANDO', () => {
      expect(SHELL).toContain("fase === 'ACTUANDO'");
    });

    it('maneja VOTANDO', () => {
      expect(SHELL).toContain("fase === 'VOTANDO'");
    });

    it('maneja FIN_DE_RONDA', () => {
      expect(SHELL).toContain("fase === 'FIN_DE_RONDA'");
    });

    it('maneja FIN_DE_JUEGO', () => {
      expect(SHELL).toContain("fase === 'FIN_DE_JUEGO'");
    });
  });

  describe('historia elegida', () => {
    it('lee historia_elegida_id del estado', () => {
      expect(SHELL).toContain('historia_elegida_id');
    });

    it('muestra título y descripción de la historia', () => {
      expect(SHELL).toContain('historia.titulo');
      expect(SHELL).toContain('historia.descripcion');
    });

    it('renderiza el dibujo si existe', () => {
      expect(SHELL).toMatch(/historia[.\?]+dibujo/);
    });
  });

  describe('NO muestra información sensible', () => {
    it('no muestra el guion completo de la historia', () => {
      expect(SHELL).not.toContain('historia.guion');
    });
  });
});
