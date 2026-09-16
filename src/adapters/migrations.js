/* =============================================================
   Migraciones incrementales de IndexedDB.
   Cada versión tiene su función. Nunca se borra la base automáticamente.
   ============================================================= */

import { STORES } from './schema.js';

export function aplicarMigraciones(db, oldVersion /*, newVersion, transaction */) {
  if (oldVersion < 1) migracionV1(db);
  // if (oldVersion < 2) migracionV2(db);
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
