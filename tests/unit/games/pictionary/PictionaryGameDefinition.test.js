import { describe, it, expect } from 'vitest';

import {
  PictionaryGameDefinition,
  MODOS,
  FASES,
  ESTADO_TURNO
} from '../../../../src/games/pictionary/PictionaryGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

/* =============================================================
   Helpers
   ============================================================= */

function configuracionValida(overrides = {}) {
  return {
    rondas: 2,
    palabras_por_modo: 2,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15,
    ...overrides
  };
}

function generarItemsValidos(rondas = 2, palabrasPorModo = 2) {
  const items = [];
  const total = rondas * palabrasPorModo;
  for (const modo of MODOS) {
    for (let i = 0; i < total; i++) {
      const item = {
        modo,
        concepto: `Concepto M${modo} ${i + 1}`
      };
      if (modo === 1) {
        item.prohibidas = [`prohibida${i + 1}a`, `prohibida${i + 1}b`];
      }
      items.push(item);
    }
  }
  return items;
}

function contenidoValido(rondas = 2, palabrasPorModo = 2) {
  return { items: generarItemsValidos(rondas, palabrasPorModo) };
}

function estadoInicial(configOverrides = {}) {
  return PictionaryGameDefinition.estadoInicial(configuracionValida(configOverrides));
}

/* =============================================================
   Grupo 1 — Constantes
   ============================================================= */

describe('MODOS', () => {
  it('contiene exactamente 4 modos', () => {
    expect(MODOS).toEqual([1, 2, 3, 4]);
  });

  it('es readonly (frozen)', () => {
    expect(() => { MODOS.push(5); }).toThrow();
  });
});

describe('FASES', () => {
  it('contiene las 8 fases esperadas', () => {
    expect(FASES).toEqual([
      'INICIO_RONDA',
      'SELECCIONANDO_MODO',
      'MOSTRANDO_PALABRA',
      'ADIVINANDO',
      'ESPERA_VALIDACION',
      'CAMBIO_MODO',
      'FIN_DE_RONDA',
      'FIN_DE_JUEGO'
    ]);
  });

  it('es readonly (frozen)', () => {
    expect(() => { FASES.push('NUEVA'); }).toThrow();
  });
});

describe('ESTADO_TURNO', () => {
  it('tiene los 4 estados', () => {
    expect(ESTADO_TURNO.PENDIENTE).toBe('pendiente');
    expect(ESTADO_TURNO.CORRECTO).toBe('correcto');
    expect(ESTADO_TURNO.INCORRECTO).toBe('incorrecto');
    expect(ESTADO_TURNO.PASADO).toBe('pasado');
  });
});

/* =============================================================
   Grupo 2 — Contrato mínimo
   ============================================================= */

describe('Contrato mínimo', () => {
  it('tiene codigo PICTIONARY', () => {
    expect(PictionaryGameDefinition.codigo).toBe('PICTIONARY');
  });

  it('tiene nombre', () => {
    expect(PictionaryGameDefinition.nombre).toBe('Pictionary');
  });

  it('requiere_set es true', () => {
    expect(PictionaryGameDefinition.requiere_set).toBe(true);
  });

  it('se registra correctamente en GameDefinitionRegistry', () => {
    const registry = new GameDefinitionRegistry();
    registry.registrar(PictionaryGameDefinition);
    expect(registry.existe('PICTIONARY')).toBe(true);
  });
});

/* =============================================================
   Grupo 3 — defaultConfig
   ============================================================= */

describe('defaultConfig', () => {
  it('tiene rondas: 1', () => {
    expect(PictionaryGameDefinition.defaultConfig.rondas).toBe(1);
  });

  it('tiene palabras_por_modo: 1', () => {
    expect(PictionaryGameDefinition.defaultConfig.palabras_por_modo).toBe(1);
  });

  it('tiene segundos_por_modo: 60', () => {
    expect(PictionaryGameDefinition.defaultConfig.segundos_por_modo).toBe(60);
  });

  it('tiene puntos_por_acierto: 10', () => {
    expect(PictionaryGameDefinition.defaultConfig.puntos_por_acierto).toBe(10);
  });

  it('tiene penalizacion_por_error: 0', () => {
    expect(PictionaryGameDefinition.defaultConfig.penalizacion_por_error).toBe(0);
  });

  it('tiene penalizacion_por_pasar: 0', () => {
    expect(PictionaryGameDefinition.defaultConfig.penalizacion_por_pasar).toBe(0);
  });

  it('tiene bonus_puntos: 0', () => {
    expect(PictionaryGameDefinition.defaultConfig.bonus_puntos).toBe(0);
  });
});

/* =============================================================
   Grupo 4 — validarConfiguracion
   ============================================================= */

describe('validarConfiguracion', () => {
  it('config válida → true', () => {
    expect(PictionaryGameDefinition.validarConfiguracion(configuracionValida())).toBe(true);
  });

  it('lanza si config es null', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(null)).toThrow(ValidacionError);
  });

  it('lanza si config no es objeto', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion('str')).toThrow(ValidacionError);
  });

  it('lanza si rondas < 1', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ rondas: 0 })))
      .toThrow('rondas debe ser un entero >= 1');
  });

  it('lanza si rondas no es entero', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ rondas: 1.5 })))
      .toThrow('rondas debe ser un entero >= 1');
  });

  it('lanza si palabras_por_modo < 1', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ palabras_por_modo: 0 })))
      .toThrow('palabras_por_modo debe ser un entero >= 1');
  });

  it('lanza si segundos_por_modo < 1', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ segundos_por_modo: 0 })))
      .toThrow('segundos_por_modo debe ser un entero >= 1');
  });

  it('lanza si puntos_por_acierto < 0', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ puntos_por_acierto: -1 })))
      .toThrow('puntos_por_acierto debe ser un entero >= 0');
  });

  it('lanza si penalizacion_por_error < 0', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ penalizacion_por_error: -1 })))
      .toThrow('penalizacion_por_error debe ser un entero >= 0');
  });

  it('lanza si penalizacion_por_pasar < 0', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ penalizacion_por_pasar: -1 })))
      .toThrow('penalizacion_por_pasar debe ser un entero >= 0');
  });

  it('lanza si bonus_puntos < 0', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ bonus_puntos: -1 })))
      .toThrow('bonus_puntos debe ser un entero >= 0');
  });
});

/* =============================================================
   Grupo 5 — validarContenidoSet
   ============================================================= */

describe('validarContenidoSet', () => {
  const config = configuracionValida();

  it('set válido → ok', () => {
    const resultado = PictionaryGameDefinition.validarContenidoSet(contenidoValido(), config);
    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('contenido null → error', () => {
    const resultado = PictionaryGameDefinition.validarContenidoSet(null, config);
    expect(resultado.ok).toBe(false);
  });

  it('items no es array → error', () => {
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items: 'no' }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0]).toContain('items debe ser un array');
  });

  it('items vacío → error', () => {
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items: [] }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0]).toContain('no puede estar vacío');
  });

  it('modo inválido → error', () => {
    const items = [{ modo: 5, concepto: 'X' }];
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('modo debe ser 1, 2, 3 o 4'))).toBe(true);
  });

  it('concepto vacío → error', () => {
    const items = [{ modo: 1, concepto: '', prohibidas: ['a'] }];
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('concepto debe ser un string no vacío'))).toBe(true);
  });

  it('modo 1 sin prohibidas → error', () => {
    const items = [{ modo: 1, concepto: 'X' }];
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('prohibidas debe ser un array no vacío'))).toBe(true);
  });

  it('modo 1 con prohibidas vacío → error', () => {
    const items = [{ modo: 1, concepto: 'X', prohibidas: [] }];
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('prohibidas debe ser un array no vacío'))).toBe(true);
  });

  it('modo 2 sin prohibidas → ok (no es obligatorio)', () => {
    const items = [
      { modo: 1, concepto: 'A', prohibidas: ['x', 'y'] },
      { modo: 2, concepto: 'B' },
      { modo: 3, concepto: 'C' },
      { modo: 4, concepto: 'D' }
    ];
    const cfg = configuracionValida({ rondas: 1, palabras_por_modo: 1 });
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, cfg);
    expect(resultado.ok).toBe(true);
  });

  it('modo con items faltantes → error', () => {
    const items = [
      { modo: 1, concepto: 'A', prohibidas: ['x'] },
      { modo: 2, concepto: 'B' }
    ];
    const resultado = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('se necesitan al menos'))).toBe(true);
  });
});

/* =============================================================
   Grupo 6 — estadoInicial
   ============================================================= */

describe('estadoInicial', () => {
  it('tiene ronda_actual: 1', () => {
    expect(estadoInicial().ronda_actual).toBe(1);
  });

  it('tiene modo_actual: 1', () => {
    expect(estadoInicial().modo_actual).toBe(1);
  });

  it('tiene equipo_actual: 1', () => {
    expect(estadoInicial().equipo_actual).toBe(1);
  });

  it('tiene palabra_actual_index: 0', () => {
    expect(estadoInicial().palabra_actual_index).toBe(0);
  });

  it('tiene palabras_del_turno: 0', () => {
    expect(estadoInicial().palabras_del_turno).toBe(0);
  });

  it('tiene puntos_equipo_1: 0', () => {
    expect(estadoInicial().puntos_equipo_1).toBe(0);
  });

  it('tiene puntos_equipo_2: 0', () => {
    expect(estadoInicial().puntos_equipo_2).toBe(0);
  });

  it('tiene fase: INICIO_RONDA', () => {
    expect(estadoInicial().fase).toBe('INICIO_RONDA');
  });

  it('tiene timer_corriendo: false', () => {
    expect(estadoInicial().timer_corriendo).toBe(false);
  });

  it('tiene tiempo_restante_seg según config', () => {
    expect(estadoInicial({ segundos_por_modo: 45 }).tiempo_restante_seg).toBe(45);
  });
});

/* =============================================================
   Grupo 7 — Flujo completo de un turno
   ============================================================= */

describe('Flujo de turno completo (equipo 1, modo 1)', () => {
  it('seleccionar → mostrar → iniciar tiempo → acierto → avanza', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    const set = contenidoValido(1, 1);

    estado = PictionaryGameDefinition.seleccionarModo(estado);
    expect(estado.fase).toBe('MOSTRANDO_PALABRA');

    estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
    expect(estado.palabra_actual).toBeTruthy();
    expect(estado.fase).toBe('MOSTRANDO_PALABRA');

    estado = PictionaryGameDefinition.iniciarTiempo(estado);
    expect(estado.fase).toBe('ADIVINANDO');
    expect(estado.timer_corriendo).toBe(true);

    estado = PictionaryGameDefinition.detenerTiempo(estado, 30);
    expect(estado.fase).toBe('ESPERA_VALIDACION');
    expect(estado.timer_corriendo).toBe(false);

    estado = PictionaryGameDefinition.aplicarAcierto(estado, config);
    expect(estado.puntos_equipo_1).toBe(10);
    expect(estado.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 8 — Cambio de equipo tras completar modo
   ============================================================= */

describe('Cambio de equipo', () => {
  it('equipo 1 completa modo 1 → sigue en equipo 1, avanza a modo 2', () => {
    const config = configuracionValida({ rondas: 2, palabras_por_modo: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    const set = contenidoValido(2, 1);

    estado = PictionaryGameDefinition.seleccionarModo(estado);
    estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
    estado = PictionaryGameDefinition.iniciarTiempo(estado);
    estado = PictionaryGameDefinition.detenerTiempo(estado, 30);
    estado = PictionaryGameDefinition.aplicarAcierto(estado, config);

    expect(estado.equipo_actual).toBe(1);
    expect(estado.modo_actual).toBe(2);
    expect(estado.fase).toBe('INICIO_RONDA');
  });

  it('equipo 1 completa los 4 modos → pasa a equipo 2 modo 1', () => {
    const config = configuracionValida({ rondas: 2, palabras_por_modo: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    const set = contenidoValido(2, 1);

    for (let i = 0; i < 4; i++) {
      estado = PictionaryGameDefinition.seleccionarModo(estado);
      estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
      estado = PictionaryGameDefinition.iniciarTiempo(estado);
      estado = PictionaryGameDefinition.detenerTiempo(estado, 30);
      estado = PictionaryGameDefinition.aplicarAcierto(estado, config);
    }

    expect(estado.equipo_actual).toBe(2);
    expect(estado.modo_actual).toBe(1);
    expect(estado.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 9 — Cambio de ronda tras completar todos los modos
   ============================================================= */

describe('Cambio de ronda', () => {
  it('ambos equipos completan 4 modos → FIN_DE_RONDA', () => {
    const config = configuracionValida({ rondas: 2, palabras_por_modo: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    const set = contenidoValido(2, 1);

    for (let turno = 0; turno < 8; turno++) {
      estado = PictionaryGameDefinition.seleccionarModo(estado);
      estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
      estado = PictionaryGameDefinition.iniciarTiempo(estado);
      estado = PictionaryGameDefinition.detenerTiempo(estado, 30);
      estado = PictionaryGameDefinition.aplicarAcierto(estado, config);
    }

    expect(estado.fase).toBe('FIN_DE_RONDA');
  });
});

/* =============================================================
   Grupo 10 — aplicarTimeUp
   ============================================================= */

describe('aplicarTimeUp', () => {
  it('error automático y avanza', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    const set = contenidoValido(1, 1);

    estado = PictionaryGameDefinition.seleccionarModo(estado);
    estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
    estado = PictionaryGameDefinition.iniciarTiempo(estado);

    estado = PictionaryGameDefinition.aplicarTimeUp(estado, config);
    expect(estado.puntos_equipo_1).toBe(0);
    expect(estado.fase).toBe('INICIO_RONDA');
  });

  it('aplica penalización por error en time up', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1, penalizacion_por_error: 5 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, puntos_equipo_1: 20 };
    const set = contenidoValido(1, 1);

    estado = PictionaryGameDefinition.seleccionarModo(estado);
    estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
    estado = PictionaryGameDefinition.iniciarTiempo(estado);

    estado = PictionaryGameDefinition.aplicarTimeUp(estado, config);
    expect(estado.puntos_equipo_1).toBe(15);
  });

  it('no aplica si fase es FIN_DE_JUEGO', () => {
    const estado = { fase: 'FIN_DE_JUEGO' };
    expect(PictionaryGameDefinition.aplicarTimeUp(estado, {})).toBeNull();
  });

  it('no aplica si fase es FIN_DE_RONDA', () => {
    const estado = { fase: 'FIN_DE_RONDA' };
    expect(PictionaryGameDefinition.aplicarTimeUp(estado, {})).toBeNull();
  });
});

/* =============================================================
   Grupo 11 — aplicarBonus
   ============================================================= */

describe('aplicarBonus', () => {
  it('suma puntos al equipo 1', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 1);
    expect(nuevo.puntos_equipo_1).toBe(25);
    expect(nuevo.puntos_equipo_2).toBe(0);
  });

  it('suma puntos al equipo 2', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 2);
    expect(nuevo.puntos_equipo_2).toBe(25);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });

  it('no aplica si equipo inválido', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 3);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });
});

/* =============================================================
   Grupo 12 — aplicarPasar
   ============================================================= */

describe('aplicarPasar', () => {
  it('penaliza si penalizacion_por_pasar > 0', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1, penalizacion_por_pasar: 7 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, puntos_equipo_1: 20, fase: 'ESPERA_VALIDACION' };

    estado = PictionaryGameDefinition.aplicarPasar(estado, config);
    expect(estado.puntos_equipo_1).toBe(13);
  });

  it('no penaliza si penalizacion_por_pasar es 0', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1, penalizacion_por_pasar: 0 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, puntos_equipo_1: 20, fase: 'ESPERA_VALIDACION' };

    estado = PictionaryGameDefinition.aplicarPasar(estado, config);
    expect(estado.puntos_equipo_1).toBe(20);
  });
});

/* =============================================================
   Grupo 13 — calcularResultado
   ============================================================= */

describe('calcularResultado', () => {
  it('ganador por puntos (equipo 1)', () => {
    const estado = { puntos_equipo_1: 30, puntos_equipo_2: 10 };
    const resultado = PictionaryGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(1);
  });

  it('ganador por puntos (equipo 2)', () => {
    const estado = { puntos_equipo_1: 5, puntos_equipo_2: 20 };
    const resultado = PictionaryGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(2);
  });

  it('empate técnico por turnos completados', () => {
    const estado = {
      puntos_equipo_1: 10,
      puntos_equipo_2: 10,
      turnos_completados_equipo_1: 5,
      turnos_completados_equipo_2: 3
    };
    const resultado = PictionaryGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(1);
  });

  it('empate total (mismos puntos y turnos)', () => {
    const estado = {
      puntos_equipo_1: 10,
      puntos_equipo_2: 10,
      turnos_completados_equipo_1: 4,
      turnos_completados_equipo_2: 4
    };
    const resultado = PictionaryGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBeNull();
  });

  it('lanza si estado no es objeto', () => {
    expect(() => PictionaryGameDefinition.calcularResultado(null)).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 14 — validarEstadoJuego
   ============================================================= */

describe('validarEstadoJuego', () => {
  it('estado válido → true', () => {
    expect(PictionaryGameDefinition.validarEstadoJuego(estadoInicial())).toBe(true);
  });

  it('lanza si estado null', () => {
    expect(() => PictionaryGameDefinition.validarEstadoJuego(null)).toThrow(ValidacionError);
  });

  it('lanza si ronda_actual < 1', () => {
    const estado = { ...estadoInicial(), ronda_actual: 0 };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('ronda_actual');
  });

  it('lanza si modo_actual inválido', () => {
    const estado = { ...estadoInicial(), modo_actual: 5 };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('modo_actual');
  });

  it('lanza si equipo_actual inválido', () => {
    const estado = { ...estadoInicial(), equipo_actual: 3 };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('equipo_actual');
  });

  it('lanza si fase inválida', () => {
    const estado = { ...estadoInicial(), fase: 'INVALIDA' };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('fase inválida');
  });

  it('lanza si timer_corriendo no es booleano', () => {
    const estado = { ...estadoInicial(), timer_corriendo: 'si' };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('timer_corriendo');
  });
});

/* =============================================================
   Grupo 15 — iniciarSiguienteRonda
   ============================================================= */

describe('iniciarSiguienteRonda', () => {
  it('avanza ronda desde FIN_DE_RONDA', () => {
    const config = configuracionValida({ rondas: 3 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };

    estado = PictionaryGameDefinition.iniciarSiguienteRonda(estado, config);
    expect(estado.ronda_actual).toBe(2);
    expect(estado.fase).toBe('INICIO_RONDA');
    expect(estado.modo_actual).toBe(1);
    expect(estado.equipo_actual).toBe(1);
  });

  it('no hace nada si fase no es FIN_DE_RONDA', () => {
    const estado = estadoInicial();
    const result = PictionaryGameDefinition.iniciarSiguienteRonda(estado, {});
    expect(result.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 16 — Bonus en contexto de turno
   ============================================================= */

describe('Bonus en contexto de turno', () => {
  it('bonus no afecta el flujo del turno', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_modo: 1, bonus_puntos: 50 });
    let estado = PictionaryGameDefinition.estadoInicial(config);

    estado = PictionaryGameDefinition.aplicarBonus(estado, config, 1);
    expect(estado.puntos_equipo_1).toBe(50);

    const set = contenidoValido(1, 1);
    estado = PictionaryGameDefinition.seleccionarModo(estado);
    estado = PictionaryGameDefinition.mostrarPalabra(estado, set);
    estado = PictionaryGameDefinition.iniciarTiempo(estado);
    estado = PictionaryGameDefinition.detenerTiempo(estado, 30);
    estado = PictionaryGameDefinition.aplicarAcierto(estado, config);

    expect(estado.puntos_equipo_1).toBe(60);
  });
});
