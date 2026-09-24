import { describe, it, expect, vi } from 'vitest';
import { AjustesGlobalesService } from '../../../src/services/AjustesGlobalesService.js';

function crearAdapter() {
  return { modo: 'indexeddb', tx: vi.fn(), query: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

describe('AjustesGlobalesService', () => {
  it('obtener() delega al repo', async () => {
    const adapter = crearAdapter();
    const svc = new AjustesGlobalesService(adapter);
    const espia = vi.spyOn(svc.repo, 'obtener').mockResolvedValue({ id: 'default', tiempo_max_pausa_seg: 120 });

    const r = await svc.obtener();
    expect(espia).toHaveBeenCalled();
    expect(r.tiempo_max_pausa_seg).toBe(120);
  });

  it('obtenerTiempoMaxPausaSeg() devuelve el valor', async () => {
    const adapter = crearAdapter();
    const svc = new AjustesGlobalesService(adapter);
    vi.spyOn(svc.repo, 'obtener').mockResolvedValue({ id: 'default', tiempo_max_pausa_seg: 90 });

    const v = await svc.obtenerTiempoMaxPausaSeg();
    expect(v).toBe(90);
  });

  it('actualizar() delega al repo', async () => {
    const adapter = crearAdapter();
    const svc = new AjustesGlobalesService(adapter);
    const espia = vi.spyOn(svc.repo, 'actualizar').mockResolvedValue({ id: 'default', tiempo_max_pausa_seg: 60 });

    const r = await svc.actualizar({ tiempo_max_pausa_seg: 60 });
    expect(espia).toHaveBeenCalledWith({ tiempo_max_pausa_seg: 60 });
    expect(r.tiempo_max_pausa_seg).toBe(60);
  });
});
