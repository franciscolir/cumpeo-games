import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsPictionaryGestos } from '../../../../../src/ui/games/pictionary/gestos/editor.js';

const SET_ID = 'set-gestos-1';
const PREFIX = 'pictionary-gestos';

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

function crearContainer({ conMount = true } = {}) {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === `#editor-items-${PREFIX}`) {
        if (!conMount) return null;
        if (!elems.has(sel)) {
          elems.set(sel, {
            set outerHTML(html) { container.innerHTML = html; }
          });
        }
        return elems.get(sel);
      }
      if (!elems.has(sel)) elems.set(sel, crearElem());
      return elems.get(sel);
    }
  };
  return container;
}

function crearApp(items = []) {
  return {
    services: {
      set: {
        listarItemsDeSet: vi.fn().mockResolvedValue(items),
        agregarItem: vi.fn().mockResolvedValue({ id: 'nuevo' }),
        actualizarItem: vi.fn().mockResolvedValue(undefined),
        eliminarItem: vi.fn().mockResolvedValue(undefined),
        reordenarItems: vi.fn().mockResolvedValue(undefined)
      }
    }
  };
}

describe('renderEditorItemsPictionaryGestos (re-export)', () => {
  let container;
  let app;

  beforeEach(() => {
    container = crearContainer();
    app = crearApp();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('es una función exportada', () => {
    expect(typeof renderEditorItemsPictionaryGestos).toBe('function');
  });

  it('renderiza con mount e ids de pictionary-gestos', async () => {
    await renderEditorItemsPictionaryGestos(container, app, SET_ID);
    expect(container.innerHTML).toContain(`id="editor-items-${PREFIX}"`);
    expect(container.innerHTML).toContain(`id="lista-items-${PREFIX}"`);
    expect(container.innerHTML).toContain(`id="item-concepto-${PREFIX}"`);
    expect(container.innerHTML).not.toContain('lista-prohibidas-');
  });

  it('muestra la instrucción de gestos', async () => {
    await renderEditorItemsPictionaryGestos(container, app, SET_ID);
    expect(container.innerHTML).toContain('El representante usa gestos, sin hablar ni hacer sonidos.');
    expect(container.innerHTML).toContain('Conceptos del set — Gestos');
  });

  it('inicializa estado con submodo GESTOS en su idPrefix', async () => {
    await renderEditorItemsPictionaryGestos(container, app, SET_ID);
    expect(container.__pictionaryEditorEstado[PREFIX].submodo).toBe('GESTOS');
    expect(container.__pictionaryEditorEstado[PREFIX].items).toEqual([]);
  });

  it('agregar concepto persiste { concepto } sin prohibidas', async () => {
    await renderEditorItemsPictionaryGestos(container, app, SET_ID);
    container.querySelector(`#item-concepto-${PREFIX}`).value = 'NADAR';
    await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

    expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, { concepto: 'NADAR' });
    expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('prohibidas');
  });

  it('reordenarItems usa [{id}] (deuda #108)', async () => {
    app = crearApp([
      { id: 'a', orden: 1, contenido: { concepto: 'A' } },
      { id: 'b', orden: 2, contenido: { concepto: 'B' } }
    ]);
    await renderEditorItemsPictionaryGestos(container, app, SET_ID);
    await container.querySelector('[data-accion="bajar"][data-id="a"]').click();
    expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
      { id: 'b' },
      { id: 'a' }
    ]);
  });
});
