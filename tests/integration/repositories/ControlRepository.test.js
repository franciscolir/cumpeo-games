import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseAdapter } from '../../../src/adapters/SupabaseAdapter.js';
import { ControlRepository } from '../../../src/repositories/ControlRepository.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const describeSiCredenciales = TIENE_CREDENCIALES ? describe : describe.skip;

let adapter;
let repo;
const partidasCreadas = [];
const controlesCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_CREDENCIALES) return;
  adapter = new SupabaseAdapter();
  await adapter.abrir();
  repo = new ControlRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const pid of controlesCreados) {
    try {
      await adapter.delete('control_partidas', { eq: { partida_id: pid } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const pid of partidasCreadas) {
    try {
      await adapter.delete('partidas', { eq: { id: pid } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

async function crearPartidaDePrueba() {
  const codigo = uniqueId('CTRL_PART');
  const rows = await adapter.insert('partidas', {
    circuito_nombre: 'Circuito Test',
    public_codigo: codigo,
    estado: 'CONFIGURANDO',
    version: 1,
    last_activity_at: new Date().toISOString()
  }, { returning: 'id' });
  const partidaId = rows[0].id;
  partidasCreadas.push(partidaId);

  await adapter.insert('control_partidas', {
    partida_id: partidaId,
    session_id: null,
    usuario_id: null,
    acquired_at: null,
    expires_at: null,
    heartbeat_at: null
  });
  controlesCreados.push(partidaId);

  return partidaId;
}

describeSiCredenciales('ControlRepository (integración Supabase)', () => {
  it('obtiene un control por partida_id', async () => {
    const partidaId = await crearPartidaDePrueba();
    const control = await repo.obtenerControl(partidaId);
    expect(control).toBeTruthy();
    expect(control.partida_id).toBe(partidaId);
    expect(control.session_id).toBeNull();
  });

  it('retorna null si el control no existe', async () => {
    const control = await repo.obtenerControl('00000000-0000-0000-0000-000000000000');
    expect(control).toBeNull();
  });

  it('toma control con una sesión', async () => {
    const partidaId = await crearPartidaDePrueba();
    const sessionId = uniqueId('SES');

    const result = await repo.tomarControl(partidaId, sessionId, 'user1');
    expect(result.adquirido).toBe(true);

    const control = await repo.obtenerControl(partidaId);
    expect(control.session_id).toBe(sessionId);
    expect(control.usuario_id).toBe('user1');
    expect(control.acquired_at).toBeTruthy();
    expect(control.expires_at).toBeTruthy();
  });

  it('renueva control con la misma sesión', async () => {
    const partidaId = await crearPartidaDePrueba();
    const sessionId = uniqueId('SES_REN');

    await repo.tomarControl(partidaId, sessionId);
    const antes = await repo.obtenerControl(partidaId);
    const expiresAntes = antes.expires_at;

    const result = await repo.renovarControl(partidaId, sessionId);
    expect(result.renovado).toBe(true);

    const despues = await repo.obtenerControl(partidaId);
    expect(despues.expires_at).not.toBe(expiresAntes);
    expect(despues.session_id).toBe(sessionId);
  });

  it('libera control con la sesión correcta', async () => {
    const partidaId = await crearPartidaDePrueba();
    const sessionId = uniqueId('SES_LIB');

    await repo.tomarControl(partidaId, sessionId);

    const result = await repo.liberarControl(partidaId, sessionId);
    expect(result.liberado).toBe(true);

    const control = await repo.obtenerControl(partidaId);
    expect(control.session_id).toBeNull();
  });
});
