import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';
import { PartidaRepository } from '../../../src/repositories/PartidaRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapterAuth;
let repo;
let juegoIdReal;
let setIdReal;
let circuitoIdReal;
let circuitoJuegoIdReal;

const partidasCreadas = [];
const circuitosCreados = [];
const setsCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapterAuth = await crearAdapterAutenticado();
  repo = new PartidaRepository(adapterAuth);

  const juegos = await adapterAuth.query('juegos', { limit: 1 });
  if (juegos.length > 0) {
    juegoIdReal = juegos[0].id;
  }

  if (juegoIdReal) {
    const setRows = await adapterAuth.insert('sets', {
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST'),
      version: 1,
      activo: true
    }, { returning: 'id' });
    setIdReal = setRows[0].id;
    setsCreados.push(setIdReal);

    await adapterAuth.insert('item_sets', {
      set_id: setIdReal,
      orden: 1,
      contenido: { pregunta: 'P1', respuesta: 'R1' }
    });

    const circuitoRows = await adapterAuth.insert('circuitos', {
      nombre: uniqueId('CIRC_TEST'),
      estado: 'LISTO',
      version: 1
    }, { returning: 'id' });
    circuitoIdReal = circuitoRows[0].id;
    circuitosCreados.push(circuitoIdReal);

    const cjRows = await adapterAuth.insert('circuito_juegos', {
      circuito_id: circuitoIdReal,
      juego_id: juegoIdReal,
      orden: 1,
      configuracion: {}
    }, { returning: 'id' });
    circuitoJuegoIdReal = cjRows[0].id;

    await adapterAuth.insert('equipo_circuitos', {
      circuito_id: circuitoIdReal,
      posicion: 1,
      nombre: 'Alpha',
      color: '#FF0000'
    });
    await adapterAuth.insert('equipo_circuitos', {
      circuito_id: circuitoIdReal,
      posicion: 2,
      nombre: 'Beta',
      color: '#0000FF'
    });
  }
});

afterAll(async () => {
  if (!adapterAuth) return;
  for (const pid of partidasCreadas) {
    try { await adapterAuth.delete('juego_ejecutados', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapterAuth.delete('equipo_partidas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapterAuth.delete('control_partidas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapterAuth.delete('accion_procesadas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapterAuth.delete('partidas', { eq: { id: pid } }); } catch (_) {}
  }
  for (const cid of circuitosCreados) {
    try { await adapterAuth.delete('circuito_juegos', { eq: { circuito_id: cid } }); } catch (_) {}
    try { await adapterAuth.delete('equipo_circuitos', { eq: { circuito_id: cid } }); } catch (_) {}
    try { await adapterAuth.delete('circuitos', { eq: { id: cid } }); } catch (_) {}
  }
  for (const sid of setsCreados) {
    try { await adapterAuth.delete('item_sets', { eq: { set_id: sid } }); } catch (_) {}
    try { await adapterAuth.delete('sets', { eq: { id: sid } }); } catch (_) {}
  }
  await adapterAuth.cerrar();
});

describeSiCredenciales('PartidaRepository (integración Supabase)', () => {
  it('obtiene una partida por id', async () => {
    if (!circuitoIdReal) return;

    const codigo = uniqueId('PUB');
    const partida = await repo.crearPartida({
      circuito_id: circuitoIdReal,
      public_codigo: codigo,
      actionId: uniqueId('ACT')
    });
    partidasCreadas.push(partida.id);

    const obtenida = await repo.obtenerPartida(partida.id);
    expect(obtenida).toBeTruthy();
    expect(obtenida.id).toBe(partida.id);
  });

  it('retorna null si la partida no existe', async () => {
    const obtenida = await repo.obtenerPartida('00000000-0000-0000-0000-000000000000');
    expect(obtenida).toBeNull();
  });

  it('obtiene partida por public_codigo', async () => {
    if (!circuitoIdReal) return;

    const codigo = uniqueId('PUB');
    const partida = await repo.crearPartida({
      circuito_id: circuitoIdReal,
      public_codigo: codigo,
      actionId: uniqueId('ACT')
    });
    partidasCreadas.push(partida.id);

    const obtenida = await repo.obtenerPartidaPorCodigo(codigo);
    expect(obtenida).toBeTruthy();
    expect(obtenida.id).toBe(partida.id);
  });

  it('lista partidas por estado', async () => {
    const lista = await repo.listarPartidasPorEstado('CONFIGURANDO');
    expect(Array.isArray(lista)).toBe(true);
  });

  it('lista partidas en curso', async () => {
    const lista = await repo.listarPartidasEnCurso();
    expect(Array.isArray(lista)).toBe(true);
  });

  it('lista partidas recuperables', async () => {
    const lista = await repo.listarPartidasRecuperables();
    expect(Array.isArray(lista)).toBe(true);
  });

  it('obtiene contexto de espera', async () => {
    if (!circuitoIdReal) return;

    const codigo = uniqueId('PUB');
    const partida = await repo.crearPartida({
      circuito_id: circuitoIdReal,
      public_codigo: codigo,
      actionId: uniqueId('ACT')
    });
    partidasCreadas.push(partida.id);

    const ctx = await repo.obtenerContextoEspera(partida.id);
    expect(ctx).toBeTruthy();
    expect(ctx.partida).toBeTruthy();
    expect(ctx.partida.id).toBe(partida.id);
    expect(Array.isArray(ctx.equipos)).toBe(true);
    expect(ctx.equipos.length).toBe(2);
    expect(Array.isArray(ctx.participantes)).toBe(true);
    expect(Array.isArray(ctx.juegos)).toBe(true);
  });

  it('obtiene contexto vacío para partida inexistente', async () => {
    const ctx = await repo.obtenerContextoEspera('00000000-0000-0000-0000-000000000000');
    expect(ctx.partida).toBeNull();
    expect(ctx.equipos).toEqual([]);
  });

  it('RPC pausar_juego setea pausado_at', async () => {
    if (!circuitoIdReal || !juegoIdReal) return;

    const codigo = uniqueId('PUB_P');
    const partida = await repo.crearPartida({
      circuito_id: circuitoIdReal,
      public_codigo: codigo,
      actionId: uniqueId('ACT')
    });
    partidasCreadas.push(partida.id);

    const sesion = uniqueId('SES');
    const je = await adapterAuth.insert('juego_ejecutados', {
      partida_id: partida.id,
      juego_id: juegoIdReal,
      orden: 1,
      estado: 'EN_CURSO',
      pausado_at: null
    }, { returning: 'id' });

    const r = await adapterAuth.rpc('pausar_juego', {
      p_partida_id: partida.id,
      p_juego_ejecutado_id: je[0].id,
      p_session_id: sesion,
      p_action_id: uniqueId('ACT')
    });
    expect(r.ok).toBe(true);
    const estado = r.estado || r;
    if (estado && typeof estado === 'object' && 'pausado_at' in estado) {
      expect(estado.pausado_at).not.toBeNull();
    }
  });

  it('RPC reanudar_juego limpia pausado_at', async () => {
    if (!circuitoIdReal || !juegoIdReal) return;

    const codigo = uniqueId('PUB_R');
    const partida = await repo.crearPartida({
      circuito_id: circuitoIdReal,
      public_codigo: codigo,
      actionId: uniqueId('ACT')
    });
    partidasCreadas.push(partida.id);

    const sesion = uniqueId('SES');
    const je = await adapterAuth.insert('juego_ejecutados', {
      partida_id: partida.id,
      juego_id: juegoIdReal,
      orden: 1,
      estado: 'PAUSADO',
      pausado_at: new Date().toISOString()
    }, { returning: 'id' });

    const r = await adapterAuth.rpc('reanudar_juego', {
      p_partida_id: partida.id,
      p_juego_ejecutado_id: je[0].id,
      p_session_id: sesion,
      p_action_id: uniqueId('ACT')
    });
    expect(r.ok).toBe(true);
    const estado = r.estado || r;
    if (estado && typeof estado === 'object' && 'pausado_at' in estado) {
      expect(estado.pausado_at).toBeNull();
    }
  });
});
