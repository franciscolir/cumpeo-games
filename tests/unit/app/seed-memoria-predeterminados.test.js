import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { bootstrap } from '../../../src/app/bootstrap.js';
import { seedMemoriaPredeterminados } from '../../../src/app/seed-memoria-predeterminados.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('seedMemoriaPredeterminados', () => {
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

  it('es una función exportada', () => {
    expect(typeof seedMemoriaPredeterminados).toBe('function');
  });

  it('bootstrap crea 2 sets predeterminados de Memoricé', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    const sets = await services.set.listarSetsPorJuego(memoria.id);

    expect(sets).toHaveLength(2);
    const nombres = sets.map((s) => s.nombre).sort();
    expect(nombres).toEqual(['Memoricé — Emojis', 'Memoricé — Íconos']);
    for (const s of sets) {
      expect(s.es_predeterminado).toBe(true);
    }
  });

  it('cada set tiene 12 items con imagen_url emoji:X', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    const sets = await services.set.listarSetsPorJuego(memoria.id);

    for (const set of sets) {
      const items = await services.set.listarItemsDeSet(set.id);
      expect(items).toHaveLength(12);
      for (const item of items) {
        expect(item.contenido.imagen_url).toMatch(/^emoji:/);
        expect(item.contenido).not.toHaveProperty('contenido');
      }
    }
  });

  it('es idempotente: llamar 2 veces no duplica', async () => {
    const { services, registry } = await bootstrap(adapter);
    await seedMemoriaPredeterminados(services, registry);
    await seedMemoriaPredeterminados(services, registry);

    const juegos = await services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    const sets = await services.set.listarSetsPorJuego(memoria.id);
    expect(sets).toHaveLength(2);
  });

  it('bootstrap dos veces no duplica sets', async () => {
    await bootstrap(adapter);
    await bootstrap(adapter);

    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    const sets = await services.set.listarSetsPorJuego(memoria.id);
    expect(sets).toHaveLength(2);
  });

  it('no-op si el juego MEMORIA no existe', async () => {
    const creados = await seedMemoriaPredeterminados({
      juego: { listarJuegos: async () => [] },
      set: {
        listarSetsPorJuego: async () => { throw new Error('no debe llamarse'); },
        crearSet: async () => { throw new Error('no debe llamarse'); },
        agregarItem: async () => { throw new Error('no debe llamarse'); }
      }
    }, null);
    expect(creados).toEqual([]);
  });

  it('los items del set Emojis empiezan con emoji: y no son storageRefs', async () => {
    const { services } = await bootstrap(adapter);
    const juegos = await services.juego.listarJuegos();
    const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
    const sets = await services.set.listarSetsPorJuego(memoria.id);
    const emojis = sets.find((s) => s.nombre === 'Memoricé — Emojis');
    const items = await services.set.listarItemsDeSet(emojis.id);

    expect(items[0].contenido.imagen_url).toBe('emoji:🐶');
    expect(items[0].contenido.imagen_url).not.toMatch(/^[0-9a-f-]{36}$/i);
  });
});
