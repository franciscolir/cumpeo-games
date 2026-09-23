import { describe, it, expect, vi } from 'vitest';
import {
  subirImagenMemoria,
  obtenerUrlImagenMemoria,
  eliminarImagenMemoria
} from '../../../../../src/ui/games/memoria/storage-helpers.js';

function crearAppConStorage() {
  return {
    storage: {
      subirArchivo: vi.fn(async () => 'ref-123'),
      obtenerUrlPublica: vi.fn(async () => 'https://cdn.example.com/img.png'),
      eliminarArchivo: vi.fn(async () => undefined)
    }
  };
}

function crearFileImagen({ name = 'foto.png', type = 'image/png', size } = {}) {
  const partes = size != null ? [new Uint8Array(size)] : ['contenido-imagen'];
  const file = new File(partes, name, { type });
  if (size != null) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

describe('storage-helpers (Memoricé)', () => {
  describe('subirImagenMemoria', () => {
    it('con File válido → llama a app.storage.subirArchivo y devuelve storageRef', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen();

      const ref = await subirImagenMemoria(app, file);

      expect(app.storage.subirArchivo).toHaveBeenCalledTimes(1);
      const [path, blob, mimeType] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^memoria\/.+\.png$/);
      expect(blob).toBe(file);
      expect(mimeType).toBe('image/png');
      expect(ref).toBe('ref-123');
    });

    it('con File no-imagen → error', async () => {
      const app = crearAppConStorage();
      const file = new File(['texto'], 'notas.txt', { type: 'text/plain' });

      await expect(subirImagenMemoria(app, file)).rejects.toThrow(
        /file debe ser una imagen/
      );
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con File > 2MB → error', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen({ size: 2 * 1024 * 1024 + 1 });

      await expect(subirImagenMemoria(app, file)).rejects.toThrow(/2MB/);
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con File nulo → error', async () => {
      const app = crearAppConStorage();

      await expect(subirImagenMemoria(app, null)).rejects.toThrow(
        /file debe ser un File/
      );
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con app sin storage → error', async () => {
      await expect(subirImagenMemoria({}, crearFileImagen())).rejects.toThrow(
        /app\.storage/
      );
    });

    it('con app nulo → error', async () => {
      await expect(subirImagenMemoria(null, crearFileImagen())).rejects.toThrow(
        /app es requerida/
      );
    });
  });

  describe('obtenerUrlImagenMemoria', () => {
    it('llama a app.storage.obtenerUrlPublica y devuelve la URL', async () => {
      const app = crearAppConStorage();

      const url = await obtenerUrlImagenMemoria(app, 'ref-abc');

      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-abc');
      expect(url).toBe('https://cdn.example.com/img.png');
    });

    it('con storageRef nulo → null (no llama a storage)', async () => {
      const app = crearAppConStorage();

      const url = await obtenerUrlImagenMemoria(app, null);

      expect(url).toBeNull();
      expect(app.storage.obtenerUrlPublica).not.toHaveBeenCalled();
    });

    it('con app nulo → error', async () => {
      await expect(obtenerUrlImagenMemoria(null, 'ref')).rejects.toThrow(
        /app es requerida/
      );
    });

    it('con app sin storage → error', async () => {
      await expect(obtenerUrlImagenMemoria({}, 'ref')).rejects.toThrow(
        /app\.storage/
      );
    });
  });

  describe('eliminarImagenMemoria', () => {
    it('llama a app.storage.eliminarArchivo', async () => {
      const app = crearAppConStorage();

      await eliminarImagenMemoria(app, 'ref-abc');

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-abc');
    });

    it('no falla si storageRef no existe', async () => {
      const app = crearAppConStorage();
      app.storage.eliminarArchivo = vi.fn(async () => undefined);

      await expect(
        eliminarImagenMemoria(app, 'no-existe-ref')
      ).resolves.toBeUndefined();
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('no-existe-ref');
    });

    it('con storageRef nulo → no falla ni llama a storage', async () => {
      const app = crearAppConStorage();

      await expect(eliminarImagenMemoria(app, null)).resolves.toBeUndefined();
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('con app nulo → error', async () => {
      await expect(eliminarImagenMemoria(null, 'ref')).rejects.toThrow(
        /app es requerida/
      );
    });

    it('con app sin storage → error', async () => {
      await expect(eliminarImagenMemoria({}, 'ref')).rejects.toThrow(
        /app\.storage/
      );
    });
  });
});
