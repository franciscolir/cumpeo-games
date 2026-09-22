import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test de la UI pública de Trivia.
 * Como _renderEscenarioTrivia es una función interna de shell-publica.js
 * (no exportada), testeamos contrato estático:
 *   1) el archivo contiene las funciones y strings esperados
 *   2) la detección y el dispatch están conectados
 */

const SHELL = fs.readFileSync('src/ui/publica/shell-publica.js', 'utf8');

describe('Trivia — UI pública', () => {
  describe('detección', () => {
    it('detecta el juego por codigo TRIVIA', () => {
      expect(SHELL).toContain("juegoActivo?.juego_codigo === 'TRIVIA'");
    });

    it('tiene variable esTrivia', () => {
      expect(SHELL).toContain('esTrivia');
    });

    it('llama a _renderEscenarioTrivia cuando corresponde', () => {
      expect(SHELL).toContain('_renderEscenarioTrivia(juegoActivo, fase, contexto)');
    });
  });

  describe('función de render', () => {
    it('está definida', () => {
      expect(SHELL).toContain('function _renderEscenarioTrivia');
    });

    it('tiene constante LETRAS_TRIVIA', () => {
      expect(SHELL).toContain('LETRAS_TRIVIA');
    });

    it('lee preguntas del estado del equipo activo', () => {
      expect(SHELL).toMatch(/preguntas_equipo_/);
    });

    it('lee la opción seleccionada', () => {
      expect(SHELL).toContain('opcion_seleccionada');
    });

    it('lee respuesta_correcta_index del item', () => {
      expect(SHELL).toContain('respuesta_correcta_index');
    });
  });

  describe('render por fase', () => {
    it('maneja INICIO_RONDA', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("INICIO_RONDA");
    });

    it('maneja SELECCIONANDO_SET', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("SELECCIONANDO_SET");
    });

    it('maneja MOSTRANDO_PREGUNTA', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("MOSTRANDO_PREGUNTA");
    });

    it('maneja SELECCIONANDO_RESPUESTA', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("SELECCIONANDO_RESPUESTA");
    });

    it('maneja MOSTRANDO_RESULTADO', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("MOSTRANDO_RESULTADO");
    });

    it('maneja CAMBIO_TURNO', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("CAMBIO_TURNO");
    });

    it('maneja FIN_DE_RONDA', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("FIN_DE_RONDA");
    });

    it('maneja FIN_DE_JUEGO', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain("FIN_DE_JUEGO");
    });
  });

  describe('mostrar resultado', () => {
    it('marca la opción correcta en verde en MOSTRANDO_RESULTADO', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain('respuesta_correcta_index');
      expect(fn[0]).toContain('esResultado');
    });

    it('marca la opción seleccionada incorrecta en rojo', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain('seleccionada');
    });

    it('NO muestra la opción correcta en MOSTRANDO_PREGUNTA', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      // El verde solo se aplica si esResultado === true
      expect(fn[0]).toContain('esResultado &&');
    });
  });

  describe('timer público', () => {
    it('tiene _iniciarTimerTriviaPublico', () => {
      expect(SHELL).toContain('function _iniciarTimerTriviaPublico');
    });

    it('tiene _limpiarTimerTriviaPublico', () => {
      expect(SHELL).toContain('function _limpiarTimerTriviaPublico');
    });

    it('usa el id trivia-pub-timer', () => {
      expect(SHELL).toContain('trivia-pub-timer');
    });

    it('inicia el timer solo en SELECCIONANDO_RESPUESTA', () => {
      // La función _iniciarTimerTriviaPublico tiene lógica condicional
      // que menciona SELECCIONANDO_RESPUESTA. Test estático simple.
      expect(SHELL).toMatch(/function _iniciarTimerTriviaPublico[\s\S]*?SELECCIONANDO_RESPUESTA/);
    });
  });

  describe('marcador', () => {
    it('muestra puntos de ambos equipos', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain('puntos_equipo_1');
      expect(fn[0]).toContain('puntos_equipo_2');
    });

    it('muestra ronda actual y total', () => {
      const fn = SHELL.match(/function _renderEscenarioTrivia[\s\S]*?\n\}/);
      expect(fn[0]).toContain('ronda_actual');
      expect(fn[0]).toContain('total_rondas');
    });
  });
});
