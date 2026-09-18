import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SnapshotRepository } from '../../../src/repositories/SnapshotRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;
const juegosCreados = [];
const setsCreados = [];
const snapshotsCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new SnapshotRepository(adapter);
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of snapshotsCreados) {
    try {
      await adapter.delete('set_snapshots', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const id of setsCreados) {
    try {
      await adapter.delete('sets', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  for (const id of juegosCreados) {
    try {
      await adapter.delete('juegos', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

async function crearJuegoDePrueba() {
  const codigo = uniqueId('SNAP_JUEGO');
  const rows = await adapter.insert('juegos', {
    codigo,
    nombre: 'Juego Snapshot Test',
    requiere_set: true,
    activo: true
  }, { returning: 'id' });
  const juegoId = rows[0].id;
  juegosCreados.push(juegoId);
  return juegoId;
}

async function crearSetDePrueba(juegoId) {
  const rows = await adapter.insert('sets', {
    juego_id: juegoId,
    nombre: uniqueId('SNAP_SET'),
    version: 1,
    activo: true
  }, { returning: 'id' });
  const setId = rows[0].id;
  setsCreados.push(setId);
  return setId;
}

describeSiCredenciales('SnapshotRepository (integración Supabase)', () => {
  it('crea un snapshot y lo obtiene por id', async () => {
    const juegoId = await crearJuegoDePrueba();
    const setId = await crearSetDePrueba(juegoId);

    const actionId = uniqueId('SNAP_ACT');
    const resultado = await repo.crearSnapshot(setId, actionId);

    expect(resultado.ok).toBe(true);
    expect(resultado.snapshot_id).toBeTruthy();
    snapshotsCreados.push(resultado.snapshot_id);

    const obtenido = await repo.obtenerSnapshot(resultado.snapshot_id);
    expect(obtenido).toBeTruthy();
    expect(obtenido.source_set_id).toBe(setId);
    expect(obtenido.juego_id).toBe(juegoId);
  });

  it('retorna null si el snapshot no existe', async () => {
    const obtenido = await repo.obtenerSnapshot('00000000-0000-0000-0000-000000000000');
    expect(obtenido).toBeNull();
  });

  it('crea snapshot desde set con contenido explícito', async () => {
    const juegoId = await crearJuegoDePrueba();
    const setId = await crearSetDePrueba(juegoId);

    const contenido = {
      items: [
        { orden: 1, contenido: { pregunta: 'P1', respuesta: 'R1' } },
        { orden: 2, contenido: { pregunta: 'P2', respuesta: 'R2' } }
      ]
    };

    const snapshot = await repo.crearSnapshotDesdeSet(setId, juegoId, contenido);
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.source_set_id).toBe(setId);
    expect(snapshot.source_version).toBe(1);
    expect(snapshot.contenido.items).toHaveLength(2);
    snapshotsCreados.push(snapshot.id);
  });

  it('lista snapshots por source_set_id', async () => {
    const juegoId = await crearJuegoDePrueba();
    const setId = await crearSetDePrueba(juegoId);

    const action1 = uniqueId('SNAP_LIST');
    const action2 = uniqueId('SNAP_LIST');
    const r1 = await repo.crearSnapshot(setId, action1);
    const r2 = await repo.crearSnapshot(setId, action2);
    snapshotsCreados.push(r1.snapshot_id, r2.snapshot_id);

    const lista = await repo.listarSnapshotsPorSet(setId);
    expect(lista.length).toBeGreaterThanOrEqual(2);
    const ids = lista.map((s) => s.id);
    expect(ids).toContain(r1.snapshot_id);
    expect(ids).toContain(r2.snapshot_id);
  });

  it('retorna vacío al listar snapshots de un set inexistente', async () => {
    const lista = await repo.listarSnapshotsPorSet('00000000-0000-0000-0000-000000000000');
    expect(lista).toEqual([]);
  });
});
