import { describe, it, expect } from 'vitest';
import { MemoriaGameDefinition, FASES } from '../../../../src/games/memoria/MemoriaGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

const def = MemoriaGameDefinition;

/* =============================================================
   Helpers
   ============================================================= */

function configuracionValida(overrides = {}) {
  return {
    rondas: 1,
    parejas_por_ronda: 6,
    tiempo_turno_seg: 20,
    tiempo_modal_cambio_turno_seg: 2,
    puntos_por_pareja: 10,
    ...overrides
  };
}

function contenidoValido(n = 6) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      id: `item-${i}`,
      contenido: `Elemento ${i + 1}`,
      imagen_url: `https://example.com/img/${i + 1}.png`
    });
  }
  return { items };
}

function setValido(n = 6) {
  return {
    id: 'set1',
    items: contenidoValido(n).items
  };
}

function shuffleDeterministica() {
  let callCount = 0;
  return () => {
    callCount++;
    const valores = [0.1, 0.5, 0.3, 0.8, 0.2, 0.7, 0.4, 0.9, 0.6, 0.05, 0.35, 0.65];
    return valores[(callCount - 1) % valores.length];
  };
}

function estadoValido(overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), ...overrides };
}

function crearEstadoConGrilla(parejasPorRonda = 2) {
  let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: parejasPorRonda }));
  estado = { ...estado, fase: 'SELECCIONANDO_SET' };
  const config = configuracionValida({ parejas_por_ronda: parejasPorRonda });
  estado = def.seleccionarSet(estado, setValido(parejasPorRonda), config, { shuffle: () => 0.5 });
  return def.confirmarGrilla(estado, config);
}

function crearEstadoConElementosConocidos() {
  return {
    ...def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 })),
    elementos: [
      { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
      { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
      { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false },
      { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false }
    ],
    fase: 'JUGANDO',
    set_id: 'set1',
    timer_activo: true,
    tiempo_restante_seg: 20
  };
}

/* =============================================================
   Tests
   ============================================================= */

describe('MemoriaGameDefinition', () => {
  /* =============================================================
     Grupo 1 — Constantes y contrato (8 tests)
     ============================================================= */

  describe('constantes y contrato', () => {
    it('FASES correctas (7 fases)', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA',
        'SELECCIONANDO_SET',
        'PREPARANDO_GRILLA',
        'JUGANDO',
        'CAMBIO_TURNO',
        'FIN_DE_RONDA',
        'FIN_DE_JUEGO'
      ]);
    });

    it('FASES tiene 7 fases', () => {
      expect(FASES.length).toBe(7);
    });

    it('código correcto', () => {
      expect(def.codigo).toBe('MEMORIA');
    });

    it('nombre correcto', () => {
      expect(def.nombre).toBe('Memoricé');
    });

    it('requiere set', () => {
      expect(def.requiere_set).toBe(true);
    });

    it('defaultConfig tiene campos esperados', () => {
      expect(def.defaultConfig).toEqual({
        rondas: 1,
        parejas_por_ronda: 6,
        tiempo_turno_seg: 20,
        tiempo_modal_cambio_turno_seg: 2,
        puntos_por_pareja: 10
      });
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
        'voltearElemento',
        'iniciarTurno',
        'cambiarTurno',
        'iniciarSiguienteRonda',
        'aplicarTimeUp'
      ];
      for (const m of metodos) {
        expect(typeof def[m]).toBe('function');
      }
    });

    it('confirmarPareja no existe', () => {
      expect(typeof def.confirmarPareja).toBe('undefined');
    });
  });

  /* =============================================================
     Grupo 2 — validarConfiguracion (10 tests)
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

    it('parejas_por_ronda = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 0 }))).toThrow(ValidacionError);
    });

    it('parejas_por_ronda = 6 → true', () => {
      expect(def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 6 }))).toBe(true);
    });

    it('parejas_por_ronda = 8 → true', () => {
      expect(def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 8 }))).toBe(true);
    });

    it('parejas_por_ronda = 10 → true', () => {
      expect(def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 10 }))).toBe(true);
    });

    it('parejas_por_ronda = 12 → true', () => {
      expect(def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 12 }))).toBe(true);
    });

    it('parejas_por_ronda = 7 → error (impar fuera de {6,8,10,12})', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 7 }))).toThrow(ValidacionError);
    });

    it('parejas_por_ronda = 4 → error (mínimo 6)', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 4 }))).toThrow(ValidacionError);
    });

    it('parejas_por_ronda = 14 → error (máximo 12)', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 14 }))).toThrow(ValidacionError);
    });

    it('tiempo_turno_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_turno_seg: 0 }))).toThrow(ValidacionError);
    });

    it('tiempo_modal_cambio_turno_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_modal_cambio_turno_seg: 0 }))).toThrow(ValidacionError);
    });

    it('puntos_por_pareja negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ puntos_por_pareja: -1 }))).toThrow(ValidacionError);
    });

    it('tiempo_modal_cambio_turno_seg custom → true', () => {
      expect(def.validarConfiguracion(configuracionValida({ tiempo_modal_cambio_turno_seg: 5 }))).toBe(true);
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

    it('contenido null → error', () => {
      expect(() => def.validarContenidoSet(null, config)).toThrow(ValidacionError);
    });

    it('items vacío → error', () => {
      expect(() => def.validarContenidoSet({ items: [] }, config)).toThrow(ValidacionError);
    });

    it('menos items que parejas_por_ronda → error', () => {
      expect(() => def.validarContenidoSet(contenidoValido(3), { parejas_por_ronda: 6 })).toThrow(ValidacionError);
    });

    it('item sin imagen_url → error', () => {
      const items = contenidoValido(6).items.map((it, i) =>
        i === 0 ? { id: it.id, contenido: it.contenido } : it
      );
      expect(() => def.validarContenidoSet({ items }, config))
        .toThrow(/items\[0\]\.imagen_url debe ser un string no vacío/);
    });

    it('item con imagen_url vacía → error', () => {
      const items = contenidoValido(6).items.map((it, i) =>
        i === 0 ? { ...it, imagen_url: '  ' } : it
      );
      expect(() => def.validarContenidoSet({ items }, config))
        .toThrow(/items\[0\]\.imagen_url debe ser un string no vacío/);
    });

    it('item solo con imagen_url (sin contenido) → true', () => {
      const items = contenidoValido(6).items.map((it) => ({
        id: it.id,
        imagen_url: it.imagen_url
      }));
      expect(def.validarContenidoSet({ items }, config)).toBe(true);
    });

    it('item con contenido presente pero vacío → error', () => {
      const items = contenidoValido(6).items.map((it, i) =>
        i === 0 ? { ...it, contenido: '  ' } : it
      );
      expect(() => def.validarContenidoSet({ items }, config))
        .toThrow(/items\[0\]\.contenido debe ser un string no vacío si está presente/);
    });

    it('item sin contenido ni imagen_url → error por imagen_url', () => {
      const items = contenidoValido(6).items.map((it, i) =>
        i === 0 ? { id: it.id } : it
      );
      expect(() => def.validarContenidoSet({ items }, config))
        .toThrow(/items\[0\]\.imagen_url/);
    });

    it('items no es array → error', () => {
      expect(() => def.validarContenidoSet({ items: 'no-array' }, config)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 4 — estadoInicial (5 tests)
     ============================================================= */

  describe('estadoInicial', () => {
    it('valores por defecto', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(1);
      expect(estado.fase).toBe('INICIO_RONDA');
      expect(estado.equipo_actual).toBe(1);
      expect(estado.set_id).toBeNull();
      expect(estado.elementos).toEqual([]);
      expect(estado.elementos_volteados).toEqual([]);
      expect(estado.elementos_descubiertos).toEqual([]);
      expect(estado.parejas_encontradas).toBe(0);
      expect(estado.parejas_equipo_1).toBe(0);
      expect(estado.parejas_equipo_2).toBe(0);
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
      expect(estado.timer_activo).toBe(false);
      expect(estado.tiempo_restante_seg).toBe(20);
    });

    it('rondas 3', () => {
      const estado = def.estadoInicial(configuracionValida({ rondas: 3 }));
      expect(estado.total_rondas).toBe(3);
    });

    it('tiempo_turno_seg custom', () => {
      const estado = def.estadoInicial(configuracionValida({ tiempo_turno_seg: 30 }));
      expect(estado.tiempo_restante_seg).toBe(30);
    });

    it('fase INICIO_RONDA', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.fase).toBe('INICIO_RONDA');
    });

    it('equipo_actual es 1', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(estado.equipo_actual).toBe(1);
    });
  });

  /* =============================================================
     Grupo 5 — seleccionarSet (7 tests)
     ============================================================= */

  describe('seleccionarSet', () => {
    it('set válido → duplica elementos, baraja, fase PREPARANDO_GRILLA', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const rng = shuffleDeterministica();
      const nuevo = def.seleccionarSet(estado, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: rng });
      expect(nuevo.fase).toBe('PREPARANDO_GRILLA');
      expect(nuevo.elementos.length).toBe(6);
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.set_id).toBe('set1');
    });

    it('cada item se duplica con id_pareja correcto', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const rng = shuffleDeterministica();
      const nuevo = def.seleccionarSet(estado, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: rng });
      const parejas = nuevo.elementos.map(e => e.id_pareja);
      const conteo = {};
      for (const p of parejas) {
        conteo[p] = (conteo[p] || 0) + 1;
      }
      for (const p of Object.keys(conteo)) {
        expect(conteo[p]).toBe(2);
      }
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.seleccionarSet(estado, setValido(), configuracionValida())).toThrow(ValidacionError);
    });

    it('set null → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      expect(() => def.seleccionarSet(estado, null, configuracionValida())).toThrow(ValidacionError);
    });

    it('set sin items → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      expect(() => def.seleccionarSet(estado, { items: [] }, configuracionValida())).toThrow(ValidacionError);
    });

    it('set con menos items que parejas_por_ronda → error', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      expect(() => def.seleccionarSet(estado, setValido(2), configuracionValida({ parejas_por_ronda: 6 }))).toThrow(ValidacionError);
    });

    it('guarda set_id', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const rng = shuffleDeterministica();
      const nuevo = def.seleccionarSet(estado, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: rng });
      expect(nuevo.set_id).toBe('set1');
    });
  });

  /* =============================================================
     Grupo 5b — confirmarGrilla (5 tests)
     ============================================================= */

  describe('confirmarGrilla', () => {
    it('PREPARANDO_GRILLA → JUGANDO con timer activo', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const config = configuracionValida({ parejas_por_ronda: 2 });
      estado = def.seleccionarSet(estado, setValido(2), config, { shuffle: () => 0.5 });
      expect(estado.fase).toBe('PREPARANDO_GRILLA');
      const nuevo = def.confirmarGrilla(estado, config);
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.timer_activo).toBe(true);
      expect(nuevo.tiempo_restante_seg).toBe(20);
    });

    it('tiempo_custom se aplica', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2, tiempo_turno_seg: 30 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const config = configuracionValida({ parejas_por_ronda: 2, tiempo_turno_seg: 30 });
      estado = def.seleccionarSet(estado, setValido(2), config, { shuffle: () => 0.5 });
      const nuevo = def.confirmarGrilla(estado, config);
      expect(nuevo.tiempo_restante_seg).toBe(30);
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'JUGANDO' });
      expect(() => def.confirmarGrilla(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase SELECCIONANDO_SET → error', () => {
      const estado = estadoValido({ fase: 'SELECCIONANDO_SET' });
      expect(() => def.confirmarGrilla(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const config = configuracionValida({ parejas_por_ronda: 2 });
      estado = def.seleccionarSet(estado, setValido(2), config, { shuffle: () => 0.5 });
      const original = JSON.parse(JSON.stringify(estado));
      def.confirmarGrilla(estado, config);
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 6 — voltearElemento (12 tests)
     ============================================================= */

  describe('voltearElemento', () => {
    it('voltear 1 elemento → elementos_volteados tiene 1, fase JUGANDO', () => {
      const estado = crearEstadoConGrilla();
      const nuevo = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      expect(nuevo.elementos_volteados).toEqual([0]);
      expect(nuevo.fase).toBe('JUGANDO');
    });

    it('voltear 2 elementos pareja → evalúa automático, descubre, suma puntos', () => {
      let estado = crearEstadoConElementosConocidos();
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      const nuevo = def.voltearElemento(estado, 1, configuracionValida({ parejas_por_ronda: 2 }));
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.parejas_equipo_1).toBe(1);
      expect(nuevo.parejas_encontradas).toBe(1);
      expect(nuevo.elementos_descubiertos).toContain(0);
      expect(nuevo.elementos_descubiertos).toContain(1);
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.timer_activo).toBe(true);
    });

    it('voltear 2 elementos NO pareja → CAMBIO_TURNO', () => {
      let estado = crearEstadoConElementosConocidos();
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      // 0 es p1, 2 es p2 → no pareja
      const nuevo = def.voltearElemento(estado, 2, configuracionValida({ parejas_por_ronda: 2 }));
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.timer_activo).toBe(false);
      expect(nuevo.elementos_volteados).toEqual([0, 2]);
    });

    it('todas las parejas descubiertas → FIN_DE_RONDA', () => {
      let estado = crearEstadoConElementosConocidos();
      estado = {
        ...estado,
        elementos_descubiertos: [2, 3],
        parejas_encontradas: 1
      };
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      const nuevo = def.voltearElemento(estado, 1, configuracionValida({ parejas_por_ronda: 2 }));
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.voltearElemento(estado, 0, configuracionValida())).toThrow(ValidacionError);
    });

    it('indice fuera de rango → error', () => {
      const estado = crearEstadoConGrilla();
      expect(() => def.voltearElemento(estado, 99, configuracionValida({ parejas_por_ronda: 2 }))).toThrow(ValidacionError);
    });

    it('elemento ya descubierto → error', () => {
      let estado = crearEstadoConGrilla();
      estado = { ...estado, elementos_descubiertos: [0] };
      expect(() => def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }))).toThrow(ValidacionError);
    });

    it('elemento ya volteado → error', () => {
      let estado = crearEstadoConGrilla();
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      expect(() => def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }))).toThrow(ValidacionError);
    });

    it('ya hay 2 volteados → error', () => {
      let estado = crearEstadoConGrilla();
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      estado = def.voltearElemento(estado, 1, configuracionValida({ parejas_por_ronda: 2 }));
      expect(() => def.voltearElemento(estado, 2, configuracionValida({ parejas_por_ronda: 2 }))).toThrow(ValidacionError);
    });

    it('pareja para equipo 2 → suma puntos equipo 2', () => {
      let estado = crearEstadoConElementosConocidos();
      estado = { ...estado, equipo_actual: 2 };
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      const nuevo = def.voltearElemento(estado, 1, configuracionValida({ parejas_por_ronda: 2 }));
      expect(nuevo.puntos_equipo_2).toBe(10);
      expect(nuevo.parejas_equipo_2).toBe(1);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoConGrilla();
      const original = JSON.parse(JSON.stringify(estado));
      def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2 }));
      expect(estado).toEqual(original);
    });

    it('puntos_por_pareja custom funciona', () => {
      let estado = crearEstadoConElementosConocidos();
      estado = def.voltearElemento(estado, 0, configuracionValida({ parejas_por_ronda: 2, puntos_por_pareja: 25 }));
      const nuevo = def.voltearElemento(estado, 1, configuracionValida({ parejas_por_ronda: 2, puntos_por_pareja: 25 }));
      expect(nuevo.puntos_equipo_1).toBe(25);
    });
  });

  /* =============================================================
     Grupo 7 — iniciarTurno (6 tests)
     ============================================================= */

  describe('iniciarTurno', () => {
    it('CAMBIO_TURNO equipo 1 → JUGANDO equipo 2, timer activo', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO', equipo_actual: 1 });
      const config = configuracionValida();
      const nuevo = def.iniciarTurno(estado, config);
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.timer_activo).toBe(true);
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.tiempo_restante_seg).toBe(20);
    });

    it('CAMBIO_TURNO equipo 2 → JUGANDO equipo 1', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO', equipo_actual: 2 });
      const nuevo = def.iniciarTurno(estado, configuracionValida());
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.equipo_actual).toBe(1);
    });

    it('tiempo_custom se aplica', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO', equipo_actual: 1 });
      const nuevo = def.iniciarTurno(estado, configuracionValida({ tiempo_turno_seg: 30 }));
      expect(nuevo.tiempo_restante_seg).toBe(30);
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'JUGANDO' });
      expect(() => def.iniciarTurno(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('fase FIN_DE_RONDA → error', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA' });
      expect(() => def.iniciarTurno(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO', equipo_actual: 1 });
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarTurno(estado, configuracionValida());
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 8 — cambiarTurno (8 tests)
     ============================================================= */

  describe('cambiarTurno', () => {
    it('desde JUGANDO equipo 1 → CAMBIO_TURNO equipo 2', () => {
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.timer_activo).toBe(false);
    });

    it('desde JUGANDO equipo 2 → CAMBIO_TURNO equipo 1', () => {
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 2 });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(1);
    });

    it('desde PREPARANDO_GRILLA → CAMBIO_TURNO', () => {
      const estado = estadoValido({ fase: 'PREPARANDO_GRILLA', equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('equipoForzado 1 fuerza equipo 1', () => {
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado, configuracionValida(), 1);
      expect(nuevo.equipo_actual).toBe(1);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
    });

    it('equipoForzado 2 fuerza equipo 2', () => {
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 2 });
      const nuevo = def.cambiarTurno(estado, configuracionValida(), 2);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
    });

    it('equipoForzado inválido → alterna normal', () => {
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado, configuracionValida(), 3);
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO' });
      expect(() => def.cambiarTurno(estado)).toThrow(ValidacionError);
    });

    it('resetea elementos_volteados', () => {
      const estado = estadoValido({ fase: 'JUGANDO', elementos_volteados: [0, 1] });
      const nuevo = def.cambiarTurno(estado);
      expect(nuevo.elementos_volteados).toEqual([]);
    });
  });

  /* =============================================================
     Grupo 9 — iniciarSiguienteRonda (4 tests)
     ============================================================= */

  describe('iniciarSiguienteRonda', () => {
    it('avanza ronda y resetea', () => {
      let estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(nuevo.ronda_actual).toBe(2);
      expect(nuevo.equipo_actual).toBe(1);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.set_id).toBeNull();
      expect(nuevo.elementos).toEqual([]);
      expect(nuevo.elementos_descubiertos).toEqual([]);
    });

    it('última ronda → FIN_DE_JUEGO', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 1 });
      const nuevo = def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 1 }));
      expect(nuevo.fase).toBe('FIN_DE_JUEGO');
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'JUGANDO' });
      expect(() => def.iniciarSiguienteRonda(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = estadoValido({ fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 });
      const original = JSON.parse(JSON.stringify(estado));
      def.iniciarSiguienteRonda(estado, configuracionValida({ rondas: 2 }));
      expect(estado).toEqual(original);
    });
  });

  /* =============================================================
     Grupo 10 — aplicarTimeUp (6 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('JUGANDO con timer → resetea volteados, pasa a CAMBIO_TURNO', () => {
      const estado = estadoValido({
        fase: 'JUGANDO',
        timer_activo: true,
        equipo_actual: 1,
        elementos_volteados: [0]
      });
      const nuevo = def.aplicarTimeUp(estado, configuracionValida());
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('JUGANDO sin timer → sin cambios', () => {
      const estado = estadoValido({ fase: 'JUGANDO', timer_activo: false });
      const nuevo = def.aplicarTimeUp(estado, configuracionValida());
      expect(nuevo.fase).toBe('JUGANDO');
    });

    it('FIN_DE_JUEGO → null', () => {
      const estado = estadoValido({ fase: 'FIN_DE_JUEGO' });
      expect(def.aplicarTimeUp(estado, configuracionValida())).toBeNull();
    });

    it('CAMBIO_TURNO → sin cambios', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO' });
      const nuevo = def.aplicarTimeUp(estado, configuracionValida());
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
    });

    it('no muta estado original', () => {
      const estado = estadoValido({
        fase: 'JUGANDO',
        timer_activo: true,
        equipo_actual: 1,
        elementos_volteados: [0]
      });
      const original = JSON.parse(JSON.stringify(estado));
      def.aplicarTimeUp(estado, configuracionValida());
      expect(estado).toEqual(original);
    });

    it('estado null → null', () => {
      expect(def.aplicarTimeUp(null, configuracionValida())).toBeNull();
    });
  });

  /* =============================================================
     Grupo 11 — calcularPuntuacion (2 tests)
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
     Grupo 12 — calcularResultado (4 tests)
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
     Grupo 13 — validarEstadoJuego (6 tests)
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

    it('elementos no es array → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      estado.elementos = 'no-array';
      expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 14 — Integración con GameDefinitionRegistry (2 tests)
     ============================================================= */

  describe('integración con GameDefinitionRegistry', () => {
    it('registrar en registry funciona', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(registry.existe('MEMORIA')).toBe(true);
      expect(registry.obtener('MEMORIA')).toBe(def);
    });

    it('validarRequerimientos → MEMORIA requiere snapshot_id', () => {
      const registry = new GameDefinitionRegistry();
      registry.registrar(def);
      expect(() => registry.validarRequerimientos('MEMORIA', {})).toThrow();
      expect(registry.validarRequerimientos('MEMORIA', { snapshot_id: 's1' })).toBe(true);
    });
  });

  /* =============================================================
     Grupo 15 — Flujo completo (5 tests)
     ============================================================= */

  describe('flujo completo', () => {
    it('Eq1 encuentra 1 pareja, FIN_DE_RONDA', () => {
      const config = configuracionValida({ parejas_por_ronda: 1, puntos_por_pareja: 10 });
      let estado = {
        ...def.estadoInicial(config),
        elementos: [
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false }
        ],
        fase: 'JUGANDO',
        timer_activo: true,
        tiempo_restante_seg: 20
      };

      estado = def.voltearElemento(estado, 0, config);
      expect(estado.fase).toBe('JUGANDO');
      estado = def.voltearElemento(estado, 1, config);
      expect(estado.puntos_equipo_1).toBe(10);
      expect(estado.parejas_encontradas).toBe(1);
      expect(estado.fase).toBe('FIN_DE_RONDA');
    });

    it('Eq1 falla → CAMBIO_TURNO → iniciarTurno → Eq2 acierta', () => {
      const config = configuracionValida({ parejas_por_ronda: 2, puntos_por_pareja: 10 });
      let estado = {
        ...def.estadoInicial(config),
        elementos: [
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false }
        ],
        fase: 'JUGANDO',
        timer_activo: true,
        tiempo_restante_seg: 20
      };

      // Eq1: 0 (p1) y 1 (p2) → no pareja
      estado = def.voltearElemento(estado, 0, config);
      estado = def.voltearElemento(estado, 1, config);
      expect(estado.fase).toBe('CAMBIO_TURNO');

      // Iniciar turno Eq2
      estado = def.iniciarTurno(estado, config);
      expect(estado.equipo_actual).toBe(2);
      expect(estado.fase).toBe('JUGANDO');

      // Eq2: 0 (p1) y 2 (p1) → pareja
      estado = def.voltearElemento(estado, 0, config);
      estado = def.voltearElemento(estado, 2, config);
      expect(estado.puntos_equipo_2).toBe(10);
      expect(estado.parejas_equipo_2).toBe(1);
    });

    it('timeUp → CAMBIO_TURNO → iniciarTurno', () => {
      const config = configuracionValida({ parejas_por_ronda: 2, tiempo_turno_seg: 10 });
      let estado = {
        ...def.estadoInicial(config),
        elementos: [
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false }
        ],
        fase: 'JUGANDO',
        timer_activo: true,
        tiempo_restante_seg: 10
      };

      // timeUp
      estado = def.aplicarTimeUp(estado, config);
      expect(estado.fase).toBe('CAMBIO_TURNO');
      expect(estado.timer_activo).toBe(false);

      // Iniciar turno
      estado = def.iniciarTurno(estado, config);
      expect(estado.fase).toBe('JUGANDO');
      expect(estado.timer_activo).toBe(true);
      expect(estado.tiempo_restante_seg).toBe(10);
    });

    it('cambiarTurno manual desde JUGANDO', () => {
      const config = configuracionValida({ parejas_por_ronda: 2 });
      const estado = estadoValido({ fase: 'JUGANDO', equipo_actual: 1 });
      const nuevo = def.cambiarTurno(estado, config);
      expect(nuevo.fase).toBe('CAMBIO_TURNO');
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.timer_activo).toBe(false);
    });

    it('flujo multi-ronda: 2 rondas, ronda 2 termina en FIN_DE_JUEGO', () => {
      const config = configuracionValida({ rondas: 2, parejas_por_ronda: 1, puntos_por_pareja: 10 });
      let estado = def.estadoInicial(config);
      estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1, total_rondas: 2 };
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.ronda_actual).toBe(2);
      expect(estado.fase).toBe('INICIO_RONDA');
      estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 2, total_rondas: 2 };
      estado = def.iniciarSiguienteRonda(estado, config);
      expect(estado.fase).toBe('FIN_DE_JUEGO');
    });
  });
});
