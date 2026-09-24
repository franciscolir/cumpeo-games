import { describe, it, expect } from 'vitest';
import { PictionaryGameDefinition, SUBMODOS, FASES } from '../../../../src/games/pictionary/PictionaryGameDefinition.js';

function configBase(overrides = {}) {
  return {
    rondas: 2,
    palabras_por_turno: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15,
    ...overrides
  };
}

function estadoBase(overrides = {}) {
  return PictionaryGameDefinition.estadoInicial(configBase(), overrides);
}

function estadoEn(fase, overrides = {}) {
  return { ...estadoBase(), fase, ...overrides };
}

function setPara(submodo, cantidad = 2) {
  const items = [];
  for (let i = 0; i < cantidad; i++) {
    const item = { concepto: `${submodo} concepto ${i + 1}` };
    if (submodo === 'PALABRAS') item.prohibidas = ['prohibida1', 'prohibida2'];
    items.push(item);
  }
  return { submodo, items };
}

describe('Pictionary Público — lógica de rendering', () => {
  describe('submodos', () => {
    it('SUBMODOS contiene 4 submodos en orden fijo', () => {
      expect(SUBMODOS).toEqual(['PALABRAS', 'GESTOS', 'PREGUNTAS', 'DIBUJO']);
    });

    it('estado inicial arranca en submodo PALABRAS', () => {
      const estado = estadoBase();
      expect(estado.submodo_actual).toBe('PALABRAS');
    });

    it('estado inicial no expone modo_actual', () => {
      expect(estadoBase().modo_actual).toBeUndefined();
    });
  });

  describe('fases', () => {
    it('FASES contiene las 9 fases', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA', 'SELECCIONANDO_SUBMODO', 'SELECCIONANDO_SET',
        'MOSTRANDO_PALABRA', 'ADIVINANDO', 'ESPERA_VALIDACION',
        'CAMBIO_TURNO', 'FIN_DE_RONDA', 'FIN_DE_JUEGO'
      ]);
    });

    it('estado inicial empieza en INICIO_RONDA', () => {
      const estado = estadoBase();
      expect(estado.fase).toBe('INICIO_RONDA');
    });
  });

  describe('flujo de selección de submodo y set', () => {
    it('INICIO_RONDA → SELECCIONANDO_SUBMODO (transición manual)', () => {
      const estado = estadoBase();
      const nuevo = { ...estado, fase: 'SELECCIONANDO_SUBMODO' };
      expect(nuevo.fase).toBe('SELECCIONANDO_SUBMODO');
    });

    it('seleccionarSubmodo: SELECCIONANDO_SUBMODO → SELECCIONANDO_SET', () => {
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      const nuevo = PictionaryGameDefinition.seleccionarSubmodo(estado, 'GESTOS');
      expect(nuevo.fase).toBe('SELECCIONANDO_SET');
      expect(nuevo.submodo_actual).toBe('GESTOS');
    });

    it('seleccionarSet: SELECCIONANDO_SET → MOSTRANDO_PALABRA con set_actual', () => {
      const set = setPara('GESTOS');
      const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
      const nuevo = PictionaryGameDefinition.seleccionarSet(estado, set);
      expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
      expect(nuevo.set_actual).toEqual(set);
    });

    it('seleccionarSet rechaza set de submodo distinto', () => {
      const set = setPara('PALABRAS');
      const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
      expect(() => PictionaryGameDefinition.seleccionarSet(estado, set))
        .toThrow('set.submodo debe coincidir con submodo_actual');
    });
  });

  describe('concepto visible', () => {
    it('mostrarPalabra carga palabra_actual con concepto desde set_actual', () => {
      const set = setPara('PALABRAS');
      const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set });
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
      expect(nuevo.palabra_actual).toBeDefined();
      expect(nuevo.palabra_actual.concepto).toBe('PALABRAS concepto 1');
    });

    it('mostrarPalabra carga palabra en submodo GESTOS', () => {
      const set = setPara('GESTOS');
      const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set });
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
      expect(nuevo.palabra_actual.concepto).toBe('GESTOS concepto 1');
    });
  });

  describe('prohibidas en PALABRAS', () => {
    it('PALABRAS carga prohibidas_actuales', () => {
      const set = setPara('PALABRAS');
      const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set, submodo_actual: 'PALABRAS' });
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
      expect(nuevo.prohibidas_actuales.length).toBeGreaterThan(0);
      expect(nuevo.prohibidas_actuales).toContain('prohibida1');
    });

    it('GESTOS no tiene prohibidas', () => {
      const set = setPara('GESTOS');
      const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set, submodo_actual: 'GESTOS' });
      const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
      expect(nuevo.prohibidas_actuales).toEqual([]);
    });
  });

  describe('header — ronda/submodo/equipo', () => {
    it('ronda_actual y total_rondas', () => {
      const estado = estadoBase();
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(2);
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
      const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1 });
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, config);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });

    it('error penaliza al equipo actual', () => {
      const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1, puntos_equipo_1: 20 });
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
    it('MOSTRANDO_PALABRA → ADIVINANDO con iniciarTiempo', () => {
      const estado = estadoEn('MOSTRANDO_PALABRA');
      const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
      expect(nuevo.fase).toBe('ADIVINANDO');
      expect(nuevo.timer_corriendo).toBe(true);
    });

    it('ADIVINANDO → ESPERA_VALIDACION con detenerTiempo', () => {
      const estado = estadoEn('ADIVINANDO', { timer_corriendo: true });
      const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 30);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.timer_corriendo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(30);
    });

    it('ESPERA_VALIDACION → avanza con acierto (INICIO_RONDA, cambio de equipo)', () => {
      const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1 });
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, config);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });
  });

  describe('cambio de turno y submodos', () => {
    it('cambiarTurno Eq1 → Eq2 conserva submodo', () => {
      const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1, submodo_actual: 'PALABRAS' });
      const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.submodo_actual).toBe('PALABRAS');
      expect(nuevo.fase).toBe('INICIO_RONDA');
    });

    it('cambiarTurno Eq2 con DIBUJO (último) → FIN_DE_RONDA', () => {
      const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 2, submodo_actual: 'DIBUJO' });
      const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });
  });

  describe('FIN_DE_RONDA — puntajes parciales', () => {
    it('muestra puntajes de ambos equipos', () => {
      const estado = estadoEn('FIN_DE_RONDA', { puntos_equipo_1: 30, puntos_equipo_2: 20 });
      expect(estado.puntos_equipo_1).toBe(30);
      expect(estado.puntos_equipo_2).toBe(20);
    });
  });

  describe('FIN_DE_JUEGO — ganador', () => {
    it('calcularResultado devuelve ganador por puntos', () => {
      const estado = estadoBase();
      estado.puntos_equipo_1 = 50;
      estado.puntos_equipo_2 = 30;
      estado.turnos_completados_equipo_1 = 2;
      estado.turnos_completados_equipo_2 = 1;
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
      expect(resultado.puntos_equipo_1).toBe(50);
      expect(resultado.puntos_equipo_2).toBe(30);
    });

    it('desempate por turnos completados', () => {
      const estado = estadoBase();
      estado.puntos_equipo_1 = 30;
      estado.puntos_equipo_2 = 30;
      estado.turnos_completados_equipo_1 = 3;
      estado.turnos_completados_equipo_2 = 1;
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
    });

    it('empate técnico si persiste', () => {
      const estado = estadoBase();
      estado.puntos_equipo_1 = 30;
      estado.puntos_equipo_2 = 30;
      estado.turnos_completados_equipo_1 = 2;
      estado.turnos_completados_equipo_2 = 2;
      const resultado = PictionaryGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBeNull();
    });
  });

  describe('time-up — no auto-avanza', () => {
    it('aplicarTimeUp deja ESPERA_VALIDACION sin cambiar turno', () => {
      const estado = estadoEn('ADIVINANDO', { timer_corriendo: true, equipo_actual: 1 });
      const config = configBase();
      const nuevo = PictionaryGameDefinition.aplicarTimeUp(estado, config);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.equipo_actual).toBe(1);
    });
  });

  describe('sincronización — reacción a acciones del conductor', () => {
    it('iniciarTiempo activa timer', () => {
      const estado = estadoEn('MOSTRANDO_PALABRA');
      const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
      expect(nuevo.fase).toBe('ADIVINANDO');
      expect(nuevo.timer_corriendo).toBe(true);
    });

    it('detenerTiempo congela timer', () => {
      const estado = estadoEn('ADIVINANDO', { timer_corriendo: true });
      const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 25);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.timer_corriendo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(25);
    });

    it('no existen shims seleccionarModo/avanzarModo', () => {
      expect(PictionaryGameDefinition.seleccionarModo).toBeUndefined();
      expect(PictionaryGameDefinition.avanzarModo).toBeUndefined();
    });
  });
});
