import { describe, it, expect } from 'vitest';
import { AntiTriviaGameDefinition, FASES } from '../../../../src/games/anti-trivia/AntiTriviaGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

const def = AntiTriviaGameDefinition;

/* =============================================================
   Helpers
   ============================================================= */

function configuracionValida(overrides = {}) {
  return {
    rondas: 1,
    preguntas_por_turno: 5,
    tiempo_respuesta_seg: 30,
    penalizacion_por_error: 0,
    puntos_por_acierto: 10,
    ...overrides
  };
}

function contenidoValido(n = 5) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      pregunta: `Pregunta ${i + 1}`,
      respuestas_correctas: [`Correcta A${i + 1}`, `Correcta B${i + 1}`],
      categoria: `Cat ${i + 1}`
    });
  }
  return { items };
}

function setValido(id = 'set1', n = 5) {
  return {
    id,
    items: contenidoValido(n).items
  };
}

function estadoValido(overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), ...overrides };
}

function crearEstadoEnFase(fase, overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), fase, ...overrides };
}

function crearEstadoRespondiendo(overrides = {}) {
  let estado = def.estadoInicial(configuracionValida({ preguntas_por_turno: 2 }));
  estado = { ...estado, fase: 'SELECCIONANDO_SET' };
  estado = def.seleccionarSet(estado, setValido('set1', 2), configuracionValida({ preguntas_por_turno: 2 }));
  estado = def.iniciarRespuesta(estado, configuracionValida({ preguntas_por_turno: 2 }));
  return { ...estado, ...overrides };
}

function crearEstadoConResultado(overrides = {}) {
  const estado = crearEstadoRespondiendo();
  return { ...def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2 })), ...overrides };
}

function crearEstadoTimeUp(overrides = {}) {
  const estado = crearEstadoRespondiendo();
  return { ...def.aplicarTimeUp(estado), ...overrides };
}

/* =============================================================
   Tests
   ============================================================= */

describe('AntiTriviaGameDefinition', () => {
  /* =============================================================
     Grupo 1 — Constantes y contrato (10 tests)
     ============================================================= */

  describe('constantes y contrato', () => {
    it('FASES correctas (9 fases)', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA',
        'SELECCIONANDO_SET',
        'MOSTRANDO_PREGUNTA',
        'RESPONDIENDO',
        'ESPERA_VALIDACION',
        'MOSTRANDO_RESULTADO',
        'CAMBIO_TURNO',
        'FIN_DE_RONDA',
        'FIN_DE_JUEGO'
      ]);
    });

    it('FASES tiene 9 fases', () => {
      expect(FASES.length).toBe(9);
    });

    it('FASES es frozen', () => {
      expect(Object.isFrozen(FASES)).toBe(true);
    });

    it('código correcto', () => {
      expect(def.codigo).toBe('ANTI_TRIVIA');
    });

    it('nombre correcto', () => {
      expect(def.nombre).toBe('Anti-Trivia');
    });

    it('requiere set', () => {
      expect(def.requiere_set).toBe(true);
    });

    it('defaultConfig tiene campos esperados', () => {
      expect(def.defaultConfig).toEqual({
        rondas: 1,
        preguntas_por_turno: 5,
        tiempo_respuesta_seg: 30,
        penalizacion_por_error: 0,
        puntos_por_acierto: 10
      });
    });

    it('defaultConfig es frozen', () => {
      expect(Object.isFrozen(def.defaultConfig)).toBe(true);
    });

    it('tiene todos los métodos esperados', () => {
      const metodos = [
        'validarConfiguracion',
        'validarContenidoSet',
        'validarEstadoJuego',
        'calcularResultado',
        'calcularPuntuacion',
        'estadoInicial',
        'seleccionarSet',
        'iniciarRespuesta',
        'marcarAcierto',
        'marcarError',
        'aplicarTimeUp',
        'confirmarRespuestaMencionada',
        'confirmarSinRespuesta',
        'siguientePregunta',
        'cambiarTurno',
        'iniciarSiguienteRonda'
      ];
      for (const m of metodos) {
        expect(typeof def[m]).toBe('function');
      }
    });

    it('marcarFallo no existe', () => {
      expect(typeof def.marcarFallo).toBe('undefined');
    });
  });

  /* =============================================================
     Grupo 2 — validarConfiguracion (9 tests)
     ============================================================= */

  describe('validarConfiguracion', () => {
    it('config válida → true', () => {
      expect(def.validarConfiguracion(configuracionValida())).toBe(true);
    });

    it('config null → error', () => {
      expect(() => def.validarConfiguracion(null)).toThrow(ValidacionError);
    });

    it('config undefined → error', () => {
      expect(() => def.validarConfiguracion(undefined)).toThrow(ValidacionError);
    });

    it('rondas = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ rondas: 0 }))).toThrow(ValidacionError);
    });

    it('rondas negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ rondas: -1 }))).toThrow(ValidacionError);
    });

    it('preguntas_por_turno = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ preguntas_por_turno: 0 }))).toThrow(ValidacionError);
    });

    it('tiempo_respuesta_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_respuesta_seg: 0 }))).toThrow(ValidacionError);
    });

    it('penalizacion_por_error negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ penalizacion_por_error: -1 }))).toThrow(ValidacionError);
    });

    it('puntos_por_acierto negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ puntos_por_acierto: -1 }))).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 3 — validarContenidoSet (10 tests)
     ============================================================= */

  describe('validarContenidoSet', () => {
    const config = configuracionValida();

    it('contenido válido → true', () => {
      expect(def.validarContenidoSet(contenidoValido(5), config)).toBe(true);
    });

    it('contenido null → error', () => {
      expect(() => def.validarContenidoSet(null, config)).toThrow(ValidacionError);
    });

    it('items no es array → error', () => {
      expect(() => def.validarContenidoSet({ items: 'no-array' }, config)).toThrow(ValidacionError);
    });

    it('items vacío → error', () => {
      expect(() => def.validarContenidoSet({ items: [] }, config)).toThrow(ValidacionError);
    });

    it('menos items que preguntas_por_turno → error', () => {
      expect(() => def.validarContenidoSet(contenidoValido(3), { preguntas_por_turno: 5 })).toThrow(ValidacionError);
    });

    it('item sin pregunta → error', () => {
      const contenido = { items: [{ respuestas_correctas: ['A'] }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('item con pregunta vacía → error', () => {
      const contenido = { items: [{ pregunta: '  ', respuestas_correctas: ['A'] }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('respuestas_correctas no es array → error', () => {
      const contenido = { items: [{ pregunta: 'Q', respuestas_correctas: 'no-array' }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('respuestas_correctas vacío → error', () => {
      const contenido = { items: [{ pregunta: 'Q', respuestas_correctas: [] }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('respuestas_correctas con string vacío → error', () => {
      const contenido = { items: [{ pregunta: 'Q', respuestas_correctas: ['  '] }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 4 — estadoInicial (7 tests)
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
      expect(estado.respuestas).toEqual([]);
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
      expect(estado.timer_activo).toBe(false);
      expect(estado.tiempo_restante_seg).toBe(30);
      expect(estado.tiempo_agotado).toBe(false);
    });

    it('rondas 3', () => {
      const estado = def.estadoInicial(configuracionValida({ rondas: 3 }));
      expect(estado.total_rondas).toBe(3);
    });

    it('tiempo_respuesta_seg custom', () => {
      const estado = def.estadoInicial(configuracionValida({ tiempo_respuesta_seg: 45 }));
      expect(estado.tiempo_restante_seg).toBe(45);
    });

    it('fase INICIO_RONDA', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.fase).toBe('INICIO_RONDA');
    });

    it('equipo_actual es 1', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.equipo_actual).toBe(1);
    });

    it('sin config usa defaults', () => {
      const estado = def.estadoInicial();
      expect(estado.total_rondas).toBe(1);
      expect(estado.tiempo_restante_seg).toBe(30);
    });

    it('no muta config', () => {
      const config = configuracionValida();
      const snapshot = JSON.parse(JSON.stringify(config));
      def.estadoInicial(config);
      expect(config).toEqual(snapshot);
    });
  });

  /* =============================================================
     Grupo 5 — seleccionarSet (7 tests)
     ============================================================= */

  describe('seleccionarSet', () => {
    it('set válido → fase MOSTRANDO_PREGUNTA, guarda set y preguntas', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      const config = configuracionValida({ preguntas_por_turno: 5 });
      const nuevo = def.seleccionarSet(estado, setValido('set1', 5), config);
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
      expect(nuevo.set_equipo_1).toBe('set1');
      expect(nuevo.preguntas_equipo_1.length).toBe(5);
      expect(nuevo.pregunta_actual_index).toBe(0);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('equipo 2 guarda en set_equipo_2 / preguntas_equipo_2', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET', { equipo_actual: 2 });
      const config = configuracionValida({ preguntas_por_turno: 5 });
      const nuevo = def.seleccionarSet(estado, setValido('set2', 5), config);
      expect(nuevo.set_equipo_2).toBe('set2');
      expect(nuevo.preguntas_equipo_2.length).toBe(5);
      expect(nuevo.set_equipo_1).toBeNull();
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.seleccionarSet(estado, setValido(), configuracionValida())).toThrow(ValidacionError);
    });

    it('set null → error', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      expect(() => def.seleccionarSet(estado, null, configuracionValida())).toThrow(ValidacionError);
    });

    it('set sin items → error', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      expect(() => def.seleccionarSet(estado, { items: [] }, configuracionValida())).toThrow(ValidacionError);
    });

    it('set con menos items que preguntas_por_turno → error', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      expect(() => def.seleccionarSet(estado, setValido('s', 3), configuracionValida({ preguntas_por_turno: 5 }))).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      const original = JSON.parse(JSON.stringify(estado));
      def.seleccionarSet(estado, setValido('set1', 5), configuracionValida());
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 6 — iniciarRespuesta (5 tests)
     ============================================================= */

  describe('iniciarRespuesta', () => {
    it('MOSTRANDO_PREGUNTA → RESPONDIENDO con timer activo', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA');
      const nuevo = def.iniciarRespuesta(estado, configuracionValida());
      expect(nuevo.fase).toBe('RESPONDIENDO');
      expect(nuevo.timer_activo).toBe(true);
      expect(nuevo.tiempo_restante_seg).toBe(30);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('tiempo custom se aplica', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA');
      const nuevo = def.iniciarRespuesta(estado, configuracionValida({ tiempo_respuesta_seg: 15 }));
      expect(nuevo.tiempo_restante_seg).toBe(15);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('RESPONDIENDO');
      expect(() => def.iniciarRespuesta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase INICIO_RONDA → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.iniciarRespuesta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA');
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarRespuesta(estado, configuracionValida());
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 7 — marcarAcierto (7 tests)
     ============================================================= */

  describe('marcarAcierto', () => {
    it('desde RESPONDIENDO → suma puntos, MOSTRANDO_RESULTADO, timer off (caso A)', () => {
      const estado = crearEstadoRespondiendo();
      const nuevo = def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.respuestas).toHaveLength(1);
      expect(nuevo.respuestas[0].resultado).toBe('acierto');
      expect(nuevo.respuestas[0].puntos).toBe(10);
      expect(nuevo.respuestas[0].tiempo_agotado).toBe(false);
    });

    it('desde ESPERA_VALIDACION → suma puntos (caso C validado)', () => {
      const estado = { ...crearEstadoTimeUp(), fase: 'ESPERA_VALIDACION' };
      const nuevo = def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.respuestas[0].tiempo_agotado).toBe(true);
    });

    it('puntos_por_acierto custom', () => {
      const estado = crearEstadoRespondiendo();
      const nuevo = def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2, puntos_por_acierto: 25 }));
      expect(nuevo.puntos_equipo_1).toBe(25);
    });

    it('equipo 2 suma en puntos_equipo_2', () => {
      const estado = crearEstadoRespondiendo({ equipo_actual: 2 });
      const nuevo = def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.puntos_equipo_2).toBe(10);
      expect(nuevo.respuestas[0].equipo).toBe(2);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA');
      expect(() => def.marcarAcierto(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase CAMBIO_TURNO → error', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO');
      expect(() => def.marcarAcierto(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoRespondiendo();
      const original = JSON.parse(JSON.stringify(estado));
      def.marcarAcierto(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 8 — marcarError (7 tests)
     ============================================================= */

  describe('marcarError', () => {
    it('desde RESPONDIENDO → penalización default 0, MOSTRANDO_RESULTADO (caso A)', () => {
      const estado = crearEstadoRespondiendo();
      const nuevo = def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.respuestas[0].resultado).toBe('error');
      expect(nuevo.respuestas[0].puntos).toBe(0);
    });

    it('desde ESPERA_VALIDACION → aplica penalización', () => {
      const estado = { ...crearEstadoTimeUp({ puntos_equipo_1: 50 }), fase: 'ESPERA_VALIDACION' };
      const nuevo = def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2, penalizacion_por_error: 15 }));
      expect(nuevo.puntos_equipo_1).toBe(35);
      expect(nuevo.respuestas[0].puntos).toBe(-15);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
    });

    it('penalización custom', () => {
      const estado = crearEstadoRespondiendo({ puntos_equipo_1: 100 });
      const nuevo = def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2, penalizacion_por_error: 20 }));
      expect(nuevo.puntos_equipo_1).toBe(80);
    });

    it('penalización negativa en config se clampa a 0', () => {
      const estado = crearEstadoRespondiendo({ puntos_equipo_1: 50 });
      const nuevo = def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2, penalizacion_por_error: -10 }));
      expect(nuevo.puntos_equipo_1).toBe(50);
      expect(nuevo.respuestas[0].puntos).toBe(0);
    });

    it('equipo 2 resta de puntos_equipo_2', () => {
      const estado = crearEstadoRespondiendo({ equipo_actual: 2, puntos_equipo_2: 40 });
      const nuevo = def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2, penalizacion_por_error: 5 }));
      expect(nuevo.puntos_equipo_2).toBe(35);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_RESULTADO');
      expect(() => def.marcarError(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoRespondiendo({ puntos_equipo_1: 100 });
      const original = JSON.parse(JSON.stringify(estado));
      def.marcarError(estado, configuracionValida({ preguntas_por_turno: 2, penalizacion_por_error: 20 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 9 — aplicarTimeUp (7 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('RESPONDIENDO con timer → detiene timer, NO puntaje, queda en RESPONDIENDO', () => {
      const estado = crearEstadoRespondiendo();
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('RESPONDIENDO');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(0);
      expect(nuevo.tiempo_agotado).toBe(true);
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.respuestas).toHaveLength(0);
    });

    it('RESPONDIENDO sin timer → sin cambios', () => {
      const estado = crearEstadoRespondiendo({ timer_activo: false });
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('RESPONDIENDO');
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('FIN_DE_JUEGO → null', () => {
      const estado = crearEstadoEnFase('FIN_DE_JUEGO');
      expect(def.aplicarTimeUp(estado)).toBeNull();
    });

    it('otra fase → copia sin cambios', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA', { timer_activo: true });
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
      expect(nuevo.timer_activo).toBe(true);
    });

    it('estado null → null', () => {
      expect(def.aplicarTimeUp(null)).toBeNull();
    });

    it('no convierte en error automático (puntos intactos)', () => {
      const estado = crearEstadoRespondiendo({ puntos_equipo_1: 30 });
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.puntos_equipo_1).toBe(30);
      expect(nuevo.respuestas).toEqual([]);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoRespondiendo();
      const original = JSON.parse(JSON.stringify(estado));
      def.aplicarTimeUp(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 10 — confirmarRespuestaMencionada (6 tests)
     ============================================================= */

  describe('confirmarRespuestaMencionada', () => {
    it('RESPONDIENDO tras time-up → ESPERA_VALIDACION (caso C)', () => {
      const estado = crearEstadoTimeUp();
      const nuevo = def.confirmarRespuestaMencionada(estado);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.respuestas).toHaveLength(0);
      expect(nuevo.puntos_equipo_1).toBe(0);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_PREGUNTA');
      expect(() => def.confirmarRespuestaMencionada(estado)).toThrow(ValidacionError);
    });

    it('timer aún corriendo → error', () => {
      const estado = crearEstadoRespondiendo();
      expect(() => def.confirmarRespuestaMencionada(estado)).toThrow(ValidacionError);
    });

    it('sin tiempo_agotado → error', () => {
      const estado = crearEstadoRespondiendo({ timer_activo: false, tiempo_agotado: false });
      expect(() => def.confirmarRespuestaMencionada(estado)).toThrow(ValidacionError);
    });

    it('desde ESPERA_VALIDACION → error', () => {
      const estado = crearEstadoTimeUp({ fase: 'ESPERA_VALIDACION' });
      expect(() => def.confirmarRespuestaMencionada(estado)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoTimeUp();
      const original = JSON.parse(JSON.stringify(estado));
      def.confirmarRespuestaMencionada(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 11 — confirmarSinRespuesta (7 tests)
     ============================================================= */

  describe('confirmarSinRespuesta', () => {
    it('RESPONDIENDO tras time-up → MOSTRANDO_RESULTADO sin puntaje (caso B)', () => {
      const estado = crearEstadoTimeUp();
      const nuevo = def.confirmarSinRespuesta(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.respuestas).toHaveLength(1);
      expect(nuevo.respuestas[0].resultado).toBe('sin_respuesta');
      expect(nuevo.respuestas[0].puntos).toBe(0);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ESPERA_VALIDACION');
      expect(() => def.confirmarSinRespuesta(estado)).toThrow(ValidacionError);
    });

    it('timer aún corriendo → error', () => {
      const estado = crearEstadoRespondiendo();
      expect(() => def.confirmarSinRespuesta(estado)).toThrow(ValidacionError);
    });

    it('sin tiempo_agotado → error', () => {
      const estado = crearEstadoRespondiendo({ timer_activo: false, tiempo_agotado: false });
      expect(() => def.confirmarSinRespuesta(estado)).toThrow(ValidacionError);
    });

    it('estado null → null', () => {
      expect(def.confirmarSinRespuesta(null)).toBeNull();
    });

    it('equipo 2 registra respuesta para equipo 2', () => {
      const estado = crearEstadoTimeUp({ equipo_actual: 2 });
      const nuevo = def.confirmarSinRespuesta(estado);
      expect(nuevo.respuestas[0].equipo).toBe(2);
      expect(nuevo.puntos_equipo_2).toBe(0);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoTimeUp();
      const original = JSON.parse(JSON.stringify(estado));
      def.confirmarSinRespuesta(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 12 — siguientePregunta (8 tests)
     ============================================================= */

  describe('siguientePregunta', () => {
    it('quedan preguntas → avanza index, MOSTRANDO_PREGUNTA', () => {
      const estado = { ...crearEstadoConResultado(), pregunta_actual_index: 0 };
      const config = configuracionValida({ preguntas_por_turno: 3 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.pregunta_actual_index).toBe(1);
      expect(nuevo.fase).toBe('MOSTRANDO_PREGUNTA');
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('equipo 1 última pregunta → CAMBIO_TURNO, equipo 2', () => {
      const estado = {
        ...crearEstadoConResultado(),
        equipo_actual: 1,
        pregunta_actual_index: 1
      };
      const config = configuracionValida({ preguntas_por_turno: 2 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.pregunta_actual_index).toBe(0);
    });

    it('equipo 2 última pregunta → FIN_DE_RONDA', () => {
      const estado = {
        ...crearEstadoConResultado(),
        equipo_actual: 2,
        pregunta_actual_index: 1
      };
      const config = configuracionValida({ preguntas_por_turno: 2 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('reset timer al avanzar', () => {
      const estado = {
        ...crearEstadoConResultado({ timer_activo: true, tiempo_restante_seg: 0, tiempo_agotado: true }),
        pregunta_actual_index: 0
      };
      const config = configuracionValida({ preguntas_por_turno: 3, tiempo_respuesta_seg: 30 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(30);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('RESPONDIENDO');
      expect(() => def.siguientePregunta(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('preguntas_por_turno 1, equipo 1 → CAMBIO_TURNO directo', () => {
      const estado = { ...crearEstadoConResultado(), equipo_actual: 1, pregunta_actual_index: 0 };
      const config = configuracionValida({ preguntas_por_turno: 1 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('preguntas_por_turno 1, equipo 2 → FIN_DE_RONDA directo', () => {
      const estado = { ...crearEstadoConResultado(), equipo_actual: 2, pregunta_actual_index: 0 };
      const config = configuracionValida({ preguntas_por_turno: 1 });
      const nuevo = def.siguientePregunta(estado, config);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('no muta estado original', () => {
      const estado = { ...crearEstadoConResultado(), pregunta_actual_index: 0 };
      const original = JSON.parse(JSON.stringify(estado));
      def.siguientePregunta(estado, configuracionValida({ preguntas_por_turno: 3 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 13 — cambiarTurno (5 tests)
     ============================================================= */

  describe('cambiarTurno', () => {
    it('CAMBIO_TURNO → SELECCIONANDO_SET para equipo 2', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 2, pregunta_actual_index: 1 });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.fase).toBe('SELECCIONANDO_SET');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.pregunta_actual_index).toBe(0);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('equipo_actual 1 en CAMBIO_TURNO → fuerza equipo 2', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.fase).toBe('SELECCIONANDO_SET');
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('RESPONDIENDO');
      expect(() => def.cambiarTurno(estado)).toThrow(ValidacionError);
    });

    it('fase FIN_DE_RONDA → error', () => {
      const estado = crearEstadoEnFase('FIN_DE_RONDA');
      expect(() => def.cambiarTurno(estado)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 2, pregunta_actual_index: 1 });
      const original = JSON.parse(JSON.stringify(estado));
      def.cambiarTurno(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 14 — iniciarSiguienteRonda (5 tests)
     ============================================================= */

  describe('iniciarSiguienteRonda', () => {
    it('avanza ronda y resetea', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2, set_equipo_1: 's1', set_equipo_2: 's2' });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.ronda_actual).toBe(2);
      expect(nuevo.equipo_actual).toBe(1);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.set_equipo_1).toBeNull();
      expect(nuevo.set_equipo_2).toBeNull();
      expect(nuevo.preguntas_equipo_1).toEqual([]);
      expect(nuevo.preguntas_equipo_2).toEqual([]);
      expect(nuevo.pregunta_actual_index).toBe(0);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('última ronda → FIN_DE_JUEGO', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 1 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 1 }));
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'RESPONDIENDO' });
      expect(() => def.iniciarSiguienteRonda(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('conserva puntos entre rondas', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2, puntos_equipo_1: 30, puntos_equipo_2: 20 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(30);
      expect(nuevo.puntos_equipo_2).toBe(20);
    });

    it('no muta estado original', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 15 — calcularPuntuacion (3 tests)
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

    it('puntos undefined → 0', () => {
      expect(def.calcularPuntuacion({}, 1).puntos).toBe(0);
    });
  });

  /* =============================================================
     Grupo 16 — calcularResultado (5 tests)
     ============================================================= */

  describe('calcularResultado', () => {
    it('mayor puntaje → ganador', () => {
      const estado = { puntos_equipo_1: 30, puntos_equipo_2: 20 };
      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(1);
    });

    it('equipo 2 mayor → ganador 2', () => {
      const estado = { puntos_equipo_1: 10, puntos_equipo_2: 50 };
      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(2);
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
     Grupo 17 — validarEstadoJuego (9 tests)
     ============================================================= */

  describe('validarEstadoJuego', () => {
    it('estado inicial válido → true', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(def.validarEstadoJuego(estado)).toBe(true);
    });

    it('estado en RESPONDIENDO válido → true', () => {
      const estado = crearEstadoRespondiendo();
      expect(def.validarEstadoJuego(estado)).toBe(true);
    });

    it('estado null → error', () => {
      expect(() => def.validarEstadoJuego(null)).toThrow(ValidacionError);
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

    it('ronda_actual inválida → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.ronda_actual = 0;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('respuestas no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.respuestas = 'no-array';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('puntos no numérico → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.puntos_equipo_2 = 'abc';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('timer_activo no booleano → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.timer_activo = 'si';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('tiempo_agotado no booleano → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.tiempo_agotado = 1;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('preguntas_equipo_1 no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.preguntas_equipo_1 = null;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 18 — Integración con GameDefinitionRegistry (3 tests)
     ============================================================= */

  describe('integración con GameDefinitionRegistry', () => {
    it('registrar en registry funciona', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(registry.existe('ANTI_TRIVIA')).toBe(true);
      expect(registry.obtener('ANTI_TRIVIA')).toBe(def);
    });

    it('validarRequerimientos → ANTI_TRIVIA requiere snapshot_id', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(() => registry.validarRequerimientos('ANTI_TRIVIA', {})).toThrow();
      expect(registry.validarRequerimientos('ANTI_TRIVIA', { snapshot_id: 's1' })).toBe(true);
    });

    it('contrato mínimo cumple registry', () => {
      const registry = new GameDefinitionRegistry();
      expect(() => registry.registrar(def)).not.toThrow();
    });
  });

  /* =============================================================
     Grupo 19 — Flujo completo (6 tests)
     ============================================================= */

  describe('flujo completo', () => {
    it('flujo mínimo preguntas_por_turno=1: Eq1 → CAMBIO_TURNO → Eq2 → FIN_DE_RONDA → FIN_DE_JUEGO', () => {
      const config = configuracionValida({ preguntas_por_turno: 1, puntos_por_acierto: 10 });
      let estado = def.estadoInicial(config);

      // Eq1
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s1', 1), config);
      expect(estado.fase).toBe('MOSTRANDO_PREGUNTA');
      estado = def.iniciarRespuesta(estado, config);
      expect(estado.fase).toBe('RESPONDIENDO');
      estado = def.marcarAcierto(estado, config);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
      expect(estado.puntos_equipo_1).toBe(10);
      estado = def.siguientePregunta(estado, config);
      expect(estado.fase).toBe('CAMBIO_TURNO');
      expect(estado.equipo_actual).toBe(2);

      // Eq2
      estado = def.cambiarTurno(estado);
      expect(estado.fase).toBe('SELECCIONANDO_SET');
      estado = def.seleccionarSet(estado, setValido('s2', 1), config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.marcarError(estado, config);
      estado = def.siguientePregunta(estado, config);
      expect(estado.fase).toBe('FIN_DE_RONDA');
      expect(estado.puntos_equipo_2).toBe(0);

      // Fin
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.fase).toBe('FIN_DE_JUEGO');

      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(1);
      expect(res.puntos_equipo_1).toBe(10);
      expect(res.puntos_equipo_2).toBe(0);
    });

    it('caso A completo: marcar mientras corre el timer', () => {
      const config = configuracionValida({ preguntas_por_turno: 1 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 1), config);
      estado = def.iniciarRespuesta(estado, config);
      expect(estado.timer_activo).toBe(true);
      estado = def.marcarAcierto(estado, config);
      expect(estado.timer_activo).toBe(false);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
    });

    it('caso B completo: time-up → sin respuesta → sin puntaje', () => {
      const config = configuracionValida({ preguntas_por_turno: 1 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 1), config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.aplicarTimeUp(estado);
      expect(estado.tiempo_agotado).toBe(true);
      expect(estado.puntos_equipo_1).toBe(0);
      estado = def.confirmarSinRespuesta(estado);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.respuestas[0].resultado).toBe('sin_respuesta');
    });

    it('caso C completo: time-up → respondió → ESPERA_VALIDACION → acierto', () => {
      const config = configuracionValida({ preguntas_por_turno: 1, puntos_por_acierto: 15 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 1), config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.aplicarTimeUp(estado);
      estado = def.confirmarRespuestaMencionada(estado);
      expect(estado.fase).toBe('ESPERA_VALIDACION');
      expect(estado.puntos_equipo_1).toBe(0);
      estado = def.marcarAcierto(estado, config);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
      expect(estado.puntos_equipo_1).toBe(15);
    });

    it('flujo multi-ronda: 2 rondas terminan en FIN_DE_JUEGO', () => {
      const config = configuracionValida({ rondas: 2, preguntas_por_turno: 1 });
      let estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.ronda_actual).toBe(2);
      expect(estado.fase).toBe('INICIO_RONDA');
      estado = { ...estado, fase: 'FIN_DE_RONDA' };
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.fase).toBe('FIN_DE_JUEGO');
    });

    it('Eq1 y Eq2 acumulan puntos independientes con penalización', () => {
      const config = configuracionValida({ preguntas_por_turno: 2, puntos_por_acierto: 10, penalizacion_por_error: 5 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET', equipo_actual: 1 };

      // Eq1: acierto + error
      estado = def.seleccionarSet(estado, setValido('s1', 2), config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.marcarAcierto(estado, config);
      estado = def.siguientePregunta(estado, config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.marcarError(estado, config);
      expect(estado.puntos_equipo_1).toBe(5);
      estado = def.siguientePregunta(estado, config);
      expect(estado.fase).toBe('CAMBIO_TURNO');
      expect(estado.equipo_actual).toBe(2);

      // Eq2: 2 aciertos
      estado = def.cambiarTurno(estado);
      estado = def.seleccionarSet(estado, setValido('s2', 2), config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.marcarAcierto(estado, config);
      estado = def.siguientePregunta(estado, config);
      estado = def.iniciarRespuesta(estado, config);
      estado = def.marcarAcierto(estado, config);
      expect(estado.puntos_equipo_2).toBe(20);
      estado = def.siguientePregunta(estado, config);
      expect(estado.fase).toBe('FIN_DE_RONDA');

      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(2);
      expect(res.puntos_equipo_1).toBe(5);
      expect(res.puntos_equipo_2).toBe(20);
    });
  });
});
