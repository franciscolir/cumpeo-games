/* =============================================================
   BaseRepository — helpers callback-based sobre un object store.

   Regla: TODO callback pasado a métodos `_xTx` es síncrono.
   No se hace `await` dentro de la transacción.
   ============================================================= */

export class BaseRepository {
  constructor(adapter, storeName) {
    if (!adapter) throw new Error('BaseRepository requiere un adapter');
    if (!storeName) throw new Error('BaseRepository requiere un storeName');
    this.adapter = adapter;
    this.storeName = storeName;
  }

  /* =============================================================
     Lectura — el resultado se entrega por callback
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

  /* =============================================================
     Escritura — no devuelven valor
     ============================================================= */

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
     API de alto nivel — abren su propia transacción
     ============================================================= */

  async obtener(id) {
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leer(tx, id, (resultado) => resolver(resultado));
    });
  }

  async listar() {
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leerTodos(tx, (resultado) => resolver(resultado));
    });
  }

  async listarPorIndice(indexName, value) {
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.leerPorIndice(tx, indexName, value, (resultado) => resolver(resultado));
    });
  }

  async contarTodos() {
    return this.adapter.tx([this.storeName], 'readonly', (tx, resolver) => {
      this.contar(tx, (resultado) => resolver(resultado));
    });
  }
}
