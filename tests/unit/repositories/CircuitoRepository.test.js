import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { CircuitoRepository } from '../../../src/repositories/CircuitoRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function payloadValido(overrides = {}) {
  return {
    nombre: 'Noche de Juegos',
    juegos: [
      { juego_id: 'j1' },
      { juego_id: 'j2' }
    ],
    equipos: [
      { posicion: 1, nombre: 'Los Rojos', color: '#E53E3E' },
      { posicion: 2, nombre: 'Los Amarillos', color: '#F6E05E' }
    ],
    ...overrides
  };
}

describe('CircuitoRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new CircuitoRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  describe('crearCircuito', () => {
    it('crea un circuito BORRADOR con version=1', async () => {
      const c = await repo.crearCircuito(payloadValido());
      expect(c.id).toBeTruthy();
      expect(c.estado).toBe('BORRADOR');
      expect(c.es_plantilla).toBe(false);
      expect(c.version).toBe(1);
    });

    it('crea los circuito_juegos con orden 1..N', async () => {
      const c = await repo.crearCircuito(payloadValido());
      const completo = await repo.obtenerCircuitoCompleto(c.id);
      expect(completo.juegos.map((j) => j.orden)).toEqual([1, 2]);
      expect(completo.juegos.map((j) => j.juego_id)).toEqual(['j1', 'j2']);
    });

    it('crea exactamente 2 equipo_circuitos', async () => {
      const c = await repo.crearCircuito(payloadValido());
      const completo = await repo.obtenerCircuitoCompleto(c.id);
      expect(completo.equipos).toHaveLength(2);
      expect(completo.equipos.map((e) => e.posicion)).toEqual([1, 2]);
    });

    it('rechaza si no hay nombre', async () => {
      await expect(
        repo.crearCircuito(payloadValido({ nombre: '' }))
      ).rejects.toThrow(/nombre/);
    });

    it('rechaza si no hay juegos', async () => {
      await expect(
        repo.crearCircuito(payloadValido({ juegos: [] }))
      ).rejects.toThrow(/al menos 1 juego/);
    });

    it('rechaza si hay 1 solo equipo', async () => {
      await expect(
        repo.crearCircuito(payloadValido({
          equipos: [{ posicion: 1, nombre: 'A', color: '#000000' }]
        }))
      ).rejects.toThrow(/exactamente 2 equipos/);
    });

    it('rechaza si hay 3 equipos', async () => {
      await expect(
        repo.crearCircuito(payloadValido({
          equipos: [
            { posicion: 1, nombre: 'A', color: '#000000' },
            { posicion: 2, nombre: 'B', color: '#111111' },
            { posicion: 1, nombre: 'C', color: '#222222' }
          ]
        }))
      ).rejects.toThrow(/exactamente 2 equipos/);
    });

    it('rechaza si hay posiciones duplicadas', async () => {
      await expect(
        repo.crearCircuito(payloadValido({
          equipos: [
            { posicion: 1, nombre: 'A', color: '#000000' },
            { posicion: 1, nombre: 'B', color: '#111111' }
          ]
        }))
      ).rejects.toThrow(/posiciones duplicadas/);
    });

    it('rechaza si el color no es #RRGGBB', async () => {
      await expect(
        repo.crearCircuito(payloadValido({
          equipos: [
            { posicion: 1, nombre: 'A', color: 'rojo' },
            { posicion: 2, nombre: 'B', color: '#111111' }
          ]
        }))
      ).rejects.toThrow(/color/);
    });
  });

  describe('obtenerCircuito', () => {
    it('devuelve null si no existe', async () => {
      expect(await repo.obtenerCircuito('nope')).toBeUndefined();
    });

    it('devuelve el circuito si existe', async () => {
      const c = await repo.crearCircuito(payloadValido());
      const encontrado = await repo.obtenerCircuito(c.id);
      expect(encontrado.id).toBe(c.id);
    });
  });

  describe('listarCircuitos / listarPlantillas', () => {
    it('listarCircuitos devuelve todos ordenados por nombre', async () => {
      await repo.crearCircuito(payloadValido({ nombre: 'Zeta' }));
      await repo.crearCircuito(payloadValido({ nombre: 'Alfa' }));
      const lista = await repo.listarCircuitos();
      expect(lista.map((c) => c.nombre)).toEqual(['Alfa', 'Zeta']);
    });

    it('listarPlantillas devuelve solo es_plantilla=true', async () => {
      const c1 = await repo.crearCircuito(payloadValido({ nombre: 'A' }));
      await repo.crearCircuito(payloadValido({ nombre: 'B' }));

      await repo.actualizarCircuito(c1.id, 1, {
        ...payloadValido({ nombre: 'A' }),
        estado: 'LISTO',
        es_plantilla: true
      });

      const plantillas = await repo.listarPlantillas();
      expect(plantillas).toHaveLength(1);
      expect(plantillas[0].nombre).toBe('A');
    });
  });

  describe('obtenerCircuitoCompleto', () => {
    it('devuelve circuito + juegos ordenados + equipos ordenados', async () => {
      const c = await repo.crearCircuito(payloadValido());
      const completo = await repo.obtenerCircuitoCompleto(c.id);

      expect(completo.circuito.id).toBe(c.id);
      expect(completo.juegos).toHaveLength(2);
      expect(completo.equipos).toHaveLength(2);
      expect(completo.juegos[0].orden).toBe(1);
      expect(completo.equipos[0].posicion).toBe(1);
    });

    it('devuelve { circuito: null, juegos: [], equipos: [] } si no existe', async () => {
      const completo = await repo.obtenerCircuitoCompleto('nope');
      expect(completo.circuito).toBeNull();
      expect(completo.juegos).toEqual([]);
      expect(completo.equipos).toEqual([]);
    });
  });

  describe('actualizarCircuito', () => {
    it('incrementa version una sola vez aunque cambien varios hijos', async () => {
      const c = await repo.crearCircuito(payloadValido());

      const up = await repo.actualizarCircuito(c.id, 1, {
        nombre: 'Nuevo nombre',
        juegos: [
          { juego_id: 'j3' },
          { juego_id: 'j4' },
          { juego_id: 'j5' }
        ],
        equipos: [
          { posicion: 1, nombre: 'X', color: '#111111' },
          { posicion: 2, nombre: 'Y', color: '#222222' }
        ]
      });

      expect(up.version).toBe(2);
      expect(up.nombre).toBe('Nuevo nombre');
    });

    it('reemplaza juegos y equipos', async () => {
      const c = await repo.crearCircuito(payloadValido());

      await repo.actualizarCircuito(c.id, 1, {
        nombre: 'Nuevo',
        juegos: [{ juego_id: 'j9' }],
        equipos: [
          { posicion: 1, nombre: 'P', color: '#333333' },
          { posicion: 2, nombre: 'Q', color: '#444444' }
        ]
      });

      const completo = await repo.obtenerCircuitoCompleto(c.id);
      expect(completo.juegos).toHaveLength(1);
      expect(completo.juegos[0].juego_id).toBe('j9');
      expect(completo.equipos[0].nombre).toBe('P');
    });

    it('rechaza si expectedVersion no coincide', async () => {
      const c = await repo.crearCircuito(payloadValido());
      await expect(
        repo.actualizarCircuito(c.id, 99, payloadValido())
      ).rejects.toThrow(/Conflicto de versión/);
    });

    it('rechaza si el circuito no existe', async () => {
      await expect(
        repo.actualizarCircuito('nope', 1, payloadValido())
      ).rejects.toThrow(/no encontrado/);
    });

    it('rechaza si el circuito no está BORRADOR', async () => {
      const c = await repo.crearCircuito(payloadValido());
      await repo.actualizarCircuito(c.id, 1, {
        ...payloadValido(),
        estado: 'LISTO'
      });

      await expect(
        repo.actualizarCircuito(c.id, 2, payloadValido())
      ).rejects.toThrow(/no es editable/);
    });

    it('permite pasar a LISTO y marcar es_plantilla', async () => {
      const c = await repo.crearCircuito(payloadValido());
      const up = await repo.actualizarCircuito(c.id, 1, {
        ...payloadValido(),
        estado: 'LISTO',
        es_plantilla: true
      });
      expect(up.estado).toBe('LISTO');
      expect(up.es_plantilla).toBe(true);
    });

    it('rechaza es_plantilla=true con estado=BORRADOR', async () => {
      const c = await repo.crearCircuito(payloadValido());
      await expect(
        repo.actualizarCircuito(c.id, 1, {
          ...payloadValido(),
          estado: 'BORRADOR',
          es_plantilla: true
        })
      ).rejects.toThrow(/es_plantilla/);
    });

    it('rechaza una actualización concurrente con expectedVersion obsoleto', async () => {
      const c = await repo.crearCircuito(payloadValido());

      const payloadA = payloadValido({
        nombre: 'Actualización A',
        juegos: [
          { juego_id: 'j3' },
          { juego_id: 'j4' }
        ]
      });

      const payloadB = payloadValido({
        nombre: 'Actualización B',
        juegos: [
          { juego_id: 'j5' },
          { juego_id: 'j6' }
        ]
      });

      const resultados = await Promise.allSettled([
        repo.actualizarCircuito(c.id, 1, payloadA),
        repo.actualizarCircuito(c.id, 1, payloadB)
      ]);

      const exitos = resultados.filter(
        (r) => r.status === 'fulfilled'
      );

      const errores = resultados.filter(
        (r) => r.status === 'rejected'
      );

      expect(exitos).toHaveLength(1);
      expect(errores).toHaveLength(1);

      expect(errores[0].reason.message).toMatch(
        /Conflicto de versión/
      );

      const completo = await repo.obtenerCircuitoCompleto(c.id);

      expect(completo.circuito.version).toBe(2);

      expect([
        'Actualización A',
        'Actualización B'
      ]).toContain(completo.circuito.nombre);

      const juegos = completo.juegos
        .map((j) => j.juego_id)
        .sort();

      const juegosA = ['j3', 'j4'].sort();
      const juegosB = ['j5', 'j6'].sort();

      expect(
        JSON.stringify(juegos) === JSON.stringify(juegosA) ||
        JSON.stringify(juegos) === JSON.stringify(juegosB)
      ).toBe(true);
    });

    it('rechaza payload inválido (equipos != 2)', async () => {
      const c = await repo.crearCircuito(payloadValido());
      await expect(
        repo.actualizarCircuito(c.id, 1, payloadValido({
          equipos: [{ posicion: 1, nombre: 'X', color: '#000000' }]
        }))
      ).rejects.toThrow(/exactamente 2 equipos/);
    });
  });

  describe('eliminarCircuito', () => {
    it('elimina el circuito y sus hijos', async () => {
      const c = await repo.crearCircuito(payloadValido());
      await repo.eliminarCircuito(c.id);

      expect(await repo.obtenerCircuito(c.id)).toBeUndefined();

      const completo = await repo.obtenerCircuitoCompleto(c.id);
      expect(completo.juegos).toHaveLength(0);
      expect(completo.equipos).toHaveLength(0);
    });

    it('rechaza si el circuito no existe', async () => {
      await expect(repo.eliminarCircuito('nope')).rejects.toThrow(/no encontrado/);
    });

    it('rechaza si hay una partida EN_CURSO asociada', async () => {
      const c = await repo.crearCircuito(payloadValido());

      await adapter.tx(['partidas'], 'readwrite', (tx) => {
        tx.objectStore('partidas').add({
          id: 'p1',
          circuito_id: c.id,
          estado: 'EN_CURSO'
        });
      });

      await expect(repo.eliminarCircuito(c.id)).rejects.toBeTruthy();
    });

    it('permite eliminar si solo hay partidas terminadas', async () => {
      const c = await repo.crearCircuito(payloadValido());

      await adapter.tx(['partidas'], 'readwrite', (tx) => {
        tx.objectStore('partidas').add({
          id: 'p1',
          circuito_id: c.id,
          estado: 'FINALIZADA'
        });
      });

      await repo.eliminarCircuito(c.id);

      expect(await repo.obtenerCircuito(c.id)).toBeUndefined();
    });
  });
});
