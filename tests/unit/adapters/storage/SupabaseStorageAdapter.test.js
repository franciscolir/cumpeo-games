import { describe, it, expect } from 'vitest';
import { SupabaseStorageAdapter } from '../../../../src/adapters/storage/SupabaseStorageAdapter.js';

function crearAdapterMock() {
  return { modo: 'supabase', client: null };
}

describe('SupabaseStorageAdapter', () => {
  it('tiene los 4 métodos del contrato', () => {
    const adapter = new SupabaseStorageAdapter(crearAdapterMock());
    expect(typeof adapter.subirArchivo).toBe('function');
    expect(typeof adapter.obtenerArchivo).toBe('function');
    expect(typeof adapter.eliminarArchivo).toBe('function');
    expect(typeof adapter.obtenerUrlPublica).toBe('function');
  });

  it('lanza error si client es null al subirArchivo', async () => {
    const adapter = new SupabaseStorageAdapter(crearAdapterMock());
    await expect(
      adapter.subirArchivo('test/file.jpg', new Blob(['x']), 'image/jpeg')
    ).rejects.toThrow();
  });

  it('lanza error si client es null al obtenerArchivo', async () => {
    const adapter = new SupabaseStorageAdapter(crearAdapterMock());
    await expect(adapter.obtenerArchivo('test/file.jpg')).rejects.toThrow();
  });

  it('lanza error si client es null al eliminarArchivo', async () => {
    const adapter = new SupabaseStorageAdapter(crearAdapterMock());
    await expect(adapter.eliminarArchivo('test/file.jpg')).rejects.toThrow();
  });

  it('lanza error si client es null al obtenerUrlPublica', async () => {
    const adapter = new SupabaseStorageAdapter(crearAdapterMock());
    await expect(adapter.obtenerUrlPublica('test/file.jpg')).rejects.toThrow();
  });

  it('lee el client del supabaseAdapter', () => {
    const mockAdapter = { modo: 'supabase', client: { storage: {} } };
    const adapter = new SupabaseStorageAdapter(mockAdapter);
    expect(adapter.client).toBe(mockAdapter.client);
  });
});
