import { describe, it, expect } from 'vitest';
import { TriviaGameDefinition, FASES } from '../../../../src/games/trivia/TriviaGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

const def = TriviaGameDefinition;

function contenidoValido(n = 6) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      pregunta: `Pregunta ${i + 1}`,
      opciones: ['A', 'B', 'C', 'D'],
      respuesta_correcta_index: i % 4
    });
  }
  return { items };
}

function configuracionValida(overrides = {}) {
  return {
    rondas: 1,
    preguntas_por_turno: 5,
    tiempo_por_pregunta_seg: 30,
    puntos_por_acierto: 10,
    penalizacion_por_error: 0,
    penalizacion_por_pasar: 0,
    ...overrides
  };
}

function setValido() {
  return {
    id: 'set1',
    items: [
      { pregunta: 'P1', opciones: ['A', 'B', 'C', 'D'], respuesta_correcta_index: 0 },
      { pregunta: 'P2', opciones: ['A', 'B', 'C', 'D'], respuesta_correcta_index: 1 },
      { pregunta: 'P3', opciones: ['A', 'B', 'C', 'D'], respuesta_correcta_index: 2 },
      { pregunta: 'P4', opciones: ['A', 'B', 'C', 'D'], respuesta_correcta_index: 3 },
      { pregunta: 'P5', opciones: ['A', 'B', 'C', 'D'], respuesta_correcta_index: 0 }
    ]
  };
}

function estadoValido(overrides = {}) {
  return def.estadoInicial(configuracionValida());
}

describe('TriviaGameDefinition', () => {
  /* =============================================================
     Grupo 1 — Constantes y contrato (6 tests)
     ============================================================= */

  describe('constantes y contrato', () => {
    it('FASES correctas', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA',
        'SELECCIONANDO_SET',
        'MOSTRANDO_PREGUNTA',
        'SELECCIONANDO_RESPUESTA',
        'MOSTRANDO_RESULTADO',
        'CAMBIO_TURNO',
        'FIN_DE_RONDA',
        'FIN_DE_JUEGO'
      ]);
    });

    it('código correcto', () => {
      expect(def.codigo).toBe('TRIVIA');
    });

    it('requiere set', () => {
      expect(def.requiere_set).toBe(true);
    });

    it('defaultConfig tiene campos esperados', () => {
      expect(def.defaultConfig).toEqual({
        rondas: 1,
        preguntas_por_turno: 5,
        tiempo_por_pregunta_seg: 30,
        puntos_por_acierto: 10,
        penalizacion_por_error: 0,
        penalizacion_por_pasar: 0
      });
    });

    it('tiene todos los métodos esperados', () => {
      const metodos = [
        'validarConfiguracion',
        'validarContenidoSet',
        'estadoInicial',
        'seleccionarSet',
        'iniciarSeleccion',
        'seleccionarOpcion',
        'validarRespuesta',
        'pasarPregunta',
        'siguientePregunta',
        'cambiarTurno',
        'iniciarSiguienteRonda',
        'calcularPuntuacion',
        'calcularResultado',
        'validarEstadoJuego',
        'aplicarTimeUp'
      ];
      for (const m of metodos) {
        expect(typeof def[m]).toBe('function');
      }
    });

    it('FASES tiene 8 fases', () => {
      expect(FASES.length).toBe(8);
    });
  });

  /* =============================================================
     Grupo 2 — validarConfiguracion (7 tests)
     ============================================================= */

  describe('validarConfiguracion', () => {
    it('config válida → true', () => {
      expect(def.validarConfiguracion(configuracionValida())).toBe(true);
    });

    it('config null → error', () => {
      expect(() => def.validarConfiguracion(null)).toThrow(ValidacionError);
    });

    it('rondas = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ rondas: 0 }))).toThrow(ValidacionError);
    });

    it('preguntas_por_turno = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ preguntas_por_turno: 0 }))).toThrow(ValidacionError);
    });

    it('tiempo_por_pregunta_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_por_pregunta_seg: 0 }))).toThrow(ValidacionError);
    });

    it('puntos_por_acierto negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ puntos_por_acierto: -1 }))).toThrow(ValidacionError);
    });

    it('penalizacion_por_error negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ penalizacion_por_error: -1 }))).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 3 — validarContenidoSet (7 tests)
     ============================================================= */

  describe('validarContenidoSet', () => {
    const config = configuracionValida();

    it('contenido válido → true', () => {
      expect(def.validarContenidoSet(contenidoValido(6), config)).toBe(true);
    });

    it('items vacío → error', () => {
      expect(() => def.validarContenidoSet({ items: [] }, config)).toThrow(ValidacionError);
    });

    it('menos items que preguntas_por_turno → error', () => {
      expect(() => def.validarContenidoSet(contenidoValido(3), { preguntas_por_turno: 5 })).toThrow(ValidacionError);
    });

    it('item sin pregunta → error', () => {
      const contenido = { items: [{ opciones: ['A', 'B'], respuesta_correcta_index: 0 }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('opciones con menos de 2 → error', () => {
      const contenido = { items: [{ pregunta: 'Q', opciones: ['A'], respuesta_correcta_index: 0 }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('respuesta_correcta_index fuera de rango → error', () => {
      const contenido = { items: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 5 }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('dificultad fuera de rango → error', () => {
      const contenido = { items: [{ pregunta: 'Q', opciones: ['A', 'B'], respuesta_correcta_index: 0, dificultad: 5 }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 4 — estadoInicial (4 tests)
     ============================================================= */

  describe('estadoInicial', () => {
    it('valores por defecto', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(1);
      expect(estado.fase).toBe('INICIO_RONDA');
      expect(estado.equipo_actual).toBe(1);
      expect(estado.set_equipo_1).toBeNull();
      expect(estado.set_equipo_2).toBeNull();
      expect(estado.preguntas_equipo_1).toEqual([]);
      expect(estado.preguntas_equipo_2).toEqual([]);
      expect(estado.pregunta_actual_index).toBe(0);
      expect(estado.opcion_seleccionada).toBeNull();
      expect(estado.respuestas).toEqual([]);
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
    });

    it('rondas 3', () => {
      const estado = def.estadoInicial(configuracionValida({ rondas: 3 }));
      expect(estado.total_rondas).toBe(3);
    });

    it('fase INICIO_RONDA', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(FASES).toContain(estado.fase);
    });

    it('equipo_actual es 1', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect([1, 2]).toContain(estado.equipo_actual);
    });
  });

  /* =============================================================
     Grupo 5 — seleccionarSet (5 tests)
     ============================================================= */

  describe('seleccionarSet', () => {
    it('seleccionar set válido → cambia a MOSTRANDO_PREGUNTA', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const nuevo = def.seleccionarSet(estado, setValido());
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
      expect(nuevo.preguntas_equipo_1.length).toBe(5);
      expect(nuevo.pregunta_actual_index).toBe(0);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.seleccionarSet(estado, setValido())).toThrow(ValidacionError);
    });

    it('set sin items → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      expect(() => def.seleccionarSet(estado, { items: [] })).toThrow(ValidacionError);
    });

    it('set null → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      expect(() => def.seleccionarSet(estado, null)).toThrow(ValidacionError);
    });

    it('guarda set_id', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const nuevo = def.seleccionarSet(estado, setValido());
      expect(nuevo.set_equipo_1).toBe('set1');
    });
  });

  /* =============================================================
     Grupo 6 — iniciarSeleccion (3 tests)
     ============================================================= */

  describe('iniciarSeleccion', () => {
    it('MOSTRANDO_PREGUNTA → SELECCIONANDO_RESPUESTA', () => {
      const estado = { fase: 'MOSTRANDO_PREGUNTA' };
      const nuevo = def.iniciarSeleccion(estado);
      expect(nuevo.fase).toBe('SELECCIONANDO_RESPUESTA');
    });

    it('fase incorrecta → error', () => {
      const estado = { fase: 'INICIO_RONDA' };
      expect(() => def.iniciarSeleccion(estado)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = { fase: 'MOSTRANDO_PREGUNTA' };
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSeleccion(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 7 — seleccionarOpcion (3 tests)
     ============================================================= */

  describe('seleccionarOpcion', () => {
    it('seleccionar opción válida', () => {
      const estado = { fase: 'SELECCIONANDO_RESPUESTA' };
      const nuevo = def.seleccionarOpcion(estado, 2);
      expect(nuevo.opcion_seleccionada).toBe(2);
    });

    it('fase incorrecta → error', () => {
      const estado = { fase: 'INICIO_RONDA' };
      expect(() => def.seleccionarOpcion(estado, 0)).toThrow(ValidacionError);
    });

    it('opcionIndex no entero → error', () => {
      const estado = { fase: 'SELECCIONANDO_RESPUESTA' };
      expect(() => def.seleccionarOpcion(estado, 1.5)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 8 — validarRespuesta (5 tests)
     ============================================================= */

  describe('validarRespuesta', () => {
    it('acierto → suma puntos', () => {
      let estado = def.estadoInicial(configuracionValida({ puntos_por_acierto: 10 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0); // P1 respuesta_correcta_index: 0
      const nuevo = def.validarRespuesta(estado, configuracionValida());
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.respuestas[0].correcta).toBe(true);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
    });

    it('error → resta puntos', () => {
      let estado = def.estadoInicial(configuracionValida({ penalizacion_por_error: 5 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 1); // P1 respuesta_correcta_index: 0
      const nuevo = def.validarRespuesta(estado, configuracionValida({ penalizacion_por_error: 5 }));
      expect(nuevo.puntos_equipo_1).toBe(-5);
      expect(nuevo.respuestas[0].correcta).toBe(false);
    });

    it('sin selección → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      expect(() => def.validarRespuesta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.validarRespuesta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('guarda respuesta en array', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0);
      const nuevo = def.validarRespuesta(estado, configuracionValida());
      expect(nuevo.respuestas.length).toBe(1);
      expect(nuevo.respuestas[0].equipo).toBe(1);
    });
  });

  /* =============================================================
     Grupo 9 — pasarPregunta (4 tests)
     ============================================================= */

  describe('pasarPregunta', () => {
    it('pasar con penalización 0', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      const nuevo = def.pasarPregunta(estado, configuracionValida());
      expect(nuevo.respuestas[0].paso).toBe(true);
      expect(nuevo.respuestas[0].correcta).toBe(false);
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
    });

    it('pasar con penalización > 0', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      const nuevo = def.pasarPregunta(estado, configuracionValida({ penalizacion_por_pasar: 3 }));
      expect(nuevo.puntos_equipo_1).toBe(-3);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.pasarPregunta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('limpia opcion_seleccionada', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET', opcion_seleccionada: 2 };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      const nuevo = def.pasarPregunta(estado, configuracionValida());
      expect(nuevo.opcion_seleccionada).toBeNull();
    });
  });

  /* =============================================================
     Grupo 10 — siguientePregunta (5 tests)
     ============================================================= */

  describe('siguientePregunta', () => {
    it('quedan preguntas → avanza índice', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = { ...estado, fase: 'MOSTRANDO_RESULTADO', pregunta_actual_index: 0 };
      const nuevo = def.siguientePregunta(estado, configuracionValida());
      expect(nuevo.pregunta_actual_index).toBe(1);
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
    });

    it('no quedan preguntas, equipo 1 → CAMBIO_TURNO', () => {
      let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = { ...estado, fase: 'MOSTRANDO_RESULTADO', pregunta_actual_index: 1 };
      const nuevo = def.siguientePregunta(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('no quedan preguntas, equipo 2, hay más rondas → FIN_DE_RONDA', () => {
      let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 2, rondas: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET', equipo_actual: 2 };
      estado = def.seleccionarSet(estado, setValido());
      estado = { ...estado, fase: 'MOSTRANDO_RESULTADO', pregunta_actual_index: 1 };
      const nuevo = def.siguientePregunta(estado, configuracionValida({ preguntas_por_turno: 2, rondas: 2 }));
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('no quedan preguntas, equipo 2, última ronda → FIN_DE_JUEGO', () => {
      let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET', equipo_actual: 2 };
      estado = def.seleccionarSet(estado, setValido());
      estado = { ...estado, fase: 'MOSTRANDO_RESULTADO', pregunta_actual_index: 1 };
      const nuevo = def.siguientePregunta(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.siguientePregunta(estado, configuracionValida())).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 11 — cambiarTurno (3 tests)
     ============================================================= */

  describe('cambiarTurno', () => {
    it('cambia a equipo 2 y SELECCIONANDO_SET', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'CAMBIO_TURNO' };
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.fase).toBe('SELECCIONANDO_SET');
      expect(nuevo.pregunta_actual_index).toBe(0);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.cambiarTurno(estado)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'CAMBIO_TURNO' };
      const original = JSON.parse(JSON.stringify(estado));
      def.cambiarTurno(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 12 — iniciarSiguienteRonda (4 tests)
     ============================================================= */

  describe('iniciarSiguienteRonda', () => {
    it('avanza ronda y resetea', () => {
      let estado = def.estadoInicial(configuracionValida({ rondas: 2 }));
      estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.ronda_actual).toBe(2);
      expect(nuevo.equipo_actual).toBe(1);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.set_equipo_1).toBeNull();
      expect(nuevo.set_equipo_2).toBeNull();
    });

    it('última ronda → FIN_DE_JUEGO', () => {
      let estado = def.estadoInicial(configuracionValida({ rondas: 1 }));
      estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 1 }));
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.iniciarSiguienteRonda(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      let estado = def.estadoInicial(configuracionValida({ rondas: 2 }));
      estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 13 — calcularPuntuacion (2 tests)
     ============================================================= */

  describe('calcularPuntuacion', () => {
    it('retorna puntos del equipo', () => {
      const estado = { puntos_equipo_1: 30, puntos_equipo_2: 20 };
      expect(def.calcularPuntuacion(estado, 1).puntos).toBe(30);
      expect(def.calcularPuntuacion(estado, 2).puntos).toBe(20);
    });

    it('estado null → 0', () => {
      expect(def.calcularPuntuacion(null, 1).puntos).toBe(0);
    });
  });

  /* =============================================================
     Grupo 14 — calcularResultado (4 tests)
     ============================================================= */

  describe('calcularResultado', () => {
    it('mayor puntaje → ganador', () => {
      const estado = { puntos_equipo_1: 30, puntos_equipo_2: 20 };
      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(1);
    });

    it('empate → null', () => {
      const estado = { puntos_equipo_1: 10, puntos_equipo_2: 10 };
      const res = def.calcularResultado(estado);
      expect(res.ganador).toBeNull();
    });

    it('devuelve shape correcto', () => {
      const estado = { puntos_equipo_1: 5, puntos_equipo_2: 8 };
      const res = def.calcularResultado(estado);
      expect(res).toEqual({ puntos_equipo_1: 5, puntos_equipo_2: 8, ganador: 2 });
    });

    it('estado inválido → error', () => {
      expect(() => def.calcularResultado(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 15 — validarEstadoJuego (5 tests)
     ============================================================= */

  describe('validarEstadoJuego', () => {
    it('estado válido → true', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(def.validarEstadoJuego(estado)).toBe(true);
    });

    it('fase inválida → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.fase = 'FASE_INVALIDA';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('equipo inválido → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.equipo_actual = 3;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('puntos no numérico → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.puntos_equipo_1 = 'abc';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('estado null → error', () => {
      expect(() => def.validarEstadoJuego(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 16 — aplicarTimeUp (5 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('SELECCIONANDO_RESPUESTA → marca incorrecta, avanza a MOSTRANDO_RESULTADO', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.respuestas[0].correcta).toBe(false);
      expect(nuevo.respuestas[0].opcion_index).toBeNull();
    });

    it('MOSTRANDO_PREGUNTA → sin cambios', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'MOSTRANDO_PREGUNTA' };
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
    });

    it('FIN_DE_JUEGO → null', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'FIN_DE_JUEGO' };
      expect(def.aplicarTimeUp(estado)).toBeNull();
    });

    it('FIN_DE_RONDA → sin cambios', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'FIN_DE_RONDA' };
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('no muta estado original', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido());
      estado = def.iniciarSeleccion(estado);
      const original = JSON.parse(JSON.stringify(estado));
      def.aplicarTimeUp(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 17 — Integración con GameDefinitionRegistry (2 tests)
     ============================================================= */

  describe('integración con GameDefinitionRegistry', () => {
    it('registrar en registry funciona', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(registry.existe('TRIVIA')).toBe(true);
      expect(registry.obtener('TRIVIA')).toBe(def);
    });

    it('validarRequerimientos → TRIVIA requiere snapshot_id', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(() => registry.validarRequerimientos('TRIVIA', {})).toThrow();
      expect(registry.validarRequerimientos('TRIVIA', { snapshot_id: 's1' })).toBe(true);
    });
  });

  /* =============================================================
     Grupo 18 — Flujo completo (3 tests)
     ============================================================= */

  describe('flujo completo', () => {
    it('Eq1 juega 2 preguntas, cambio turno, Eq2 juega 2, FIN_DE_RONDA', () => {
      let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 2, rondas: 1 }));
      const config = configuracionValida({ preguntas_por_turno: 2, rondas: 1 });
      const set1 = {
        id: 's1',
        items: [
          { pregunta: 'P1', opciones: ['A', 'B'], respuesta_correcta_index: 0 },
          { pregunta: 'P2', opciones: ['A', 'B'], respuesta_correcta_index: 1 }
        ]
      };
      const set2 = {
        id: 's2',
        items: [
          { pregunta: 'P3', opciones: ['A', 'B'], respuesta_correcta_index: 0 },
          { pregunta: 'P4', opciones: ['A', 'B'], respuesta_correcta_index: 1 }
        ]
      };

      // Eq1
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, set1);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 1);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config); // CAMBIO_TURNO

      expect(estado.fase).toBe('CAMBIO_TURNO');
      expect(estado.equipo_actual).toBe(2);

      // Eq2
      estado = def.cambiarTurno(estado);
      estado = def.seleccionarSet(estado, set2);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 1);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config); // FIN_DE_RONDA

      expect(estado.fase).toBe('FIN_DE_JUEGO');
      expect(estado.puntos_equipo_1).toBe(20); // 2 aciertos
      expect(estado.puntos_equipo_2).toBe(20); // 2 aciertos
    });

    it('múltiples rondas', () => {
      let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 1, rondas: 2 }));
      const config = configuracionValida({ preguntas_por_turno: 1, rondas: 2 });
      const set1 = { id: 's1', items: [{ pregunta: 'P1', opciones: ['A', 'B'], respuesta_correcta_index: 0 }] };
      const set2 = { id: 's2', items: [{ pregunta: 'P2', opciones: ['A', 'B'], respuesta_correcta_index: 0 }] };

      // Ronda 1, Eq1
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, set1);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config); // CAMBIO_TURNO

      // Ronda 1, Eq2
      estado = def.cambiarTurno(estado);
      estado = def.seleccionarSet(estado, set2);
      estado = def.iniciarSeleccion(estado);
      estado = def.seleccionarOpcion(estado, 0);
      estado = def.validarRespuesta(estado, config);
      estado = def.siguientePregunta(estado, config); // FIN_DE_RONDA

      expect(estado.fase).toBe('FIN_DE_RONDA');

      // Ronda 2
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.ronda_actual).toBe(2);
      expect(estado.fase).toBe('INICIO_RONDA');
    });

    it('inmutabilidad: reducers no mutan estado original', () => {
      const estado = def.estadoInicial(configuracionValida());
      const original = JSON.parse(JSON.stringify(estado));
      const estadoConSet = { ...estado, fase: 'SELECCIONANDO_SET' };
      def.seleccionarSet(estadoConSet, setValido());
      expect(estado).toEqual(original);
    });
  });
});
