/* =============================================================
   Storage helpers para el editor de Historia Enredada (7.8a).
   Subir / obtener URL / eliminar imágenes de items de historia.
   ============================================================= */

const MAX_IMAGEN_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif'
};

function validarApp(app, nombre) {
  if (!app) {
    throw new Error(`${nombre}: app es requerida`);
  }
  if (!app.storage) {
    throw new Error(`${nombre}: app.storage no está disponible`);
  }
}

/**
 * Sube una imagen (File) a Storage y devuelve su storageRef.
 * Path: historia-enredada/{uuid}.{ext}
 *
 * @param {object} app - Objeto app con storage.
 * @param {File} file - Archivo de imagen (type image/*, máx 2MB).
 * @returns {Promise<string>} storageRef.
 * @throws {Error} si app/storage faltan o el File no es válido.
 */
export async function subirImagenHistoria(app, file) {
  validarApp(app, 'subirImagenHistoria');

  if (!(file instanceof File)) {
    throw new Error('subirImagenHistoria: file debe ser un File');
  }
  if (typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    throw new Error('subirImagenHistoria: file debe ser una imagen (image/*)');
  }
  if (file.size > MAX_IMAGEN_BYTES) {
    throw new Error('subirImagenHistoria: la imagen no puede superar 2MB');
  }

  const ext = MIME_TO_EXT[file.type] || 'bin';
  const path = `historia-enredada/${crypto.randomUUID()}.${ext}`;
  const blob = file;

  return app.storage.subirArchivo(path, blob, file.type);
}

/**
 * Obtiene la URL pública de una imagen subida.
 *
 * @param {object} app - Objeto app con storage.
 * @param {string|null} storageRef - Referencia del archivo.
 * @returns {Promise<string|null>} URL o null.
 * @throws {Error} si app/storage faltan.
 */
export async function obtenerUrlImagenHistoria(app, storageRef) {
  validarApp(app, 'obtenerUrlImagenHistoria');

  if (!storageRef) {
    return null;
  }

  return app.storage.obtenerUrlPublica(storageRef);
}

/**
 * Elimina una imagen de Storage. No falla si no existe.
 *
 * @param {object} app - Objeto app con storage.
 * @param {string|null} storageRef - Referencia del archivo.
 * @returns {Promise<void>}
 * @throws {Error} si app/storage faltan.
 */
export async function eliminarImagenHistoria(app, storageRef) {
  validarApp(app, 'eliminarImagenHistoria');

  if (!storageRef) {
    return;
  }

  await app.storage.eliminarArchivo(storageRef);
}
