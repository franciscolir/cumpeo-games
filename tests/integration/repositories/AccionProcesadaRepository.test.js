import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';
import { AccionProcesadaRepository } from '../../../src/repositories/AccionProcesadaRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapterAuth;
let repo;
const accionesCreadas = [];
const partidasCreadas = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapterAuth = await crearAdapterAutenticado();
  repo = new AccionProcesadaRepository(adapterAuth);
});

afterAll(async () => {
  if (!adapterAuth) return;
  for (const actionId of accionesCreadas) {
    try {
      await adapterAuth.delete('accion_procesadas', { eq: { action_id: actionId } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const pid of partidasCreadas) {
    try {
      await adapterAuth.delete('partidas', { eq: { id: pid } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapterAuth.cerrar();
});

async function crearPartidaDePrueba() {
  const rows = await adapterAuth.insert('partidas', {
    circuito_nombre: 'Test Partida',
    public_codigo: uniqueId('PUB'),
    estado: 'CONFIGURANDO',
    version: 1,
    last_activity_at: new Date().toISOString()
  }, { returning: 'id' });
  const partidaId = rows[0].id;
  partidasCreadas.push(partidaId);
  return partidaId;
}

describeSiCredenciales('AccionProcesadaRepository (integración Supabase)', () => {
  it('reserva una acción nueva', async () => {
    const actionId = uniqueId('ACC_TEST');
    accionesCreadas.push(actionId);

    const resultado = await repo.reservar({
      actionId,
      partidaId: null,
      tipoAccion: 'test_reserva'
    });

    expect(resultado.yaProcesada).toBe(false);
  });

  it('obtiene una acción por action_id', async () => {
    const actionId = uniqueId('ACC_TEST');
    accionesCreadas.push(actionId);

    await repo.reservar({
      actionId,
      partidaId: null,
      tipoAccion: 'test_obtener'
    });

    const obtenida = await repo.obtenerPorActionId(actionId);
    expect(obtenida).toBeTruthy();
    expect(obtenida.action_id).toBe(actionId);
    expect(obtenida.tipo_accion).toBe('test_obtener');
    expect(obtenida.partida_id).toBeNull();
  });

  it('retorna null si la acción no existe', async () => {
    const obtenida = await repo.obtenerPorActionId('00000000-0000-0000-0000-000000000000');
    expect(obtenida).toBeNull();
  });

  it('reintento idempotente detecta acción existente', async () => {
    const actionId = uniqueId('ACC_TEST');
    accionesCreadas.push(actionId);

    const primera = await repo.reservar({
      actionId,
      partidaId: null,
      tipoAccion: 'test_idempotente'
    });
    expect(primera.yaProcesada).toBe(false);

    const segunda = await repo.reservar({
      actionId,
      partidaId: null,
      tipoAccion: 'test_idempotente'
    });
    expect(segunda.yaProcesada).toBe(true);
  });

  it('reserva con partida_id no nulo', async () => {
    const actionId = uniqueId('ACC_TEST');
    accionesCreadas.push(actionId);

    const partidaId = await crearPartidaDePrueba();

    const resultado = await repo.reservar({
      actionId,
      partidaId,
      tipoAccion: 'test_con_partida'
    });
    expect(resultado.yaProcesada).toBe(false);

    const obtenida = await repo.obtenerPorActionId(actionId);
    expect(obtenida.partida_id).toBe(partidaId);
  });

  it('lista acciones por partida_id', async () => {
    const partidaId = await crearPartidaDePrueba();
    const actionId1 = uniqueId('ACC_LIST');
    const actionId2 = uniqueId('ACC_LIST');
    accionesCreadas.push(actionId1, actionId2);

    await repo.reservar({
      actionId: actionId1,
      partidaId,
      tipoAccion: 'test_lista_1'
    });
    await repo.reservar({
      actionId: actionId2,
      partidaId,
      tipoAccion: 'test_lista_2'
    });

    const lista = await repo.listarPorPartida(partidaId);
    expect(lista.length).toBeGreaterThanOrEqual(2);
    const ids = lista.map((a) => a.action_id);
    expect(ids).toContain(actionId1);
    expect(ids).toContain(actionId2);
  });
});
