import { describe, it, expect } from 'vitest';
import { EnlacesGameDefinition, FASES } from '../../../../src/games/enlaces/EnlacesGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

const def = EnlacesGameDefinition;

/* =============================================================
   Helpers
   ============================================================= */

function configuracionValida(overrides = {}) {
  return {
    rondas: 1,
    pares_por_turno: 8,
    tiempo_turno_seg: 60,
    puntos_por_acierto: 10,
    ...overrides
  };
}

function contenidoValido(n = 8) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      concepto_a: `Concepto A ${i + 1}`,
      concepto_b: `Concepto B ${i + 1}`,
      categoria: `Cat ${i + 1}`,
      dificultad: (i % 3) + 1
    });
  }
  return { items };
}

function setValido(id = 'set1', n = 8) {
  return { id, items: contenidoValido(n).items };
}

function estadoValido(overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), ...overrides };
}

function crearEstadoEnFase(fase, overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), fase, ...overrides };
}

function crearEstadoOrdenando(config = configuracionValida(), overrides = {}) {
  let estado = def.estadoInicial(config);
  estado = { ...estado, fase: 'SELECCIONANDO_SET' };
  estado = def.seleccionarSet(estado, setValido('set1', config.pares_por_turno), config);
  estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0.5 });
  return { ...estado, ...overrides };
}

function crearEstadoValidado(config = configuracionValida(), overrides = {}) {
  const estado = crearEstadoOrdenando(config);
  return { ...def.validar(estado, config), ...overrides };
}

/* =============================================================
   Tests
   ============================================================= */

describe('EnlacesGameDefinition', () => {
  /* =============================================================
     Grupo 1 — Constantes y contrato (12 tests)
     ============================================================= */

  describe('constantes y contrato', () => {
    it('FASES correctas (9 fases)', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA',
        'SELECCIONANDO_SET',
        'PREPARANDO_TABLERO',
        'ORDENANDO',
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
      expect(def.codigo).toBe('ENLACES');
    });

    it('nombre correcto', () => {
      expect(def.nombre).toBe('Enlaces');
    });

    it('requiere set', () => {
      expect(def.requiere_set).toBe(true);
    });

    it('defaultConfig tiene campos esperados', () => {
      expect(def.defaultConfig).toEqual({
        rondas: 1,
        pares_por_turno: 8,
        tiempo_turno_seg: 60,
        puntos_por_acierto: 10
      });
    });

    it('defaultConfig es frozen', () => {
      expect(Object.isFrozen(def.defaultConfig)).toBe(true);
    });

    it('tiene los 5 métodos obligatorios', () => {
      const metodos = [
        'validarConfiguracion',
        'validarContenidoSet',
        'validarEstadoJuego',
        'calcularResultado',
        'aplicarTimeUp'
      ];
      for (const m of metodos) {
        expect(typeof def[m]).toBe('function');
      }
    });

    it('tiene todos los reducers esperados', () => {
      const reducers = [
        'estadoInicial',
        'seleccionarSet',
        'prepararTablero',
        'moverElemento',
        'deshacerMovimiento',
        'validar',
        'siguienteTurno',
        'iniciarSiguienteTurno',
        'iniciarSiguienteRonda',
        'finalizarJuego',
        'calcularPuntuacion'
      ];
      for (const r of reducers) {
        expect(typeof def[r]).toBe('function');
      }
    });

    it('moverElemento no existe como acción de otra fase', () => {
      expect(typeof def.moverElemento).toBe('function');
    });

    it('no expone propiedades desconocidas de contrato', () => {
      expect(typeof def.requiere_snapshot).toBe('undefined');
    });
  });

  /* =============================================================
     Grupo 2 — validarConfiguracion (8 tests)
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

    it('pares_por_turno = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ pares_por_turno: 0 }))).toThrow(ValidacionError);
    });

    it('tiempo_turno_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_turno_seg: 0 }))).toThrow(ValidacionError);
    });

    it('puntos_por_acierto negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ puntos_por_acierto: -1 }))).toThrow(ValidacionError);
    });

    it('puntos_por_acierto = 0 es válido', () => {
      expect(def.validarConfiguracion(configuracionValida({ puntos_por_acierto: 0 }))).toBe(true);
    });
  });

  /* =============================================================
     Grupo 3 — validarContenidoSet (12 tests)
     ============================================================= */

  describe('validarContenidoSet', () => {
    const config = configuracionValida();

    it('contenido válido → true', () => {
      expect(def.validarContenidoSet(contenidoValido(8), config)).toBe(true);
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

    it('menos items que pares_por_turno → error', () => {
      expect(() => def.validarContenidoSet(contenidoValido(3), configuracionValida({ pares_por_turno: 8 }))).toThrow(ValidacionError);
    });

    it('item sin concepto_a → error', () => {
      const contenido = { items: [{ concepto_b: 'B' }] };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 1 }))).toThrow(ValidacionError);
    });

    it('item con concepto_a vacío → error', () => {
      const contenido = { items: [{ concepto_a: '  ', concepto_b: 'B' }] };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 1 }))).toThrow(ValidacionError);
    });

    it('item sin concepto_b → error', () => {
      const contenido = { items: [{ concepto_a: 'A' }] };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 1 }))).toThrow(ValidacionError);
    });

    it('item con concepto_b vacío → error', () => {
      const contenido = { items: [{ concepto_a: 'A', concepto_b: '' }] };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 1 }))).toThrow(ValidacionError);
    });

    it('concepto_a duplicado → error', () => {
      const contenido = {
        items: [
          { concepto_a: 'A1', concepto_b: 'B1' },
          { concepto_a: 'A1', concepto_b: 'B2' }
        ]
      };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 2 }))).toThrow(ValidacionError);
    });

    it('concepto_b duplicado → error', () => {
      const contenido = {
        items: [
          { concepto_a: 'A1', concepto_b: 'B1' },
          { concepto_a: 'A2', concepto_b: 'B1' }
        ]
      };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 2 }))).toThrow(ValidacionError);
    });

    it('dificultad inválida → error', () => {
      const contenido = { items: [{ concepto_a: 'A', concepto_b: 'B', dificultad: 5 }] };
      expect(() => def.validarContenidoSet(contenido, configuracionValida({ pares_por_turno: 1 }))).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 4 — estadoInicial (8 tests)
     ============================================================= */

  describe('estadoInicial', () => {
    it('valores por defecto', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.fase).toBe('INICIO_RONDA');
      expect(estado.equipo_actual).toBe(1);
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(1);
      expect(estado.columna_a).toEqual([]);
      expect(estado.columna_b).toEqual([]);
      expect(estado.pares_correctos).toEqual({});
      expect(estado.movimientos).toEqual([]);
      expect(estado.validado).toBe(false);
      expect(estado.resultado_turno).toBeNull();
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
      expect(estado.tiempo_restante_seg).toBe(60);
      expect(estado.tiempo_agotado).toBe(false);
    });

    it('rondas 3', () => {
      const estado = def.estadoInicial(configuracionValida({ rondas: 3 }));
      expect(estado.total_rondas).toBe(3);
    });

    it('tiempo custom', () => {
      const estado = def.estadoInicial(configuracionValida({ tiempo_turno_seg: 45 }));
      expect(estado.tiempo_restante_seg).toBe(45);
    });

    it('sin config usa defaults', () => {
      const estado = def.estadoInicial();
      expect(estado.total_rondas).toBe(1);
      expect(estado.tiempo_restante_seg).toBe(60);
    });

    it('items vacío inicialmente', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.items).toEqual([]);
      expect(estado.set_equipo_1).toBeNull();
      expect(estado.set_equipo_2).toBeNull();
    });

    it('no muta config', () => {
      const config = configuracionValida();
      const snapshot = JSON.parse(JSON.stringify(config));
      def.estadoInicial(config);
      expect(config).toEqual(snapshot);
    });

    it('estado inicial pasa validarEstadoJuego', () => {
      expect(def.validarEstadoJuego(def.estadoInicial(configuracionValida()))).toBe(true);
    });

    it('timer_activo inicia en false', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.timer_activo).toBe(false);
    });
  });

  /* =============================================================
     Grupo 5 — seleccionarSet (7 tests)
     ============================================================= */

  describe('seleccionarSet', () => {
    it('set válido → PREPARANDO_TABLERO, guarda set e items', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      const nuevo = def.seleccionarSet(estado, setValido('set1', 8), configuracionValida());
      expect(nuevo.fase).toBe('PREPARANDO_TABLERO');
      expect(nuevo.set_equipo_1).toBe('set1');
      expect(nuevo.items).toHaveLength(8);
      expect(nuevo.tiempo_agotado).toBe(false);
      expect(nuevo.validado).toBe(false);
    });

    it('equipo 2 guarda en set_equipo_2', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET', { equipo_actual: 2 });
      const nuevo = def.seleccionarSet(estado, setValido('set2', 8), configuracionValida());
      expect(nuevo.set_equipo_2).toBe('set2');
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

    it('set con menos items que pares_por_turno → error', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      expect(() => def.seleccionarSet(estado, setValido('s', 3), configuracionValida({ pares_por_turno: 8 }))).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoEnFase('SELECCIONANDO_SET');
      const original = JSON.parse(JSON.stringify(estado));
      def.seleccionarSet(estado, setValido('set1', 8), configuracionValida());
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 6 — prepararTablero (8 tests)
     ============================================================= */

  describe('prepararTablero', () => {
    it('ORDENANDO con columnas y pares correctos', () => {
      const config = configuracionValida({ pares_por_turno: 4 });
      const estado = crearEstadoEnFase('PREPARANDO_TABLERO');
      const seleccionado = def.seleccionarSet(
        { ...estado, fase: 'SELECCIONANDO_SET' },
        setValido('s', 4),
        config
      );
      const nuevo = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0.5 });
      expect(nuevo.fase).toBe('ORDENANDO');
      expect(nuevo.columna_a).toHaveLength(4);
      expect(nuevo.columna_b).toHaveLength(4);
      expect(nuevo.timer_activo).toBe(true);
      expect(nuevo.tiempo_restante_seg).toBe(60);
      expect(Object.keys(nuevo.pares_correctos)).toHaveLength(4);
    });

    it('columna_a es fija (orden de concepto_a) y pares_correctos correcto', () => {
      const config = configuracionValida({ pares_por_turno: 3 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 3), config);
      const nuevo = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0.9 });
      for (const a of nuevo.columna_a) {
        expect(nuevo.pares_correctos[a]).toBeDefined();
        expect(nuevo.pares_correctos[a]).toMatch(/^Concepto B/);
      }
    });

    it('set con más items que pares_por_turno → toma solo pares_por_turno', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 8), config);
      const nuevo = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      expect(nuevo.columna_a).toHaveLength(2);
      expect(nuevo.columna_b).toHaveLength(2);
      expect(nuevo.items).toHaveLength(2);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ORDENANDO');
      expect(() => def.prepararTablero(estado, [], configuracionValida())).toThrow(ValidacionError);
    });

    it('sin items suficientes → error', () => {
      const estado = crearEstadoEnFase('PREPARANDO_TABLERO');
      expect(() => def.prepararTablero(estado, [], configuracionValida())).toThrow(ValidacionError);
    });

    it('resetea movimientos y validado', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 2), config);
      const nuevo = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      expect(nuevo.movimientos).toEqual([]);
      expect(nuevo.validado).toBe(false);
      expect(nuevo.resultado_turno).toBeNull();
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('acepta items explícitos por parámetro', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      const estado = crearEstadoEnFase('PREPARANDO_TABLERO');
      const items = [
        { concepto_a: 'X1', concepto_b: 'Y1' },
        { concepto_a: 'X2', concepto_b: 'Y2' }
      ];
      const nuevo = def.prepararTablero(estado, items, config, { shuffle: () => 0 });
      expect(nuevo.columna_a).toEqual(['X1', 'X2']);
      expect(nuevo.pares_correctos).toEqual({ X1: 'Y1', X2: 'Y2' });
    });

    it('no muta estado original', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 2), config);
      const original = JSON.parse(JSON.stringify(seleccionado));
      def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      expect(seleccionado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 7 — moverElemento (7 tests)
     ============================================================= */

  describe('moverElemento', () => {
    it('reordena la columna B', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const antes = [...estado.columna_b];
      const nuevo = def.moverElemento(estado, 0, 2);
      expect(nuevo.columna_b).toHaveLength(3);
      expect(nuevo.columna_b[2]).toBe(antes[0]);
      expect(nuevo.columna_b).not.toEqual(antes);
    });

    it('registra el movimiento', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const nuevo = def.moverElemento(estado, 1, 0);
      expect(nuevo.movimientos).toHaveLength(1);
      expect(nuevo.movimientos[0]).toEqual({ desde: 1, hasta: 0 });
    });

    it('desdeIdx = hastaIdx → sin cambios pero copia', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const nuevo = def.moverElemento(estado, 1, 1);
      expect(nuevo.columna_b).toEqual(estado.columna_b);
      expect(nuevo.movimientos).toHaveLength(0);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ESPERA_VALIDACION');
      expect(() => def.moverElemento(estado, 0, 1)).toThrow(ValidacionError);
    });

    it('desdeIdx fuera de rango → error', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      expect(() => def.moverElemento(estado, 99, 0)).toThrow(ValidacionError);
    });

    it('hastaIdx fuera de rango → error', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      expect(() => def.moverElemento(estado, 0, -1)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const original = JSON.parse(JSON.stringify(estado));
      def.moverElemento(estado, 0, 2);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 8 — deshacerMovimiento (6 tests)
     ============================================================= */

  describe('deshacerMovimiento', () => {
    it('revierte el último movimiento', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const base = [...estado.columna_b];
      const movido = def.moverElemento(estado, 0, 2);
      const revertido = def.deshacerMovimiento(movido);
      expect(revertido.columna_b).toEqual(base);
      expect(revertido.movimientos).toHaveLength(0);
    });

    it('sin movimientos → sin cambios (copia)', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const nuevo = def.deshacerMovimiento(estado);
      expect(nuevo.columna_b).toEqual(estado.columna_b);
      expect(nuevo.movimientos).toHaveLength(0);
    });

    it('revierte solo el último de varios', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 4 }));
      let e = def.moverElemento(estado, 0, 1);
      const trasPrimero = [...e.columna_b];
      e = def.moverElemento(e, 2, 3);
      const trasSegundo = [...e.columna_b];
      e = def.deshacerMovimiento(e);
      expect(e.columna_b).toEqual(trasPrimero);
      expect(e.movimientos).toHaveLength(1);
      e = def.deshacerMovimiento(e);
      expect(e.columna_b).toEqual(estado.columna_b);
      expect(trasSegundo).not.toEqual(trasPrimero);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ESPERA_VALIDACION');
      expect(() => def.deshacerMovimiento(estado)).toThrow(ValidacionError);
    });

    it('fase ORDENANDO tras time-up (ESPERA_VALIDACION) → error', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const timeup = def.aplicarTimeUp(estado);
      expect(timeup.fase).toBe('ESPERA_VALIDACION');
      expect(() => def.deshacerMovimiento(timeup)).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const movido = def.moverElemento(estado, 0, 2);
      const original = JSON.parse(JSON.stringify(movido));
      def.deshacerMovimiento(movido);
      expect(movido).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 9 — validar (8 tests)
     ============================================================= */

  describe('validar', () => {
    it('tablero perfecto → todos aciertos, suma puntos', () => {
      const config = configuracionValida({ pares_por_turno: 3, puntos_por_acierto: 10 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 3), config);
      // shuffle = 0.5 con 3 elementos suele alterar; forzamos orden correcto manualmente
      let tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      // reconstruir columna_b en orden correcto para el test
      tablero = {
        ...tablero,
        columna_b: tablero.columna_a.map((a) => tablero.pares_correctos[a])
      };
      const nuevo = def.validar(tablero, config);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.validado).toBe(true);
      expect(nuevo.resultado_turno).toEqual({ aciertos: 3, total: 3 });
      expect(nuevo.puntos_equipo_1).toBe(30);
      expect(nuevo.timer_activo).toBe(false);
    });

    it('tablero deliberadamente desordenado → 0 aciertos, 0 puntos', () => {
      const config = configuracionValida({ pares_por_turno: 3 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 3), config);
      let tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0.5 });
      // rotar la solución 1 posición → 0 aciertos garantizados (pares únicos)
      const solucion = tablero.columna_a.map((a) => tablero.pares_correctos[a]);
      tablero = {
        ...tablero,
        columna_b: [...solucion.slice(1), solucion[0]]
      };
      const nuevo = def.validar(tablero, config);
      expect(nuevo.resultado_turno.aciertos).toBe(0);
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.resultado_turno.total).toBe(3);
    });

    it('cuenta aciertos parciales correctamente', () => {
      const config = configuracionValida({ pares_por_turno: 3, puntos_por_acierto: 10 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 3), config);
      let tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      // 1 correcto, 2 incorrectos
      tablero = {
        ...tablero,
        columna_b: [
          tablero.pares_correctos[tablero.columna_a[0]],
          tablero.pares_correctos[tablero.columna_a[2]],
          tablero.pares_correctos[tablero.columna_a[1]]
        ]
      };
      const nuevo = def.validar(tablero, config);
      expect(nuevo.resultado_turno.aciertos).toBe(1);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });

    it('equipo 2 suma en puntos_equipo_2', () => {
      const config = configuracionValida({ pares_por_turno: 1, puntos_por_acierto: 10 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET', equipo_actual: 2 };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 1), config);
      let tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      tablero = {
        ...tablero,
        columna_b: [tablero.pares_correctos[tablero.columna_a[0]]]
      };
      const nuevo = def.validar(tablero, config);
      expect(nuevo.puntos_equipo_2).toBe(10);
      expect(nuevo.puntos_equipo_1).toBe(0);
    });

    it('desde ESPERA_VALIDACION también valida', () => {
      const config = configuracionValida({ pares_por_turno: 1 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 1), config);
      let tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      tablero = def.aplicarTimeUp(tablero);
      expect(tablero.fase).toBe('ESPERA_VALIDACION');
      const nuevo = def.validar(tablero, config);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.resultado_turno.total).toBe(1);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_RESULTADO');
      expect(() => def.validar(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase INICIO_RONDA → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.validar(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      const estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      const seleccionado = def.seleccionarSet(estado, setValido('s', 2), config);
      const tablero = def.prepararTablero(seleccionado, undefined, config, { shuffle: () => 0 });
      const original = JSON.parse(JSON.stringify(tablero));
      def.validar(tablero, config);
      expect(tablero).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 10 — aplicarTimeUp (7 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('ORDENANDO con timer → ESPERA_VALIDACION + tiempo_agotado', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('ESPERA_VALIDACION');
      expect(nuevo.tiempo_agotado).toBe(true);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(0);
    });

    it('ORDENANDO sin timer → copia sin cambios', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }), { timer_activo: false });
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('ORDENANDO');
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('FIN_DE_RONDA → null', () => {
      const estado = crearEstadoEnFase('FIN_DE_RONDA');
      expect(def.aplicarTimeUp(estado)).toBeNull();
    });

    it('FIN_DE_JUEGO → null', () => {
      const estado = crearEstadoEnFase('FIN_DE_JUEGO');
      expect(def.aplicarTimeUp(estado)).toBeNull();
    });

    it('otra fase → copia sin cambios', () => {
      const estado = crearEstadoEnFase('MOSTRANDO_RESULTADO', { timer_activo: true });
      const nuevo = def.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('MOSTRANDO_RESULTADO');
      expect(nuevo.timer_activo).toBe(true);
    });

    it('estado null → null', () => {
      expect(def.aplicarTimeUp(null)).toBeNull();
    });

    it('es determinista (INV-066): dos llamadas → mismo resultado', () => {
      const estado = crearEstadoOrdenando(configuracionValida({ pares_por_turno: 3 }));
      const r1 = def.aplicarTimeUp(estado);
      const r2 = def.aplicarTimeUp(estado);
      expect(r1).toEqual(r2);
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    });
  });

  /* =============================================================
     Grupo 11 — siguienteTurno (5 tests)
     ============================================================= */

  describe('siguienteTurno', () => {
    it('MOSTRANDO_RESULTADO → CAMBIO_TURNO', () => {
      const estado = crearEstadoValidado(configuracionValida({ pares_por_turno: 3 }));
      const nuevo = def.siguienteTurno(estado);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ORDENANDO');
      expect(() => def.siguienteTurno(estado)).toThrow(ValidacionError);
    });

    it('fase CAMBIO_TURNO → error', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO');
      expect(() => def.siguienteTurno(estado)).toThrow(ValidacionError);
    });

    it('conserva puntos', () => {
      const estado = crearEstadoValidado(
        configuracionValida({ pares_por_turno: 3 }),
        { puntos_equipo_1: 30 }
      );
      const nuevo = def.siguienteTurno(estado);
      expect(nuevo.puntos_equipo_1).toBe(30);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoValidado(configuracionValida({ pares_por_turno: 3 }));
      const original = JSON.parse(JSON.stringify(estado));
      def.siguienteTurno(estado);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 12 — iniciarSiguienteTurno (7 tests)
     ============================================================= */

  describe('iniciarSiguienteTurno', () => {
    it('Eq1 → Eq2 en SELECCIONANDO_SET', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 1 });
      const nuevo = def.iniciarSiguienteTurno(estado, configuracionValida());
      expect(nuevo.fase).toBe('SELECCIONANDO_SET');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_agotado).toBe(false);
    });

    it('Eq1 → limpia tablero anterior', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', {
        equipo_actual: 1,
        columna_a: ['A'],
        columna_b: ['B'],
        pares_correctos: { A: 'B' },
        movimientos: [{ desde: 0, hasta: 1 }],
        validado: true,
        resultado_turno: { aciertos: 1, total: 1 },
        items: [{ concepto_a: 'A', concepto_b: 'B' }]
      });
      const nuevo = def.iniciarSiguienteTurno(estado, configuracionValida());
      expect(nuevo.columna_a).toEqual([]);
      expect(nuevo.columna_b).toEqual([]);
      expect(nuevo.pares_correctos).toEqual({});
      expect(nuevo.movimientos).toEqual([]);
      expect(nuevo.validado).toBe(false);
      expect(nuevo.resultado_turno).toBeNull();
      expect(nuevo.items).toEqual([]);
    });

    it('Eq2 → FIN_DE_RONDA', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 2 });
      const nuevo = def.iniciarSiguienteTurno(estado, configuracionValida());
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('fase incorrecta → error', () => {
      const estado = crearEstadoEnFase('ORDENANDO');
      expect(() => def.iniciarSiguienteTurno(estado)).toThrow(ValidacionError);
    });

    it('fase FIN_DE_RONDA → error', () => {
      const estado = crearEstadoEnFase('FIN_DE_RONDA');
      expect(() => def.iniciarSiguienteTurno(estado)).toThrow(ValidacionError);
    });

    it('resetea tiempo_restante_seg al default', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 1, tiempo_restante_seg: 0 });
      const nuevo = def.iniciarSiguienteTurno(estado, configuracionValida({ tiempo_turno_seg: 45 }));
      expect(nuevo.tiempo_restante_seg).toBe(45);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoEnFase('CAMBIO_TURNO', { equipo_actual: 1 });
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSiguienteTurno(estado, configuracionValida());
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 13 — iniciarSiguienteRonda (6 tests)
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
      expect(nuevo.columna_a).toEqual([]);
      expect(nuevo.movimientos).toEqual([]);
      expect(nuevo.validado).toBe(false);
    });

    it('última ronda → FIN_DE_JUEGO', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 1 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 1 }));
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'ORDENANDO' });
      expect(() => def.iniciarSiguienteRonda(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('conserva puntos entre rondas', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2, puntos_equipo_1: 30, puntos_equipo_2: 20 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(30);
      expect(nuevo.puntos_equipo_2).toBe(20);
    });

    it('resetea tiempo_agotado y timer', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2, tiempo_agotado: true, timer_activo: true });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.tiempo_agotado).toBe(false);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.tiempo_restante_seg).toBe(60);
    });

    it('no muta estado original', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 14 — finalizarJuego (4 tests)
     ============================================================= */

  describe('finalizarJuego', () => {
    it('fase FIN_DE_JUEGO', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA' });
      const nuevo = def.finalizarJuego(estado);
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('desde cualquier fase', () => {
      const estado = estadoValido({ fase: 'ORDENANDO', timer_activo: true });
      const nuevo = def.finalizarJuego(estado);
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('conserva puntos', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', puntos_equipo_1: 50, puntos_equipo_2: 30 });
      const nuevo = def.finalizarJuego(estado);
      expect(nuevo.puntos_equipo_1).toBe(50);
      expect(nuevo.puntos_equipo_2).toBe(30);
    });

    it('no muta estado original', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA' });
      const original = JSON.parse(JSON.stringify(estado));
      def.finalizarJuego(estado);
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
    it('mayor puntaje Eq1 → ganador 1', () => {
      const res = def.calcularResultado({ puntos_equipo_1: 30, puntos_equipo_2: 20 });
      expect(res.ganador).toBe(1);
    });

    it('mayor puntaje Eq2 → ganador 2', () => {
      const res = def.calcularResultado({ puntos_equipo_1: 10, puntos_equipo_2: 50 });
      expect(res.ganador).toBe(2);
    });

    it('empate → null', () => {
      const res = def.calcularResultado({ puntos_equipo_1: 10, puntos_equipo_2: 10 });
      expect(res.ganador).toBeNull();
    });

    it('devuelve shape correcto', () => {
      const res = def.calcularResultado({ puntos_equipo_1: 5, puntos_equipo_2: 8 });
      expect(res).toEqual({ puntos_equipo_1: 5, puntos_equipo_2: 8, ganador: 2 });
    });

    it('estado inválido → error', () => {
      expect(() => def.calcularResultado(null)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 17 — validarEstadoJuego (12 tests)
     ============================================================= */

  describe('validarEstadoJuego', () => {
    it('estado inicial válido → true', () => {
      expect(def.validarEstadoJuego(def.estadoInicial(configuracionValida()))).toBe(true);
    });

    it('estado en ORDENANDO válido → true', () => {
      expect(def.validarEstadoJuego(crearEstadoOrdenando())).toBe(true);
    });

    it('estado validado válido → true', () => {
      expect(def.validarEstadoJuego(crearEstadoValidado())).toBe(true);
    });

    it('estado null → error', () => {
      expect(() => def.validarEstadoJuego(null)).toThrow(ValidacionError);
    });

    it('fase desconocida → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.fase = 'FASE_INVALIDA';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('equipo 3 → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.equipo_actual = 3;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('ronda_actual 0 → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.ronda_actual = 0;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('columna_a no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.columna_a = 'no-array';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('columna_b no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.columna_b = null;
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('puntos no numérico → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.puntos_equipo_1 = 'abc';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('movimientos no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.movimientos = 'no-array';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });

    it('resultado_turno inválido → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.resultado_turno = { aciertos: 'x' };
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
      expect(registry.existe('ENLACES')).toBe(true);
      expect(registry.obtener('ENLACES')).toBe(def);
    });

    it('validarRequerimientos → ENLACES requiere snapshot_id', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(() => registry.validarRequerimientos('ENLACES', {})).toThrow();
      expect(registry.validarRequerimientos('ENLACES', { snapshot_id: 's1' })).toBe(true);
    });

    it('contrato mínimo cumple registry', () => {
      const registry = new GameDefinitionRegistry();
      expect(() => registry.registrar(def)).not.toThrow();
    });
  });

  /* =============================================================
     Grupo 19 — Flujo completo (7 tests)
     ============================================================= */

  describe('flujo completo', () => {
    it('flujo mínimo pares=2: Eq1 → CAMBIO_TURNO → Eq2 → FIN_DE_RONDA → FIN_DE_JUEGO', () => {
      const config = configuracionValida({ pares_por_turno: 2, puntos_por_acierto: 10 });
      let estado = def.estadoInicial(config);

      // Eq1
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s1', 2), config);
      expect(estado.fase).toBe('PREPARANDO_TABLERO');
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0 });
      expect(estado.fase).toBe('ORDENANDO');
      // Alinear todas las filas
      estado = {
        ...estado,
        columna_b: estado.columna_a.map((a) => estado.pares_correctos[a])
      };
      estado = def.validar(estado, config);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
      expect(estado.puntos_equipo_1).toBe(20);
      expect(estado.resultado_turno).toEqual({ aciertos: 2, total: 2 });
      estado = def.siguienteTurno(estado);
      expect(estado.fase).toBe('CAMBIO_TURNO');
      estado = def.iniciarSiguienteTurno(estado, config);
      expect(estado.fase).toBe('SELECCIONANDO_SET');
      expect(estado.equipo_actual).toBe(2);

      // Eq2: tablero rotado → 0 aciertos
      estado = def.seleccionarSet(estado, setValido('s2', 2), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0.5 });
      const solucion = estado.columna_a.map((a) => estado.pares_correctos[a]);
      estado = { ...estado, columna_b: [...solucion.slice(1), solucion[0]] };
      estado = def.validar(estado, config);
      expect(estado.puntos_equipo_2).toBe(0);
      estado = def.siguienteTurno(estado);
      estado = def.iniciarSiguienteTurno(estado, config);
      expect(estado.fase).toBe('FIN_DE_RONDA');

      // Fin
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.fase).toBe('FIN_DE_JUEGO');

      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(1);
      expect(res.puntos_equipo_1).toBe(20);
      expect(res.puntos_equipo_2).toBe(0);
    });

    it('flujo con time-up: ORDENANDO → ESPERA_VALIDACION → validar → resultado', () => {
      const config = configuracionValida({ pares_por_turno: 2 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 2), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0.5 });
      expect(estado.timer_activo).toBe(true);
      estado = def.aplicarTimeUp(estado);
      expect(estado.fase).toBe('ESPERA_VALIDACION');
      expect(estado.tiempo_agotado).toBe(true);
      estado = def.validar(estado, config);
      expect(estado.fase).toBe('MOSTRANDO_RESULTADO');
      expect(estado.validado).toBe(true);
    });

    it('flujo con movimientos y deshacer', () => {
      const config = configuracionValida({ pares_por_turno: 3 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 3), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0 });
      const base = [...estado.columna_b];
      estado = def.moverElemento(estado, 0, 2);
      expect(estado.movimientos).toHaveLength(1);
      estado = def.moverElemento(estado, 2, 1);
      expect(estado.movimientos).toHaveLength(2);
      estado = def.deshacerMovimiento(estado);
      expect(estado.movimientos).toHaveLength(1);
      estado = def.deshacerMovimiento(estado);
      expect(estado.columna_b).toEqual(base);
      expect(estado.movimientos).toHaveLength(0);
    });

    it('validar tras deshacer usa el estado actual', () => {
      const config = configuracionValida({ pares_por_turno: 3, puntos_por_acierto: 10 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido('s', 3), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0 });
      estado = def.moverElemento(estado, 0, 2);
      estado = def.deshacerMovimiento(estado);
      estado = {
        ...estado,
        columna_b: estado.columna_a.map((a) => estado.pares_correctos[a])
      };
      const nuevo = def.validar(estado, config);
      expect(nuevo.resultado_turno.aciertos).toBe(3);
      expect(nuevo.puntos_equipo_1).toBe(30);
    });

    it('multi-ronda: 2 rondas terminan en FIN_DE_JUEGO', () => {
      const config = configuracionValida({ rondas: 2, pares_por_turno: 1 });
      let estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.ronda_actual).toBe(2);
      expect(estado.fase).toBe('INICIO_RONDA');
      estado = { ...estado, fase: 'FIN_DE_RONDA' };
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.fase).toBe('FIN_DE_JUEGO');
    });

    it('ambos equipos acumulan puntos independientes', () => {
      const config = configuracionValida({ pares_por_turno: 2, puntos_por_acierto: 10 });
      let estado = { ...def.estadoInicial(config), fase: 'SELECCIONANDO_SET', equipo_actual: 1 };

      // Eq1: 2 aciertos
      estado = def.seleccionarSet(estado, setValido('s1', 2), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0 });
      estado = {
        ...estado,
        columna_b: estado.columna_a.map((a) => estado.pares_correctos[a])
      };
      estado = def.validar(estado, config);
      expect(estado.puntos_equipo_1).toBe(20);
      estado = def.siguienteTurno(estado);
      estado = def.iniciarSiguienteTurno(estado, config);
      expect(estado.equipo_actual).toBe(2);

      // Eq2: tablero rotado → 0 aciertos
      estado = def.seleccionarSet(estado, setValido('s2', 2), config);
      estado = def.prepararTablero(estado, undefined, config, { shuffle: () => 0.5 });
      const solucion = estado.columna_a.map((a) => estado.pares_correctos[a]);
      estado = { ...estado, columna_b: [...solucion.slice(1), solucion[0]] };
      estado = def.validar(estado, config);
      expect(estado.puntos_equipo_2).toBe(0);
      estado = def.siguienteTurno(estado);
      estado = def.iniciarSiguienteTurno(estado, config);
      expect(estado.fase).toBe('FIN_DE_RONDA');

      const res = def.calcularResultado(estado);
      expect(res.ganador).toBe(1);
    });

    it('finalizarJuego desde FIN_DE_RONDA conserva todo', () => {
      const config = configuracionValida({ pares_por_turno: 1 });
      let estado = estadoValido({
        fase: 'FIN_DE_RONDA',
        puntos_equipo_1: 40,
        puntos_equipo_2: 20,
        resultado_turno: { aciertos: 2, total: 2 },
        validado: true
      });
      estado = def.finalizarJuego(estado);
      expect(estado.fase).toBe('FIN_DE_JUEGO');
      expect(estado.puntos_equipo_1).toBe(40);
      expect(estado.puntos_equipo_2).toBe(20);
      expect(def.validarEstadoJuego(estado)).toBe(true);
    });
  });
});
