import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test de la UI pública de Anti-Trivia.
 * Como _renderEscenarioAntiTrivia es una función interna de
 * shell-publica.js (no exportada), testeamos contrato estático:
 *   1) el archivo contiene las funciones y strings esperados
 *   2) la detección y el dispatch están conectados
 */

const SHELL = fs.readFileSync('src/ui/publica/shell-publica.js', 'utf8');

function getFn() {
  const match = SHELL.match(/function _renderEscenarioAntiTrivia[\s\S]*?\n\}/);
  return match ? match[0] : '';
}

function getTimerFn() {
  const match = SHELL.match(/function _iniciarTimerAntiTriviaPublico[\s\S]*?\n\}/);
  return match ? match[0] : '';
}

describe('Anti-Trivia — UI pública', () => {
  describe('detección', () => {
    it('detecta el juego por codigo ANTI_TRIVIA', () => {
      expect(SHELL).toContain("juegoActivo?.juego_codigo === 'ANTI_TRIVIA'");
    });

    it('tiene variable esAntiTrivia', () => {
      expect(SHELL).toContain('esAntiTrivia');
    });

    it('llama a _renderEscenarioAntiTrivia cuando corresponde', () => {
      expect(SHELL).toContain('_renderEscenarioAntiTrivia(juegoActivo, fase, contexto)');
    });

    it('importa AntiTriviaGameDefinition', () => {
      expect(SHELL).toContain("import { AntiTriviaGameDefinition } from '../../games/anti-trivia/AntiTriviaGameDefinition.js'");
    });
  });

  describe('función de render', () => {
    it('está definida', () => {
      expect(SHELL).toContain('function _renderEscenarioAntiTrivia');
    });

    it('renderiza el título Anti-Trivia', () => {
      expect(SHELL).toContain('Anti-Trivia');
    });

    it('lee preguntas del equipo activo', () => {
      expect(getFn()).toMatch(/preguntas_equipo_/);
    });

    it('lee respuestas_correctas del item', () => {
      expect(getFn()).toContain('respuestas_correctas');
    });

    it('muestra la lista "Respuestas correctas a evitar"', () => {
      expect(getFn()).toContain('Respuestas correctas a evitar');
    });
  });

  describe('render por fase — las 9 fases', () => {
    it('maneja INICIO_RONDA', () => {
      expect(getFn()).toContain('INICIO_RONDA');
    });

    it('maneja SELECCIONANDO_SET', () => {
      expect(getFn()).toContain('SELECCIONANDO_SET');
    });

    it('maneja MOSTRANDO_PREGUNTA', () => {
      expect(getFn()).toContain('MOSTRANDO_PREGUNTA');
    });

    it('maneja RESPONDIENDO', () => {
      expect(getFn()).toContain('RESPONDIENDO');
    });

    it('maneja ESPERA_VALIDACION', () => {
      expect(getFn()).toContain('ESPERA_VALIDACION');
    });

    it('maneja MOSTRANDO_RESULTADO', () => {
      expect(getFn()).toContain('MOSTRANDO_RESULTADO');
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

  describe('respuesta revelada — acierto/error', () => {
    it('marca acierto en verde (tertiary)', () => {
      expect(getFn()).toContain('resultado === \'acierto\'');
      expect(getFn()).toContain('bg-tertiary/30');
    });

    it('marca error en rojo (error)', () => {
      expect(getFn()).toContain('resultado === \'error\'');
      expect(getFn()).toContain('bg-error/30');
    });

    it('muestra sin respuesta en gris', () => {
      expect(getFn()).toContain('sin_respuesta');
    });

    it('el indicador solo se aplica en MOSTRANDO_RESULTADO', () => {
      expect(getFn()).toContain('fase === \'MOSTRANDO_RESULTADO\'');
    });

    it('usa _ultimaRespuestaAntiTrivia para leer la respuesta', () => {
      expect(getFn()).toContain('_ultimaRespuestaAntiTrivia(estadoJuego)');
      expect(SHELL).toContain('function _ultimaRespuestaAntiTrivia');
    });

    it('NO muestra la respuesta específica del jugador', () => {
      expect(getFn()).not.toContain('respuesta_jugador');
      expect(getFn()).not.toContain('respuesta_dada');
      expect(getFn()).not.toContain('respuesta_texto');
    });
  });

  describe('indicadores de fase', () => {
    it('RESPONDIENDO con tiempo agotado muestra "Tiempo agotado"', () => {
      expect(getFn()).toContain('data-anti-trivia-tiempo-agotado');
      expect(getFn()).toContain('Tiempo agotado');
    });

    it('ESPERA_VALIDACION muestra "El conductor está validando…"', () => {
      expect(getFn()).toContain('El conductor está validando…');
    });
  });

  describe('timer público', () => {
    it('tiene _iniciarTimerAntiTriviaPublico', () => {
      expect(SHELL).toContain('function _iniciarTimerAntiTriviaPublico');
    });

    it('tiene _limpiarTimerAntiTriviaPublico', () => {
      expect(SHELL).toContain('function _limpiarTimerAntiTriviaPublico');
    });

    it('usa el id anti-trivia-pub-timer', () => {
      expect(SHELL).toContain('anti-trivia-pub-timer');
    });

    it('el timer corre solo en RESPONDIENDO', () => {
      expect(getTimerFn()).toContain('RESPONDIENDO');
      expect(getTimerFn()).toContain('timer_activo');
    });

    it('lee tiempo_respuesta_seg de configuracion_congelada', () => {
      expect(getTimerFn()).toContain('configuracion_congelada');
      expect(getTimerFn()).toContain('tiempo_respuesta_seg');
    });

    it('se invoca cuando esAntiTrivia y hay estado', () => {
      expect(SHELL).toContain('_iniciarTimerAntiTriviaPublico(juegoActivo, container)');
    });

    it('usa crearTimer con iniciarSiCambio', () => {
      expect(getTimerFn()).toContain('crearTimer');
      expect(getTimerFn()).toContain('iniciarSiCambio');
    });
  });

  describe('marcador y cabecera', () => {
    it('muestra puntos de ambos equipos', () => {
      expect(getFn()).toContain('puntos_equipo_1');
      expect(getFn()).toContain('puntos_equipo_2');
    });

    it('muestra ronda actual y total', () => {
      expect(getFn()).toContain('ronda_actual');
      expect(getFn()).toContain('total_rondas');
    });

    it('muestra el equipo activo con color', () => {
      expect(getFn()).toContain('equipo_actual');
      expect(getFn()).toContain('equipoActivoColor');
    });

    it('muestra el número de pregunta actual', () => {
      expect(getFn()).toContain('pregunta_actual_index');
    });
  });

  describe('FIN_DE_JUEGO — ganador', () => {
    it('usa calcularResultado de AntiTriviaGameDefinition', () => {
      expect(getFn()).toContain('AntiTriviaGameDefinition?.calcularResultado');
    });

    it('muestra empate técnico si hay empate', () => {
      expect(getFn()).toContain('Empate técnico');
    });
  });
});
