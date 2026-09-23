import { describe, it, expect } from 'vitest';

import {
  RoscoGameDefinition,
  ALFABETO,
  ESTADO_LETRA
} from '../../../../src/games/rosco/RoscoGameDefinition.js';
import { GameDefinitionRegistry } from '../../../../src/services/GameDefinitionRegistry.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

/* =============================================================
   Helpers
   ============================================================= */

function configuracionValida(overrides = {}) {
  return {
    rondas: 2,
    segundos_por_equipo: 60,
    puntos_por_acierto: 10,
    penalizacion_puntos: 5,
    ...overrides
  };
}

function generarItemsValidos() {
  return ALFABETO.map((letra) => ({
    letra,
    definicion: `Definición de ${letra}`,
    respuesta: `Respuesta ${letra}`
  }));
}

function contenidoValido() {
  return { items: generarItemsValidos() };
}

function generarSet(id = 'set-1') {
  return { id, items: generarItemsValidos() };
}

function generarSets(n = 2) {
  return Array.from({ length: n }, (_, i) => generarSet(`set-${i + 1}`));
}

function estadoInicial(configOverrides = {}, sets = null) {
  return RoscoGameDefinition.estadoInicial(
    configuracionValida(configOverrides),
    sets
  );
}

/* =============================================================
   Grupo 1 — Alfabeto
   ============================================================= */

describe('ALFABETO', () => {
  it('contiene exactamente 27 letras', () => {
    expect(ALFABETO.length).toBe(27);
  });

  it('incluye la Ñ', () => {
    expect(ALFABETO).toContain('Ñ');
  });

  it('está en orden alfabético tradicional español', () => {
    expect(ALFABETO).toEqual([
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    ]);
  });

  it('es readonly (frozen)', () => {
    expect(() => { ALFABETO.push('!'); }).toThrow();
  });
});

/* =============================================================
   Grupo 2 — validarConfiguracion
   ============================================================= */

describe('validarConfiguracion', () => {
  it('config válida → true', () => {
    expect(RoscoGameDefinition.validarConfiguracion(configuracionValida())).toBe(true);
  });

  it('config null → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(null)).toThrow(ValidacionError);
  });

  it('rondas = 0 → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(configuracionValida({ rondas: 0 }))).toThrow(ValidacionError);
  });

  it('rondas negativa → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(configuracionValida({ rondas: -1 }))).toThrow(ValidacionError);
  });

  it('segundos_por_equipo = 0 → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(configuracionValida({ segundos_por_equipo: 0 }))).toThrow(ValidacionError);
  });

  it('puntos_por_acierto negativo → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(configuracionValida({ puntos_por_acierto: -5 }))).toThrow(ValidacionError);
  });

  it('penalizacion_puntos negativa → error', () => {
    expect(() => RoscoGameDefinition.validarConfiguracion(configuracionValida({ penalizacion_puntos: -1 }))).toThrow(ValidacionError);
  });

  it('defaultConfig mantiene 10/5', () => {
    expect(RoscoGameDefinition.defaultConfig.puntos_por_acierto).toBe(10);
    expect(RoscoGameDefinition.defaultConfig.penalizacion_puntos).toBe(5);
    expect(RoscoGameDefinition.defaultConfig.rondas).toBe(1);
  });
});

/* =============================================================
   Grupo 3 — validarContenidoSet (exactamente 27 items)
   ============================================================= */

describe('validarContenidoSet', () => {
  it('set válido (27 letras, 1 item cada una) → ok', () => {
    const config = configuracionValida({ rondas: 1 });
    const resultado = RoscoGameDefinition.validarContenidoSet(contenidoValido(), config);
    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('set válido con config rondas=3 → ok (no depende de rondas)', () => {
    const config = configuracionValida({ rondas: 3 });
    const resultado = RoscoGameDefinition.validarContenidoSet(contenidoValido(), config);
    expect(resultado.ok).toBe(true);
  });

  it('set vacío → error exactamente 27', () => {
    const config = configuracionValida();
    const resultado = RoscoGameDefinition.validarContenidoSet({ items: [] }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 27'))).toBe(true);
  });

  it('set null → error', () => {
    const config = configuracionValida();
    const resultado = RoscoGameDefinition.validarContenidoSet(null, config);
    expect(resultado.ok).toBe(false);
  });

  it('items no array → error', () => {
    const resultado = RoscoGameDefinition.validarContenidoSet({ items: 'nope' }, configuracionValida());
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0]).toContain('array');
  });

  it('26 items (letra M faltante) → error exactamente 27 + Falta la letra M', () => {
    const config = configuracionValida();
    const items = ALFABETO.filter((l) => l !== 'M').map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 27'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('Falta la letra M'))).toBe(true);
  });

  it('letra faltante → error listando la letra', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = ALFABETO.filter((l) => l !== 'M').map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('Falta la letra M'))).toBe(true);
  });

  it('28 items (letra duplicada) → error exactamente 27 + más de un item', () => {
    const config = configuracionValida();
    const items = [
      ...generarItemsValidos(),
      { letra: 'A', definicion: 'Dup', respuesta: 'Dup' }
    ];
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 27'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('La letra A tiene más de un item'))).toBe(true);
  });

  it('27 items pero una letra duplicada y otra faltante → errores por letra', () => {
    const config = configuracionValida();
    const items = generarItemsValidos().filter((i) => i.letra !== 'M');
    items.push({ letra: 'A', definicion: 'Dup', respuesta: 'Dup' });
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('Falta la letra M'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('La letra A tiene más de un item'))).toBe(true);
  });

  it('no acepta 2 items por letra aunque rondas=2', () => {
    const config = configuracionValida({ rondas: 2 });
    const items = [];
    for (const letra of ALFABETO) {
      for (let r = 0; r < 2; r++) {
        items.push({ letra, definicion: `Def ${letra} r${r}`, respuesta: `Resp ${letra} ${r}` });
      }
    }
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 27'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('más de un item'))).toBe(true);
  });

  it('item con letra inválida → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = [
      ...generarItemsValidos(),
      { letra: '!', definicion: 'Inválida', respuesta: 'X' }
    ];
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('"!"'))).toBe(true);
  });

  it('item con definicion vacía → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = generarItemsValidos().map((item) =>
      item.letra === 'A' ? { ...item, definicion: '' } : item
    );
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('definicion'))).toBe(true);
  });

  it('item con respuesta vacía → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = generarItemsValidos().map((item) =>
      item.letra === 'Z' ? { ...item, respuesta: '' } : item
    );
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('respuesta'))).toBe(true);
  });

  it('todas las letras ausentes → lista las 27 faltantes', () => {
    const config = configuracionValida({ rondas: 1 });
    const resultado = RoscoGameDefinition.validarContenidoSet({ items: [] }, config);
    const faltantes = resultado.errores.filter((e) => e.includes('Falta la letra'));
    expect(faltantes).toHaveLength(27);
  });
});

/* =============================================================
   Grupo 4 — estadoInicial (N sets)
   ============================================================= */

describe('estadoInicial', () => {
  it('crea estado con 27 letras pendientes', () => {
    const estado = estadoInicial();
    expect(estado.rosco).toHaveLength(27);
    expect(estado.rosco.every((l) => l.estado === ESTADO_LETRA.PENDIENTE)).toBe(true);
  });

  it('ronda_actual = 1', () => {
    const estado = estadoInicial();
    expect(estado.ronda_actual).toBe(1);
  });

  it('equipo_actual = 1', () => {
    const estado = estadoInicial();
    expect(estado.equipo_actual).toBe(1);
  });

  it('puntos ambos equipos en 0', () => {
    const estado = estadoInicial();
    expect(estado.puntos_equipo_1).toBe(0);
    expect(estado.puntos_equipo_2).toBe(0);
  });

  it('tiempo ambos equipos igual a config', () => {
    const estado = estadoInicial({ segundos_por_equipo: 90 });
    expect(estado.tiempo_equipo_1).toBe(90);
    expect(estado.tiempo_equipo_2).toBe(90);
  });

  it('fase = INICIO_RONDA', () => {
    const estado = estadoInicial();
    expect(estado.fase).toBe('INICIO_RONDA');
  });

  it('sin sets → 1 set vacío en sets_por_ronda', () => {
    const estado = estadoInicial();
    expect(estado.sets_por_ronda).toHaveLength(1);
    expect(estado.sets_por_ronda[0].items).toEqual([]);
    expect(estado.set_ronda_actual).toBe(estado.sets_por_ronda[0]);
  });

  it('recibe N sets → sets_por_ronda tiene N', () => {
    const sets = generarSets(3);
    const estado = estadoInicial({ rondas: 3 }, sets);
    expect(estado.sets_por_ronda).toHaveLength(3);
    expect(estado.sets_por_ronda[0].id).toBe('set-1');
    expect(estado.sets_por_ronda[2].id).toBe('set-3');
  });

  it('set_ronda_actual = primer set', () => {
    const sets = generarSets(2);
    const estado = estadoInicial({ rondas: 2 }, sets);
    expect(estado.set_ronda_actual.id).toBe('set-1');
    expect(estado.set_ronda_actual.items).toHaveLength(27);
  });

  it('total_rondas = config.rondas', () => {
    const estado = estadoInicial({ rondas: 4 }, generarSets(4));
    expect(estado.total_rondas).toBe(4);
  });

  it('total_rondas default = 1', () => {
    const estado = estadoInicial({ rondas: 1 });
    expect(estado.total_rondas).toBe(1);
  });
});

/* =============================================================
   Grupo 5 — Estados de letra (acierto/error/pasapalabra)
   ============================================================= */

describe('aplicarAcierto', () => {
  it('letra pendiente → correcta', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.CORRECTA);
  });

  it('suma puntos al equipo actual', () => {
    const estado = estadoInicial();
    const config = configuracionValida({ puntos_por_acierto: 15 });
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
    expect(nuevo.puntos_equipo_1).toBe(15);
  });

  it('incrementa letras_completadas', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    expect(nuevo.letras_completadas_equipo_1).toBe(1);
  });

  it('letra ya correcta → no cambia', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    expect(nuevo.puntos_equipo_1).toBe(10);
  });

  it('letra incorrecta → no cambia', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarError(estado, 'A', configuracionValida());
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.INCORRECTA);
  });

  it('asigna la letra al equipo', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.equipo_asignado).toBe(1);
  });
});

describe('aplicarError', () => {
  it('letra pendiente → incorrecta', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.INCORRECTA);
  });

  it('aplica penalización', () => {
    const estado = estadoInicial({ puntos_por_acierto: 0 });
    const config = configuracionValida({ penalizacion_puntos: 10 });
    const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', config);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });

  it('penalización no baja de 0', () => {
    const estado = estadoInicial({ puntos_por_acierto: 0 });
    const config = configuracionValida({ penalizacion_puntos: 100 });
    const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', config);
    expect(nuevo.puntos_equipo_1).toBe(0);
  });

  it('letra ya correcta → no cambia', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.CORRECTA);
  });

  it('asigna la letra al equipo', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', configuracionValida());
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.equipo_asignado).toBe(1);
  });
});

describe('aplicarPasapalabra', () => {
  it('letra pendiente → pasada', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarPasapalabra(estado, 'A');
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.PASADA);
  });

  it('letra ya correcta → no cambia', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    const nuevo = RoscoGameDefinition.aplicarPasapalabra(estado, 'A');
    const letra = nuevo.rosco.find((l) => l.letra === 'A');
    expect(letra.estado).toBe(ESTADO_LETRA.CORRECTA);
  });

  it('no cambia puntos', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.aplicarPasapalabra(estado, 'A');
    expect(nuevo.puntos_equipo_1).toBe(0);
  });
});

/* =============================================================
   Grupo 6 — Avance de letra
   ============================================================= */

describe('avanzarLetra', () => {
  it('avanza a la siguiente letra', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.avanzarLetra(estado);
    expect(nuevo.indice_actual).toBe(1);
  });

  it('salta letras correctas', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'B', configuracionValida());
    const nuevo = RoscoGameDefinition.avanzarLetra(estado);
    expect(nuevo.rosco[nuevo.indice_actual].letra).toBe('C');
  });

  it('salta letras incorrectas', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarError(estado, 'A', configuracionValida());
    const nuevo = RoscoGameDefinition.avanzarLetra(estado);
    expect(nuevo.rosco[nuevo.indice_actual].letra).toBe('B');
  });

  it('si no hay pendientes frescas, va a pasadas', () => {
    let estado = estadoInicial();
    for (const letra of ALFABETO) {
      if (letra === 'Z') continue;
      estado = RoscoGameDefinition.aplicarAcierto(estado, letra, configuracionValida());
    }
    estado = RoscoGameDefinition.aplicarPasapalabra(estado, 'Z');
    estado = { ...estado, indice_actual: 25 };
    const nuevo = RoscoGameDefinition.avanzarLetra(estado);
    expect(nuevo.rosco[nuevo.indice_actual].letra).toBe('Z');
    expect(nuevo.rosco[nuevo.indice_actual].estado).toBe(ESTADO_LETRA.PASADA);
  });

  it('fin de ronda cuando no quedan pendientes ni pasadas', () => {
    let estado = estadoInicial();
    for (const letra of ALFABETO) {
      estado = RoscoGameDefinition.aplicarAcierto(estado, letra, configuracionValida());
    }
    estado = { ...estado, indice_actual: 26 };
    const nuevo = RoscoGameDefinition.avanzarLetra(estado);
    expect(nuevo.fase).toBe('FIN_DE_RONDA');
    expect(nuevo.turno_activo).toBe(false);
  });
});

/* =============================================================
   Grupo 7 — Cambio de turno
   ============================================================= */

describe('cambiarTurno', () => {
  it('cambia equipo de 1 a 2', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.cambiarTurno(estado);
    expect(nuevo.equipo_actual).toBe(2);
  });

  it('cambia equipo de 2 a 1', () => {
    const estado = estadoInicial({ rondas: 1 });
    estado.equipo_actual = 2;
    const nuevo = RoscoGameDefinition.cambiarTurno(estado);
    expect(nuevo.equipo_actual).toBe(1);
  });

  it('resetea indice_actual a 0', () => {
    const estado = estadoInicial();
    estado.indice_actual = 15;
    const nuevo = RoscoGameDefinition.cambiarTurno(estado);
    expect(nuevo.indice_actual).toBe(0);
  });

  it('fase = CAMBIO_TURNO', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.cambiarTurno(estado);
    expect(nuevo.fase).toBe('CAMBIO_TURNO');
  });

  it('turno_activo = false', () => {
    const estado = estadoInicial();
    const nuevo = RoscoGameDefinition.cambiarTurno(estado);
    expect(nuevo.turno_activo).toBe(false);
  });
});

/* =============================================================
   Grupo 8 — Reinicio entre rondas (cambio de set)
   ============================================================= */

describe('limpiarRoscoParaNuevaRonda', () => {
  it('todas las letras vuelven a pendiente', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarError(estado, 'B', configuracionValida());
    estado = RoscoGameDefinition.aplicarPasapalabra(estado, 'C');

    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);

    expect(nuevo.rosco.every((l) => l.estado === ESTADO_LETRA.PENDIENTE)).toBe(true);
  });

  it('incrementa ronda_actual', () => {
    const estado = estadoInicial();
    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);
    expect(nuevo.ronda_actual).toBe(2);
  });

  it('cambia set_ronda_actual al set de la nueva ronda', () => {
    const sets = generarSets(2);
    const estado = estadoInicial({ rondas: 2 }, sets);
    expect(estado.set_ronda_actual.id).toBe('set-1');

    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, sets[1]);
    expect(nuevo.set_ronda_actual.id).toBe('set-2');
    expect(nuevo.set_ronda_actual.items).toHaveLength(27);
    expect(nuevo.set_ronda_actual).not.toBe(estado.set_ronda_actual);
  });

  it('resetea equipo_actual a 1', () => {
    const estado = estadoInicial();
    estado.equipo_actual = 2;
    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);
    expect(nuevo.equipo_actual).toBe(1);
  });

  it('resetea indice_actual a 0', () => {
    const estado = estadoInicial();
    estado.indice_actual = 10;
    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);
    expect(nuevo.indice_actual).toBe(0);
  });

  it('preserva puntos entre rondas', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'B', configuracionValida());

    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);
    expect(nuevo.puntos_equipo_1).toBe(20);
  });

  it('fase = INICIO_RONDA', () => {
    const estado = estadoInicial();
    const set2 = generarSet('set-2');
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, set2);
    expect(nuevo.fase).toBe('INICIO_RONDA');
  });

  it('preserva sets_por_ronda (N sets intactos)', () => {
    const sets = generarSets(3);
    const estado = estadoInicial({ rondas: 3 }, sets);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, sets[1]);
    expect(nuevo.sets_por_ronda).toHaveLength(3);
    expect(nuevo.sets_por_ronda[2].id).toBe('set-3');
  });
});

/* =============================================================
   Grupo 9 — Puntuación y desempate
   ============================================================= */

describe('calcularPuntuacion', () => {
  it('devuelve puntos y letras completadas', () => {
    const estado = estadoInicial();
    const puntos = RoscoGameDefinition.calcularPuntuacion(estado, 1);
    expect(puntos).toEqual({ puntos: 0, letras_completadas: 0 });
  });

  it('refleja aciertos', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'B', configuracionValida());
    const puntos = RoscoGameDefinition.calcularPuntuacion(estado, 1);
    expect(puntos.puntos).toBe(20);
    expect(puntos.letras_completadas).toBe(2);
  });
});

describe('calcularResultado', () => {
  it('equipo 1 gana por puntos', () => {
    const estado = estadoInicial();
    estado.puntos_equipo_1 = 50;
    estado.puntos_equipo_2 = 30;
    const resultado = RoscoGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(1);
  });

  it('equipo 2 gana por puntos', () => {
    const estado = estadoInicial();
    estado.puntos_equipo_1 = 10;
    estado.puntos_equipo_2 = 40;
    const resultado = RoscoGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(2);
  });

  it('empate en puntos → desempate por letras completadas', () => {
    const estado = estadoInicial();
    estado.puntos_equipo_1 = 30;
    estado.puntos_equipo_2 = 30;
    estado.letras_completadas_equipo_1 = 5;
    estado.letras_completadas_equipo_2 = 3;
    const resultado = RoscoGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBe(1);
  });

  it('empate total → ganador null', () => {
    const estado = estadoInicial();
    const resultado = RoscoGameDefinition.calcularResultado(estado);
    expect(resultado.ganador).toBeNull();
  });

  it('estado null → error', () => {
    expect(() => RoscoGameDefinition.calcularResultado(null)).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 10 — aplicarTimeUp
   ============================================================= */

describe('aplicarTimeUp', () => {
  it('fase TURNO_ACTIVO → FIN_DE_RONDA', () => {
    const estado = estadoInicial();
    estado.fase = 'TURNO_ACTIVO';
    estado.turno_activo = true;
    const nuevo = RoscoGameDefinition.aplicarTimeUp(estado);
    expect(nuevo.fase).toBe('FIN_DE_RONDA');
    expect(nuevo.turno_activo).toBe(false);
  });

  it('fase FIN_DE_RONDA → sin cambios', () => {
    const estado = estadoInicial();
    estado.fase = 'FIN_DE_RONDA';
    const nuevo = RoscoGameDefinition.aplicarTimeUp(estado);
    expect(nuevo.fase).toBe('FIN_DE_RONDA');
  });

  it('fase FIN_DE_JUEGO → null', () => {
    const estado = estadoInicial();
    estado.fase = 'FIN_DE_JUEGO';
    expect(RoscoGameDefinition.aplicarTimeUp(estado)).toBeNull();
  });

  it('estado null → error', () => {
    expect(() => RoscoGameDefinition.aplicarTimeUp(null)).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 11 — validarEstadoJuego
   ============================================================= */

describe('validarEstadoJuego', () => {
  it('estado inicial válido → true', () => {
    const estado = estadoInicial();
    expect(RoscoGameDefinition.validarEstadoJuego(estado)).toBe(true);
  });

  it('estado con N sets → true', () => {
    const estado = estadoInicial({ rondas: 2 }, generarSets(2));
    expect(RoscoGameDefinition.validarEstadoJuego(estado)).toBe(true);
  });

  it('estado null → error', () => {
    expect(() => RoscoGameDefinition.validarEstadoJuego(null)).toThrow(ValidacionError);
  });

  it('ronda_actual inválida → error', () => {
    const estado = estadoInicial();
    estado.ronda_actual = 0;
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });

  it('total_rondas inválido → error', () => {
    const estado = estadoInicial();
    estado.total_rondas = 0;
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });

  it('rosco sin 27 letras → error', () => {
    const estado = estadoInicial();
    estado.rosco = estado.rosco.slice(0, 10);
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });

  it('sets_por_ronda no array → error', () => {
    const estado = estadoInicial();
    estado.sets_por_ronda = 'nope';
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow('sets_por_ronda');
  });

  it('sets_por_ronda vacío → error', () => {
    const estado = estadoInicial();
    estado.sets_por_ronda = [];
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow('sets_por_ronda');
  });

  it('set_ronda_actual ausente → error', () => {
    const estado = estadoInicial();
    estado.set_ronda_actual = null;
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow('set_ronda_actual');
  });

  it('equipo_actual inválido → error', () => {
    const estado = estadoInicial();
    estado.equipo_actual = 3;
    expect(() => RoscoGameDefinition.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });
});

/* =============================================================
   Grupo 12 — validarSetsElegidos
   ============================================================= */

describe('validarSetsElegidos', () => {
  it('N sets válidos con config.rondas = N → ok', () => {
    const sets = generarSets(3);
    const config = configuracionValida({ rondas: 3 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('1 set válido con rondas=1 → ok', () => {
    const sets = [generarSet('s1')];
    const config = configuracionValida({ rondas: 1 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(true);
  });

  it('sets no array → error', () => {
    const resultado = RoscoGameDefinition.validarSetsElegidos('nope', configuracionValida());
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0]).toContain('array');
  });

  it('cantidad distinta a rondas → error', () => {
    const sets = generarSets(2);
    const config = configuracionValida({ rondas: 3 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 3'))).toBe(true);
  });

  it('más sets que rondas → error', () => {
    const sets = generarSets(3);
    const config = configuracionValida({ rondas: 2 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('exactamente 2'))).toBe(true);
  });

  it('set inválido (items incompletos) → error con prefijo Set N', () => {
    const sets = [
      generarSet('s1'),
      { id: 's2', items: generarItemsValidos().slice(0, 10) }
    ];
    const config = configuracionValida({ rondas: 2 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.startsWith('Set 2:'))).toBe(true);
    expect(resultado.errores.some((e) => e.includes('exactamente 27'))).toBe(true);
  });

  it('set no objeto → error', () => {
    const sets = [null];
    const config = configuracionValida({ rondas: 1 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('sets[0]'))).toBe(true);
  });

  it('múltiples sets inválidos → lista errores de todos', () => {
    const sets = [
      { id: 'a', items: [] },
      { id: 'b', items: [] }
    ];
    const config = configuracionValida({ rondas: 2 });
    const resultado = RoscoGameDefinition.validarSetsElegidos(sets, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.startsWith('Set 1:'))).toBe(true);
    expect(resultado.errores.some((e) => e.startsWith('Set 2:'))).toBe(true);
  });
});

/* =============================================================
   Grupo 13 — Integración con GameDefinitionRegistry
   ============================================================= */

describe('integración con GameDefinitionRegistry', () => {
  it('registrar en registry funciona', () => {
    const registry = new GameDefinitionRegistry();
    registry.registrar(RoscoGameDefinition);
    expect(registry.existe('ROSCO')).toBe(true);
    expect(registry.obtener('ROSCO')).toBe(RoscoGameDefinition);
  });

  it('validarRequerimientos → ROSCO requiere snapshot_id', () => {
    const registry = new GameDefinitionRegistry();
    registry.registrar(RoscoGameDefinition);
    expect(() => registry.validarRequerimientos('ROSCO', {})).toThrow();
    expect(registry.validarRequerimientos('ROSCO', { snapshot_id: 's1' })).toBe(true);
  });

  it('contrato mínimo presente (incluye validarSetsElegidos)', () => {
    expect(typeof RoscoGameDefinition.validarConfiguracion).toBe('function');
    expect(typeof RoscoGameDefinition.validarContenidoSet).toBe('function');
    expect(typeof RoscoGameDefinition.validarEstadoJuego).toBe('function');
    expect(typeof RoscoGameDefinition.validarSetsElegidos).toBe('function');
    expect(typeof RoscoGameDefinition.calcularResultado).toBe('function');
    expect(typeof RoscoGameDefinition.aplicarTimeUp).toBe('function');
  });
});
