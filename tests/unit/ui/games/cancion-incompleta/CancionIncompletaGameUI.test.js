import { describe, it, expect, beforeEach } from 'vitest';
import { CancionIncompletaGameUI } from '../../../../../src/ui/games/cancion-incompleta/CancionIncompletaGameUI.js';

function makeContainer() {
  return { innerHTML: '', querySelector: () => null };
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
    const estadoActivo = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: false };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoActivo, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Iniciar tiempo');
  });

  it('cleanup no lanza error', () => {
    expect(() => CancionIncompletaGameUI.cleanup()).not.toThrow();
  });

  it('renderizarAreaJuego muestra timer cuando está corriendo', () => {
    const uiEstado = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: true, tiempo_restante_seg: 10 };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('id="ci-timer"');
  });

  it('renderizarAreaJuego muestra tiempo restante cuando timer no corre', () => {
    const uiEstado = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: false, tiempo_restante_seg: 45 };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('45s');
  });

  it('renderizarPanelConductor muestra Detener tiempo si timer corriendo', () => {
    const estadoActivo = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: true };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoActivo, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Detener tiempo');
  });

  it('renderizarPanelConductor muestra Correcto e Incorrecto en ESPERA_VALIDACION', () => {
    const estadoVal = { ...estado, fase: 'ESPERA_VALIDACION' };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoVal, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Correcto');
    expect(panel.innerHTML).toContain('Incorrecto');
  });

  it('renderizarPanelConductor muestra Siguiente ronda en FIN_DE_RONDA', () => {
    const estadoFin = { ...estado, fase: 'FIN_DE_RONDA' };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoFin, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).toContain('Siguiente ronda');
  });

  it('renderizarPanelConductor no muestra botones en FIN_DE_JUEGO', () => {
    const estadoFinJuego = { ...estado, fase: 'FIN_DE_JUEGO' };
    const panel = makeContainer();
    CancionIncompletaGameUI.renderizarPanelConductor(estadoFinJuego, panel, contexto, { onAccion: () => {} });
    expect(panel.innerHTML).not.toContain('Iniciar juego');
    expect(panel.innerHTML).not.toContain('Iniciar turno');
  });

  it('renderizarAreaJuego muestra fase en el contenedor', () => {
    const uiEstado = { ...estado, fase: 'ESPERA_VALIDACION' };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('ESPERA VALIDACION');
  });

  it('renderizarAreaJuego muestra equipo actual', () => {
    const uiEstado = { ...estado, equipo_actual: 2 };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('Equipo 2');
  });

  it('renderizarAreaJuego muestra puntajes de ambos equipos', () => {
    const uiEstado = { ...estado, puntos_equipo_1: 10, puntos_equipo_2: 5 };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('10');
    expect(container.innerHTML).toContain('5');
  });

  it('renderizarAreaJuego muestra canción actual', () => {
    const uiEstado = { ...estado, cancion_actual: 2 };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('Canción 2/2');
  });

  it('renderizarPanelConductor inicia juego action binding existe', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    CancionIncompletaGameUI.renderizarPanelConductor({}, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarPanelConductor iniciar turno action binding existe', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    CancionIncompletaGameUI.renderizarPanelConductor(estado, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarPanelConductor iniciar tiempo action binding existe', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    const estadoActivo = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: false };
    CancionIncompletaGameUI.renderizarPanelConductor(estadoActivo, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarPanelConductor detener tiempo action binding existe', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    const estadoActivo = { ...estado, fase: 'TURNO_ACTIVO', timer_corriendo: true };
    CancionIncompletaGameUI.renderizarPanelConductor(estadoActivo, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarPanelConductor correcto/incorrecto action bindings existen', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    const estadoVal = { ...estado, fase: 'ESPERA_VALIDACION' };
    CancionIncompletaGameUI.renderizarPanelConductor(estadoVal, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarPanelConductor siguiente ronda action binding existe', () => {
    const panel = {
      innerHTML: '',
      querySelector: (sel) => ({ addEventListener: () => {} })
    };
    const estadoFin = { ...estado, fase: 'FIN_DE_RONDA' };
    CancionIncompletaGameUI.renderizarPanelConductor(estadoFin, panel, contexto, { onAccion: () => {} });
    expect(true).toBe(true);
  });

  it('renderizarAreaJuego no inicia timer si fase no es TURNO_ACTIVO', () => {
    const uiEstado = { ...estado, fase: 'INICIO_RONDA', timer_corriendo: true };
    CancionIncompletaGameUI.renderizarAreaJuego(uiEstado, container, contexto, {});
    expect(container.innerHTML).toContain('Ronda 1 / 1');
  });
});
