import { describe, it, expect } from 'vitest';
import { PictionaryGameDefinition, MODOS, FASES } from '../../../../src/games/pictionary/PictionaryGameDefinition.js';

function configBase() {
  return {
    rondas: 2,
    palabras_por_modo: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15
  };
}

function estadoBase(overrides = {}) {
  return PictionaryGameDefinition.estadoInicial(configBase(), overrides);
}

function itemsBase() {
  const items = [];
  for (const modo of MODOS) {
    for (let i = 0; i < 2; i++) {
      const item = { modo, concepto: `Concepto M${modo} ${i + 1}` };
      if (modo === 1) item.prohibidas = ['prohibida1', 'prohibida2'];
      items.push(item);
    }
  }
  return items;
}

describe('Pictionary Público — lógica de rendering', () => {
  describe('modos', () => {
    it('MODOS contiene 4 modos', () => {
      expect(MODOS).toEqual([1, 2, 3, 4]);
    });

    it('modo 1 es palabras prohibidas', () => {
      const estado = estadoBase();
      expect(estado.modo_actual).toBe(1);
    });
  });

  describe('fases', () => {
    it('FASES contiene las 8 fases', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA', 'SELECCIONANDO_MODO', 'MOSTRANDO_PALABRA',
        'ADIVINANDO', 'ESPERA_VALIDACION', 'CAMBIO_MODO',
        'FIN_DE_RONDA', 'FIN_DE_JUEGO'
      ]);
    });

    it('estado inicial empieza en INICIO_RONDA', () => {
      const estado = estadoBase();
      expect(estado.fase).toBe('INICIO_RONDA');
    });
  });

  describe('concepto visible', () => {
    it('mostrarPalabra carga palabra_actual con concepto', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA' };
      const items = itemsBase();
      const contenidoSet = { items };
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado, contenidoSet);
      expect(nuevo.palabra_actual).toBeDefined();
      expect(nuevo.palabra_actual.concepto).toBeTruthy();
      expect(nuevo.palabra_actual.concepto).toBe('Concepto M1 1');
    });

    it('palabra_actual tiene concepto en modo 2', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA', modo_actual: 2 };
      const items = itemsBase();
      const contenidoSet = { items };
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado, contenidoSet);
      expect(nuevo.palabra_actual.concepto).toBe('Concepto M2 1');
    });
  });

  describe('prohibidas en modo 1', () => {
    it('modo 1 carga prohibidas_actuales', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA', modo_actual: 1 };
      const items = itemsBase();
      const contenidoSet = { items };
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado, contenidoSet);
      expect(nuevo.prohibidas_actuales).toBeDefined();
      expect(nuevo.prohibidas_actuales.length).toBeGreaterThan(0);
      expect(nuevo.prohibidas_actuales).toContain('prohibida1');
    });

    it('modo 2 no tiene prohibidas', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA', modo_actual: 2 };
      const items = itemsBase();
      const contenidoSet = { items };
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado, contenidoSet);
      expect(nuevo.prohibidas_actuales).toEqual([]);
    });
  });

  describe('header — ronda/modo/equipo', () => {
    it('ronda_actual y total_rondas', () => {
      const estado = estadoBase();
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(2);
    });

    it('modo_actual empieza en 1', () => {
      const estado = estadoBase();
      expect(estado.modo_actual).toBe(1);
    });

    it('equipo_actual empieza en 1', () => {
      const estado = estadoBase();
      expect(estado.equipo_actual).toBe(1);
    });
  });

  describe('marcador — puntos de ambos equipos', () => {
    it('puntos empiezan en 0', () => {
      const estado = estadoBase();
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
    });

    it('acierto suma puntos al equipo actual', () => {
      const estado = { ...estadoBase(), fase: 'ESPERA_VALIDACION', equipo_actual: 1 };
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, config);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });

    it('error penaliza al equipo actual', () => {
      const estado = { ...estadoBase(), fase: 'ESPERA_VALIDACION', equipo_actual: 1, puntos_equipo_1: 20 };
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarError(estado, config);
      expect(nuevo.puntos_equipo_1).toBe(15);
    });
  });

  describe('timer — visible en fases correctas', () => {
    it('ADIVINANDO tiene timer_corriendo true', () => {
      const estado = { ...estadoBase(), fase: 'ADIVINANDO', timer_corriendo: true };
      expect(estado.timer_corriendo).toBe(true);
    });

    it('MOSTRANDO_PALABRA tiene timer_corriendo false', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA', timer_corriendo: false };
      expect(estado.timer_corriendo).toBe(false);
    });

    it('tiempo_restante_seg inicia con segundos_por_modo', () => {
      const estado = estadoBase();
      expect(estado.tiempo_restante_seg).toBe(60);
    });
  });

  describe('fases — transiciones de estado', () => {
    it('INICIO_RONDA → MOSTRANDO_PALABRA con seleccionarModo', () => {
      const estado = estadoBase();
      const nuevo = PictionaryGameDefinition.seleccionarModo(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
    });

    it('MOSTRANDO_PALABRA → ADIVINANDO con iniciarTiempo', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA' };
      const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
      expect(nuevo.fase).toBe('ADIVINANDO');
      expect(nuevo.timer_corriendo).toBe(true);
    });

    it('ADIVINANDO → ESPERA_VALIDACION con detenerTiempo', () => {
      const estado = { ...estadoBase(), fase: 'ADIVINANDO', timer_corriendo: true };
      const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 30);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.timer_corriendo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(30);
    });

    it('ESPERA_VALIDACION → avanza con acierto', () => {
      const estado = { ...estadoBase(), fase: 'ESPERA_VALIDACION', equipo_actual: 1 };
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, config);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.puntos_equipo_1).toBe(10);
    });
  });

  describe('FIN_DE_RONDA — puntajes parciales', () => {
    it('muestra puntajes de ambos equipos', () => {
      const estado = {
        ...estadoBase(),
        fase: 'FIN_DE_RONDA',
        puntos_equipo_1: 30,
        puntos_equipo_2: 20
      };
      expect(estado.puntos_equipo_1).toBe(30);
      expect(estado.puntos_equipo_2).toBe(20);
    });
  });

  describe('FIN_DE_JUEGO — ganador', () => {
    it('calcularResultado devuelve ganador por puntos', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 50,
        puntos_equipo_2: 30,
        turnos_completados_equipo_1: 2,
        turnos_completados_equipo_2: 1
      };
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
      expect(resultado.puntos_equipo_1).toBe(50);
      expect(resultado.puntos_equipo_2).toBe(30);
    });

    it('desempate por turnos completados', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 30,
        puntos_equipo_2: 30,
        turnos_completados_equipo_1: 3,
        turnos_completados_equipo_2: 1
      };
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
    });

    it('empate técnico si persiste', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 30,
        puntos_equipo_2: 30,
        turnos_completados_equipo_1: 2,
        turnos_completados_equipo_2: 2
      };
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBeNull();
    });
  });

  describe('sincronización — reacción a acciones del conductor', () => {
    it('seleccionarModo cambia a MOSTRANDO_PALABRA', () => {
      const estado = estadoBase();
      const nuevo = PictionaryGameDefinition.seleccionarModo(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
    });

    it('iniciarTiempo activa timer', () => {
      const estado = { ...estadoBase(), fase: 'MOSTRANDO_PALABRA' };
      const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
      expect(nuevo.fase).toBe('ADIVINANDO');
      expect(nuevo.timer_corriendo).toBe(true);
    });

    it('detenerTiempo congela timer', () => {
      const estado = { ...estadoBase(), fase: 'ADIVINANDO', timer_corriendo: true };
      const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 25);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.timer_corriendo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(25);
    });
  });
});
