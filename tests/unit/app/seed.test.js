import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { bootstrap } from '../../../src/app/bootstrap.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('seedJuegos', () => {
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

  it('registry con 6 defs crea 6 Juegos', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    expect(juegos.length).toBe(6);
    const codigos = juegos.map((j) => j.codigo).sort();
    expect(codigos).toEqual(['CANCION_INCOMPLETA', 'HISTORIA_ENREDADA', 'PICTIONARY', 'QUE_PIENSA_EL_PUBLICO', 'ROSCO', 'TRIVIA']);
  });

  it('el Juego creado tiene codigo y nombre correctos', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    expect(trivia).toBeDefined();
    expect(trivia.nombre).toBe('Trivia');
  });

  it('el Juego creado tiene requiere_set correcto', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    expect(trivia.requiere_set).toBe(true);
  });

  it('llamar bootstrap dos veces no duplica juegos', async () => {
    await bootstrap(adapter);
    await bootstrap(adapter);

    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const triviaCount = juegos.filter((j) => j.codigo === 'TRIVIA').length;
    expect(triviaCount).toBe(1);
  });

  it('el id es UUID (no el código)', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    expect(trivia.id).not.toBe('TRIVIA');
    expect(trivia.id.length).toBeGreaterThan(20);
  });
});
