import { describe, it, expect, vi } from 'vitest';
import { cargarItemsDeJuego } from '../../../../../src/ui/games/_shared/cargarItemsDeJuego.js';

describe('cargarItemsDeJuego', () => {
  it('sin juegoActivo devuelve null', async () => {
    const result = await cargarItemsDeJuego({}, null);
    expect(result).toBeNull();
  });

  it('con snapshot_id lee items del source_set', async () => {
    const mockAdapter = {
      query: vi.fn().mockResolvedValue([{ source_set_id: 'set-1' }])
    };
    const mockSet = {
      listarItemsDeSet: vi.fn().mockResolvedValue([
        { orden: 2, contenido: { pregunta: 'P2' } },
        { orden: 1, contenido: { pregunta: 'P1' } }
      ])
    };
    const app = { adapter: mockAdapter, services: { set: mockSet } };
    const juegoActivo = { snapshot_id: 'snap-1', juego_id: 'j-1' };

    const result = await cargarItemsDeJuego(app, juegoActivo);

    expect(mockAdapter.query).toHaveBeenCalledWith('set_snapshots', { eq: { id: 'snap-1' } });
    expect(mockSet.listarItemsDeSet).toHaveBeenCalledWith('set-1');
    expect(result).toEqual([{ pregunta: 'P1' }, { pregunta: 'P2' }]);
  });

  it('sin snapshot_id usa el set activo más reciente', async () => {
    const mockAdapter = { query: vi.fn() };
    const mockSet = {
      listarSetsActivosPorJuego: vi.fn().mockResolvedValue([
        { id: 'set-old', created_at: '2024-01-01' },
        { id: 'set-new', created_at: '2024-06-01' }
      ]),
      listarItemsDeSet: vi.fn().mockResolvedValue([
        { orden: 1, contenido: { pregunta: 'A' } }
      ])
    };
    const app = { adapter: mockAdapter, services: { set: mockSet } };
    const juegoActivo = { juego_id: 'j-1' };

    const result = await cargarItemsDeJuego(app, juegoActivo);

    expect(mockSet.listarSetsActivosPorJuego).toHaveBeenCalledWith('j-1');
    expect(mockSet.listarItemsDeSet).toHaveBeenCalledWith('set-new');
    expect(result).toEqual([{ pregunta: 'A' }]);
  });

  it('sin sets activos devuelve null', async () => {
    const mockAdapter = { query: vi.fn() };
    const mockSet = {
      listarSetsActivosPorJuego: vi.fn().mockResolvedValue([])
    };
    const app = { adapter: mockAdapter, services: { set: mockSet } };
    const juegoActivo = { juego_id: 'j-1' };

    const result = await cargarItemsDeJuego(app, juegoActivo);
    expect(result).toBeNull();
  });

  it('error en query devuelve null', async () => {
    const mockAdapter = {
      query: vi.fn().mockRejectedValue(new Error('DB error'))
    };
    const app = { adapter: mockAdapter, services: { set: {} } };
    const juegoActivo = { snapshot_id: 'snap-1', juego_id: 'j-1' };

    const result = await cargarItemsDeJuego(app, juegoActivo);
    expect(result).toBeNull();
  });
});
