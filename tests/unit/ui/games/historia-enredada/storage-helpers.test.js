import { describe, it, expect, vi } from 'vitest';
import {
  subirImagenHistoria,
  obtenerUrlImagenHistoria,
  eliminarImagenHistoria
} from '../../../../../src/ui/games/historia-enredada/storage-helpers.js';

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

describe('storage-helpers (Historia Enredada)', () => {
  describe('subirImagenHistoria', () => {
    it('con File válido → llama a app.storage.subirArchivo y devuelve storageRef', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen();

      const ref = await subirImagenHistoria(app, file);

      expect(app.storage.subirArchivo).toHaveBeenCalledTimes(1);
      const [path, blob, mimeType] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^historia-enredada\/.+\.png$/);
      expect(blob).toBe(file);
      expect(mimeType).toBe('image/png');
      expect(ref).toBe('ref-123');
    });

    it('usa extensión jpg para image/jpeg', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen({ type: 'image/jpeg', name: 'a.jpg' });

      await subirImagenHistoria(app, file);

      const [path] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^historia-enredada\/.+\.jpg$/);
    });

    it('usa extensión webp para image/webp', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen({ type: 'image/webp', name: 'a.webp' });

      await subirImagenHistoria(app, file);

      const [path] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^historia-enredada\/.+\.webp$/);
    });

    it('mime desconocido → extensión bin', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen({ type: 'image/x-desconocido', name: 'a.x' });

      await subirImagenHistoria(app, file);

      const [path] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^historia-enredada\/.+\.bin$/);
    });

    it('el path es único entre llamadas (uuid)', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen();

      await subirImagenHistoria(app, file);
      await subirImagenHistoria(app, file);

      const [path1] = app.storage.subirArchivo.mock.calls[0];
      const [path2] = app.storage.subirArchivo.mock.calls[1];
      expect(path1).not.toBe(path2);
    });

    it('con File no-imagen → error', async () => {
      const app = crearAppConStorage();
      const file = new File(['texto'], 'notas.txt', { type: 'text/plain' });

      await expect(subirImagenHistoria(app, file)).rejects.toThrow(
        /file debe ser una imagen/
      );
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con File > 2MB → error', async () => {
      const app = crearAppConStorage();
      const file = crearFileImagen({ size: 2 * 1024 * 1024 + 1 });

      await expect(subirImagenHistoria(app, file)).rejects.toThrow(/2MB/);
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con File nulo → error', async () => {
      const app = crearAppConStorage();

      await expect(subirImagenHistoria(app, null)).rejects.toThrow(
        /file debe ser un File/
      );
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con file no-File (objeto) → error', async () => {
      const app = crearAppConStorage();

      await expect(
        subirImagenHistoria(app, { type: 'image/png', size: 10 })
      ).rejects.toThrow(/file debe ser un File/);
      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
    });

    it('con app sin storage → error', async () => {
      await expect(subirImagenHistoria({}, crearFileImagen())).rejects.toThrow(
        /app\.storage/
      );
    });

    it('con app nulo → error', async () => {
      await expect(subirImagenHistoria(null, crearFileImagen())).rejects.toThrow(
        /app es requerida/
      );
    });
  });

  describe('obtenerUrlImagenHistoria', () => {
    it('llama a app.storage.obtenerUrlPublica y devuelve la URL', async () => {
      const app = crearAppConStorage();

      const url = await obtenerUrlImagenHistoria(app, 'ref-abc');

      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-abc');
      expect(url).toBe('https://cdn.example.com/img.png');
    });

    it('con storageRef nulo → null (no llama a storage)', async () => {
      const app = crearAppConStorage();

      const url = await obtenerUrlImagenHistoria(app, null);

      expect(url).toBeNull();
      expect(app.storage.obtenerUrlPublica).not.toHaveBeenCalled();
    });

    it('con storageRef vacío → null', async () => {
      const app = crearAppConStorage();

      const url = await obtenerUrlImagenHistoria(app, '');

      expect(url).toBeNull();
      expect(app.storage.obtenerUrlPublica).not.toHaveBeenCalled();
    });

    it('con app nulo → error', async () => {
      await expect(obtenerUrlImagenHistoria(null, 'ref')).rejects.toThrow(
        /app es requerida/
      );
    });

    it('con app sin storage → error', async () => {
      await expect(obtenerUrlImagenHistoria({}, 'ref')).rejects.toThrow(
        /app\.storage/
      );
    });
  });

  describe('eliminarImagenHistoria', () => {
    it('llama a app.storage.eliminarArchivo', async () => {
      const app = crearAppConStorage();

      await eliminarImagenHistoria(app, 'ref-abc');

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-abc');
    });

    it('no falla si storageRef no existe', async () => {
      const app = crearAppConStorage();
      app.storage.eliminarArchivo = vi.fn(async () => undefined);

      await expect(
        eliminarImagenHistoria(app, 'no-existe-ref')
      ).resolves.toBeUndefined();
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('no-existe-ref');
    });

    it('con storageRef nulo → no falla ni llama a storage', async () => {
      const app = crearAppConStorage();

      await expect(eliminarImagenHistoria(app, null)).resolves.toBeUndefined();
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('con storageRef vacío → no falla ni llama a storage', async () => {
      const app = crearAppConStorage();

      await expect(eliminarImagenHistoria(app, '')).resolves.toBeUndefined();
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('con app nulo → error', async () => {
      await expect(eliminarImagenHistoria(null, 'ref')).rejects.toThrow(
        /app es requerida/
      );
    });

    it('con app sin storage → error', async () => {
      await expect(eliminarImagenHistoria({}, 'ref')).rejects.toThrow(
        /app\.storage/
      );
    });
  });
});
