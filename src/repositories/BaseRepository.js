/* =============================================================
   BaseRepository — capa de persistencia polimórfica.

   Soporta dos modos:
   - indexeddb: transacciones callback-based (LocalAdapter).
   - supabase: query/insert/update/delete (SupabaseAdapter).

   Los repos concretos llaman a los métodos públicos (obtener,
   listar, agregar, etc.) que delegan al modo correcto.

   Los helpers de transacción (agregar, eliminar, insertarOActualizar,
   leer, leerTodos, leerPorIndice, contar) se mantienen como
   públicos para compatibilidad con tests unitarios existentes.
   ============================================================= */

export class BaseRepository {
  /**
   * @param {object} adapter - LocalAdapter o SupabaseAdapter.
   * @param {string} storeName - Nombre de store (IndexedDB) / tabla (Supabase).
   * @param {string} [idField='id'] - Nombre del campo ID en la tabla Supabase.
   */
  constructor(adapter, storeName, idField = 'id') {
    if (!adapter) throw new Error('BaseRepository requiere un adapter');
    if (!storeName) throw new Error('BaseRepository requiere un storeName');
    this.adapter = adapter;
    this.storeName = storeName;
    this.idField = idField;
  }

  /** @returns {'indexeddb'|'supabase'} */
  get modo() {
    return this.adapter.constructor.modo;
  }

  /* =============================================================
     Helpers — transacción-scoped (IndexedDB)
     Se mantienen públicos para compatibilidad con tests existentes.
     ============================================================= */

  leer(tx, id, onOk) {
    const req = tx.objectStore(this.storeName).get(id);
    req.onsuccess = () => onOk(req.result);
  }

  leerTodos(tx, onOk) {
    const req = tx.objectStore(this.storeName).getAll();
    req.onsuccess = () => onOk(req.result);
  }

  leerPorIndice(tx, indexName, value, onOk) {
    const req = tx.objectStore(this.storeName).index(indexName).getAll(value);
    req.onsuccess = () => onOk(req.result);
  }

  contar(tx, onOk) {
    const req = tx.objectStore(this.storeName).count();
    req.onsuccess = () => onOk(req.result);
  }

  agregar(tx, entidad) {
    tx.objectStore(this.storeName).add(entidad);
  }

  insertarOActualizar(tx, entidad) {
    tx.objectStore(this.storeName).put(entidad);
  }

  eliminar(tx, id) {
    tx.objectStore(this.storeName).delete(id);
  }

  /* =============================================================
     API polimórfica — métodos públicos que soportan ambos modos
     ============================================================= */

  async obtener(id) {
    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { [this.idField]: id },
        single: true
      });
    }
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leer(tx, id, (resultado) => resolver(resultado));
    });
  }

  async listar() {
    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName);
    }
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leerTodos(tx, (resultado) => resolver(resultado));
    });
  }

  async listarPorIndice(indexName, value) {
    if (this.modo === 'supabase') {
      return this.adapter.query(this.storeName, {
        eq: { [indexName]: value }
      });
    }
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leerPorIndice(tx, indexName, value, (resultado) => resolver(resultado));
    });
  }

  async contarTodos() {
    if (this.modo === 'supabase') {
      const filas = await this.adapter.query(this.storeName, { select: 'id' });
      return Array.isArray(filas) ? filas.length : 0;
    }
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.contar(tx, (resultado) => resolver(resultado));
    });
  }

  async agregarRegistro(entidad) {
    if (this.modo === 'supabase') {
      const filas = await this.adapter.insert(this.storeName, entidad, { returning: '*' });
      return Array.isArray(filas) ? filas[0] : filas;
    }
    return this.adapter.tx([this.storeName], 'readwrite', (tx) => {
      this.agregar(tx, entidad);
    });
  }

  async agregarMuchos(entidades) {
    if (this.modo === 'supabase') {
      return this.adapter.insert(this.storeName, entidades, { returning: '*' });
    }
    return this.adapter.tx([this.storeName], 'readwrite', (tx) => {
      for (const entidad of entidades) {
        this.agregar(tx, entidad);
      }
    });
  }

  async actualizarRegistro(entidad) {
    if (this.modo === 'supabase') {
      const id = entidad[this.idField];
      return this.adapter.update(
        this.storeName,
        { eq: { [this.idField]: id } },
        entidad,
        { returning: '*' }
      );
    }
    return this.adapter.tx([this.storeName], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, entidad);
    });
  }

  async eliminarRegistro(id) {
    if (this.modo === 'supabase') {
      return this.adapter.delete(this.storeName, {
        eq: { [this.idField]: id }
      });
    }
    return this.adapter.tx([this.storeName], 'readwrite', (tx) => {
      this.eliminar(tx, id);
    });
  }
}
