import { describe, it, expect } from 'vitest';
import { HistoriaEnredadaGameDefinition, FASES } from '../../../../src/games/historia-enredada/HistoriaEnredadaGameDefinition.js';
import { ValidacionError } from '../../../../src/repositories/errors.js';

const def = HistoriaEnredadaGameDefinition;

describe('HistoriaEnredadaGameDefinition - contrato', () => {
  it('código correcto', () => {
    expect(def.codigo).toBe('HISTORIA_ENREDADA');
  });

  it('requiere set', () => {
    expect(def.requiere_set).toBe(true);
  });

  it('FASES correctas', () => {
    expect(FASES).toEqual([
      'INICIO_RONDA',
      'SELECCIONANDO_HISTORIA',
      'PREPARANDO',
      'ACTUANDO',
      'VOTANDO',
      'FIN_DE_RONDA',
      'FIN_DE_JUEGO'
    ]);
  });

  it('tiene métodos esperados', () => {
    const metodos = [
      'validarConfiguracion',
      'validarContenidoSet',
      'estadoInicial',
      'iniciarRonda',
      'seleccionarHistoria',
      'empezarActuacion',
      'empezarVotacion',
      'asignarPuntos',
      'avanzarEquipo',
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
});

describe('validarConfiguracion', () => {
  it('config válida', () => {
    expect(() => def.validarConfiguracion({ rondas: 1, puntos_por_historia: 10 })).not.toThrow();
  });

  it('config null', () => {
    expect(() => def.validarConfiguracion(null)).toThrow(ValidacionError);
  });

  it('rondas inválida', () => {
    expect(() => def.validarConfiguracion({ rondas: 0 })).toThrow(ValidacionError);
  });

  it('puntos negativos', () => {
    expect(() => def.validarConfiguracion({ rondas: 1, puntos_por_historia: -1 })).toThrow(ValidacionError);
  });
});

describe('validarContenidoSet', () => {
  const config = { rondas: 1 };

  it('set válido con 1 historia', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
  });

  it('set válido con N historias', () => {
    const contenido = { items: [
      { titulo: 'A', descripcion: 'd', guion: 'g' },
      { titulo: 'B', descripcion: 'd2', guion: 'g2' }
    ]};
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
  });

  it('set vacío', () => {
    const res = def.validarContenidoSet({ items: [] }, config);
    expect(res.ok).toBe(false);
  });

  it('item sin titulo', () => {
    const contenido = { items: [{ descripcion: 'd', guion: 'g' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
  });

  it('item sin descripcion', () => {
    const contenido = { items: [{ titulo: 'A', guion: 'g' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
  });

  it('item sin guion', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
  });

  it('campos vacíos', () => {
    const contenido = { items: [{ titulo: ' ', descripcion: '', guion: ' ' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
  });

  it('item con dibujo válido (string no vacío) → válido', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: 'ref-abc-123' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
    expect(res.errores).toEqual([]);
  });

  it('item sin dibujo → válido', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
  });

  it('item con dibujo: null → válido (tratado como ausente)', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: null }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
  });

  it('item con dibujo: undefined → válido (tratado como ausente)', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: undefined }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(true);
  });

  it('item con dibujo vacío → error', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: '' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
    expect(res.errores[0]).toContain('items[0].dibujo');
  });

  it('item con dibujo solo whitespace → error', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: '   ' }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
    expect(res.errores[0]).toContain('items[0].dibujo');
  });

  it('item con dibujo no-string → error', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: 123 }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
    expect(res.errores[0]).toContain('items[0].dibujo');
  });

  it('item con dibujo booleano → error', () => {
    const contenido = { items: [{ titulo: 'A', descripcion: 'd', guion: 'g', dibujo: true }] };
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
    expect(res.errores[0]).toContain('items[0].dibujo');
  });

  it('mixto: un item con dibujo inválido falla, el resto no agrega errores', () => {
    const contenido = { items: [
      { titulo: 'A', descripcion: 'd', guion: 'g', dibujo: 'ok-ref' },
      { titulo: 'B', descripcion: 'd', guion: 'g' },
      { titulo: 'C', descripcion: 'd', guion: 'g', dibujo: '' }
    ]};
    const res = def.validarContenidoSet(contenido, config);
    expect(res.ok).toBe(false);
    expect(res.errores).toHaveLength(1);
    expect(res.errores[0]).toContain('items[2].dibujo');
  });
});

describe('estadoInicial', () => {
  it('valores por defecto', () => {
    const estado = def.estadoInicial({ rondas: 2 });
    expect(estado.ronda_actual).toBe(1);
    expect(estado.total_rondas).toBe(2);
    expect(estado.fase).toBe('INICIO_RONDA');
    expect(estado.equipo_actual).toBe(1);
    expect(estado.historias_usadas).toEqual([]);
    expect(estado.puntos_equipo_1).toBe(0);
    expect(estado.puntos_equipo_2).toBe(0);
  });
});

describe('flujo de ronda', () => {
  const set = {
    items: [
      { id: 'h1', titulo: 'H1', descripcion: 'd', guion: 'g' },
      { id: 'h2', titulo: 'H2', descripcion: 'd', guion: 'g' }
    ]
  };
  let estado;

  it('iniciarRonda → SELECCIONANDO_HISTORIA', () => {
    estado = def.estadoInicial({ rondas: 1 });
    estado = def.iniciarRonda(estado);
    expect(estado.fase).toBe('SELECCIONANDO_HISTORIA');
  });

  it('seleccionarHistoria Eq1 → PREPARANDO', () => {
    estado = def.seleccionarHistoria(estado, 'h1', set);
    expect(estado.fase).toBe('PREPARANDO');
    expect(estado.historia_elegida_id).toBe('h1');
    expect(estado.historias_usadas).toContain('h1');
  });

  it('empezarActuacion → ACTUANDO', () => {
    estado = def.empezarActuacion(estado);
    expect(estado.fase).toBe('ACTUANDO');
  });

  it('empezarVotacion → VOTANDO', () => {
    estado = def.empezarVotacion(estado);
    expect(estado.fase).toBe('VOTANDO');
  });

  it('asignarPuntos Eq1 → Eq2 SELECCIONANDO_HISTORIA', () => {
    estado = def.asignarPuntos(estado, {}, 10);
    expect(estado.puntos_equipo_1).toBe(10);
    expect(estado.equipo_actual).toBe(2);
    expect(estado.fase).toBe('SELECCIONANDO_HISTORIA');
    expect(estado.historia_elegida_id).toBeNull();
  });

  it('seleccionarHistoria Eq2 → PREPARANDO', () => {
    estado = def.seleccionarHistoria(estado, 'h2', set);
    expect(estado.fase).toBe('PREPARANDO');
    expect(estado.historia_elegida_id).toBe('h2');
  });

  it('completa Eq2 → FIN_DE_RONDA', () => {
    estado = def.empezarActuacion(estado);
    estado = def.empezarVotacion(estado);
    estado = def.asignarPuntos(estado, {}, 8);
    expect(estado.puntos_equipo_2).toBe(8);
    expect(estado.fase).toBe('FIN_DE_RONDA');
  });
});

describe('no repetir historias', () => {
  const set = { items: [{ id: 'h1', titulo: 'H1', descripcion: 'd', guion: 'g' }] };
  it('seleccionar historia usada lanza error', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    const s1 = def.seleccionarHistoria(estado, 'h1', set);
    expect(() => def.seleccionarHistoria(s1, 'h1', set)).toThrow(ValidacionError);
  });

  it('historia inexistente lanza error', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    expect(() => def.seleccionarHistoria(estado, 'noexiste', set)).toThrow(ValidacionError);
  });
});

describe('múltiples rondas', () => {
  const set = {
    items: [
      { id: 'h1', titulo: 'H1', descripcion: 'd', guion: 'g' },
      { id: 'h2', titulo: 'H2', descripcion: 'd', guion: 'g' },
      { id: 'h3', titulo: 'H3', descripcion: 'd', guion: 'g' },
      { id: 'h4', titulo: 'H4', descripcion: 'd', guion: 'g' }
    ]
  };
  it('iniciarSiguienteRonda avanza y resetea equipo', () => {
    let estado = def.estadoInicial({ rondas: 2 });
    estado = def.iniciarRonda(estado);
    estado = def.seleccionarHistoria(estado, 'h1', set);
    estado = def.asignarPuntos(estado, {}, 5); // Eq1
    estado = def.seleccionarHistoria(estado, 'h2', set);
    estado = def.asignarPuntos(estado, {}, 5); // Eq2 → FIN_DE_RONDA
    estado = def.iniciarSiguienteRonda(estado, { rondas: 2 });
    expect(estado.ronda_actual).toBe(2);
    expect(estado.equipo_actual).toBe(1);
    expect(estado.fase).toBe('INICIO_RONDA');
    expect(estado.historias_usadas).toEqual(['h1','h2']);
  });
});

describe('puntuación', () => {
  it('asignarPuntos suma al equipo correcto', () => {
    let estado = def.estadoInicial({ rondas: 1 });
    estado = def.iniciarRonda(estado);
    estado.equipo_actual = 1;
    estado = def.asignarPuntos(estado, {}, 7);
    expect(estado.puntos_equipo_1).toBe(7);
  });

  it('puntos negativos lanza error', () => {
    let estado = def.estadoInicial({ rondas: 1 });
    expect(() => def.asignarPuntos(estado, {}, -1)).toThrow(ValidacionError);
  });
});

describe('resultado', () => {
  it('mayor puntaje → ganador', () => {
    const estado = { puntos_equipo_1: 10, puntos_equipo_2: 5 };
    const res = def.calcularResultado(estado, {});
    expect(res.ganador).toBe(1);
  });

  it('empate → null', () => {
    const estado = { puntos_equipo_1: 10, puntos_equipo_2: 10 };
    const res = def.calcularResultado(estado, {});
    expect(res.ganador).toBeNull();
  });
});

describe('inmutabilidad', () => {
  it('reducers no mutan estado original', () => {
    const original = def.estadoInicial({ rondas: 1 });
    const copy = JSON.parse(JSON.stringify(original));
    const nuevo = def.iniciarRonda(original);
    expect(original).toEqual(copy);
    expect(nuevo.fase).toBe('SELECCIONANDO_HISTORIA');
  });

  it('mismo input → mismo output', () => {
    const original = def.estadoInicial({ rondas: 1 });
    const a = def.iniciarRonda(original);
    const b = def.iniciarRonda(original);
    expect(a).toEqual(b);
  });
});

describe('validarEstadoJuego', () => {
  it('estado válido', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    expect(() => def.validarEstadoJuego(estado)).not.toThrow();
  });

  it('fase inválida', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    estado.fase = 'FASE_INVALIDA';
    expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });

  it('equipo inválido', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    estado.equipo_actual = 3;
    expect(() => def.validarEstadoJuego(estado)).toThrow(ValidacionError);
  });
});

describe('avanzarEquipo', () => {
  it('1 → 2 y fase SELECCIONANDO_HISTORIA', () => {
    let estado = def.estadoInicial({ rondas: 1 });
    estado.equipo_actual = 1;
    estado = def.avanzarEquipo(estado);
    expect(estado.equipo_actual).toBe(2);
    expect(estado.fase).toBe('SELECCIONANDO_HISTORIA');
  });

  it('2 → FIN_DE_RONDA', () => {
    let estado = def.estadoInicial({ rondas: 1 });
    estado.equipo_actual = 2;
    estado = def.avanzarEquipo(estado);
    expect(estado.fase).toBe('FIN_DE_RONDA');
  });
});

describe('calcularPuntuacion', () => {
  it('retorna puntos del equipo', () => {
    const estado = { puntos_equipo_1: 5, puntos_equipo_2: 8 };
    expect(def.calcularPuntuacion(estado, 1).puntos).toBe(5);
    expect(def.calcularPuntuacion(estado, 2).puntos).toBe(8);
  });
});

describe('aplicarTimeUp', () => {
  it('retorna null', () => {
    const estado = def.estadoInicial({ rondas: 1 });
    expect(def.aplicarTimeUp(estado)).toBeNull();
  });
});

describe('defaultConfig', () => {
  it('tiene rondas y puntos_por_historia', () => {
    expect(def.defaultConfig.rondas).toBe(1);
    expect(def.defaultConfig.puntos_por_historia).toBe(10);
  });
});

