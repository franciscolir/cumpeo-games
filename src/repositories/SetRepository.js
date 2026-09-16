/* =============================================================
   SetRepository — sets + items de set.
   Reglas:
   - Set.version incrementa en cada modificación persistida del
     CONTENIDO (nombre, descripcion, items).
   - desactivarSet NO incrementa version (metadata operativa).
   - ItemSet.orden: 1-based, único por set, sin gaps.
   - Eliminar Set: cascada manual sobre item_sets + source_set_id=NULL
     en set_snapshots. Todo en una transacción.
   -------------------------------------------------------------
   Nota sobre el índice único (set_id, orden):
   IndexedDB evalúa el índice único en cada `put`. Para evitar
   colisiones temporales al reordenar/insertar, se procesan los
   desplazamientos en orden adecuado o en dos fases.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE_SETS = 'sets';
const STORE_ITEMS = 'item_sets';
const STORE_SNAPSHOTS = 'set_snapshots';

const OFFSET_TEMPORAL = 1000000;

export class SetRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE_SETS);
  }

  /* =============================================================
     Sets
     ============================================================= */

  async crearSet({ juego_id, nombre, descripcion = null, orden_catalogo = null }) {
    validarNoVacio(juego_id, 'juego_id');
    validarNoVacio(nombre, 'nombre');

    const ts = ahora();
    const set = {
      id: nuevoId(),
      juego_id,
      nombre,
      descripcion,
      version: 1,
      orden_catalogo,
      activo: true,
      created_at: ts,
      updated_at: ts
    };

    await this.adapter.tx([STORE_SETS], 'readwrite', (tx) => {
      this.agregar(tx, set);
    });

    return set;
  }

  async obtenerSet(setId) {
    return this.obtener(setId);
  }

  async listarSetsPorJuego(juegoId) {
    validarNoVacio(juegoId, 'juego_id');
    const lista = await this.listarPorIndice('set_juego_id', juegoId);
    return lista.sort((a, b) => this._comparar(a, b));
  }

  async listarSetsActivosPorJuego(juegoId) {
    const todos = await this.listarSetsPorJuego(juegoId);
    return todos.filter((s) => s.activo === true);
  }

  async actualizarSet(setId, cambios) {
    validarNoVacio(setId, 'setId');

    return this.adapter.tx([STORE_SETS], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE_SETS);
      const req = store.get(setId);

      req.onsuccess = () => {
        const actual = req.result;

        if (!actual) {
          resolver({ error: new NoEncontradoError('Set', setId) });
          return;
        }

        const permitidos = ['nombre', 'descripcion', 'orden_catalogo'];
        const actualizado = { ...actual };
        let cambioContenido = false;

        for (const campo of permitidos) {
          if (Object.prototype.hasOwnProperty.call(cambios, campo)) {
            if (actual[campo] !== cambios[campo]) {
              cambioContenido = true;
            }
            actualizado[campo] = cambios[campo];
          }
        }

        if (actualizado.nombre != null) {
          try {
            validarNoVacio(actualizado.nombre, 'nombre');
          } catch (error) {
            resolver({ error });
            return;
          }
        }

        if (!cambioContenido) {
          resolver({ set: actual });
          return;
        }

        const ts = ahora();

        actualizado.version = actual.version + 1;
        actualizado.updated_at = ts;

        store.put(actualizado);
        resolver({ set: actualizado });
      };

      req.onerror = () => tx.abort();
    }).then((r) => {
      if (r && r.error) throw r.error;
      return r.set;
    });
  }

  async desactivarSet(setId) {
    const actual = await this.obtener(setId);
    if (!actual) throw new NoEncontradoError('Set', setId);

    const actualizado = { ...actual, activo: false, updated_at: ahora() };

    await this.adapter.tx([STORE_SETS], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async eliminarSet(setId) {
    const actual = await this.obtener(setId);
    if (!actual) throw new NoEncontradoError('Set', setId);

    await this.adapter.tx(
      [STORE_SETS, STORE_ITEMS, STORE_SNAPSHOTS],
      'readwrite',
      (tx) => {
        const itemsStore = tx.objectStore(STORE_ITEMS);
        const idxItems = itemsStore.index('item_set_set_id');
        const reqItems = idxItems.getAllKeys(setId);
        reqItems.onsuccess = () => {
          for (const key of reqItems.result) {
            itemsStore.delete(key);
          }
        };

        const snapStore = tx.objectStore(STORE_SNAPSHOTS);
        const idxSnap = snapStore.index('set_snapshot_source_set_id');
        const reqSnap = idxSnap.getAll(setId);
        reqSnap.onsuccess = () => {
          for (const snap of reqSnap.result) {
            snapStore.put({ ...snap, source_set_id: null });
          }
        };

        tx.objectStore(STORE_SETS).delete(setId);
      }
    );
  }

  /* =============================================================
     Items de set
     ============================================================= */

  async obtenerItem(itemId) {
    return this.adapter.tx([STORE_ITEMS], 'readonly', (tx, resolver) => {
      const req = tx.objectStore(STORE_ITEMS).get(itemId);
      req.onsuccess = () => resolver(req.result);
    });
  }

  async listarItemsDeSet(setId) {
    validarNoVacio(setId, 'set_id');
    const lista = await this.adapter.tx([STORE_ITEMS], 'readonly', (tx, resolver) => {
      const idx = tx.objectStore(STORE_ITEMS).index('item_set_set_id');
      const req = idx.getAll(setId);
      req.onsuccess = () => resolver(req.result);
    });
    return lista.sort((a, b) => a.orden - b.orden);
  }

  async agregarItem(setId, contenido, { posicion = null } = {}) {
    const set = await this.obtener(setId);
    if (!set) throw new NoEncontradoError('Set', setId);
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('contenido del item debe ser un objeto');
    }

    const ts = ahora();
    const itemId = nuevoId();

    await this.adapter.tx([STORE_SETS, STORE_ITEMS], 'readwrite', (tx, resolver) => {
      const setsStore = tx.objectStore(STORE_SETS);
      const reqSet = setsStore.get(setId);

      reqSet.onsuccess = () => {
        const setActual = reqSet.result;

        if (!setActual) {
          resolver({ error: new NoEncontradoError('Set', setId) });
          return;
        }

        const itemsStore = tx.objectStore(STORE_ITEMS);
        const idx = itemsStore.index('item_set_set_id');
        const req = idx.getAll(setId);

        req.onsuccess = () => {
          const items = req.result.sort((a, b) => a.orden - b.orden);
          const total = items.length;

          let nuevaPos;
          if (posicion == null) {
            nuevaPos = total + 1;
          } else if (
            Number.isInteger(posicion) &&
            posicion >= 1 &&
            posicion <= total + 1
          ) {
            nuevaPos = posicion;
          } else {
            tx.abort();
            return;
          }

          if (nuevaPos <= total) {
            const aDesplazar = items
              .filter((it) => it.orden >= nuevaPos)
              .sort((a, b) => b.orden - a.orden);

            for (const it of aDesplazar) {
              itemsStore.put({ ...it, orden: it.orden + 1 });
            }
          }

          const nuevoItem = {
            id: itemId,
            set_id: setId,
            orden: nuevaPos,
            contenido,
            created_at: ts,
            updated_at: ts
          };

          itemsStore.add(nuevoItem);

          setsStore.put({
            ...setActual,
            version: setActual.version + 1,
            updated_at: ts
          });

          resolver(nuevoItem);
        };

        req.onerror = () => tx.abort();
      };

      reqSet.onerror = () => tx.abort();
    });

    return this.obtenerItem(itemId);
  }

  async actualizarItem(itemId, contenido) {
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('contenido del item debe ser un objeto');
    }

    return this.adapter.tx(
      [STORE_SETS, STORE_ITEMS],
      'readwrite',
      (tx, resolver) => {
        const itemsStore = tx.objectStore(STORE_ITEMS);
        const setsStore = tx.objectStore(STORE_SETS);

        const reqItem = itemsStore.get(itemId);

        reqItem.onsuccess = () => {
          const itemActual = reqItem.result;

          if (!itemActual) {
            resolver({ error: new NoEncontradoError('ItemSet', itemId) });
            return;
          }

          const reqSet = setsStore.get(itemActual.set_id);

          reqSet.onsuccess = () => {
            const set = reqSet.result;

            if (!set) {
              resolver({ error: new NoEncontradoError('Set', itemActual.set_id) });
              return;
            }

            const ts = ahora();
            const itemActualizado = {
              ...itemActual,
              contenido,
              updated_at: ts
            };

            itemsStore.put(itemActualizado);
            setsStore.put({
              ...set,
              version: set.version + 1,
              updated_at: ts
            });

            resolver({ item: itemActualizado });
          };

          reqSet.onerror = () => tx.abort();
        };

        reqItem.onerror = () => tx.abort();
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.item;
    });
  }

  async eliminarItem(itemId) {
    return this.adapter.tx(
      [STORE_SETS, STORE_ITEMS],
      'readwrite',
      (tx, resolver) => {
        const itemsStore = tx.objectStore(STORE_ITEMS);
        const setsStore = tx.objectStore(STORE_SETS);

        const reqItem = itemsStore.get(itemId);

        reqItem.onsuccess = () => {
          const item = reqItem.result;

          if (!item) {
            resolver({ error: new NoEncontradoError('ItemSet', itemId) });
            return;
          }

          const reqSet = setsStore.get(item.set_id);

          reqSet.onsuccess = () => {
            const set = reqSet.result;

            if (!set) {
              resolver({
                error: new NoEncontradoError('Set', item.set_id)
              });
              return;
            }

            const ts = ahora();

            itemsStore.delete(itemId);

            const idx = itemsStore.index('item_set_set_id');
            const req = idx.getAll(item.set_id);

            req.onsuccess = () => {
              const aRenumerar = req.result
                .filter((it) => it.orden > item.orden)
                .sort((a, b) => a.orden - b.orden);

              for (const it of aRenumerar) {
                itemsStore.put({
                  ...it,
                  orden: it.orden - 1,
                  updated_at: ts
                });
              }

              setsStore.put({
                ...set,
                version: set.version + 1,
                updated_at: ts
              });

              resolver(true);
            };

            req.onerror = () => tx.abort();
          };

          reqSet.onerror = () => tx.abort();
        };

        reqItem.onerror = () => tx.abort();
      }
    );
  }

  async reordenarItems(setId, ordenFinal) {
    if (!Array.isArray(ordenFinal)) {
      throw new ValidacionError('ordenFinal debe ser un array');
    }

    const ts = ahora();

    await this.adapter.tx(
      [STORE_SETS, STORE_ITEMS],
      'readwrite',
      (tx, resolver) => {
        const setsStore = tx.objectStore(STORE_SETS);
        const itemsStore = tx.objectStore(STORE_ITEMS);

        const reqSet = setsStore.get(setId);

        reqSet.onsuccess = () => {
          const set = reqSet.result;

          if (!set) {
            tx.abort();
            return;
          }

          const idx = itemsStore.index('item_set_set_id');
          const reqItems = idx.getAll(setId);

          reqItems.onsuccess = () => {
            const items = reqItems.result;
            const mapa = new Map(items.map((item) => [item.id, item]));

            /*
             * La lista recibida debe ser una permutación COMPLETA.
             * Nunca se infieren elementos faltantes.
             */
            if (ordenFinal.length !== items.length) {
              tx.abort();
              return;
            }

            const ids = new Set();

            for (const entrada of ordenFinal) {
              if (!entrada || typeof entrada.id !== 'string') {
                tx.abort();
                return;
              }

              if (!mapa.has(entrada.id)) {
                tx.abort();
                return;
              }

              if (ids.has(entrada.id)) {
                tx.abort();
                return;
              }

              ids.add(entrada.id);
            }

            /*
             * Fase 1:
             * eliminar todos los items del set.
             *
             * La transacción sigue abierta, por lo que todavía no
             * existe ningún estado parcialmente persistido.
             */
            for (const item of items) {
              itemsStore.delete(item.id);
            }

            /*
             * Fase 2:
             * insertar nuevamente todos los items en el orden final.
             */
            for (let i = 0; i < ordenFinal.length; i++) {
              const original = mapa.get(ordenFinal[i].id);

              itemsStore.add({
                ...original,
                orden: i + 1,
                updated_at: ts
              });
            }

            /*
             * El cambio de orden modifica el contenido del Set,
             * por lo tanto incrementa version dentro de la misma
             * transacción.
             */
            setsStore.put({
              ...set,
              version: set.version + 1,
              updated_at: ts
            });

            resolver(true);
          };

          reqItems.onerror = () => tx.abort();
        };

        reqSet.onerror = () => tx.abort();
      }
    );
  }

  _comparar(a, b) {
    const oa = a.orden_catalogo ?? Infinity;
    const ob = b.orden_catalogo ?? Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  }
}
