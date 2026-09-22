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
    puntos_por_pareja: 10,
    ...overrides
  };
}

function contenidoValido(n = 6) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      id: `item-${i}`,
      contenido: `Elemento ${i + 1}`
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
    // Retorna valores determinísticos para barajar predeciblemente
    const valores = [0.1, 0.5, 0.3, 0.8, 0.2, 0.7, 0.4, 0.9, 0.6, 0.05, 0.35, 0.65];
    return valores[(callCount - 1) % valores.length];
  };
}

function estadoValido(overrides = {}) {
  return { ...def.estadoInicial(configuracionValida()), ...overrides };
}

/* =============================================================
   Tests
   ============================================================= */

describe('MemoriaGameDefinition', () => {
  /* =============================================================
     Grupo 1 — Constantes y contrato (6 tests)
     ============================================================= */

  describe('constantes y contrato', () => {
    it('FASES correctas', () => {
      expect(FASES).toEqual([
        'INICIO_RONDA',
        'SELECCIONANDO_SET',
        'PREPARANDO_GRILLA',
        'JUGANDO',
        'ESPERA_CONFIRMACION',
        'CAMBIO_TURNO',
        'FIN_DE_RONDA',
        'FIN_DE_JUEGO'
      ]);
    });

    it('FASES tiene 8 fases', () => {
      expect(FASES.length).toBe(8);
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
        'confirmarPareja',
        'cambiarTurno',
        'iniciarSiguienteRonda',
        'aplicarTimeUp'
      ];
      for (const m of metodos) {
        expect(typeof def[m]).toBe('function');
      }
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

    it('rondas negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ rondas: -1 }))).toThrow(ValidacionError);
    });

    it('parejas_por_ronda = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ parejas_por_ronda: 0 }))).toThrow(ValidacionError);
    });

    it('tiempo_turno_seg = 0 → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ tiempo_turno_seg: 0 }))).toThrow(ValidacionError);
    });

    it('puntos_por_pareja negativo → error', () => {
      expect(() => def.validarConfiguracion(configuracionValida({ puntos_por_pareja: -1 }))).toThrow(ValidacionError);
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

    it('item sin contenido → error', () => {
      const contenido = { items: [{ id: 'x' }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
    });

    it('item con contenido vacío → error', () => {
      const contenido = { items: [{ id: 'x', contenido: '  ' }] };
      expect(() => def.validarContenidoSet(contenido, config)).toThrow(ValidacionError);
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
    it('set válido → duplica elementos, baraja, fase JUGANDO', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const rng = shuffleDeterministica();
      const nuevo = def.seleccionarSet(estado, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: rng });
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.elementos.length).toBe(6); // 3 items x 2
      expect(nuevo.timer_activo).toBe(true);
      expect(nuevo.set_id).toBe('set1');
    });

    it('cada item se duplica con id_pareja correcto', () => {
      let estado = def.estadoInicial(configuracionValida());
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      const rng = shuffleDeterministica();
      const nuevo = def.seleccionarSet(estado, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: rng });
      const parejas = nuevo.elementos.map(e => e.id_pareja);
      // Cada pareja debe aparecer exactamente 2 veces
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
     Grupo 6 — voltearElemento (7 tests)
     ============================================================= */

  describe('voltearElemento', () => {
    function estadoConGrilla() {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      return def.seleccionarSet(estado, setValido(2), configuracionValida({ parejas_por_ronda: 2 }), { shuffle: () => 0.5 });
    }

    it('voltear 1 elemento → elementos_volteados tiene 1', () => {
      const estado = estadoConGrilla();
      const nuevo = def.voltearElemento(estado, 0);
      expect(nuevo.elementos_volteados).toEqual([0]);
      expect(nuevo.fase).toBe('JUGANDO');
    });

    it('voltear 2 elementos → fase ESPERA_CONFIRMACION', () => {
      let estado = estadoConGrilla();
      estado = def.voltearElemento(estado, 0);
      const nuevo = def.voltearElemento(estado, 1);
      expect(nuevo.elementos_volteados).toEqual([0, 1]);
      expect(nuevo.fase).toBe('ESPERA_CONFIRMACION');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.voltearElemento(estado, 0)).toThrow(ValidacionError);
    });

    it('indice fuera de rango → error', () => {
      const estado = estadoConGrilla();
      expect(() => def.voltearElemento(estado, 99)).toThrow(ValidacionError);
    });

    it('elemento ya descubierto → error', () => {
      let estado = estadoConGrilla();
      // Descubrir elemento 0
      estado = { ...estado, elementos_descubiertos: [0] };
      expect(() => def.voltearElemento(estado, 0)).toThrow(ValidacionError);
    });

    it('elemento ya volteado → error', () => {
      let estado = estadoConGrilla();
      estado = def.voltearElemento(estado, 0);
      expect(() => def.voltearElemento(estado, 0)).toThrow(ValidacionError);
    });

    it('ya hay 2 volteados → error', () => {
      let estado = estadoConGrilla();
      estado = def.voltearElemento(estado, 0);
      estado = def.voltearElemento(estado, 1);
      expect(() => def.voltearElemento(estado, 2)).toThrow(ValidacionError);
    });
  });

  /* =============================================================
     Grupo 7 — confirmarPareja (7 tests)
     ============================================================= */

  describe('confirmarPareja', () => {
    function crearEstadoConParejas(parejas = true) {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      // Crear set con 2 items
      const items = [
        { id: 'p1', contenido: 'A' },
        { id: 'p2', contenido: 'B' }
      ];
      // Forzar elementos en orden conocido: p1-a, p1-b, p2-a, p2-b
      estado = {
        ...estado,
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

      // Voltear 2 elementos
      estado = def.voltearElemento(estado, parejas ? 0 : 0);
      estado = def.voltearElemento(estado, parejas ? 1 : 2);
      return estado;
    }

    it('pareja correcta → suma puntos, descubre, sigue mismo equipo', () => {
      const estado = crearEstadoConParejas(true);
      const config = configuracionValida();
      const nuevo = def.confirmarPareja(estado, config);
      expect(nuevo.puntos_equipo_1).toBe(10);
      expect(nuevo.parejas_equipo_1).toBe(1);
      expect(nuevo.parejas_encontradas).toBe(1);
      expect(nuevo.elementos_descubiertos).toContain(0);
      expect(nuevo.elementos_descubiertos).toContain(1);
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.equipo_actual).toBe(1);
      expect(nuevo.fase).toBe('JUGANDO');
      expect(nuevo.timer_activo).toBe(true);
    });

    it('pareja incorrecta → oculta, cambia turno', () => {
      const estado = crearEstadoConParejas(false);
      const config = configuracionValida();
      const nuevo = def.confirmarPareja(estado, config);
      expect(nuevo.puntos_equipo_1).toBe(0);
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.fase).toBe('JUGANDO');
    });

    it('todas las parejas descubiertas → FIN_DE_RONDA', () => {
      let estado = crearEstadoConParejas(true);
      // Simular que solo quedaba 1 pareja por encontrar
      estado = {
        ...estado,
        elementos_descubiertos: [2, 3],
        parejas_encontradas: 1
      };
      const nuevo = def.confirmarPareja(estado, configuracionValida());
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
      expect(nuevo.timer_activo).toBe(false);
    });

    it('fase incorrecta → error', () => {
      const estado = def.estadoInicial(configuracionValida());
      expect(() => def.confirmarPareja(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('menos de 2 volteados → error', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 2 }));
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };
      estado = def.seleccionarSet(estado, setValido(2), configuracionValida({ parejas_por_ronda: 2 }), { shuffle: () => 0.5 });
      estado = def.voltearElemento(estado, 0);
      expect(() => def.confirmarPareja(estado, configuracionValida())).toThrow(ValidacionError);
    });

    it('no muta estado original', () => {
      const estado = crearEstadoConParejas(true);
      const original = JSON.parse(JSON.stringify(estado));
      def.confirmarPareja(estado, configuracionValida());
      expect(estado).toEqual(original);
    });

    it('pareja correcta para equipo 2', () => {
      let estado = crearEstadoConParejas(true);
      estado = { ...estado, equipo_actual: 2 };
      const nuevo = def.confirmarPareja(estado, configuracionValida());
      expect(nuevo.puntos_equipo_2).toBe(10);
      expect(nuevo.parejas_equipo_2).toBe(1);
    });
  });

  /* =============================================================
     Grupo 8 — cambiarTurno (3 tests)
     ============================================================= */

  describe('cambiarTurno', () => {
    it('alterna equipo_actual', () => {
      let estado = estadoValido({ fase: 'CAMBIO_TURNO', equipo_actual: 1 });
      let nuevo = def.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.fase).toBe('JUGANDO');

      estado = { ...nuevo, fase: 'CAMBIO_TURNO' };
      nuevo = def.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(1);
    });

    it('fase incorrecta → error', () => {
      const estado = estadoValido({ fase: 'JUGANDO' });
      expect(() => def.cambiarTurno(estado)).toThrow(ValidacionError);
    });

    it('resetea elementos_volteados', () => {
      const estado = estadoValido({ fase: 'CAMBIO_TURNO', elementos_volteados: [0, 1] });
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
     Grupo 10 — aplicarTimeUp (5 tests)
     ============================================================= */

  describe('aplicarTimeUp', () => {
    it('JUGANDO con timer → resetea volteados, cambia turno', () => {
      const estado = estadoValido({
        fase: 'JUGANDO',
        timer_activo: true,
        equipo_actual: 1,
        elementos_volteados: [0]
      });
      const config = configuracionValida();
      const nuevo = def.aplicarTimeUp(estado, config);
      expect(nuevo.elementos_volteados).toEqual([]);
      expect(nuevo.equipo_actual).toBe(2);
      expect(nuevo.tiempo_restante_seg).toBe(20);
      expect(nuevo.fase).toBe('JUGANDO');
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

    it('ESPERA_CONFIRMACION → sin cambios', () => {
      const estado = estadoValido({ fase: 'ESPERA_CONFIRMACION' });
      const nuevo = def.aplicarTimeUp(estado, configuracionValida());
      expect(nuevo.fase).toBe('ESPERA_CONFIRMACION');
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
     Grupo 15 — Flujo completo (3 tests)
     ============================================================= */

  describe('flujo completo', () => {
    it('Eq1 encuentra 1 pareja, pierde 1, Eq2 encuentra 1, FIN_DE_RONDA', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 1, puntos_por_pareja: 10 }));
      const config = configuracionValida({ parejas_por_ronda: 1, puntos_por_pareja: 10 });

      // Ir a SELECCIONANDO_SET
      estado = { ...estado, fase: 'SELECCIONANDO_SET' };

      // Seleccionar set con 1 item (2 elementos)
      // Forzar orden conocido: ambos elementos son pareja (id_pareja = 'p1')
      estado = {
        ...estado,
        elementos: [
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false }
        ],
        fase: 'JUGANDO',
        timer_activo: true,
        tiempo_restante_seg: 20
      };

      // Eq1 voltear 2 → pareja
      estado = def.voltearElemento(estado, 0);
      expect(estado.fase).toBe('JUGANDO');
      estado = def.voltearElemento(estado, 1);
      expect(estado.fase).toBe('ESPERA_CONFIRMACION');

      estado = def.confirmarPareja(estado, config);
      expect(estado.puntos_equipo_1).toBe(10);
      expect(estado.parejas_encontradas).toBe(1);
      expect(estado.fase).toBe('FIN_DE_RONDA');
    });

    it('Eq1 falla, Eq2 acierta', () => {
      let estado = def.estadoInicial(configuracionValida({ parejas_por_ronda: 1, puntos_por_pareja: 10 }));
      const config = configuracionValida({ parejas_por_ronda: 1, puntos_por_pareja: 10 });

      estado = {
        ...estado,
        elementos: [
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p1', contenido: 'A', imagen_url: undefined, categoria: undefined, descubierto: false },
          { id_pareja: 'p2', contenido: 'B', imagen_url: undefined, categoria: undefined, descubierto: false }
        ],
        fase: 'JUGANDO',
        timer_activo: true,
        tiempo_restante_seg: 20,
        parejas_por_ronda: 2
      };

      // Eq1 voltear 0 y 2 → no pareja (p1 y p1? No,索引 0 es p1-a, 索引 2 es p1-b)
      // Indices: 0=p1-a, 1=p2-a, 2=p1-b, 3=p2-b
      // Voltear 0 (p1) y 1 (p2) → no pareja
      estado = def.voltearElemento(estado, 0);
      estado = def.voltearElemento(estado, 1);
      expect(estado.fase).toBe('ESPERA_CONFIRMACION');

      estado = def.confirmarPareja(estado, config);
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.equipo_actual).toBe(2); // cambia turno

      // Eq2 voltear 0 y 2 → pareja (ambos p1)
      estado = def.voltearElemento(estado, 0);
      estado = def.voltearElemento(estado, 2);
      expect(estado.fase).toBe('ESPERA_CONFIRMACION');

      estado = def.confirmarPareja(estado, config);
      expect(estado.puntos_equipo_2).toBe(10);
      expect(estado.parejas_equipo_2).toBe(1);
    });

    it('inmutabilidad: reducers no mutan estado original', () => {
      const estado = def.estadoInicial(configuracionValida());
      const original = JSON.parse(JSON.stringify(estado));
      const estadoConSet = { ...estado, fase: 'SELECCIONANDO_SET' };
      def.seleccionarSet(estadoConSet, setValido(3), configuracionValida({ parejas_por_ronda: 3 }), { shuffle: () => 0.5 });
      expect(estado).toEqual(original);
    });
  });
});
