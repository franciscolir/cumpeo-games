import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Test de la UI pública de Enlaces.
 * Como _renderEscenarioEnlaces es una función interna de
 * shell-publica.js (no exportada), testeamos contrato estático:
 *   1) el archivo contiene las funciones y strings esperados
 *   2) la detección y el dispatch están conectados
 *   3) pares_correctos solo se usa internamente en MOSTRANDO_RESULTADO
 *      y movimientos nunca aparece
 */

const SHELL = fs.readFileSync('src/ui/publica/shell-publica.js', 'utf8');

function getFn() {
  const match = SHELL.match(/function _renderEscenarioEnlaces[\s\S]*?\n\}/);
  return match ? match[0] : '';
}

function getTimerFn() {
  const match = SHELL.match(/function _iniciarTimerEnlacesPublico[\s\S]*?\n\}/);
  return match ? match[0] : '';
}

describe('Enlaces — UI pública', () => {
  describe('detección', () => {
    it('detecta el juego por codigo ENLACES', () => {
      expect(SHELL).toContain("juegoActivo?.juego_codigo === 'ENLACES'");
    });

    it('tiene variable esEnlaces', () => {
      expect(SHELL).toContain('esEnlaces');
    });

    it('llama a _renderEscenarioEnlaces cuando corresponde', () => {
      expect(SHELL).toContain('_renderEscenarioEnlaces(juegoActivo, fase, contexto)');
    });

    it('importa EnlacesGameDefinition', () => {
      expect(SHELL).toContain("import { EnlacesGameDefinition } from '../../games/enlaces/EnlacesGameDefinition.js'");
    });
  });

  describe('función de render', () => {
    it('está definida', () => {
      expect(SHELL).toContain('function _renderEscenarioEnlaces');
    });

    it('renderiza el título Enlaces', () => {
      expect(getFn()).toContain('Enlaces');
    });

    it('muestra el mensaje inicial ¡A JUGAR!', () => {
      expect(getFn()).toContain('¡A JUGAR!');
    });

    it('lee columna_a del estado', () => {
      expect(getFn()).toContain('columna_a');
    });

    it('lee columna_b del estado', () => {
      expect(getFn()).toContain('columna_b');
    });

    it('muestra el equipo activo con color', () => {
      expect(getFn()).toContain('equipo_actual');
      expect(getFn()).toContain('equipoActivoColor');
    });
  });

  describe('render por fase — las 9 fases', () => {
    it('maneja INICIO_RONDA', () => {
      expect(getFn()).toContain('INICIO_RONDA');
    });

    it('maneja SELECCIONANDO_SET', () => {
      expect(getFn()).toContain('SELECCIONANDO_SET');
    });

    it('maneja PREPARANDO_TABLERO', () => {
      expect(getFn()).toContain('PREPARANDO_TABLERO');
    });

    it('maneja ORDENANDO', () => {
      expect(getFn()).toContain('ORDENANDO');
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

  describe('mensajes por fase', () => {
    it('SELECCIONANDO_SET: "El conductor elige un set para …"', () => {
      expect(getFn()).toContain('El conductor elige un set para');
    });

    it('PREPARANDO_TABLERO: "Preparando tablero…"', () => {
      expect(getFn()).toContain('Preparando tablero…');
    });

    it('ESPERA_VALIDACION: "Esperando validación…"', () => {
      expect(getFn()).toContain('Esperando validación…');
    });

    it('CAMBIO_TURNO: "Turno de <equipo>"', () => {
      expect(getFn()).toContain('Turno de ');
    });

    it('FIN_DE_RONDA muestra ronda actual y total', () => {
      expect(getFn()).toContain('ronda_actual');
      expect(getFn()).toContain('total_rondas');
    });
  });

  describe('tablero público', () => {
    it('muestra encabezado "Columna A"', () => {
      expect(getFn()).toContain('Columna A');
    });

    it('muestra encabezado "Columna B"', () => {
      expect(getFn()).toContain('Columna B');
    });

    it('ORDENANDO muestra el timer público #enlaces-pub-timer', () => {
      expect(getFn()).toContain('fase === \'ORDENANDO\'');
      expect(getFn()).toContain('enlaces-pub-timer');
    });

    it('ORDENANDO no marca elementos como draggable', () => {
      expect(getFn()).not.toContain('draggable="true"');
      expect(getFn()).not.toContain('draggable=');
    });
  });

  describe('indicadores ✓/✗ — solo MOSTRANDO_RESULTADO', () => {
    it('calcula indicadores solo en MOSTRANDO_RESULTADO', () => {
      expect(getFn()).toContain('mostrarIndicadores = fase === \'MOSTRANDO_RESULTADO\'');
    });

    it('marca acierto en verde (tertiary) con ✓', () => {
      expect(getFn()).toContain('text-tertiary');
      expect(getFn()).toContain('data-enlaces-pub-indicador="acierto"');
      expect(getFn()).toContain('✓');
    });

    it('marca error en rojo (error) con ✗', () => {
      expect(getFn()).toContain('text-error');
      expect(getFn()).toContain('data-enlaces-pub-indicador="error"');
      expect(getFn()).toContain('✗');
    });

    it('lee pares_correctos solo bajo condición mostrarIndicadores', () => {
      const fn = getFn();
      expect(fn).toContain('pares_correctos');
      const lineas = fn.split('\n').filter((l) => l.includes('pares_correctos'));
      expect(lineas.length).toBeGreaterThan(0);
      for (const l of lineas) {
        expect(l).toContain('mostrarIndicadores');
      }
    });

    it('NO vuelca el mapa pares_correctos al HTML', () => {
      expect(getFn()).not.toContain('${pares}');
      expect(getFn()).not.toContain('JSON.stringify');
    });

    it('NO muestra movimientos en ninguna parte', () => {
      expect(getFn()).not.toContain('movimientos');
      expect(getTimerFn()).not.toContain('movimientos');
      const codigoRender = SHELL.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(codigoRender.match(/movimientos/g)).toBeNull();
    });

    it('muestra resultado_turno con aciertos y total', () => {
      expect(getFn()).toContain('resultado_turno');
      expect(getFn()).toContain('data-enlaces-pub-resultado');
      expect(getFn()).toContain('Aciertos:');
      expect(getFn()).toContain('resultado.aciertos');
      expect(getFn()).toContain('resultado.total');
    });
  });

  describe('marcador', () => {
    it('muestra puntos de ambos equipos en todas las fases', () => {
      expect(getFn()).toContain('puntos_equipo_1');
      expect(getFn()).toContain('puntos_equipo_2');
    });

    it('resalta el equipo activo en el marcador', () => {
      expect(getFn()).toContain('equipoActivoColor');
    });
  });

  describe('FIN_DE_JUEGO — ganador', () => {
    it('usa calcularResultado de EnlacesGameDefinition', () => {
      expect(getFn()).toContain('EnlacesGameDefinition?.calcularResultado');
    });

    it('muestra empate técnico si hay empate', () => {
      expect(getFn()).toContain('Empate técnico');
    });

    it('muestra el nombre del ganador por color de equipo', () => {
      expect(getFn()).toContain('ganador === 1');
      expect(getFn()).toContain('ganador === 2');
    });
  });

  describe('timer público', () => {
    it('tiene _iniciarTimerEnlacesPublico', () => {
      expect(SHELL).toContain('function _iniciarTimerEnlacesPublico');
    });

    it('tiene _limpiarTimerEnlacesPublico', () => {
      expect(SHELL).toContain('function _limpiarTimerEnlacesPublico');
    });

    it('usa el id enlaces-pub-timer', () => {
      expect(SHELL).toContain('enlaces-pub-timer');
    });

    it('el timer corre solo en ORDENANDO', () => {
      expect(getTimerFn()).toContain('ORDENANDO');
      expect(getTimerFn()).toContain('tiempo_agotado');
    });

    it('lee tiempo_turno_seg de configuracion_congelada', () => {
      expect(getTimerFn()).toContain('configuracion_congelada');
      expect(getTimerFn()).toContain('tiempo_turno_seg');
    });

    it('se invoca cuando esEnlaces y hay estado', () => {
      expect(SHELL).toContain('_iniciarTimerEnlacesPublico(juegoActivo, container)');
    });

    it('usa crearTimer con iniciarSiCambio', () => {
      expect(getTimerFn()).toContain('crearTimer');
      expect(getTimerFn()).toContain('iniciarSiCambio');
    });

    it('la key del timer es por juego, equipo y ronda', () => {
      expect(getTimerFn()).toContain(':eq${equipo}:r${ronda}');
    });

    it('limpia el timer al iniciar (fuera de ORDENANDO o sin elemento)', () => {
      expect(getTimerFn()).toContain('_limpiarTimerEnlacesPublico()');
    });

    it('se limpia al entrar a la pantalla pública', () => {
      expect(SHELL).toContain('_limpiarTimerEnlacesPublico();');
    });
  });
});
