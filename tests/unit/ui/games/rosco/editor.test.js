import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderEditorItemsRosco } from '../../../../../src/ui/games/rosco/editor.js';
import { ALFABETO } from '../../../../../src/games/rosco/RoscoGameDefinition.js';

const SET_ID = 'set-rosco-1';

function crearElem() {
  const clases = new Set();
  return {
    value: '',
    textContent: '',
    listeners: {},
    classList: {
      add: (c) => { clases.add(c); },
      remove: (c) => { clases.delete(c); },
      contains: (c) => clases.has(c)
    },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    click() { return this.listeners.click?.(); }
  };
}

function crearContainer({ conMount = true, letrasSinInput = [] } = {}) {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#editor-items-rosco') {
        if (!conMount) return null;
        if (!elems.has(sel)) {
          elems.set(sel, {
            set outerHTML(html) { container.innerHTML = html; }
          });
        }
        return elems.get(sel);
      }

      const m = sel.match(/data-letra="([^"]+)"/);
      if (m && letrasSinInput.includes(m[1])) return null;

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
        eliminarItem: vi.fn().mockResolvedValue(undefined),
        crearSetCompleto: vi.fn()
      }
    }
  };
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function llenarTodos(container) {
  for (const letra of ALFABETO) {
    const def = container.querySelector(`[data-campo="def"][data-letra="${letra}"]`);
    const resp = container.querySelector(`[data-campo="resp"][data-letra="${letra}"]`);
    if (def) def.value = `Def ${letra}`;
    if (resp) resp.value = `Resp ${letra}`;
  }
}

describe('renderEditorItemsRosco', () => {
  let container;
  let app;

  beforeEach(() => {
    container = crearContainer();
    app = crearApp();
  });

  describe('render', () => {
    it('es una función exportada', () => {
      expect(typeof renderEditorItemsRosco).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-rosco', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsRosco(c, app, SET_ID, { id: SET_ID });
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-rosco', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('id="editor-items-rosco"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza 27 filas con data-letra', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      const filas = contar(container.innerHTML, /class="rosco-editor-fila"/g);
      expect(filas).toBe(27);
    });

    it('renderiza 27 inputs de definición', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      const defs = contar(container.innerHTML, /data-campo="def"/g);
      expect(defs).toBe(27);
    });

    it('renderiza 27 inputs de respuesta', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      const resps = contar(container.innerHTML, /data-campo="resp"/g);
      expect(resps).toBe(27);
    });

    it('incluye la letra Ñ en el alfabeto', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('data-letra="Ñ"');
    });

    it('tiene botón #btn-guardar-rosco', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('id="btn-guardar-rosco"');
    });

    it('#item-error-rosco y #item-ok-rosco nacen ocultos', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toMatch(/id="item-error-rosco"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-ok-rosco"[^>]*hidden/);
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('llena el input de definición por letra', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { letra: 'A', definicion: 'Capital de Francia', respuesta: 'París' } }
      ]);
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.querySelector('[data-campo="def"][data-letra="A"]').value)
        .toBe('Capital de Francia');
    });

    it('llena el input de respuesta por letra', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { letra: 'A', definicion: 'Capital de Francia', respuesta: 'París' } }
      ]);
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.querySelector('[data-campo="resp"][data-letra="A"]').value)
        .toBe('París');
    });

    it('set vacío deja los inputs sin tocar', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.querySelector('[data-campo="def"][data-letra="A"]').value).toBe('');
      expect(container.querySelector('[data-campo="resp"][data-letra="Z"]').value).toBe('');
    });

    it('ignora items sin letra', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { definicion: 'x', respuesta: 'y' } }
      ]);
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      for (const letra of ALFABETO) {
        expect(container.querySelector(`[data-campo="def"][data-letra="${letra}"]`).value).toBe('');
      }
    });

    it('solo llena las letras presentes en los items', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { letra: 'Ñ', definicion: 'def Ñ', respuesta: 'resp Ñ' } }
      ]);
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      expect(container.querySelector('[data-campo="def"][data-letra="Ñ"]').value).toBe('def Ñ');
      expect(container.querySelector('[data-campo="def"][data-letra="A"]').value).toBe('');
    });
  });

  describe('guardar — set vacío (agregarItem × 27)', () => {
    it('NO llama crearSetCompleto', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      expect(app.services.set.crearSetCompleto).not.toHaveBeenCalled();
    });

    it('llama agregarItem 27 veces', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(27);
    });

    it('agregarItem recibe { letra, definicion, respuesta } en orden A→Z', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();

      const llamadas = app.services.set.agregarItem.mock.calls;
      expect(llamadas[0][0]).toBe(SET_ID);
      expect(llamadas[0][1]).toEqual({ letra: 'A', definicion: 'Def A', respuesta: 'Resp A' });
      expect(llamadas[26][1]).toEqual({ letra: 'Z', definicion: 'Def Z', respuesta: 'Resp Z' });

      const letras = llamadas.map((c) => c[1].letra);
      expect(letras).toEqual([...ALFABETO]);
    });

    it('muestra "Guardado" en #item-ok-rosco', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      const okEl = container.querySelector('#item-ok-rosco');
      expect(okEl.textContent).toBe('Guardado');
      expect(okEl.classList.contains('hidden')).toBe(false);
    });

    it('NO llama eliminarItem cuando no hay items existentes', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('limpia el error previo y muestra ok al volver a guardar', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      container.querySelector('[data-campo="def"][data-letra="A"]').value = '';
      await container.querySelector('#btn-guardar-rosco').click();

      const errorEl = container.querySelector('#item-error-rosco');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();

      container.querySelector('[data-campo="def"][data-letra="A"]').value = 'Def A';
      await container.querySelector('#btn-guardar-rosco').click();

      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
      expect(container.querySelector('#item-ok-rosco').classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(27);
    });
  });

  describe('guardar — con items existentes', () => {
    function appConItems() {
      return crearApp([
        { id: 'i1', orden: 1, contenido: { letra: 'A', definicion: 'x', respuesta: 'y' } },
        { id: 'i2', orden: 2, contenido: { letra: 'B', definicion: 'x', respuesta: 'y' } }
      ]);
    }

    it('elimina los items existentes por id', async () => {
      app = appConItems();
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();

      expect(app.services.set.eliminarItem).toHaveBeenCalledTimes(2);
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('i1');
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('i2');
    });

    it('re-fetch de items antes de eliminar (2× listarItemsDeSet)', async () => {
      app = appConItems();
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('elimina todo antes de agregar los 27 nuevos', async () => {
      app = appConItems();
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();

      const finElim = Math.max(...app.services.set.eliminarItem.mock.invocationCallOrder);
      const iniAgrega = Math.min(...app.services.set.agregarItem.mock.invocationCallOrder);
      expect(finElim).toBeLessThan(iniAgrega);
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(27);
    });

    it('muestra "Guardado" tras eliminar y reagregar', async () => {
      app = appConItems();
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();

      const okEl = container.querySelector('#item-ok-rosco');
      expect(okEl.textContent).toBe('Guardado');
      expect(okEl.classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#item-error-rosco').classList.contains('hidden')).toBe(true);
    });
  });

  describe('validación previa al guardado', () => {
    it('definición vacía → muestra error y no persiste', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      container.querySelector('[data-campo="def"][data-letra="A"]').value = '';
      await container.querySelector('#btn-guardar-rosco').click();

      const errorEl = container.querySelector('#item-error-rosco');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('items[0].definicion');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('respuesta vacía → muestra error y no persiste', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      container.querySelector('[data-campo="resp"][data-letra="B"]').value = '   ';
      await container.querySelector('#btn-guardar-rosco').click();

      const errorEl = container.querySelector('#item-error-rosco');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('items[1].respuesta');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('input de letra ausente → "Falta la letra"', async () => {
      container = crearContainer({ letrasSinInput: ['Ñ'] });
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();

      const errorEl = container.querySelector('#item-error-rosco');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('Falta la letra Ñ');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('no muestra "Guardado" cuando falla la validación', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-guardar-rosco').click();

      const okEl = container.querySelector('#item-ok-rosco');
      expect(okEl.textContent).toBe('');
      expect(okEl.classList.contains('hidden')).toBe(true);
    });

    it('un fallo posterior oculta un "Guardado" previo', async () => {
      await renderEditorItemsRosco(container, app, SET_ID, { id: SET_ID });
      llenarTodos(container);
      await container.querySelector('#btn-guardar-rosco').click();
      expect(container.querySelector('#item-ok-rosco').classList.contains('hidden')).toBe(false);

      container.querySelector('[data-campo="resp"][data-letra="A"]').value = '';
      await container.querySelector('#btn-guardar-rosco').click();

      expect(container.querySelector('#item-ok-rosco').classList.contains('hidden')).toBe(true);
      expect(container.querySelector('#item-error-rosco').classList.contains('hidden')).toBe(false);
    });
  });
});
