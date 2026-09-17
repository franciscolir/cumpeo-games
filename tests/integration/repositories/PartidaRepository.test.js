import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';
import { PartidaRepository } from '../../../src/repositories/PartidaRepository.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const describeSiCredenciales = TIENE_CREDENCIALES ? describe : describe.skip;

let adapter;
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
  if (!TIENE_CREDENCIALES) return;
  adapter = new SupabaseAdapter();
  await adapter.abrir();
  repo = new PartidaRepository(adapter);

  const juegos = await adapter.query('juegos', { limit: 1 });
  if (juegos.length > 0) {
    juegoIdReal = juegos[0].id;
  }

  if (juegoIdReal) {
    const setRows = await adapter.insert('sets', {
      juego_id: juegoIdReal,
      nombre: uniqueId('SET_TEST'),
      version: 1,
      activo: true
    }, { returning: 'id' });
    setIdReal = setRows[0].id;
    setsCreados.push(setIdReal);

    await adapter.insert('item_sets', {
      set_id: setIdReal,
      orden: 1,
      contenido: { pregunta: 'P1', respuesta: 'R1' }
    });

    const circuitoRows = await adapter.insert('circuitos', {
      nombre: uniqueId('CIRC_TEST'),
      estado: 'LISTO',
      version: 1
    }, { returning: 'id' });
    circuitoIdReal = circuitoRows[0].id;
    circuitosCreados.push(circuitoIdReal);

    const cjRows = await adapter.insert('circuito_juegos', {
      circuito_id: circuitoIdReal,
      juego_id: juegoIdReal,
      orden: 1,
      configuracion: {}
    }, { returning: 'id' });
    circuitoJuegoIdReal = cjRows[0].id;

    await adapter.insert('equipo_circuitos', {
      circuito_id: circuitoIdReal,
      posicion: 1,
      nombre: 'Alpha',
      color: '#FF0000'
    });
    await adapter.insert('equipo_circuitos', {
      circuito_id: circuitoIdReal,
      posicion: 2,
      nombre: 'Beta',
      color: '#0000FF'
    });
  }
});

afterAll(async () => {
  if (!adapter) return;
  for (const pid of partidasCreadas) {
    try { await adapter.delete('juego_ejecutados', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapter.delete('equipo_partidas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapter.delete('control_partidas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapter.delete('accion_procesadas', { eq: { partida_id: pid } }); } catch (_) {}
    try { await adapter.delete('partidas', { eq: { id: pid } }); } catch (_) {}
  }
  for (const cid of circuitosCreados) {
    try { await adapter.delete('circuito_juegos', { eq: { circuito_id: cid } }); } catch (_) {}
    try { await adapter.delete('equipo_circuitos', { eq: { circuito_id: cid } }); } catch (_) {}
    try { await adapter.delete('circuitos', { eq: { id: cid } }); } catch (_) {}
  }
  for (const sid of setsCreados) {
    try { await adapter.delete('item_sets', { eq: { set_id: sid } }); } catch (_) {}
    try { await adapter.delete('sets', { eq: { id: sid } }); } catch (_) {}
  }
  await adapter.cerrar();
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
});
