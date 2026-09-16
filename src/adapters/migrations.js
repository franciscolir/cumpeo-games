/* =============================================================
   Migraciones incrementales de IndexedDB.
   Cada versión tiene su función. Nunca se borra la base automáticamente.
   ============================================================= */

import { STORES } from './schema.js';

export function aplicarMigraciones(db, oldVersion /*, newVersion, transaction */) {
  if (oldVersion < 1) migracionV1(db);
  if (oldVersion < 2) migracionV2(db);
}

function migracionV1(db) {
  for (const definicion of STORES) {
    const store = db.createObjectStore(definicion.nombre, {
      keyPath: definicion.keyPath,
      autoIncrement: false
    });

    for (const idx of definicion.indexes) {
      store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
    }
  }
}

/* =============================================================
   V2 — Corrección de keyPath de accion_procesadas.
   El store original se creó con keyPath='id'. La entidad no tiene
   campo 'id'; su PK real es 'action_id'.
   Como estamos en dev y sin datos, borramos y recreamos.
   ============================================================= */
function migracionV2(db) {
  if (db.objectStoreNames.contains('accion_procesadas')) {
    db.deleteObjectStore('accion_procesadas');
  }

  const definicion = STORES.find((s) => s.nombre === 'accion_procesadas');
  const store = db.createObjectStore(definicion.nombre, {
    keyPath: definicion.keyPath,
    autoIncrement: false
  });

  for (const idx of definicion.indexes) {
    store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
  }
}
