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

function generarItemsValidos(rondas = 2) {
  const items = [];
  for (const letra of ALFABETO) {
    for (let r = 0; r < rondas; r++) {
      items.push({
        letra,
        definicion: `Definición de ${letra} (ronda ${r + 1})`,
        respuesta: `Respuesta ${letra} ${r + 1}`
      });
    }
  }
  return items;
}

function contenidoValido(rondas = 2) {
  return { items: generarItemsValidos(rondas) };
}

function estadoInicial(configOverrides = {}) {
  return RoscoGameDefinition.estadoInicial(configuracionValida(configOverrides));
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
});

/* =============================================================
   Grupo 3 — validarContenidoSet
   ============================================================= */

describe('validarContenidoSet', () => {
  it('set válido (27 letras, 2 items cada una) → ok', () => {
    const config = configuracionValida({ rondas: 2 });
    const resultado = RoscoGameDefinition.validarContenidoSet(contenidoValido(2), config);
    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('set con 1 ronda y 27 items → ok', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = ALFABETO.map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(true);
    expect(resultado.errores).toHaveLength(0);
  });

  it('set vacío → error', () => {
    const config = configuracionValida();
    const resultado = RoscoGameDefinition.validarContenidoSet({ items: [] }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.length).toBeGreaterThan(0);
  });

  it('set null → error', () => {
    const config = configuracionValida();
    const resultado = RoscoGameDefinition.validarContenidoSet(null, config);
    expect(resultado.ok).toBe(false);
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
    expect(resultado.errores.some((e) => e.includes('"M"'))).toBe(true);
  });

  it('letra con menos de N items → error listando letra y déficit', () => {
    const config = configuracionValida({ rondas: 3 });
    const items = ALFABETO.map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('tiene 1 item(s)') && e.includes('necesitan al menos 3'))).toBe(true);
  });

  it('item con letra inválida → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = [
      ...ALFABETO.map((letra) => ({ letra, definicion: `Def ${letra}`, respuesta: `Resp ${letra}` })),
      { letra: '!', definicion: 'Inválida', respuesta: 'X' }
    ];
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('"!"'))).toBe(true);
  });

  it('item con definicion vacía → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = ALFABETO.map((letra) => ({
      letra,
      definicion: letra === 'A' ? '' : `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('definicion'))).toBe(true);
  });

  it('item con respuesta vacía → error', () => {
    const config = configuracionValida({ rondas: 1 });
    const items = ALFABETO.map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: letra === 'Z' ? '' : `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.some((e) => e.includes('respuesta'))).toBe(true);
  });

  itemsPorLetra: it('múltiples letras con déficit → lista todas', () => {
    const config = configuracionValida({ rondas: 2 });
    const items = ALFABETO.map((letra) => ({
      letra,
      definicion: `Def ${letra}`,
      respuesta: `Resp ${letra}`
    }));
    const resultado = RoscoGameDefinition.validarContenidoSet({ items }, config);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores.length).toBe(27);
  });
});

/* =============================================================
   Grupo 4 — estadoInicial
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
   Grupo 8 — Reinicio entre rondas
   ============================================================= */

describe('limpiarRoscoParaNuevaRonda', () => {
  it('todas las letras vuelven a pendiente', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarError(estado, 'B', configuracionValida());
    estado = RoscoGameDefinition.aplicarPasapalabra(estado, 'C');

    const config = configuracionValida({ rondas: 2 });
    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);

    expect(nuevo.rosco.every((l) => l.estado === ESTADO_LETRA.PENDIENTE)).toBe(true);
  });

  it('incrementa ronda_actual', () => {
    const estado = estadoInicial();
    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);
    expect(nuevo.ronda_actual).toBe(2);
  });

  it('resetea equipo_actual a 1', () => {
    const estado = estadoInicial();
    estado.equipo_actual = 2;
    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);
    expect(nuevo.equipo_actual).toBe(1);
  });

  it('resetea indice_actual a 0', () => {
    const estado = estadoInicial();
    estado.indice_actual = 10;
    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);
    expect(nuevo.indice_actual).toBe(0);
  });

  it('preserva puntos entre rondas', () => {
    let estado = estadoInicial();
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', configuracionValida());
    estado = RoscoGameDefinition.aplicarAcierto(estado, 'B', configuracionValida());

    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);
    expect(nuevo.puntos_equipo_1).toBe(20);
  });

  it('fase = INICIO_RONDA', () => {
    const estado = estadoInicial();
    const contenido = contenidoValido(2);
    const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenido);
    expect(nuevo.fase).toBe('INICIO_RONDA');
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
   Grupo 11 — Integración con GameDefinitionRegistry
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
});
