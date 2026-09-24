/* =============================================================
   Migraciones incrementales de IndexedDB.
   Cada versión tiene su función. Nunca se borra la base automáticamente.
   ============================================================= */

import { STORES } from './schema.js';

export function aplicarMigraciones(db, oldVersion, upgradeTx) {
  if (oldVersion < 1) migracionV1(db);
  if (oldVersion < 2) migracionV2(db);
  if (oldVersion < 3) migracionV3(db, upgradeTx);
  if (oldVersion < 4) migracionV4(db, upgradeTx);
  if (oldVersion < 5) migracionV5(db);
  if (oldVersion < 6) migracionV6(db);
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

/* =============================================================
   V3 — Mensajes públicos, fotos públicas, archivos públicos.
   Extiende el modelo para contenido generado por el móvil.
   - Crea 3 stores nuevos con sus índices.
   - Agrega session_token a participante_partidas existentes.
   La migración es idempotente.
   ============================================================= */

const STORES_NUEVOS_V3 = ['mensajes_publicos', 'fotos_publicas', 'archivos_publicos'];

function migracionV3(db, upgradeTx) {
  // 1. Crear stores nuevos desde definiciones del schema
  for (const nombre of STORES_NUEVOS_V3) {
    if (db.objectStoreNames.contains(nombre)) continue;

    const definicion = STORES.find((s) => s.nombre === nombre);
    const store = db.createObjectStore(definicion.nombre, {
      keyPath: definicion.keyPath,
      autoIncrement: false
    });

    for (const idx of definicion.indexes) {
      store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
    }
  }

  // 2. Asignar session_token a participante_partidas existentes
  //    Usamos openCursor para mantener la transacción activa durante
  //    el recorrido. getAll() + onsuccess es frágil en onupgradeneeded.
  if (db.objectStoreNames.contains('participante_partidas') && upgradeTx) {
    const store = upgradeTx.objectStore('participante_partidas');
    const cursorReq = store.openCursor();

    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) return;
      const registro = cursor.value;
      if (!registro.session_token) {
        registro.session_token = crypto.randomUUID();
        cursor.update(registro);
      }
      cursor.continue();
    };
  }
}

/* =============================================================
   V4 — Índice único de session_token en participante_partidas.
   INV-171: session_token único por participación.
   ============================================================= */

function migracionV4(db, upgradeTx) {
  if (!db.objectStoreNames.contains('participante_partidas')) return;
  if (!upgradeTx) return;

  const store = upgradeTx.objectStore('participante_partidas');
  if (store.indexNames.contains('participante_partida_session_token')) return;

  store.createIndex('participante_partida_session_token', 'session_token', { unique: true });
}

/* =============================================================
   V5 — Store respuestas_encuesta.
   INV-189: opcion ∈ { A, B }.
   INV-190: UNIQUE (juego_ejecutado_id, participante_id, pregunta_index).
   ============================================================= */

const STORE_NUEVO_V5 = 'respuestas_encuesta';

function migracionV5(db) {
  if (db.objectStoreNames.contains(STORE_NUEVO_V5)) return;

  const definicion = STORES.find((s) => s.nombre === STORE_NUEVO_V5);
  const store = db.createObjectStore(definicion.nombre, {
    keyPath: definicion.keyPath,
    autoIncrement: false
  });

  for (const idx of definicion.indexes) {
    store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
  }
}

/* =============================================================
   V6 — Configuración de juego + submodo de set.
   - No requiere cambios estructurales en IndexedDB.
   - Los campos nuevos (configuracion, submodo) se agregan al crear
     los registros. Los registros existentes quedan sin ellos,
     y los repos los tratan como {} y null respectivamente.
   La migración es no-op: existe solo para subir la versión de DB.
   ============================================================= */
function migracionV6(db) {
  // No-op: los nuevos campos se agregan al crear registros.
  // Los existentes se tratan como {} y null en los repos.
}
