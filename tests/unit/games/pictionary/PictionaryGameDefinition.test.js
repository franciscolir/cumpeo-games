import { describe, it, expect } from 'vitest';

import {
  PictionaryGameDefinition,
  SUBMODOS,
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
    rondas: 1,
    palabras_por_turno: 1,
    segundos_por_modo: 60,
    puntos_por_acierto: 10,
    penalizacion_por_error: 5,
    penalizacion_por_pasar: 3,
    bonus_puntos: 15,
    ...overrides
  };
}

function itemsParaSubmodo(submodo, cantidad = 1) {
  const items = [];
  for (let i = 0; i < cantidad; i++) {
    const item = { concepto: `${submodo} concepto ${i + 1}` };
    if (submodo === 'PALABRAS') {
      item.prohibidas = [`prohibida${i + 1}a`, `prohibida${i + 1}b`];
    }
    items.push(item);
  }
  return items;
}

function contenidoPara(submodo, cantidad = 1) {
  return { items: itemsParaSubmodo(submodo, cantidad) };
}

function setPara(submodo, cantidad = 1) {
  return { submodo, items: itemsParaSubmodo(submodo, cantidad) };
}

function estadoInicial(configOverrides = {}) {
  return PictionaryGameDefinition.estadoInicial(configuracionValida(configOverrides));
}

function estadoEn(fase, overrides = {}) {
  return { ...estadoInicial(), fase, ...overrides };
}

/* =============================================================
   Grupo 1 — Constantes
   ============================================================= */

describe('SUBMODOS', () => {
  it('contiene exactamente 4 submodos en orden fijo', () => {
    expect(SUBMODOS).toEqual(['PALABRAS', 'GESTOS', 'PREGUNTAS', 'DIBUJO']);
  });

  it('es readonly (frozen)', () => {
    expect(() => { SUBMODOS.push('X'); }).toThrow();
  });
});

describe('FASES', () => {
  it('contiene las 9 fases esperadas', () => {
    expect(FASES).toEqual([
      'INICIO_RONDA',
      'SELECCIONANDO_SUBMODO',
      'SELECCIONANDO_SET',
      'MOSTRANDO_PALABRA',
      'ADIVINANDO',
      'ESPERA_VALIDACION',
      'CAMBIO_TURNO',
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

  it('tiene palabras_por_turno: 1', () => {
    expect(PictionaryGameDefinition.defaultConfig.palabras_por_turno).toBe(1);
  });

  it('no expone palabras_por_modo (renombrado)', () => {
    expect(PictionaryGameDefinition.defaultConfig.palabras_por_modo).toBeUndefined();
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

  it('lanza si palabras_por_turno < 1', () => {
    expect(() => PictionaryGameDefinition.validarConfiguracion(configuracionValida({ palabras_por_turno: 0 })))
      .toThrow('palabras_por_turno debe ser un entero >= 1');
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

  it('set PALABRAS válido → ok', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('PALABRAS'), config, 'PALABRAS'
    );
    expect(r.ok).toBe(true);
    expect(r.errores).toHaveLength(0);
  });

  it('set GESTOS válido → ok', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('GESTOS'), config, 'GESTOS'
    );
    expect(r.ok).toBe(true);
  });

  it('set PREGUNTAS válido → ok', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('PREGUNTAS'), config, 'PREGUNTAS'
    );
    expect(r.ok).toBe(true);
  });

  it('set DIBUJO válido → ok', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('DIBUJO'), config, 'DIBUJO'
    );
    expect(r.ok).toBe(true);
  });

  it('submodo inválido → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('PALABRAS'), config, 'INVALIDO'
    );
    expect(r.ok).toBe(false);
    expect(r.errores).toContain('submodo inválido');
  });

  it('sin submodo → submodo inválido', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X' }] }, config
    );
    expect(r.ok).toBe(false);
    expect(r.errores).toContain('submodo inválido');
  });

  it('contenido null → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(null, config, 'PALABRAS');
    expect(r.ok).toBe(false);
  });

  it('items no es array → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet({ items: 'no' }, config, 'GESTOS');
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toContain('items debe ser un array');
  });

  it('items vacío → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet({ items: [] }, config, 'GESTOS');
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toContain('no puede estar vacío');
  });

  it('concepto vacío → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: '' }] }, config, 'GESTOS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('concepto debe ser un string no vacío'))).toBe(true);
  });

  it('PALABRAS sin prohibidas → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X' }] }, config, 'PALABRAS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('prohibidas debe ser un array no vacío'))).toBe(true);
  });

  it('PALABRAS con prohibidas vacío → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', prohibidas: [] }] }, config, 'PALABRAS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('prohibidas debe ser un array no vacío'))).toBe(true);
  });

  it('GESTOS con prohibidas no vacías → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', prohibidas: ['a'] }] }, config, 'GESTOS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('prohibidas debe estar ausente o vacío'))).toBe(true);
  });

  it('PREGUNTAS con prohibidas no vacías → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', prohibidas: ['a'] }] }, config, 'PREGUNTAS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('prohibidas debe estar ausente o vacío'))).toBe(true);
  });

  it('DIBUJO con prohibidas no vacías → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', prohibidas: ['a'] }] }, config, 'DIBUJO'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('prohibidas debe estar ausente o vacío'))).toBe(true);
  });

  it('DIBUJO con prohibidas [] → ok (vacío permitido)', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', prohibidas: [] }] }, config, 'DIBUJO'
    );
    expect(r.ok).toBe(true);
  });

  it('items insuficientes vs palabras_por_turno → error', () => {
    const cfg = configuracionValida({ palabras_por_turno: 3 });
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('GESTOS', 2), cfg, 'GESTOS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('se necesitan al menos'))).toBe(true);
  });

  it('items suficientes → ok', () => {
    const cfg = configuracionValida({ palabras_por_turno: 2 });
    const r = PictionaryGameDefinition.validarContenidoSet(
      contenidoPara('GESTOS', 2), cfg, 'GESTOS'
    );
    expect(r.ok).toBe(true);
  });

  it('dificultad inválida (0) → error', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', dificultad: 0 }] }, config, 'GESTOS'
    );
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => e.includes('dificultad debe ser un entero'))).toBe(true);
  });

  it('dificultad 2 → ok', () => {
    const r = PictionaryGameDefinition.validarContenidoSet(
      { items: [{ concepto: 'X', dificultad: 2 }] }, config, 'GESTOS'
    );
    expect(r.ok).toBe(true);
  });

  it('item.modo no sustituye al submodo requerido', () => {
    const items = [{ modo: 1, concepto: 'X', prohibidas: ['a'] }];
    const r = PictionaryGameDefinition.validarContenidoSet({ items }, config);
    expect(r.ok).toBe(false);
    expect(r.errores).toContain('submodo inválido');
  });
});

/* =============================================================
   Grupo 6 — estadoInicial
   ============================================================= */

describe('estadoInicial', () => {
  it('tiene ronda_actual: 1', () => {
    expect(estadoInicial().ronda_actual).toBe(1);
  });

  it('tiene total_rondas según config', () => {
    expect(estadoInicial({ rondas: 3 }).total_rondas).toBe(3);
  });

  it('tiene submodo_actual: PALABRAS', () => {
    expect(estadoInicial().submodo_actual).toBe('PALABRAS');
  });

  it('tiene set_actual: null', () => {
    expect(estadoInicial().set_actual).toBeNull();
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

  it('tiene turnos completados en 0', () => {
    expect(estadoInicial().turnos_completados_equipo_1).toBe(0);
    expect(estadoInicial().turnos_completados_equipo_2).toBe(0);
  });

  it('tiene timer_corriendo: false', () => {
    expect(estadoInicial().timer_corriendo).toBe(false);
  });

  it('tiene tiempo_restante_seg según config', () => {
    expect(estadoInicial({ segundos_por_modo: 45 }).tiempo_restante_seg).toBe(45);
  });

  it('tiene turno_activo: false', () => {
    expect(estadoInicial().turno_activo).toBe(false);
  });

  it('tiene palabra_actual: null', () => {
    expect(estadoInicial().palabra_actual).toBeNull();
  });

  it('tiene prohibidas_actuales: []', () => {
    expect(estadoInicial().prohibidas_actuales).toEqual([]);
  });

  it('no expone modo_actual (eliminado en 7.7c)', () => {
    expect(estadoInicial().modo_actual).toBeUndefined();
  });
});

/* =============================================================
   Grupo 7 — seleccionarSubmodo
   ============================================================= */

describe('seleccionarSubmodo', () => {
  it('SELECCIONANDO_SUBMODO → SELECCIONANDO_SET', () => {
    const estado = estadoEn('SELECCIONANDO_SUBMODO');
    const nuevo = PictionaryGameDefinition.seleccionarSubmodo(estado, 'GESTOS');
    expect(nuevo.fase).toBe('SELECCIONANDO_SET');
    expect(nuevo.submodo_actual).toBe('GESTOS');
  });

  it('acepta los 4 submodos', () => {
    for (const sub of SUBMODOS) {
      const estado = estadoEn('SELECCIONANDO_SUBMODO');
      const nuevo = PictionaryGameDefinition.seleccionarSubmodo(estado, sub);
      expect(nuevo.submodo_actual).toBe(sub);
    }
  });

  it('submodo inválido → throw ValidacionError', () => {
    const estado = estadoEn('SELECCIONANDO_SUBMODO');
    expect(() => PictionaryGameDefinition.seleccionarSubmodo(estado, 'XXX'))
      .toThrow(ValidacionError);
  });

  it('fase incorrecta → retorna estado sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.seleccionarSubmodo(estado, 'GESTOS');
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 8 — seleccionarSet
   ============================================================= */

describe('seleccionarSet', () => {
  it('SELECCIONANDO_SET con set correcto → MOSTRANDO_PALABRA', () => {
    const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
    const set = setPara('GESTOS', 2);
    const nuevo = PictionaryGameDefinition.seleccionarSet(estado, set);
    expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
    expect(nuevo.set_actual).toEqual(set);
    expect(nuevo.palabra_actual_index).toBe(0);
    expect(nuevo.palabras_del_turno).toBe(0);
  });

  it('set.submodo incorrecto → throw', () => {
    const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
    const set = setPara('PALABRAS', 1);
    expect(() => PictionaryGameDefinition.seleccionarSet(estado, set))
      .toThrow('set.submodo debe coincidir con submodo_actual');
  });

  it('set sin items → throw', () => {
    const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
    expect(() => PictionaryGameDefinition.seleccionarSet(estado, { submodo: 'GESTOS', items: [] }))
      .toThrow(ValidacionError);
  });

  it('set null → throw', () => {
    const estado = estadoEn('SELECCIONANDO_SET', { submodo_actual: 'GESTOS' });
    expect(() => PictionaryGameDefinition.seleccionarSet(estado, null))
      .toThrow(ValidacionError);
  });

  it('fase incorrecta → retorna estado sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.seleccionarSet(estado, setPara('PALABRAS'));
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 9 — mostrarPalabra / iniciarTiempo / detenerTiempo
   ============================================================= */

describe('mostrarPalabra', () => {
  it('carga palabra_actual desde set_actual', () => {
    const set = setPara('GESTOS', 2);
    const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set });
    const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
    expect(nuevo.palabra_actual).toEqual(set.items[0]);
    expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
  });

  it('prohibidas_actuales vacías para GESTOS', () => {
    const set = setPara('GESTOS');
    const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set });
    const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
    expect(nuevo.prohibidas_actuales).toEqual([]);
  });

  it('prohibidas_actuales para PALABRAS', () => {
    const set = setPara('PALABRAS');
    const estado = estadoEn('MOSTRANDO_PALABRA', { set_actual: set });
    const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
    expect(nuevo.prohibidas_actuales.length).toBeGreaterThan(0);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.mostrarPalabra(estado);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

describe('iniciarTiempo', () => {
  it('MOSTRANDO_PALABRA → ADIVINANDO con timer', () => {
    const estado = estadoEn('MOSTRANDO_PALABRA');
    const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
    expect(nuevo.fase).toBe('ADIVINANDO');
    expect(nuevo.timer_corriendo).toBe(true);
    expect(nuevo.turno_activo).toBe(true);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.iniciarTiempo(estado);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

describe('detenerTiempo', () => {
  it('ADIVINANDO → ESPERA_VALIDACION', () => {
    const estado = estadoEn('ADIVINANDO', { timer_corriendo: true, turno_activo: true });
    const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 30);
    expect(nuevo.fase).toBe('ESPERA_VALIDACION');
    expect(nuevo.timer_corriendo).toBe(false);
    expect(nuevo.tiempo_restante_seg).toBe(30);
    expect(nuevo.turno_activo).toBe(false);
  });

  it('negativo se clampa a 0', () => {
    const estado = estadoEn('ADIVINANDO');
    const nuevo = PictionaryGameDefinition.detenerTiempo(estado, -5);
    expect(nuevo.tiempo_restante_seg).toBe(0);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.detenerTiempo(estado, 10);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 10 — aplicarAcierto / aplicarError / aplicarPasar
   ============================================================= */

describe('aplicarAcierto', () => {
  it('suma puntos y avanza (palabra única)', () => {
    const config = configuracionValida({ palabras_por_turno: 1 });
    const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1 });
    const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(10);
    expect(nuevo.equipo_actual).toBe(2);
    expect(nuevo.fase).toBe('INICIO_RONDA');
    expect(nuevo.turnos_completados_equipo_1).toBe(1);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.aplicarAcierto(estado, configuracionValida());
    expect(nuevo.puntos_equipo_1).toBe(0);
  });
});

describe('aplicarError', () => {
  it('penaliza y avanza', () => {
    const config = configuracionValida({ penalizacion_por_error: 5 });
    const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1, puntos_equipo_1: 20 });
    const nuevo = PictionaryGameDefinition.aplicarError(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(15);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('no baja de 0', () => {
    const config = configuracionValida({ penalizacion_por_error: 50 });
    const estado = estadoEn('ESPERA_VALIDACION', { puntos_equipo_1: 3 });
    const nuevo = PictionaryGameDefinition.aplicarError(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA', { puntos_equipo_1: 10 });
    const nuevo = PictionaryGameDefinition.aplicarError(estado, configuracionValida());
    expect(nuevo.puntos_equipo_1).toBe(10);
  });
});

describe('aplicarPasar', () => {
  it('penaliza si penalizacion_por_pasar > 0', () => {
    const config = configuracionValida({ penalizacion_por_pasar: 7 });
    const estado = estadoEn('ESPERA_VALIDACION', { puntos_equipo_1: 20 });
    const nuevo = PictionaryGameDefinition.aplicarPasar(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(13);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('no penaliza si penalizacion_por_pasar es 0', () => {
    const config = configuracionValida({ penalizacion_por_pasar: 0 });
    const estado = estadoEn('ESPERA_VALIDACION', { puntos_equipo_1: 20 });
    const nuevo = PictionaryGameDefinition.aplicarPasar(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(20);
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.aplicarPasar(estado, configuracionValida());
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 11 — aplicarBonus / aplicarTimeUp
   ============================================================= */

describe('aplicarBonus', () => {
  it('suma puntos al equipo 1 sin cambiar fase', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 1);
    expect(nuevo.puntos_equipo_1).toBe(25);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('suma puntos al equipo 2', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 2);
    expect(nuevo.puntos_equipo_2).toBe(25);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });

  it('equipo inválido → sin cambios', () => {
    const config = configuracionValida({ bonus_puntos: 25 });
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.aplicarBonus(estado, config, 3);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });
});

describe('aplicarTimeUp', () => {
  it('ADIVINANDO → ESPERA_VALIDACION con penalización', () => {
    const config = configuracionValida({ penalizacion_por_error: 5 });
    const estado = estadoEn('ADIVINANDO', { puntos_equipo_1: 20, timer_corriendo: true });
    const nuevo = PictionaryGameDefinition.aplicarTimeUp(estado, config);
    expect(nuevo.puntos_equipo_1).toBe(15);
    expect(nuevo.fase).toBe('ESPERA_VALIDACION');
    expect(nuevo.timer_corriendo).toBe(false);
    expect(nuevo.tiempo_restante_seg).toBe(0);
  });

  it('FIN_DE_JUEGO → null', () => {
    expect(PictionaryGameDefinition.aplicarTimeUp({ fase: 'FIN_DE_JUEGO' }, {})).toBeNull();
  });

  it('FIN_DE_RONDA → null', () => {
    expect(PictionaryGameDefinition.aplicarTimeUp({ fase: 'FIN_DE_RONDA' }, {})).toBeNull();
  });

  it('fase no ADIVINANDO → sin cambios', () => {
    const estado = estadoEn('INICIO_RONDA');
    const nuevo = PictionaryGameDefinition.aplicarTimeUp(estado, {});
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('estado no objeto → throw', () => {
    expect(() => PictionaryGameDefinition.aplicarTimeUp(null, {})).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 12 — avanzarTurno
   ============================================================= */

describe('avanzarTurno', () => {
  it('palabras restantes → MOSTRANDO_PALABRA con index+1', () => {
    const config = configuracionValida({ palabras_por_turno: 2 });
    const estado = estadoEn('ESPERA_VALIDACION', { palabra_actual_index: 0, palabras_del_turno: 0 });
    const nuevo = PictionaryGameDefinition.avanzarTurno(estado, config);
    expect(nuevo.fase).toBe('MOSTRANDO_PALABRA');
    expect(nuevo.palabra_actual_index).toBe(1);
    expect(nuevo.palabras_del_turno).toBe(1);
  });

  it('última palabra → cambiarTurno', () => {
    const config = configuracionValida({ palabras_por_turno: 1 });
    const estado = estadoEn('ESPERA_VALIDACION', { equipo_actual: 1 });
    const nuevo = PictionaryGameDefinition.avanzarTurno(estado, config);
    expect(nuevo.equipo_actual).toBe(2);
    expect(nuevo.turnos_completados_equipo_1).toBe(1);
  });
});

/* =============================================================
   Grupo 13 — cambiarTurno
   ============================================================= */

describe('cambiarTurno', () => {
  it('Eq1 → Eq2 con MISMO submodo, fase INICIO_RONDA', () => {
    const estado = estadoEn('ESPERA_VALIDACION', {
      equipo_actual: 1,
      submodo_actual: 'PALABRAS',
      set_actual: setPara('PALABRAS')
    });
    const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
    expect(nuevo.equipo_actual).toBe(2);
    expect(nuevo.submodo_actual).toBe('PALABRAS');
    expect(nuevo.fase).toBe('INICIO_RONDA');
    expect(nuevo.turnos_completados_equipo_1).toBe(1);
    expect(nuevo.set_actual).toBeNull();
    expect(nuevo.palabra_actual).toBeNull();
    expect(nuevo.palabra_actual_index).toBe(0);
    expect(nuevo.palabras_del_turno).toBe(0);
  });

  it('Eq2 con PALABRAS → Eq1 con GESTOS', () => {
    const estado = estadoEn('ESPERA_VALIDACION', {
      equipo_actual: 2,
      submodo_actual: 'PALABRAS'
    });
    const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
    expect(nuevo.equipo_actual).toBe(1);
    expect(nuevo.submodo_actual).toBe('GESTOS');
    expect(nuevo.fase).toBe('INICIO_RONDA');
    expect(nuevo.turnos_completados_equipo_2).toBe(1);
  });

  it('Eq2 con GESTOS → Eq1 con PREGUNTAS', () => {
    const estado = estadoEn('ESPERA_VALIDACION', {
      equipo_actual: 2,
      submodo_actual: 'GESTOS'
    });
    const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
    expect(nuevo.submodo_actual).toBe('PREGUNTAS');
    expect(nuevo.equipo_actual).toBe(1);
  });

  it('Eq2 con PREGUNTAS → Eq1 con DIBUJO', () => {
    const estado = estadoEn('ESPERA_VALIDACION', {
      equipo_actual: 2,
      submodo_actual: 'PREGUNTAS'
    });
    const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
    expect(nuevo.submodo_actual).toBe('DIBUJO');
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('Eq2 con DIBUJO (último) → FIN_DE_RONDA, Eq1, PALABRAS', () => {
    const estado = estadoEn('ESPERA_VALIDACION', {
      equipo_actual: 2,
      submodo_actual: 'DIBUJO',
      turnos_completados_equipo_2: 3
    });
    const nuevo = PictionaryGameDefinition.cambiarTurno(estado);
    expect(nuevo.fase).toBe('FIN_DE_RONDA');
    expect(nuevo.equipo_actual).toBe(1);
    expect(nuevo.submodo_actual).toBe('PALABRAS');
    expect(nuevo.turnos_completados_equipo_2).toBe(4);
  });
});

/* =============================================================
   Grupo 14 — iniciarSiguienteRonda
   ============================================================= */

describe('iniciarSiguienteRonda', () => {
  it('FIN_DE_RONDA → INICIO_RONDA con ronda+1', () => {
    const config = configuracionValida({ rondas: 3 });
    const estado = { ...estadoInicial({ rondas: 3 }), fase: 'FIN_DE_RONDA', ronda_actual: 1 };
    const nuevo = PictionaryGameDefinition.iniciarSiguienteRonda(estado, config);
    expect(nuevo.ronda_actual).toBe(2);
    expect(nuevo.fase).toBe('INICIO_RONDA');
    expect(nuevo.submodo_actual).toBe('PALABRAS');
    expect(nuevo.equipo_actual).toBe(1);
  });

  it('última ronda → FIN_DE_JUEGO', () => {
    const config = configuracionValida({ rondas: 2 });
    const estado = { ...estadoInicial({ rondas: 2 }), fase: 'FIN_DE_RONDA', ronda_actual: 2 };
    const nuevo = PictionaryGameDefinition.iniciarSiguienteRonda(estado, config);
    expect(nuevo.fase).toBe('FIN_DE_JUEGO');
  });

  it('fase incorrecta → sin cambios', () => {
    const estado = estadoInicial();
    const nuevo = PictionaryGameDefinition.iniciarSiguienteRonda(estado, {});
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });
});

/* =============================================================
   Grupo 15 — validarEstadoJuego
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

  it('lanza si submodo_actual inválido', () => {
    const estado = { ...estadoInicial(), submodo_actual: 'XXX' };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('submodo_actual');
  });

  it('acepta los 4 submodos válidos', () => {
    for (const sub of SUBMODOS) {
      const estado = { ...estadoInicial(), submodo_actual: sub };
      expect(PictionaryGameDefinition.validarEstadoJuego(estado)).toBe(true);
    }
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

  it('lanza si tiempo_restante_seg negativo', () => {
    const estado = { ...estadoInicial(), tiempo_restante_seg: -1 };
    expect(() => PictionaryGameDefinition.validarEstadoJuego(estado)).toThrow('tiempo_restante_seg');
  });
});

/* =============================================================
   Grupo 16 — calcularResultado
   ============================================================= */

describe('calcularResultado', () => {
  it('ganador por puntos (equipo 1)', () => {
    const r = PictionaryGameDefinition.calcularResultado({ puntos_equipo_1: 30, puntos_equipo_2: 10 });
    expect(r.ganador).toBe(1);
  });

  it('ganador por puntos (equipo 2)', () => {
    const r = PictionaryGameDefinition.calcularResultado({ puntos_equipo_1: 5, puntos_equipo_2: 20 });
    expect(r.ganador).toBe(2);
  });

  it('empate por turnos completados', () => {
    const r = PictionaryGameDefinition.calcularResultado({
      puntos_equipo_1: 10,
      puntos_equipo_2: 10,
      turnos_completados_equipo_1: 5,
      turnos_completados_equipo_2: 3
    });
    expect(r.ganador).toBe(1);
  });

  it('empate total → null', () => {
    const r = PictionaryGameDefinition.calcularResultado({
      puntos_equipo_1: 10,
      puntos_equipo_2: 10,
      turnos_completados_equipo_1: 4,
      turnos_completados_equipo_2: 4
    });
    expect(r.ganador).toBeNull();
  });

  it('lanza si estado no es objeto', () => {
    expect(() => PictionaryGameDefinition.calcularResultado(null)).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 17 — Flujo completo (1 ronda = 8 turnos)
   ============================================================= */

describe('Flujo completo — 1 ronda = 4 submodos × 2 equipos', () => {
  function jugarTurno(estado, config, set) {
    let e = estado;
    if (e.fase === 'INICIO_RONDA') {
      e = { ...e, fase: 'SELECCIONANDO_SUBMODO' };
    }
    e = PictionaryGameDefinition.seleccionarSubmodo(e, e.submodo_actual);
    e = PictionaryGameDefinition.seleccionarSet(e, set);
    e = PictionaryGameDefinition.mostrarPalabra(e);
    e = PictionaryGameDefinition.iniciarTiempo(e);
    e = PictionaryGameDefinition.detenerTiempo(e, 30);
    e = PictionaryGameDefinition.aplicarAcierto(e, config);
    return e;
  }

  it('secuencia de 8 turnos → FIN_DE_RONDA', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_turno: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, fase: 'SELECCIONANDO_SUBMODO' };

    const esperado = [
      ['PALABRAS', 1], ['PALABRAS', 2],
      ['GESTOS', 1], ['GESTOS', 2],
      ['PREGUNTAS', 1], ['PREGUNTAS', 2],
      ['DIBUJO', 1], ['DIBUJO', 2]
    ];

    for (let turno = 0; turno < 8; turno++) {
      const [sub, eq] = esperado[turno];
      expect(estado.submodo_actual).toBe(sub);
      expect(estado.equipo_actual).toBe(eq);
      const set = setPara(sub, 1);
      estado = jugarTurno(estado, config, set);
    }

    expect(estado.fase).toBe('FIN_DE_RONDA');
    expect(estado.turnos_completados_equipo_1).toBe(4);
    expect(estado.turnos_completados_equipo_2).toBe(4);
    expect(estado.puntos_equipo_1).toBe(40);
    expect(estado.puntos_equipo_2).toBe(40);
  });

  it('FIN_DE_RONDA con rondas=1 → siguiente → FIN_DE_JUEGO', () => {
    const config = configuracionValida({ rondas: 1, palabras_por_turno: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    expect(estado.total_rondas).toBe(1);
    estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };
    estado = PictionaryGameDefinition.iniciarSiguienteRonda(estado, config);
    expect(estado.fase).toBe('FIN_DE_JUEGO');
  });

  it('flujo completo con 2 rondas → ronda 2 inicia limpia', () => {
    const config = configuracionValida({ rondas: 2, palabras_por_turno: 1 });
    let estado = PictionaryGameDefinition.estadoInicial(config);
    estado = { ...estado, fase: 'FIN_DE_RONDA', ronda_actual: 1 };
    estado = PictionaryGameDefinition.iniciarSiguienteRonda(estado, config);
    expect(estado.fase).toBe('INICIO_RONDA');
    expect(estado.ronda_actual).toBe(2);
    expect(estado.submodo_actual).toBe('PALABRAS');
    expect(estado.equipo_actual).toBe(1);
    expect(PictionaryGameDefinition.validarEstadoJuego(estado)).toBe(true);
  });
});
