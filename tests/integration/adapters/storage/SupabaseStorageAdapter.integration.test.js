import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseStorageAdapter } from '../../../../src/adapters/storage/SupabaseStorageAdapter.js';
import { crearAdapterAutenticado, tieneCredencialesAuth } from '../../_helpers/auth.js';

const TIENE_AUTH = tieneCredencialesAuth();
const describeSiAuth = TIENE_AUTH ? describe : describe.skip;

let adapter;
let storage;

function uniquePath() {
  return `test/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
}

beforeAll(async () => {
  if (!TIENE_AUTH) return;
  adapter = await crearAdapterAutenticado();
  storage = new SupabaseStorageAdapter(adapter);
});

afterAll(async () => {
  if (adapter) await adapter.cerrar();
});

describeSiAuth('SupabaseStorageAdapter — integración', () => {
  it('subirArchivo sube un blob y devuelve un path no vacío', async () => {
    const path = uniquePath();
    const blob = new Blob(['hello world'], { type: 'image/jpeg' });

    const ref = await storage.subirArchivo(path, blob, 'image/jpeg');

    expect(ref).toBe(path);

    await storage.eliminarArchivo(ref);
  });

  it('obtenerArchivo devuelve el Blob correcto tras subir', async () => {
    const path = uniquePath();
    const contenido = 'contenido de prueba';
    const blob = new Blob([contenido], { type: 'image/jpeg' });

    const ref = await storage.subirArchivo(path, blob, 'image/jpeg');
    const obtenido = await storage.obtenerArchivo(ref);

    expect(obtenido).toBeTruthy();
    const texto = await obtenido.text();
    expect(texto).toBe(contenido);

    await storage.eliminarArchivo(ref);
  });

  it('obtenerArchivo devuelve null si el archivo no existe', async () => {
    const resultado = await storage.obtenerArchivo('no-existe/no-existe.txt');
    expect(resultado).toBeNull();
  });

  it('eliminarArchivo borra el archivo del bucket', async () => {
    const path = uniquePath();
    const blob = new Blob(['borrar'], { type: 'image/jpeg' });

    const ref = await storage.subirArchivo(path, blob, 'image/jpeg');
    await storage.eliminarArchivo(ref);

    const obtenido = await storage.obtenerArchivo(ref);
    expect(obtenido).toBeNull();
  });

  it('eliminarArchivo no falla si el archivo no existe', async () => {
    await expect(
      storage.eliminarArchivo('no-existe/para-borrar.txt')
    ).resolves.toBeUndefined();
  });

  it('obtenerUrlPublica devuelve una URL firmada válida', async () => {
    const path = uniquePath();
    const blob = new Blob(['url test'], { type: 'image/jpeg' });

    const ref = await storage.subirArchivo(path, blob, 'image/jpeg');
    const url = await storage.obtenerUrlPublica(ref);

    expect(url).toBeTruthy();
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('/sign/');

    await storage.eliminarArchivo(ref);
  });
});
