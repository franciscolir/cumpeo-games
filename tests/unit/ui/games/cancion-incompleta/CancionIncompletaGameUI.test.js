import { describe, it, expect, beforeEach } from 'vitest';
import { CancionIncompletaGameUI } from '../../../../src/ui/games/cancion-incompleta/CancionIncompletaGameUI.js';

function makeContainer() {
  const div = document.createElement('div');
  return div;
}

describe('CancionIncompletaGameUI', () => {
  let container;
  let estado;
  let contexto;

  beforeEach(() => {
    container = makeContainer();
    estado = {
      ronda_actual: 1,
      total_rondas: 1,
      fase: 'INICIO_RONDA',
      equipo_actual: 1,
      cancion_actual: 1,
      puntos_equipo_1: 0,
      puntos_equipo_2: 0
    };
    contexto = {
      equipos: [{ nombre: 'Rojo' }, { nombre: 'Azul' }],
      juegoEjecutado: { configuracion_congelada: { segundos_por_cancion: 60 } },
      itemsDelJuego: []
    };
  });

  it('renderizarAreaJuego muestra placeholder sin fase', () => {
    const uiEstado = {};
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('Canción Incompleta');
  });

  it('renderizarAreaJuego muestra fase y marcador', () => {
    CancionIncompletaGameUI.renderizarAreaJuego(estado, container, contexto, {});
    expect(container.innerHTML).toContain('Ronda 1 / 1');
    expect(container.innerHTML).toContain('Rojo');
  });

  it('renderizarPanelConductor muestra iniciar juego sin fase', () => {
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor({}, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Iniciar juego');
  });

  it('renderizarPanelConductor muestra iniciar turno en INICIO_RONDA', () => {
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estado, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Iniciar turno');
  });

  it('renderizarPanelConductor muestra botones en TURNO_ACTIVO', () => {
    const estadoActivo = { ...estado, fase: 'TURNO_ACTIVO' };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoActivo, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Correcto');
    expect(panel.innerHTML).toContain('Incorrecto');
  });

  it('cleanup no lanza error', () => {
    expect(() => CancionIncompletaGameUI.cleanup()).not.toThrow();
  });
});
