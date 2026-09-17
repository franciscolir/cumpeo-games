import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const describeSiCredenciales = TIENE_CREDENCIALES ? describe : describe.skip;

let adapter;

beforeAll(async () => {
  if (!TIENE_CREDENCIALES) return;
  adapter = new SupabaseAdapter();
  await adapter.abrir();
});

afterAll(async () => {
  if (adapter) await adapter.cerrar();
});

/* =============================================================
   Helper: crear escenario de prueba completo
   ============================================================= */
async function crearEscenario(actionPrefix) {
  const ts = Date.now();

  // 1. Crear juego
  const juegoRows = await adapter.insert('juegos', {
    codigo: `${actionPrefix}_JUEGO_${ts}`,
    nombre: 'Trivia Test',
    requiere_set: true,
    activo: true
  }, { returning: 'id, codigo' });
  const juegoId = juegoRows[0].id;

  // 2. Crear set con items
  const setRows = await adapter.insert('sets', {
    juego_id: juegoId,
    nombre: `${actionPrefix}_SET_${ts}`,
    version: 1,
    activo: true
  }, { returning: 'id, nombre' });
  const setId = setRows[0].id;

  await adapter.insert('item_sets', [
    { set_id: setId, orden: 1, contenido: { pregunta: 'P1', opciones: ['A', 'B'], respuesta_correcta_index: 0 } },
    { set_id: setId, orden: 2, contenido: { pregunta: 'P2', opciones: ['C', 'D'], respuesta_correcta_index: 1 } }
  ]);

  // 3. Crear snapshot
  const snapResult = await adapter.rpc('crear_snapshot', {
    p_set_id: setId,
    p_action_id: `${actionPrefix}_SNAP_${ts}`
  });
  const snapshotId = snapResult.snapshot_id;

  // 4. Crear circuito LISTO
  const circuitoRows = await adapter.insert('circuitos', {
    nombre: `${actionPrefix}_CIRCUITO_${ts}`,
    estado: 'LISTO',
    version: 1
  }, { returning: 'id, nombre' });
  const circuitoId = circuitoRows[0].id;

  // 5. Crear 2 equipo_circuitos
  await adapter.insert('equipo_circuitos', [
    { circuito_id: circuitoId, posicion: 1, nombre: 'Rojo', color: '#FF0000' },
    { circuito_id: circuitoId, posicion: 2, nombre: 'Azul', color: '#0000FF' }
  ]);

  // 6. Crear circuito_juego con snapshot
  await adapter.insert('circuito_juegos', {
    circuito_id: circuitoId,
    juego_id: juegoId,
    orden: 1,
    configuracion: { rondas: 1 },
    snapshot_id: snapshotId
  });

  return { juegoId, setId, snapshotId, circuitoId };
}

async function limpiarEscenario(escenario) {
  if (!escenario || !adapter) return;
  const { circuitoId, setId, juegoId } = escenario;
  try {
    await adapter.query('circuito_juegos', { eq: { circuito_id: circuitoId } });
    const cjRows = await adapter.query('circuito_juegos', { eq: { circuito_id: circuitoId } });
    for (const cj of cjRows) {
      await adapter.query('juego_ejecutados', { eq: { circuito_juego_id: cj.id } });
      const jeRows = await adapter.query('juego_ejecutados', { eq: { circuito_juego_id: cj.id } });
      for (const je of jeRows) {
        await adapter.query('participante_partidas', { eq: { partida_id: je.partida_id } });
        const ppRows = await adapter.query('participante_partidas', { eq: { partida_id: je.partida_id } });
        for (const pp of ppRows) {
          await adapter.delete('extra_usos', { eq: { participante_partida_id: pp.id } });
        }
        await adapter.delete('participante_partidas', { eq: { partida_id: je.partida_id } });
        await adapter.delete('equipo_partidas', { eq: { partida_id: je.partida_id } });
        await adapter.delete('control_partidas', { eq: { partida_id: je.partida_id } });
        await adapter.delete('accion_procesadas', { eq: { partida_id: je.partida_id } });
        await adapter.delete('partidas', { eq: { id: je.partida_id } });
      }
      await adapter.delete('juego_ejecutados', { eq: { circuito_juego_id: cj.id } });
    }
    await adapter.delete('circuito_juegos', { eq: { circuito_id: circuitoId } });
    await adapter.delete('equipo_circuitos', { eq: { circuito_id: circuitoId } });
    await adapter.delete('circuitos', { eq: { id: circuitoId } });
    await adapter.delete('set_snapshots', { eq: { source_set_id: setId } });
    await adapter.delete('item_sets', { eq: { set_id: setId } });
    await adapter.delete('sets', { eq: { id: setId } });
    await adapter.delete('juegos', { eq: { id: juegoId } });
  } catch (e) {
    console.warn('Limpieza parcial:', e.message);
  }
}

/* =============================================================
   Grupo 1: Idempotencia y Control
   ============================================================= */
describeSiCredenciales.sequential('Funciones de control — reservar_accion y tomar_control', () => {
  it('reservar_accion crea acción nueva', async () => {
    const actionId = `TEST_CTRL_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const r = await adapter.rpc('reservar_accion', {
      p_action_id: actionId,
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    expect(r.ok).toBe(true);
    expect(r.yaProcesada).toBe(false);
  });

  it('reservar_accion es idempotente', async () => {
    await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_CTRL_002',
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    const r2 = await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_CTRL_002',
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    expect(r2.yaProcesada).toBe(true);
  });

  it('reservar_accion rechaza action_id vacío', async () => {
    const r = await adapter.rpc('reservar_accion', {
      p_action_id: '',
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/action_id/);
  });

  it('tomar_control adquiere lease', async () => {
    const esc = await crearEscenario('TC01');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_TC01',
        p_session_id: 'session_abc',
        p_action_id: 'TEST_TC_CREAR_001'
      });
      expect(crear.ok).toBe(true);

      const r = await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 'session_abc'
      });
      expect(r.ok).toBe(true);
      expect(r.session_id).toBe('session_abc');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('tomar_control rechaza si ocupado por otra sesión', async () => {
    const esc = await crearEscenario('TC02');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_TC02',
        p_session_id: 'session_a',
        p_action_id: 'TEST_TC_CREAR_002'
      });
      expect(crear.ok).toBe(true);

      await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 'session_a'
      });

      const r = await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 'session_b'
      });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('control_ocupado');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('tomar_control permite a la misma sesión renovar', async () => {
    const esc = await crearEscenario('TC03');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_TC03',
        p_session_id: 'session_x',
        p_action_id: 'TEST_TC_CREAR_003'
      });
      expect(crear.ok).toBe(true);

      await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 'session_x'
      });

      const r = await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 'session_x'
      });
      expect(r.ok).toBe(true);
      expect(r.renewed).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('actualizar_resultado_accion guarda resultado', async () => {
    await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_AR_001',
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    await adapter.rpc('actualizar_resultado_accion', {
      p_action_id: 'TEST_AR_001',
      p_resultado: { ok: true, custom: 'data' }
    });
    const r2 = await adapter.rpc('reservar_accion', {
      p_action_id: 'TEST_AR_001',
      p_partida_id: null,
      p_tipo_accion: 'TEST_CTRL'
    });
    expect(r2.yaProcesada).toBe(true);
    expect(r2.resultado.custom).toBe('data');
  });
});

/* =============================================================
   Grupo 2: Ciclo de vida de partida
   ============================================================= */
describeSiCredenciales.sequential('Funciones de partida — crear, comenzar, descartar', () => {
  it('crear_partida crea partida + hijos', async () => {
    const esc = await crearEscenario('CP01');
    try {
      const r = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_CP01',
        p_session_id: 's1',
        p_action_id: 'TEST_CP_001'
      });
      expect(r.ok).toBe(true);
      expect(r.partida_id).toBeDefined();
      expect(r.estado).toBe('CONFIGURANDO');

      const eps = await adapter.query('equipo_partidas', { eq: { partida_id: r.partida_id } });
      expect(eps.length).toBe(2);

      const ctrl = await adapter.query('control_partidas', { eq: { partida_id: r.partida_id } });
      expect(ctrl.length).toBe(1);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('crear_partida es idempotente', async () => {
    const esc = await crearEscenario('CP02');
    try {
      const r1 = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_CP02',
        p_session_id: 's1',
        p_action_id: 'TEST_CP_002'
      });
      const r2 = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_CP02',
        p_session_id: 's1',
        p_action_id: 'TEST_CP_002'
      });
      expect(r2.ok).toBe(true);
      expect(r2.partida_id).toBe(r1.partida_id);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('crear_partida rechaza public_codigo duplicado', async () => {
    const esc = await crearEscenario('CP03');
    try {
      await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_CP03',
        p_session_id: 's1',
        p_action_id: 'TEST_CP_003A'
      });
      const r = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_CP03',
        p_session_id: 's1',
        p_action_id: 'TEST_CP_003B'
      });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('public_codigo_duplicado');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('comenzar_partida cambia a EN_CURSO', async () => {
    const esc = await crearEscenario('BP01');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_BP01',
        p_session_id: 's1',
        p_action_id: 'TEST_BP_CREAR_001'
      });
      expect(crear.ok).toBe(true);

      await adapter.rpc('tomar_control', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1'
      });

      const r = await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_BP_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('EN_CURSO');

      const je = await adapter.query('juego_ejecutados', { eq: { partida_id: crear.partida_id } });
      expect(je.length).toBeGreaterThan(0);
      expect(je[0].estado).toBe('PENDIENTE');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('comenzar_partida falla sin control', async () => {
    const esc = await crearEscenario('BP02');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_BP02',
        p_session_id: 's1',
        p_action_id: 'TEST_BP_CREAR_002'
      });
      expect(crear.ok).toBe(true);

      const r = await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's_wrong',
        p_action_id: 'TEST_BP_002'
      });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/control/);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('descartar_partida marca juegos como NO_JUGADO', async () => {
    const esc = await crearEscenario('DP01');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_DP01',
        p_session_id: 's1',
        p_action_id: 'TEST_DP_CREAR_001'
      });
      await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
      await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_DP_COMENZAR_001'
      });

      const r = await adapter.rpc('descartar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_DP_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('DESCARTADA');

      const je = await adapter.query('juego_ejecutados', { eq: { partida_id: crear.partida_id } });
      expect(je.every(j => j.estado === 'NO_JUGADO')).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });
});

/* =============================================================
   Grupo 3: Ciclo de vida de juego
   ============================================================= */
describeSiCredenciales.sequential('Funciones de juego — iniciar, pausar, reanudar', () => {
  async function prepararJuego(prefix) {
    const esc = await crearEscenario(prefix);
    const crear = await adapter.rpc('crear_partida', {
      p_circuito_id: esc.circuitoId,
      p_public_codigo: `TST_${prefix}`,
      p_session_id: 's1',
      p_action_id: `${prefix}_CREAR`
    });
    await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
    await adapter.rpc('comenzar_partida', {
      p_partida_id: crear.partida_id,
      p_session_id: 's1',
      p_action_id: `${prefix}_COMENZAR`
    });
    const jes = await adapter.query('juego_ejecutados', { eq: { partida_id: crear.partida_id } });
    return { esc, partidaId: crear.partida_id, juegoEjecutadoId: jes[0].id };
  }

  it('iniciar_juego cambia a EN_CURSO', async () => {
    const { esc, partidaId, juegoEjecutadoId } = await prepararJuego('IJ01');
    try {
      const r = await adapter.rpc('iniciar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_IJ_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('EN_CURSO');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('iniciar_juego es idempotente', async () => {
    const { esc, partidaId, juegoEjecutadoId } = await prepararJuego('IJ02');
    try {
      await adapter.rpc('iniciar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_IJ_002'
      });
      const r2 = await adapter.rpc('iniciar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_IJ_002'
      });
      expect(r2.ok).toBe(true);
      expect(r2.estado).toBe('EN_CURSO');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('pausar_juego cambia a PAUSADO', async () => {
    const { esc, partidaId, juegoEjecutadoId } = await prepararJuego('PJ01');
    try {
      await adapter.rpc('iniciar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_PJ_INICIAR_001'
      });
      const r = await adapter.rpc('pausar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_PJ_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('PAUSADO');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('reanudar_juego cambia a EN_CURSO', async () => {
    const { esc, partidaId, juegoEjecutadoId } = await prepararJuego('RJ01');
    try {
      await adapter.rpc('iniciar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_RJ_INICIAR_001'
      });
      await adapter.rpc('pausar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_RJ_PAUSAR_001'
      });
      const r = await adapter.rpc('reanudar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_RJ_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('EN_CURSO');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('pausar_juego falla si juego no está EN_CURSO', async () => {
    const { esc, partidaId, juegoEjecutadoId } = await prepararJuego('PJ02');
    try {
      const r = await adapter.rpc('pausar_juego', {
        p_partida_id: partidaId,
        p_juego_ejecutado_id: juegoEjecutadoId,
        p_session_id: 's1',
        p_action_id: 'TEST_PJ_002'
      });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('juego_no_en_curso');
    } finally {
      await limpiarEscenario(esc);
    }
  });
});

/* =============================================================
   Grupo 4: Cierre de juego y partida
   ============================================================= */
describeSiCredenciales.sequential('Funciones de cierre — finalizar_juego, finalizar_circuito', () => {
  it('finalizar_juego suma puntos y finaliza si todos terminales', async () => {
    const esc = await crearEscenario('FJ01');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_FJ01',
        p_session_id: 's1',
        p_action_id: 'TEST_FJ_CREAR_001'
      });
      await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
      await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FJ_COMENZAR_001'
      });
      const jes = await adapter.query('juego_ejecutados', { eq: { partida_id: crear.partida_id } });
      const jeId = jes[0].id;

      await adapter.rpc('iniciar_juego', {
        p_partida_id: crear.partida_id,
        p_juego_ejecutado_id: jeId,
        p_session_id: 's1',
        p_action_id: 'TEST_FJ_INICIAR_001'
      });

      const r = await adapter.rpc('finalizar_juego', {
        p_partida_id: crear.partida_id,
        p_juego_ejecutado_id: jeId,
        p_resultado: { ronda: 1, puntaje: 10 },
        p_puntos_equipo_1: 10,
        p_puntos_equipo_2: 5,
        p_finish_reason: 'NORMAL',
        p_session_id: 's1',
        p_action_id: 'TEST_FJ_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('FINALIZADO');
      expect(r.todos_terminales).toBe(true);

      const eps = await adapter.query('equipo_partidas', { eq: { partida_id: crear.partida_id } });
      const ep1 = eps.find(e => e.posicion === 1);
      const ep2 = eps.find(e => e.posicion === 2);
      expect(ep1.puntaje).toBe(10);
      expect(ep2.puntaje).toBe(5);

      const p = await adapter.query('partidas', { eq: { id: crear.partida_id }, single: true });
      expect(p.estado).toBe('FINALIZADA');
      expect(p.finish_reason).toBe('CIRCUITO_COMPLETO');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('finalizar_circuito cierra todos los juegos y la partida', async () => {
    const esc = await crearEscenario('FC01');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_FC01',
        p_session_id: 's1',
        p_action_id: 'TEST_FC_CREAR_001'
      });
      await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
      await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FC_COMENZAR_001'
      });

      const r = await adapter.rpc('finalizar_circuito', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FC_001'
      });
      expect(r.ok).toBe(true);
      expect(r.estado).toBe('FINALIZADA');

      const je = await adapter.query('juego_ejecutados', { eq: { partida_id: crear.partida_id } });
      expect(je.every(j => j.estado === 'NO_JUGADO')).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('finalizar_circuito es idempotente', async () => {
    const esc = await crearEscenario('FC02');
    try {
      const crear = await adapter.rpc('crear_partida', {
        p_circuito_id: esc.circuitoId,
        p_public_codigo: 'TST_FC02',
        p_session_id: 's1',
        p_action_id: 'TEST_FC2_CREAR_001'
      });
      await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
      await adapter.rpc('comenzar_partida', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FC2_COMENZAR_001'
      });
      await adapter.rpc('finalizar_circuito', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FC_002'
      });
      const r2 = await adapter.rpc('finalizar_circuito', {
        p_partida_id: crear.partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_FC_002'
      });
      expect(r2.ok).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });
});

/* =============================================================
   Grupo 5: Expiración
   ============================================================= */
describeSiCredenciales.sequential('Funciones de expiración', () => {
  it('expirar_partidas_inactivas devuelve cantidad', async () => {
    const r = await adapter.rpc('expirar_partidas_inactivas', { p_horas: 0 });
    expect(r.ok).toBe(true);
    expect(typeof r.expiradas).toBe('number');
  });
});

/* =============================================================
   Grupo 6: Snapshots
   ============================================================= */
describeSiCredenciales.sequential('Funciones de snapshot', () => {
  it('crear_snapshot crea snapshot inmutable', async () => {
    const ts = Date.now();
    const juegoRows = await adapter.insert('juegos', {
      codigo: `TST_SNAP_J_${ts}`,
      nombre: 'Juego Snap',
      requiere_set: true,
      activo: true
    }, { returning: 'id' });
    const juegoId = juegoRows[0].id;

    const setRows = await adapter.insert('sets', {
      juego_id: juegoId,
      nombre: `TST_SNAP_S_${ts}`,
      version: 1,
      activo: true
    }, { returning: 'id' });
    const setId = setRows[0].id;

    await adapter.insert('item_sets', [
      { set_id: setId, orden: 1, contenido: { pregunta: 'P1' } }
    ]);

    const r = await adapter.rpc('crear_snapshot', {
      p_set_id: setId,
      p_action_id: 'TEST_SNAP_001'
    });
    expect(r.ok).toBe(true);
    expect(r.snapshot_id).toBeDefined();
    expect(r.items_count).toBe(1);
  });

  it('crear_snapshot es idempotente', async () => {
    const ts = Date.now();
    const juegoRows = await adapter.insert('juegos', {
      codigo: `TST_SNAP2_J_${ts}`,
      nombre: 'Juego Snap2',
      requiere_set: true,
      activo: true
    }, { returning: 'id' });
    const juegoId = juegoRows[0].id;

    const setRows = await adapter.insert('sets', {
      juego_id: juegoId,
      nombre: `TST_SNAP2_S_${ts}`,
      version: 1,
      activo: true
    }, { returning: 'id' });
    const setId = setRows[0].id;

    await adapter.insert('item_sets', [
      { set_id: setId, orden: 1, contenido: { pregunta: 'P1' } }
    ]);

    const r1 = await adapter.rpc('crear_snapshot', {
      p_set_id: setId,
      p_action_id: 'TEST_SNAP_002'
    });
    const r2 = await adapter.rpc('crear_snapshot', {
      p_set_id: setId,
      p_action_id: 'TEST_SNAP_002'
    });
    expect(r2.ok).toBe(true);
    expect(r2.snapshot_id).toBe(r1.snapshot_id);
  });
});

/* =============================================================
   Grupo 7: Participantes
   ============================================================= */
describeSiCredenciales.sequential('Funciones de participantes', () => {
  async function crearPartidaConEquipo(prefix) {
    const esc = await crearEscenario(prefix);
    const crear = await adapter.rpc('crear_partida', {
      p_circuito_id: esc.circuitoId,
      p_public_codigo: `TST_${prefix}`,
      p_session_id: 's1',
      p_action_id: `${prefix}_CREAR`
    });
    await adapter.rpc('tomar_control', { p_partida_id: crear.partida_id, p_session_id: 's1' });
    await adapter.rpc('comenzar_partida', {
      p_partida_id: crear.partida_id,
      p_session_id: 's1',
      p_action_id: `${prefix}_COMENZAR`
    });
    const eps = await adapter.query('equipo_partidas', { eq: { partida_id: crear.partida_id } });
    return { esc, partidaId: crear.partida_id, equipoPartidaId: eps[0].id };
  }

  it('agregar_participante crea participante', async () => {
    const { esc, partidaId, equipoPartidaId } = await crearPartidaConEquipo('AP01');
    try {
      const r = await adapter.rpc('agregar_participante', {
        p_partida_id: partidaId,
        p_equipo_partida_id: equipoPartidaId,
        p_nombre: 'Juan',
        p_session_id: 's1',
        p_action_id: 'TEST_AP_001'
      });
      expect(r.ok).toBe(true);
      expect(r.nombre).toBe('Juan');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('agregar_participante rechaza duplicado', async () => {
    const { esc, partidaId, equipoPartidaId } = await crearPartidaConEquipo('AP02');
    try {
      await adapter.rpc('agregar_participante', {
        p_partida_id: partidaId,
        p_equipo_partida_id: equipoPartidaId,
        p_nombre: 'Pedro',
        p_session_id: 's1',
        p_action_id: 'TEST_AP_002A'
      });
      const r = await adapter.rpc('agregar_participante', {
        p_partida_id: partidaId,
        p_equipo_partida_id: equipoPartidaId,
        p_nombre: 'Pedro',
        p_session_id: 's1',
        p_action_id: 'TEST_AP_002B'
      });
      expect(r.ok).toBe(false);
      expect(r.error).toBe('participante_duplicado');
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('marcar_participacion cambia ha_participado', async () => {
    const { esc, partidaId, equipoPartidaId } = await crearPartidaConEquipo('MP01');
    try {
      const crear = await adapter.rpc('agregar_participante', {
        p_partida_id: partidaId,
        p_equipo_partida_id: equipoPartidaId,
        p_nombre: 'Ana',
        p_session_id: 's1',
        p_action_id: 'TEST_MP_CREAR_001'
      });
      expect(crear.ok).toBe(true);

      const r = await adapter.rpc('marcar_participacion', {
        p_participante_partida_id: crear.participante_partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_MP_001'
      });
      expect(r.ok).toBe(true);
      expect(r.ha_participado).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });

  it('marcar_participacion es idempotente', async () => {
    const { esc, partidaId, equipoPartidaId } = await crearPartidaConEquipo('MP02');
    try {
      const crear = await adapter.rpc('agregar_participante', {
        p_partida_id: partidaId,
        p_equipo_partida_id: equipoPartidaId,
        p_nombre: 'Luis',
        p_session_id: 's1',
        p_action_id: 'TEST_MP2_CREAR_001'
      });
      await adapter.rpc('marcar_participacion', {
        p_participante_partida_id: crear.participante_partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_MP_002A'
      });
      const r2 = await adapter.rpc('marcar_participacion', {
        p_participante_partida_id: crear.participante_partida_id,
        p_session_id: 's1',
        p_action_id: 'TEST_MP_002B'
      });
      expect(r2.ok).toBe(true);
      expect(r2.ya_marcado).toBe(true);
    } finally {
      await limpiarEscenario(esc);
    }
  });
});
