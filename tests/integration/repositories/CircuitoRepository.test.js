import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CircuitoRepository } from '../../../src/repositories/CircuitoRepository.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../_helpers/auth.js';

const TIENE_CREDENCIALES =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const TIENE_AUTH = TIENE_CREDENCIALES && tieneCredencialesAuth();

const describeSiCredenciales = TIENE_AUTH ? describe : describe.skip;

let adapter;
let repo;
let juegoIdReal;
const circuitosCreados = [];

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  repo = new CircuitoRepository(adapter);

  const juegos = await adapter.query('juegos', { limit: 1 });
  if (juegos.length > 0) {
    juegoIdReal = juegos[0].id;
  }
});

afterAll(async () => {
  if (!adapter) return;
  for (const id of circuitosCreados) {
    try {
      await adapter.delete('circuito_juegos', { eq: { circuito_id: id } });
    } catch (_) { /* cleanup best-effort */ }
    try {
      await adapter.delete('equipo_circuitos', { eq: { circuito_id: id } });
    } catch (_) { /* cleanup best-effort */ }
    try {
      await adapter.delete('circuitos', { eq: { id } });
    } catch (_) { /* cleanup best-effort */ }
  }
  await adapter.cerrar();
});

function payloadValido() {
  return {
    nombre: uniqueId('CIRC_TEST'),
    descripcion: 'Circuito de integración',
    juegos: [{ juego_id: juegoIdReal }],
    equipos: [
      { posicion: 1, nombre: 'Equipo Alpha', color: '#FF0000' },
      { posicion: 2, nombre: 'Equipo Beta', color: '#0000FF' }
    ]
  };
}

describeSiCredenciales('CircuitoRepository (integración Supabase)', () => {
  it('crea un circuito completo via RPC', async () => {
    if (!juegoIdReal) {
      console.warn('Saltando test: no hay juegos en la BD');
      return;
    }

    const payload = payloadValido();
    const circuito = await repo.crearCircuito(payload);
    expect(circuito.id).toBeTruthy();
    expect(circuito.nombre).toBe(payload.nombre);
    expect(circuito.estado).toBe('BORRADOR');
    expect(circuito.version).toBe(1);
    circuitosCreados.push(circuito.id);

    const completo = await repo.obtenerCircuitoCompleto(circuito.id);
    expect(completo.circuito.id).toBe(circuito.id);
    expect(completo.juegos).toHaveLength(1);
    expect(completo.equipos).toHaveLength(2);
  });

  it('obtiene un circuito por id', async () => {
    if (!juegoIdReal) return;

    const payload = payloadValido();
    const creado = await repo.crearCircuito(payload);
    circuitosCreados.push(creado.id);

    const obtenido = await repo.obtenerCircuito(creado.id);
    expect(obtenido).toBeTruthy();
    expect(obtenido.id).toBe(creado.id);
    expect(obtenido.nombre).toBe(payload.nombre);
  });

  it('retorna null si el circuito no existe', async () => {
    const obtenido = await repo.obtenerCircuito('00000000-0000-0000-0000-000000000000');
    expect(obtenido).toBeNull();
  });

  it('lista circuitos', async () => {
    if (!juegoIdReal) return;

    const payload = payloadValido();
    const creado = await repo.crearCircuito(payload);
    circuitosCreados.push(creado.id);

    const todos = await repo.listarCircuitos();
    expect(todos.length).toBeGreaterThanOrEqual(1);
    const ids = todos.map((c) => c.id);
    expect(ids).toContain(creado.id);
  });

  it('filtra plantillas con listarPlantillas', async () => {
    if (!juegoIdReal) return;

    const payload = payloadValido();
    const creado = await repo.crearCircuito(payload);
    circuitosCreados.push(creado.id);

    const plantillas = await repo.listarPlantillas();
    expect(Array.isArray(plantillas)).toBe(true);
  });

  it('obtiene circuito completo con juegos y equipos', async () => {
    if (!juegoIdReal) return;

    const payload = payloadValido();
    const circuito = await repo.crearCircuito(payload);
    circuitosCreados.push(circuito.id);

    const completo = await repo.obtenerCircuitoCompleto(circuito.id);
    expect(completo.circuito).toBeTruthy();
    expect(completo.juegos.length).toBeGreaterThanOrEqual(1);
    expect(completo.equipos.length).toBe(2);
    expect(completo.equipos[0].posicion).toBe(1);
    expect(completo.equipos[1].posicion).toBe(2);
  });

  it('obtiene vacío para circuito inexistente', async () => {
    const completo = await repo.obtenerCircuitoCompleto('00000000-0000-0000-0000-000000000000');
    expect(completo.circuito).toBeNull();
    expect(completo.juegos).toEqual([]);
    expect(completo.equipos).toEqual([]);
  });
});
