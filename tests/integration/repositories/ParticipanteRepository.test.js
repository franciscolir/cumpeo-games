import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ParticipanteRepository } from '../../../src/repositories/ParticipanteRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;
const partidasCreadas = [];
const equiposCreados = [];
const participantesCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new ParticipanteRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of participantesCreados) {
    try {
      await adapter.delete('participante_partidas', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const id of equiposCreados) {
    try {
      await adapter.delete('equipo_partidas', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const id of partidasCreadas) {
    try {
      await adapter.delete('partidas', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

async function crearEscenario() {
  const codigo = uniqueId('PART_TEST');
  const partRows = await adapter.insert('partidas', {
    circuito_nombre: 'Circuito Participantes',
    public_codigo: codigo,
    estado: 'CONFIGURANDO',
    version: 1,
    last_activity_at: new Date().toISOString()
  }, { returning: 'id' });
  const partidaId = partRows[0].id;
  partidasCreadas.push(partidaId);

  const eqRows = await adapter.insert('equipo_partidas', [
    {
      partida_id: partidaId,
      posicion: 1,
      nombre: 'Rojo',
      color: '#FF0000',
      puntaje: 0,
      version: 1
    },
    {
      partida_id: partidaId,
      posicion: 2,
      nombre: 'Azul',
      color: '#0000FF',
      puntaje: 0,
      version: 1
    }
  ], { returning: 'id' });
  for (const r of eqRows) equiposCreados.push(r.id);

  return { partidaId, equipoIds: eqRows.map((r) => r.id) };
}

describeSiCredenciales('ParticipanteRepository (integración Supabase)', () => {
  it('agrega un participante y lo obtiene por id', async () => {
    const { partidaId, equipoIds } = await crearEscenario();
    const p = await repo.agregarParticipante(partidaId, equipoIds[0], 'Juan');
    expect(p.id).toBeTruthy();
    expect(p.nombre).toBe('Juan');
    expect(p.ha_participado).toBe(false);
    participantesCreados.push(p.id);

    const obtenido = await repo.obtenerParticipante(p.id);
    expect(obtenido.id).toBe(p.id);
    expect(obtenido.nombre).toBe('Juan');
  });

  it('retorna null si el participante no existe', async () => {
    const obtenido = await repo.obtenerParticipante('00000000-0000-0000-0000-000000000000');
    expect(obtenido).toBeNull();
  });

  it('lista participantes de una partida ordenados por nombre', async () => {
    const { partidaId, equipoIds } = await crearEscenario();
    const p1 = await repo.agregarParticipante(partidaId, equipoIds[0], 'Carlos');
    const p2 = await repo.agregarParticipante(partidaId, equipoIds[1], 'Ana');
    participantesCreados.push(p1.id, p2.id);

    const lista = await repo.listarParticipantesDePartida(partidaId);
    expect(lista.length).toBeGreaterThanOrEqual(2);
    const nombres = lista.map((p) => p.nombre);
    expect(nombres[0]).toBe('Ana');
    expect(nombres[1]).toBe('Carlos');
  });

  it('marca participación de un participante', async () => {
    const { partidaId, equipoIds } = await crearEscenario();
    const p = await repo.agregarParticipante(partidaId, equipoIds[0], 'Marcador');
    participantesCreados.push(p.id);

    const result = await repo.marcarParticipacion(p.id);
    expect(result.ha_participado).toBe(true);

    const obtenido = await repo.obtenerParticipante(p.id);
    expect(obtenido.ha_participado).toBe(true);
  });

  it('elimina un participante que no ha participado', async () => {
    const { partidaId, equipoIds } = await crearEscenario();
    const p = await repo.agregarParticipante(partidaId, equipoIds[0], 'Temporal');

    await repo.eliminarParticipante(p.id);

    const obtenido = await repo.obtenerParticipante(p.id);
    expect(obtenido).toBeNull();
  });
});
