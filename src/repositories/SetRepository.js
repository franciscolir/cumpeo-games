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

   Modo Supabase: usa queries directas + RPC crear_set_completo.
   Modo IndexedDB: usa transacciones nativas.
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

  /**
   * Crea un set simple (sin items atómicos).
   *
   * @param {object} params - Datos del set.
   * @param {string} params.juego_id - ID del juego.
   * @param {string} params.nombre - Nombre del set.
   * @param {string|null} [params.descripcion] - Descripción.
   * @param {number|null} [params.orden_catalogo] - Orden en catálogo.
   * @param {boolean} [params.es_predeterminado=false] - Set predeterminado (no eliminable).
   * @returns {Promise<object>} El set creado.
   */
  async crearSet({
    juego_id,
    nombre,
    descripcion = null,
    orden_catalogo = null,
    es_predeterminado = false,
    submodo = null
  }) {
    validarNoVacio(juego_id, 'juego_id');
    validarNoVacio(nombre, 'nombre');

    if (this.modo === 'supabase') {
      const set = {
        id: nuevoId(),
        juego_id,
        nombre,
        descripcion,
        version: 1,
        orden_catalogo,
        activo: true,
        es_predeterminado,
        submodo,
        created_at: ahora(),
        updated_at: ahora()
      };

      return this.agregarRegistro(set);
    }

    const ts = ahora();
    const set = {
      id: nuevoId(),
      juego_id,
      nombre,
      descripcion,
      version: 1,
      orden_catalogo,
      activo: true,
      es_predeterminado,
      submodo,
      created_at: ts,
      updated_at: ts
    };

    await this.adapter.tx([STORE_SETS], 'readwrite', (tx) => {
      this.agregar(tx, set);
    });

    return set;
  }

  /**
   * Crea un set completo con items atómicamente (Supabase).
   *
   * @param {object} params - Datos del set.
   * @param {string} params.juego_id - ID del juego.
   * @param {string} params.nombre - Nombre del set.
   * @param {string|null} [params.descripcion] - Descripción.
   * @param {Array} params.items - Lista de items [{ orden, contenido }].
   * @param {string} params.actionId - ID de acción para idempotencia.
   * @returns {Promise<object>} { ok, set_id, items_count }
   */
  async crearSetCompleto({ juego_id, nombre, descripcion = null, items, actionId, submodo = null }) {
    validarNoVacio(juego_id, 'juego_id');
    validarNoVacio(nombre, 'nombre');
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidacionError('items requeridos (al menos 1)');
    }
    validarNoVacio(actionId, 'actionId');

    if (this.modo === 'supabase') {
      return this.adapter.rpc('crear_set_completo', {
        p_juego_id: juego_id,
        p_nombre: nombre,
        p_descripcion: descripcion,
        p_items: items.map((it, i) => ({
          orden: it.orden ?? i + 1,
          contenido: it.contenido ?? {}
        })),
        p_action_id: actionId
      });
    }

    return this.crearSet({ juego_id, nombre, descripcion, submodo });
  }

  /**
   * Obtiene un set por su id.
   *
   * @param {string} setId - ID del set.
   * @returns {Promise<object|null>} El set o null.
   */
  async obtenerSet(setId) {
    return this.obtener(setId);
  }

  /**
   * Lista sets por juego_id.
   *
   * @param {string} juegoId - ID del juego.
   * @returns {Promise<Array>} Lista de sets.
   */
  async listarSetsPorJuego(juegoId) {
    validarNoVacio(juegoId, 'juego_id');

    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(this.storeName, {
        eq: { juego_id: juegoId }
      });
      return lista.sort((a, b) => this._comparar(a, b));
    }

    const lista = await this.listarPorIndice('set_juego_id', juegoId);
    return lista.sort((a, b) => this._comparar(a, b));
  }

  /**
   * Lista sets activos por juego_id.
   *
   * @param {string} juegoId - ID del juego.
   * @returns {Promise<Array>} Lista de sets activos.
   */
  async listarSetsActivosPorJuego(juegoId) {
    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(this.storeName, {
        eq: { juego_id: juegoId, activo: true }
      });
      return lista.sort((a, b) => this._comparar(a, b));
    }

    const todos = await this.listarSetsPorJuego(juegoId);
    return todos.filter((s) => s.activo === true);
  }

  /**
   * Actualiza un set (nombre, descripcion, orden_catalogo).
   * Incrementa version si hay cambios de contenido.
   *
   * @param {string} setId - ID del set.
   * @param {object} cambios - Campos a actualizar.
   * @returns {Promise<object>} El set actualizado.
   */
  async actualizarSet(setId, cambios) {
    validarNoVacio(setId, 'setId');

    if (Object.prototype.hasOwnProperty.call(cambios, 'submodo')) {
      const sm = cambios.submodo;
      if (sm !== null && typeof sm !== 'string') {
        throw new ValidacionError('submodo debe ser string o null', { campo: 'submodo' });
      }
    }

    if (this.modo === 'supabase') {
      const actual = await this.obtener(setId);
      if (!actual) throw new NoEncontradoError('Set', setId);

      const permitidos = ['nombre', 'descripcion', 'orden_catalogo', 'submodo'];
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
        validarNoVacio(actualizado.nombre, 'nombre');
      }

      if (!cambioContenido) {
        return actual;
      }

      actualizado.version = actual.version + 1;
      actualizado.updated_at = ahora();

      await this.adapter.update(this.storeName, {
        eq: { id: setId }
      }, actualizado);

      return actualizado;
    }

    return this.adapter.tx([STORE_SETS], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE_SETS);
      const req = store.get(setId);

      req.onsuccess = () => {
        const actual = req.result;

        if (!actual) {
          resolver({ error: new NoEncontradoError('Set', setId) });
          return;
        }

        const permitidos = ['nombre', 'descripcion', 'orden_catalogo', 'submodo'];
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

  /**
   * Desactiva un set (no incrementa version).
   *
   * @param {string} setId - ID del set.
   * @returns {Promise<object>} El set desactivado.
   */
  async desactivarSet(setId) {
    const actual = await this.obtener(setId);
    if (!actual) throw new NoEncontradoError('Set', setId);

    const actualizado = { ...actual, activo: false, updated_at: ahora() };

    if (this.modo === 'supabase') {
      await this.adapter.update(this.storeName, {
        eq: { id: setId }
      }, actualizado);
      return actualizado;
    }

    await this.adapter.tx([STORE_SETS], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  /**
   * Elimina un set y sus hijos (items, snapshots).
   *
   * @param {string} setId - ID del set.
   * @returns {Promise<void>}
   */
  async eliminarSet(setId) {
    const actual = await this.obtener(setId);
    if (!actual) throw new NoEncontradoError('Set', setId);

    if (actual.es_predeterminado === true) {
      throw new ValidacionError('No se puede eliminar un set predeterminado');
    }

    if (this.modo === 'supabase') {
      await this.adapter.delete(STORE_ITEMS, { eq: { set_id: setId } });

      const snapshots = await this.adapter.query(STORE_SNAPSHOTS, {
        eq: { source_set_id: setId }
      });
      for (const snap of snapshots) {
        await this.adapter.update(STORE_SNAPSHOTS, {
          eq: { id: snap.id }
        }, { ...snap, source_set_id: null });
      }

      await this.eliminarRegistro(setId);
      return;
    }

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

  /**
   * Obtiene un item por su id.
   *
   * @param {string} itemId - ID del item.
   * @returns {Promise<object|null>} El item o null.
   */
  async obtenerItem(itemId) {
    if (this.modo === 'supabase') {
      return this.adapter.query(STORE_ITEMS, {
        eq: { id: itemId },
        single: true
      });
    }

    return this.adapter.tx([STORE_ITEMS], 'readonly', (tx, resolver) => {
      const req = tx.objectStore(STORE_ITEMS).get(itemId);
      req.onsuccess = () => resolver(req.result);
    });
  }

  /**
   * Lista items de un set, ordenados por orden.
   *
   * @param {string} setId - ID del set.
   * @returns {Promise<Array>} Lista de items.
   */
  async listarItemsDeSet(setId) {
    validarNoVacio(setId, 'set_id');

    if (this.modo === 'supabase') {
      const lista = await this.adapter.query(STORE_ITEMS, {
        eq: { set_id: setId }
      });
      return lista.sort((a, b) => a.orden - b.orden);
    }

    const lista = await this.adapter.tx([STORE_ITEMS], 'readonly', (tx, resolver) => {
      const idx = tx.objectStore(STORE_ITEMS).index('item_set_set_id');
      const req = idx.getAll(setId);
      req.onsuccess = () => resolver(req.result);
    });
    return lista.sort((a, b) => a.orden - b.orden);
  }

  /**
   * Agrega un item a un set.
   * Inserta en la posición indicada y renumera el resto.
   * Incrementa la versión del set.
   *
   * @param {string} setId - ID del set.
   * @param {object} contenido - Contenido del item.
   * @param {object} [opciones] - Opciones adicionales.
   * @param {number|null} [opciones.posicion] - Posición de inserción (1-based).
   * @returns {Promise<object>} El item creado.
   */
  async agregarItem(setId, contenido, { posicion = null } = {}) {
    const set = await this.obtener(setId);
    if (!set) throw new NoEncontradoError('Set', setId);
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('contenido del item debe ser un objeto');
    }

    if (this.modo === 'supabase') {
      const itemsActuales = await this.listarItemsDeSet(setId);
      const total = itemsActuales.length;

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
        throw new ValidacionError('posición inválida');
      }

      if (nuevaPos <= total) {
        const aDesplazar = itemsActuales
          .filter((it) => it.orden >= nuevaPos)
          .sort((a, b) => b.orden - a.orden);

        for (const it of aDesplazar) {
          await this.adapter.update(STORE_ITEMS, {
            eq: { id: it.id }
          }, { ...it, orden: it.orden + 1, updated_at: ahora() });
        }
      }

      const ts = ahora();
      const nuevoItem = {
        id: nuevoId(),
        set_id: setId,
        orden: nuevaPos,
        contenido,
        created_at: ts,
        updated_at: ts
      };

      await this.adapter.insert(STORE_ITEMS, nuevoItem, { returning: "*" });

      await this.adapter.update(this.storeName, {
        eq: { id: setId }
      }, {
        ...set,
        version: set.version + 1,
        updated_at: ts
      });

      return this.obtenerItem(nuevoItem.id);
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

  /**
   * Actualiza el contenido de un item.
   * Incrementa la versión del set.
   *
   * @param {string} itemId - ID del item.
   * @param {object} contenido - Nuevo contenido.
   * @returns {Promise<object>} El item actualizado.
   */
  async actualizarItem(itemId, contenido) {
    if (!contenido || typeof contenido !== 'object') {
      throw new ValidacionError('contenido del item debe ser un objeto');
    }

    if (this.modo === 'supabase') {
      const itemActual = await this.obtenerItem(itemId);
      if (!itemActual) throw new NoEncontradoError('ItemSet', itemId);

      const set = await this.obtener(itemActual.set_id);
      if (!set) throw new NoEncontradoError('Set', itemActual.set_id);

      const ts = ahora();
      const itemActualizado = {
        ...itemActual,
        contenido,
        updated_at: ts
      };

      await this.adapter.update(STORE_ITEMS, {
        eq: { id: itemId }
      }, itemActualizado);

      await this.adapter.update(this.storeName, {
        eq: { id: itemActual.set_id }
      }, {
        ...set,
        version: set.version + 1,
        updated_at: ts
      });

      return itemActualizado;
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

  /**
   * Elimina un item y renumera los posteriores.
   * Incrementa la versión del set.
   *
   * @param {string} itemId - ID del item.
   * @returns {Promise<boolean>} true si se eliminó.
   */
  async eliminarItem(itemId) {
    if (this.modo === 'supabase') {
      const item = await this.obtenerItem(itemId);
      if (!item) throw new NoEncontradoError('ItemSet', itemId);

      const set = await this.obtener(item.set_id);
      if (!set) throw new NoEncontradoError('Set', item.set_id);

      await this.adapter.delete(STORE_ITEMS, { eq: { id: itemId } });

      const itemsRestantes = await this.listarItemsDeSet(item.set_id);
      const aRenumerar = itemsRestantes
        .filter((it) => it.orden > item.orden)
        .sort((a, b) => a.orden - b.orden);

      const ts = ahora();
      for (const it of aRenumerar) {
        await this.adapter.update(STORE_ITEMS, {
          eq: { id: it.id }
        }, { ...it, orden: it.orden - 1, updated_at: ts });
      }

      await this.adapter.update(this.storeName, {
        eq: { id: item.set_id }
      }, {
        ...set,
        version: set.version + 1,
        updated_at: ts
      });

      return true;
    }

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

  /**
   * Reordena todos los items de un set.
   * Incrementa la versión del set.
   *
   * @param {string} setId - ID del set.
   * @param {Array} ordenFinal - Array completo de { id } en orden nuevo.
   * @returns {Promise<boolean>} true si se reordenó.
   */
  async reordenarItems(setId, ordenFinal) {
    if (!Array.isArray(ordenFinal)) {
      throw new ValidacionError('ordenFinal debe ser un array');
    }

    if (this.modo === 'supabase') {
      const set = await this.obtener(setId);
      if (!set) throw new NoEncontradoError('Set', setId);

      const itemsActuales = await this.listarItemsDeSet(setId);
      const mapa = new Map(itemsActuales.map((item) => [item.id, item]));

      if (ordenFinal.length !== itemsActuales.length) {
        throw new ValidacionError('ordenFinal debe contener todos los items');
      }

      const ids = new Set();
      for (const entrada of ordenFinal) {
        if (!entrada || typeof entrada.id !== 'string') {
          throw new ValidacionError('entrada inválida en ordenFinal');
        }
        if (!mapa.has(entrada.id)) {
          throw new ValidacionError('item no encontrado en el set');
        }
        if (ids.has(entrada.id)) {
          throw new ValidacionError('item duplicado en ordenFinal');
        }
        ids.add(entrada.id);
      }

      const ts = ahora();

      for (let i = 0; i < ordenFinal.length; i++) {
        const original = mapa.get(ordenFinal[i].id);
        await this.adapter.update(STORE_ITEMS, {
          eq: { id: ordenFinal[i].id }
        }, {
          ...original,
          orden: i + 1,
          updated_at: ts
        });
      }

      await this.adapter.update(this.storeName, {
        eq: { id: setId }
      }, {
        ...set,
        version: set.version + 1,
        updated_at: ts
      });

      return true;
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

            for (const item of items) {
              itemsStore.delete(item.id);
            }

            for (let i = 0; i < ordenFinal.length; i++) {
              const original = mapa.get(ordenFinal[i].id);

              itemsStore.add({
                ...original,
                orden: i + 1,
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
