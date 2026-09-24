import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderListaSets } from '../../../../src/ui/sets/lista.js';

const JUEGO_PIC = { id: 'g-pic', codigo: 'PICTIONARY', nombre: 'Pictionary' };
const JUEGO_TRIVIA = { id: 'g-trivia', codigo: 'TRIVIA', nombre: 'Trivia' };

function crearElem() {
  const clases = new Set();
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    listeners: {},
    classList: {
      add: (c) => { clases.add(c); },
      remove: (c) => { clases.delete(c); },
      contains: (c) => clases.has(c),
      toggle: (c, force) => { if (force) clases.add(c); else clases.delete(c); }
    },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    click() { return this.listeners.click?.(); },
    focus() {}
  };
}

function crearContainer() {
  const elems = new Map();
  return {
    innerHTML: '',
    querySelector(sel) {
      if (!elems.has(sel)) elems.set(sel, crearElem());
      return elems.get(sel);
    },
    querySelectorAll() {
      return [];
    }
  };
}

function crearApp({ juegos = [], sets = [] } = {}) {
  return {
    services: {
      juego: {
        listarJuegos: vi.fn().mockResolvedValue(juegos)
      },
      set: {
        listarSetsPorJuego: vi.fn().mockResolvedValue(sets),
        desactivarSet: vi.fn(),
        eliminarSet: vi.fn()
      }
    }
  };
}

function setPic(overrides = {}) {
  return {
    id: 's1',
    nombre: 'Set Pic',
    descripcion: '',
    submodo: 'PALABRAS',
    activo: true,
    version: 1,
    ...overrides
  };
}

describe('renderListaSets — botón Configurar condiciones', () => {
  let container;

  beforeEach(() => {
    container = crearContainer();
    vi.stubGlobal('window', {
      location: { hash: '#/sets' },
      confirm: vi.fn(() => true),
      alert: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin juego seleccionado → no muestra "Configurar condiciones"', async () => {
    window.location.hash = '#/sets';
    const app = crearApp({ juegos: [JUEGO_PIC] });
    await renderListaSets(container, app);
    expect(container.innerHTML).not.toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('Seleccioná un juego para ver sus sets.');
  });

  it('juego no-Pictionary → no muestra "Configurar condiciones"', async () => {
    window.location.hash = '#/sets?juego=g-trivia';
    const app = crearApp({ juegos: [JUEGO_TRIVIA, JUEGO_PIC], sets: [setPic()] });
    await renderListaSets(container, app);
    expect(container.innerHTML).not.toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('+ Nuevo set');
  });

  it('juego Pictionary → muestra "Configurar condiciones"', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({ juegos: [JUEGO_PIC], sets: [setPic()] });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('+ Nuevo set');
  });

  it('el link apunta a #/juegos/PICTIONARY/config', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({ juegos: [JUEGO_PIC], sets: [setPic()] });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('href="#/juegos/PICTIONARY/config"');
  });

  it('con sets vacíos para Pictionary el botón sigue visible', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({ juegos: [JUEGO_PIC], sets: [] });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('No hay sets para este juego.');
  });

  it('muestra el select de filtro con el juego activo', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({ juegos: [JUEGO_PIC], sets: [setPic()] });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('id="filtro-juego"');
    expect(container.innerHTML).toContain('Pictionary');
  });

  it('renderiza los sets del juego con submodo', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({
      juegos: [JUEGO_PIC],
      sets: [setPic({ submodo: 'GESTOS' }), setPic({ id: 's2', nombre: 'Otro', submodo: null })]
    });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('Set Pic');
    expect(container.innerHTML).toContain('Submodo: GESTOS');
    expect(container.innerHTML).toContain('Otro');
  });

  it('juego no-Pictionary con sets no muestra link de config', async () => {
    window.location.hash = '#/sets?juego=g-trivia';
    const app = crearApp({
      juegos: [JUEGO_TRIVIA],
      sets: [setPic({ submodo: null })]
    });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('Set Pic');
    expect(container.innerHTML).not.toContain('Configurar condiciones');
    expect(container.innerHTML).not.toContain('#/juegos/PICTIONARY/config');
  });

  it('detecta Pictionary por código, no por nombre', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({
      juegos: [{ id: 'g-pic', codigo: 'PICTIONARY', nombre: 'Nombre Raro' }],
      sets: []
    });
    await renderListaSets(container, app);
    expect(container.innerHTML).toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('Nombre Raro');
  });

  it('solo un juego en el catálogo no-Pictionary → sin botón de config', async () => {
    window.location.hash = '#/sets?juego=g-trivia';
    const app = crearApp({ juegos: [JUEGO_TRIVIA], sets: [] });
    await renderListaSets(container, app);
    expect(container.innerHTML).not.toContain('Configurar condiciones');
    expect(container.innerHTML).toContain('+ Nuevo set');
  });

  it('el botón de config usa variante secondary (clase bg-secondary-container)', async () => {
    window.location.hash = '#/sets?juego=g-pic';
    const app = crearApp({ juegos: [JUEGO_PIC], sets: [] });
    await renderListaSets(container, app);
    const idxLink = container.innerHTML.indexOf('href="#/juegos/PICTIONARY/config"');
    const idxSecondary = container.innerHTML.indexOf('bg-secondary-container', idxLink);
    const idxTexto = container.innerHTML.indexOf('Configurar condiciones', idxLink);
    expect(idxLink).toBeGreaterThan(-1);
    expect(idxSecondary).toBeGreaterThan(idxLink);
    expect(idxTexto).toBeGreaterThan(idxSecondary);
  });
});
