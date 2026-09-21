import { describe, it, expect } from 'vitest';
import { CancionIncompletaGameDefinition, FASES } from '../../../../src/games/cancion-incompleta/CancionIncompletaGameDefinition.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

describe('CancionIncompletaGameDefinition', () => {
  it('tiene código y nombre correctos', () => {
    expect(CancionIncompletaGameDefinition.codigo).toBe('CANCION_INCOMPLETA');
    expect(CancionIncompletaGameDefinition.nombre).toBe('Canción Incompleta');
    expect(CancionIncompletaGameDefinition.requiere_set).toBe(false);
  });

  it('valida configuración válida', () => {
    expect(() => CancionIncompletaGameDefinition.validarConfiguracion({
      rondas: 1,
      segundos_por_cancion: 60,
      puntos_por_acierto: 10,
      penalizacion_puntos: 0
    })).not.toThrow();
  });

  it('lanza error por configuración inválida', () => {
    expect(() => CancionIncompletaGameDefinition.validarConfiguracion({ rondas: 0 })).toThrow(ValidacionError);
    expect(() => CancionIncompletaGameDefinition.validarConfiguracion({ segundos_por_cancion: 0 })).toThrow(ValidacionError);
  });

  it('validarContenidoSet siempre ok', () => {
    const res = CancionIncompletaGameDefinition.validarContenidoSet({}, {});
    expect(res.ok).toBe(true);
    expect(res.errores).toEqual([]);
  });

  it('estadoInicial crea estado correcto', () => {
    const estado = CancionIncompletaGameDefinition.estadoInicial({ rondas: 2, segundos_por_cancion: 45 });
    expect(estado.ronda_actual).toBe(1);
    expect(estado.total_rondas).toBe(2);
    expect(estado.equipo_actual).toBe(1);
    expect(estado.cancion_actual).toBe(1);
    expect(estado.fase).toBe('INICIO_RONDA');
    expect(estado.puntos_equipo_1).toBe(0);
  });

  it('iniciarTurno activa turno', () => {
    const estado = CancionIncompletaGameDefinition.estadoInicial({});
    const nuevo = CancionIncompletaGameDefinition.iniciarTurno(estado);
    expect(nuevo.fase).toBe('TURNO_ACTIVO');
    expect(nuevo.turno_activo).toBe(true);
  });

  it('aplicarAcierto suma puntos y avanza', () => {
    const estado = CancionIncompletaGameDefinition.estadoInicial({ rondas: 1, puntos_por_acierto: 10 });
    const s1 = CancionIncompletaGameDefinition.iniciarTurno(estado);
    const s2 = CancionIncompletaGameDefinition.aplicarAcierto(s1, { puntos_por_acierto: 10 });
    expect(s2.puntos_equipo_1).toBe(10);
    expect(s2.cancion_actual).toBe(2);
    expect(s2.equipo_actual).toBe(2);
  });

  it('aplicarError no suma puntos y avanza', () => {
    const estado = CancionIncompletaGameDefinition.estadoInicial({ rondas: 1, penalizacion_puntos: 5 });
    const s1 = CancionIncompletaGameDefinition.iniciarTurno(estado);
    const s2 = CancionIncompletaGameDefinition.aplicarError(s1, { penalizacion_puntos: 5 });
    expect(s2.puntos_equipo_1).toBe(0);
    expect(s2.equipo_actual).toBe(2);
  });

  it('avanzarCancion termina juego al completar últimas rondas', () => {
    let estado = CancionIncompletaGameDefinition.estadoInicial({ rondas: 1 });
    estado = { ...estado, cancion_actual: 2, equipo_actual: 2 };
    const final = CancionIncompletaGameDefinition.avanzarCancion(estado);
    expect(final.fase).toBe('FIN_DE_JUEGO');
  });

  it('calcularResultado con empate devuelve ganador null', () => {
    const estado = { puntos_equipo_1: 10, puntos_equipo_2: 10 };
    const res = CancionIncompletaGameDefinition.calcularResultado(estado);
    expect(res.ganador).toBeNull();
  });

  it('validarEstadoJuego lanza por estado inválido', () => {
    expect(() => CancionIncompletaGameDefinition.validarEstadoJuego({})).toThrow(ValidacionError);
  });

  it('aplicarTimeUp avanza como error', () => {
    const estado = CancionIncompletaGameDefinition.estadoInicial({ rondas: 1 });
    const s1 = CancionIncompletaGameDefinition.iniciarTurno(estado);
    const s2 = CancionIncompletaGameDefinition.aplicarTimeUp(s1);
    expect(s2).not.toBeNull();
    expect(s2.equipo_actual).toBe(2);
  });

  it('FASES contiene valores esperados', () => {
    expect(FASES).toContain('INICIO_RONDA');
    expect(FASES).toContain('TURNO_ACTIVO');
    expect(FASES).toContain('FIN_DE_JUEGO');
  });
});
