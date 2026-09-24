import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { LocalStorageAdapter } from '../../../src/adapters/storage/LocalStorageAdapter.js';
import { bootstrap } from '../../../src/app/bootstrap.js';
import { registrarTodos } from '../../../src/games/registro.js';
import { GameDefinitionRegistry } from '../../../src/services/GameDefinitionRegistry.js';
import { FotoPublicaRepository } from '../../../src/repositories/FotoPublicaRepository.js';
import { MensajePublicoRepository } from '../../../src/repositories/MensajePublicoRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('bootstrap', () => {
  let adapter;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  it('retorna un objeto con { adapter, session, services, registry, storage }', async () => {
    const result = await bootstrap(adapter);
    expect(result.adapter).toBe(adapter);
    expect(result.session).toBeDefined();
    expect(result.services).toBeDefined();
    expect(result.registry).toBeDefined();
    expect(result.storage).toBeDefined();
  });

  it('services tiene los 11 servicios', async () => {
    const { services } = await bootstrap(adapter);
    expect(services.control).toBeDefined();
    expect(services.partida).toBeDefined();
    expect(services.circuito).toBeDefined();
    expect(services.set).toBeDefined();
    expect(services.juego).toBeDefined();
    expect(services.ajustes).toBeDefined();
    expect(services.registry).toBeDefined();
    expect(services.foto).toBeDefined();
    expect(services.mensaje).toBeDefined();
    expect(services.participante).toBeDefined();
    expect(services.respuestaEncuesta).toBeDefined();
  });

  it('registry tiene TRIVIA registrado', async () => {
    const { registry } = await bootstrap(adapter);
    expect(registry.existe('TRIVIA')).toBe(true);
  });

  it('registry.listarCodigos() incluye TRIVIA', async () => {
    const { registry } = await bootstrap(adapter);
    const codigos = registry.listarCodigos();
    expect(codigos).toContain('TRIVIA');
  });

  it('session tiene sessionId', async () => {
    const { session } = await bootstrap(adapter);
    expect(session.sessionId).toBeDefined();
    expect(typeof session.sessionId).toBe('string');
    expect(session.sessionId.length).toBeGreaterThan(0);
  });

  it('bootstrap(null) lanza error', async () => {
    await expect(bootstrap(null)).rejects.toThrow('bootstrap: adapter requerido');
  });

  it('bootstrap con dos llamadas crea instancias distintas', async () => {
    const r1 = await bootstrap(adapter);
    const r2 = await bootstrap(adapter);
    expect(r1.services).not.toBe(r2.services);
    expect(r1.registry).not.toBe(r2.registry);
  });

  it('bootstrap con el mismo adapter funciona', async () => {
    const result = await bootstrap(adapter);
    expect(result.adapter).toBe(adapter);
    expect(result.services.control).toBeDefined();
  });

  it('storage es un LocalStorageAdapter cuando usa LocalAdapter', async () => {
    const result = await bootstrap(adapter);
    expect(result.storage).toBeInstanceOf(LocalStorageAdapter);
  });

  it('services.foto es una instancia de FotoPublicaRepository', async () => {
    const result = await bootstrap(adapter);
    expect(result.services.foto).toBeInstanceOf(FotoPublicaRepository);
  });

  it('services.mensaje es una instancia de MensajePublicoRepository', async () => {
    const result = await bootstrap(adapter);
    expect(result.services.mensaje).toBeInstanceOf(MensajePublicoRepository);
  });

  it('services.foto usa el mismo storage que app.storage', async () => {
    const result = await bootstrap(adapter);
    expect(result.services.foto.storage).toBe(result.storage);
  });
});

describe('registrarTodos', () => {
  it('devuelve ["TRIVIA", "QUE_PIENSA_EL_PUBLICO", "ROSCO", "CANCION_INCOMPLETA", "PICTIONARY","HISTORIA_ENREDADA","MEMORIA","ANTI_TRIVIA","ENLACES"]', () => {
    const registry = new GameDefinitionRegistry();
    const codigos = registrarTodos(registry);
    expect(codigos).toEqual(['TRIVIA', 'QUE_PIENSA_EL_PUBLICO', 'ROSCO', 'CANCION_INCOMPLETA', 'PICTIONARY','HISTORIA_ENREDADA','MEMORIA','ANTI_TRIVIA','ENLACES']);
  });
});
