/* =============================================================
   SnapshotRepository — snapshots inmutables de Set.

   Reglas:
   - SetSnapshot es INMUTABLE. No existe update.
   - source_set_name y source_version se obtienen del Set real,
     no del llamador.
   - source_set_id nullable (SET NULL al eliminar el Set).
   - Compartible entre múltiples circuito_juegos / juego_ejecutados.
   - Reutilización solo en actualizarSnapshotDeCircuitoJuego cuando
     existe un snapshot con (source_set_id, source_version).
   - Eliminación solo si no hay referencias (RESTRICT).
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  SnapshotReferenciadoError,
  CircuitoNoEditableError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'set_snapshots';
const STORE_SETS = 'sets';
const STORE_CIRCUITO_JUEGOS = 'circuito_juegos';
const STORE_CIRCUITOS = 'circuitos';
const STORE_JUEGO_EJECUTADOS = 'juego_ejecutados';

export class SnapshotRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  /**
   * Obtiene un snapshot por su id.
   *
   * @param {string} snapshotId - ID del snapshot.
   * @returns {Promise<object|null>} El snapshot o null.
   */
  async obtenerSnapshot(snapshotId) {
    return this.obtener(snapshotId);
  }

  /**
   * Lista snapshots por source_set_id, ordenados por versión descendente.
   *
   * @param {string} setId - ID del set origen.
   * @returns {Promise<Array>} Lista de snapshots.
   */
  async listarSnapshotsPorSet(setId) {
    validarNoVacio(setId, 'setId');
    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(this.storeName, {
        eq: { source_set_id: setId }
      });
      return lista.sort((a, b) => b.source_version - a.source_version);
    }
    const lista = await this.listarPorIndice('set_snapshot_source_set_id', setId);
    return lista.sort((a, b) => b.source_version - a.source_version);
  }

  /**
   * Crea un snapshot desde un set con contenido explícito.
   *
   * IMPORTANTE: firma sobrecargada.
   * - Modo Supabase: crearSnapshotDesdeSet(setId, juegoId, contenido)
   * - Modo IndexedDB: crearSnapshotDesdeSet(setId, juegoId, contenido)
   *
   * @param {string} setId - ID del set origen.
   * @param {string} juegoId - ID del juego asociado.
   * @param {object} contenido - Contenido del snapshot.
   * @returns {Promise<object>} El snapshot creado.
   */
  async crearSnapshotDesdeSet(setId, juegoId, contenido) {
    validarNoVacio(setId, 'setId');
    validarNoVacio(juegoId, 'juegoId');
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('contenido debe ser un objeto');
    }

    if (this.modo === 'supabase') {
      const set = await this.adapter.query(STORE_SETS, {
        eq: { id: setId },
        single: true
      });
      if (!set) throw new NoEncontradoError('Set', setId);

      const snapshot = {
        id: nuevoId(),
        source_set_id: set.id,
        source_set_name: set.nombre,
        source_version: set.version,
        juego_id: juegoId,
        contenido,
        created_at: ahora()
      };

      return this.agregarRegistro(snapshot);
    }

    const set = await this.adapter.tx([STORE_SETS], 'readonly', (tx, resolver) => {
      const req = tx.objectStore(STORE_SETS).get(setId);
      req.onsuccess = () => resolver(req.result);
    });

    if (!set) throw new NoEncontradoError('Set', setId);

    const snapshot = {
      id: nuevoId(),
      source_set_id: set.id,
      source_set_name: set.nombre,
      source_version: set.version,
      juego_id: juegoId,
      contenido,
      created_at: ahora()
    };

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.agregar(tx, snapshot);
    });

    return snapshot;
  }

  /**
   * Crea un snapshot usando la RPC crear_snapshot (Supabase)
   * o la lógica nativa (IndexedDB).
   *
   * @param {string} setId - ID del set a snapshottear.
   * @param {string} actionId - ID de acción para idempotencia.
   * @returns {Promise<object>} Resultado de la operación.
   */
  async crearSnapshot(setId, actionId) {
    validarNoVacio(setId, 'setId');
    validarNoVacio(actionId, 'actionId');

    if (this.modo === 'supabase') {
      return this.adapter.rpc('crear_snapshot', {
        p_set_id: setId,
        p_action_id: actionId
      });
    }

    return this.crearSnapshotDesdeSet(setId, null, {});
  }

  /**
   * Actualiza el snapshot de un circuito_juego.
   * En Supabase: lógica simplificada con queries directas.
   * En IndexedDB: transacción compleja con reutilización.
   *
   * @param {string} circuitoJuegoId - ID del circuito_juego.
   * @returns {Promise<object>} { snapshot, reutilizado }.
   */
  async actualizarSnapshotDeCircuitoJuego(circuitoJuegoId) {
    validarNoVacio(circuitoJuegoId, 'circuitoJuegoId');

    if (this.modo === 'supabase') {
      const cj = await this.adapter.query(STORE_CIRCUITO_JUEGOS, {
        eq: { id: circuitoJuegoId },
        single: true
      });
      if (!cj) throw new NoEncontradoError('CircuitoJuego', circuitoJuegoId);

      const circuito = await this.adapter.query(STORE_CIRCUITOS, {
        eq: { id: cj.circuito_id },
        single: true
      });
      if (!circuito) throw new NoEncontradoError('Circuito', cj.circuito_id);

      if (circuito.estado !== 'BORRADOR') {
        throw new CircuitoNoEditableError(circuito.id, circuito.estado);
      }

      const sets = await this.adapter.query(STORE_SETS, {
        eq: { juego_id: cj.juego_id }
      });
      const set = sets.find((s) => s.activo === true) || sets[0];
      if (!set) throw new NoEncontradoError('Set activo para juego', cj.juego_id);

      const existentes = await this.adapter.query(this.storeName, {
        eq: { source_set_id: set.id, source_version: set.version }
      });
      let snapshot = existentes.length > 0 ? existentes[0] : null;
      const reutilizado = !!snapshot;

      if (!snapshot) {
        const snapshotData = {
          id: nuevoId(),
          source_set_id: set.id,
          source_set_name: set.nombre,
          source_version: set.version,
          juego_id: cj.juego_id,
          contenido: {},
          created_at: ahora()
        };
        snapshot = await this.agregarRegistro(snapshotData);
      }

      await this.adapter.update(STORE_CIRCUITO_JUEGOS, {
        eq: { id: circuitoJuegoId }
      }, {
        ...cj,
        snapshot_id: snapshot.id,
        updated_at: ahora()
      });

      await this.adapter.update(STORE_CIRCUITOS, {
        eq: { id: circuito.id }
      }, {
        ...circuito,
        version: circuito.version + 1,
        updated_at: ahora()
      });

      return { snapshot, reutilizado };
    }

    return this.adapter.tx(
      [STORE_CIRCUITO_JUEGOS, STORE_CIRCUITOS, STORE_SETS, STORE],
      'readwrite',
      (tx, resolver) => {
        const cjStore = tx.objectStore(STORE_CIRCUITO_JUEGOS);
        const reqCj = cjStore.get(circuitoJuegoId);

        reqCj.onsuccess = () => {
          const circuitoJuego = reqCj.result;
          if (!circuitoJuego) {
            resolver({ error: new NoEncontradoError('CircuitoJuego', circuitoJuegoId) });
            return;
          }

          const circuitoStore = tx.objectStore(STORE_CIRCUITOS);
          const reqCircuito = circuitoStore.get(circuitoJuego.circuito_id);

          reqCircuito.onsuccess = () => {
            const circuito = reqCircuito.result;
            if (!circuito) {
              resolver({ error: new NoEncontradoError('Circuito', circuitoJuego.circuito_id) });
              return;
            }

            if (circuito.estado !== 'BORRADOR') {
              resolver({ error: new CircuitoNoEditableError(circuito.id, circuito.estado) });
              return;
            }

            const setStore = tx.objectStore(STORE_SETS);
            const reqSets = setStore.index('set_juego_id').getAll(circuitoJuego.juego_id);

            reqSets.onsuccess = () => {
              const sets = reqSets.result;
              const set = sets.find((s) => s.activo === true) || sets[0];

              if (!set) {
                resolver({ error: new NoEncontradoError('Set activo para juego', circuitoJuego.juego_id) });
                return;
              }

              const snapshotStore = tx.objectStore(STORE);
              const idx = snapshotStore.index('set_snapshot_source_set_id_source_version');
              const reqSnap = idx.get([set.id, set.version]);

              reqSnap.onsuccess = () => {
                let snapshot = reqSnap.result;
                const reutilizado = !!snapshot;

                if (!snapshot) {
                  snapshot = {
                    id: nuevoId(),
                    source_set_id: set.id,
                    source_set_name: set.nombre,
                    source_version: set.version,
                    juego_id: circuitoJuego.juego_id,
                    contenido: {},
                    created_at: ahora()
                  };
                  snapshotStore.add(snapshot);
                }

                cjStore.put({
                  ...circuitoJuego,
                  snapshot_id: snapshot.id,
                  updated_at: ahora()
                });

                circuitoStore.put({
                  ...circuito,
                  version: circuito.version + 1,
                  updated_at: ahora()
                });

                resolver({ snapshot, reutilizado });
              };

              reqSnap.onerror = () => tx.abort();
            };

            reqSets.onerror = () => tx.abort();
          };

          reqCircuito.onerror = () => tx.abort();
        };

        reqCj.onerror = () => tx.abort();
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r;
    });
  }

  /**
   * Elimina un snapshot si no tiene referencias.
   *
   * @param {string} snapshotId - ID del snapshot a eliminar.
   * @returns {Promise<boolean>} true si se eliminó.
   */
  async _eliminarSiNoReferenciado(snapshotId) {
    validarNoVacio(snapshotId, 'snapshotId');

    if (this.modo === 'supabase') {
      const snapshot = await this.obtener(snapshotId);
      if (!snapshot) throw new NoEncontradoError('SetSnapshot', snapshotId);

      const refsCj = await this.adapter.query(STORE_CIRCUITO_JUEGOS, {
        eq: { snapshot_id: snapshotId }
      });
      const refsJe = await this.adapter.query(STORE_JUEGO_EJECUTADOS, {
        eq: { snapshot_id: snapshotId }
      });
      const total = refsCj.length + refsJe.length;

      if (total > 0) {
        throw new SnapshotReferenciadoError(snapshotId);
      }

      await this.eliminarRegistro(snapshotId);
      return true;
    }

    return this.adapter.tx(
      [STORE, STORE_CIRCUITO_JUEGOS, STORE_JUEGO_EJECUTADOS],
      'readwrite',
      (tx, resolver) => {
        const snapshotStore = tx.objectStore(STORE);
        const reqSnap = snapshotStore.get(snapshotId);

        reqSnap.onsuccess = () => {
          const snapshot = reqSnap.result;
          if (!snapshot) {
            resolver({ error: new NoEncontradoError('SetSnapshot', snapshotId) });
            return;
          }

          const idxCj = tx
            .objectStore(STORE_CIRCUITO_JUEGOS)
            .index('circuito_juego_snapshot_id');
          const reqCj = idxCj.count(snapshotId);

          reqCj.onsuccess = () => {
            const refsCj = reqCj.result;

            const idxJe = tx
              .objectStore(STORE_JUEGO_EJECUTADOS)
              .index('juego_ejecutado_snapshot_id');
            const reqJe = idxJe.count(snapshotId);

            reqJe.onsuccess = () => {
              const refsJe = reqJe.result;
              const total = refsCj + refsJe;

              if (total > 0) {
                resolver({
                  error: new SnapshotReferenciadoError(snapshotId),
                  refs: { circuito_juegos: refsCj, juego_ejecutados: refsJe }
                });
                return;
              }

              snapshotStore.delete(snapshotId);
              resolver({ eliminado: true });
            };

            reqJe.onerror = () => tx.abort();
          };

          reqCj.onerror = () => tx.abort();
        };

        reqSnap.onerror = () => tx.abort();
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r;
    });
  }
}
