import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsEnlaces } from '../../../../../src/ui/games/enlaces/editor.js';

const SET_ID = 'set-enlaces-1';

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
      if (sel === '#editor-items-enlaces') {
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
        actualizarItem: vi.fn().mockResolvedValue({ id: 'actualizado' }),
        eliminarItem: vi.fn().mockResolvedValue(undefined),
        reordenarItems: vi.fn().mockResolvedValue(undefined)
      }
    }
  };
}

function itemsBase() {
  return [
    { id: 'i1', orden: 1, contenido: { concepto_a: 'Sol', concepto_b: 'Estrella', categoria: 'Ciencia', dificultad: 2 } },
    { id: 'i2', orden: 2, contenido: { concepto_a: 'Luna', concepto_b: 'Satélite' } },
    { id: 'i3', orden: 3, contenido: { concepto_a: 'Río', concepto_b: 'Corriente', categoria: 'Naturaleza', dificultad: 1 } }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector('#lista-items-pares-enlaces').innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function llenarFormNuevo(container, { conceptoA = 'NuevaA', conceptoB = 'NuevaB', categoria = '', dificultad = '' } = {}) {
  container.querySelector('#item-concepto-a-enlaces').value = conceptoA;
  container.querySelector('#item-concepto-b-enlaces').value = conceptoB;
  container.querySelector('#item-categoria-enlaces').value = categoria;
  container.querySelector('#item-dificultad-enlaces').value = dificultad;
}

describe('renderEditorItemsEnlaces', () => {
  let container;
  let app;
  let confirmMock;

  beforeEach(() => {
    container = crearContainer();
    app = crearApp();
    confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('render', () => {
    it('es una función exportada', () => {
      expect(typeof renderEditorItemsEnlaces).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-enlaces', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsEnlaces(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-enlaces', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-enlaces"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista de pares y controles del form', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-pares-enlaces"');
      expect(container.innerHTML).toContain('id="item-concepto-a-enlaces"');
      expect(container.innerHTML).toContain('id="item-concepto-b-enlaces"');
      expect(container.innerHTML).toContain('id="item-categoria-enlaces"');
      expect(container.innerHTML).toContain('id="item-dificultad-enlaces"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-enlaces"');
    });

    it('arranca en modo "Agregar par"', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-enlaces"[^>]*>Agregar par</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-enlaces"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-enlaces"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-enlaces"[^>]*hidden/);
    });

    it('set vacío muestra "No hay pares todavía"', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay pares todavía');
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada par concepto_a ↔ concepto_b', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Sol ↔ Estrella');
      expect(listaHtml(container)).toContain('Luna ↔ Satélite');
      expect(listaHtml(container)).toContain('Río ↔ Corriente');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('muestra la categoría cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Categoría: Ciencia');
      expect(listaHtml(container)).toContain('Categoría: Naturaleza');
    });

    it('muestra la dificultad cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Dificultad: 2');
      expect(listaHtml(container)).toContain('Dificultad: 1');
    });

    it('item sin categoría ni dificultad no muestra esos campos', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(listaHtml(container)).not.toContain('Categoría: Luna');
      expect(listaHtml(container)).not.toContain('Dificultad: undefined');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });
  });

  describe('agregar par', () => {
    it('llama agregarItem con el contenido', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { conceptoA: 'Perro', conceptoB: 'Can', categoria: 'Animales' });
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        concepto_a: 'Perro',
        concepto_b: 'Can',
        categoria: 'Animales'
      });
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { conceptoA: 'A', conceptoB: 'B', categoria: 'Cat', dificultad: '3' });
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(container.querySelector('#form-item-titulo-enlaces').textContent).toBe('Agregar par');
      expect(container.querySelector('#btn-guardar-item-enlaces').textContent).toBe('Agregar');
      expect(container.querySelector('#item-concepto-a-enlaces').value).toBe('');
      expect(container.querySelector('#item-concepto-b-enlaces').value).toBe('');
      expect(container.querySelector('#item-categoria-enlaces').value).toBe('');
      expect(container.querySelector('#item-dificultad-enlaces').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-enlaces').classList.contains('hidden')).toBe(true);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('NO llama crearSetCompleto', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.crearSetCompleto).toBeUndefined();
      expect(app.services.set.crearSet).toBeUndefined();
    });

    it('NO llama crearSet', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.crearSet).toBeUndefined();
    });
  });

  describe('validación — no vacíos', () => {
    it('concepto_a vacío → error y no persiste', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      container.querySelector('#item-concepto-a-enlaces').value = '   ';
      container.querySelector('#item-concepto-b-enlaces').value = 'B';
      await container.querySelector('#btn-guardar-item-enlaces').click();

      const errorEl = container.querySelector('#item-error-enlaces');
      expect(errorEl.textContent).toBe('El concepto A es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('concepto_b vacío → error y no persiste', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      container.querySelector('#item-concepto-a-enlaces').value = 'A';
      container.querySelector('#item-concepto-b-enlaces').value = '   ';
      await container.querySelector('#btn-guardar-item-enlaces').click();

      const errorEl = container.querySelector('#item-error-enlaces');
      expect(errorEl.textContent).toBe('El concepto B es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      const errorEl = container.querySelector('#item-error-enlaces');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta whitespace de conceptos y categoría', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { conceptoA: '  A  ', conceptoB: '  B  ', categoria: '  Cat  ' });
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        concepto_a: 'A',
        concepto_b: 'B',
        categoria: 'Cat'
      });
    });
  });

  describe('validación — unicidad', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
    });

    it('concepto_a duplicado → error y no persiste', async () => {
      llenarFormNuevo(container, { conceptoA: 'Sol', conceptoB: 'NuevaB' });
      await container.querySelector('#btn-guardar-item-enlaces').click();

      const errorEl = container.querySelector('#item-error-enlaces');
      expect(errorEl.textContent).toBe('El concepto A "Sol" ya existe en el set');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('concepto_b duplicado → error y no persiste', async () => {
      llenarFormNuevo(container, { conceptoA: 'NuevaA', conceptoB: 'Estrella' });
      await container.querySelector('#btn-guardar-item-enlaces').click();

      const errorEl = container.querySelector('#item-error-enlaces');
      expect(errorEl.textContent).toBe('El concepto B "Estrella" ya existe en el set');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('editar el mismo item no da duplicado consigo mismo', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        concepto_a: 'Sol',
        concepto_b: 'Estrella',
        categoria: 'Ciencia',
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('concepto igual a otro item al editar → error', async () => {
      await btnItem(container, 'editar', 'i3').click();
      container.querySelector('#item-concepto-a-enlaces').value = 'Luna';
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(container.querySelector('#item-error-enlaces').textContent)
        .toBe('El concepto A "Luna" ya existe en el set');
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('categoría y dificultad opcionales', () => {
    it('categoría vacía → no se incluye en el contenido', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { categoria: '' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('categoria');
    });

    it('categoría con texto → se incluye en el contenido', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { categoria: 'Geografía' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].categoria).toBe('Geografía');
    });

    it('dificultad vacía → no se incluye en el contenido', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dificultad');
    });

    it('dificultad 1 → se incluye como número 1', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '1' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(1);
    });

    it('dificultad 2 → se incluye como número 2', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '2' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(2);
    });

    it('dificultad 3 → se incluye como número 3', async () => {
      await renderEditorItemsEnlaces(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '3' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(3);
    });
  });

  describe('editar par existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
    });

    it('clic en ✎ carga conceptos, titulo y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-concepto-a-enlaces').value).toBe('Sol');
      expect(container.querySelector('#item-concepto-b-enlaces').value).toBe('Estrella');
      expect(container.querySelector('#form-item-titulo-enlaces').textContent).toBe('Editar par');
      expect(container.querySelector('#btn-guardar-item-enlaces').textContent).toBe('Guardar cambios');
      expect(container.querySelector('#btn-cancelar-edicion-enlaces').classList.contains('hidden')).toBe(false);
    });

    it('carga la categoría del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-categoria-enlaces').value).toBe('Ciencia');
    });

    it('item sin categoría → input vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector('#item-categoria-enlaces').value).toBe('');
    });

    it('carga la dificultad del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-dificultad-enlaces').value).toBe('2');
    });

    it('item sin dificultad → select vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector('#item-dificultad-enlaces').value).toBe('');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-enlaces').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        concepto_a: 'Sol',
        concepto_b: 'Estrella',
        categoria: 'Ciencia',
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('Cancelar limpia el form y el modo edición', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-cancelar-edicion-enlaces').click();

      expect(container.querySelector('#form-item-titulo-enlaces').textContent).toBe('Agregar par');
      expect(container.querySelector('#item-concepto-a-enlaces').value).toBe('');
      expect(container.querySelector('#item-concepto-b-enlaces').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-enlaces').classList.contains('hidden')).toBe(true);

      llenarFormNuevo(container, { conceptoA: 'Zeta', conceptoB: 'Omega' });
      await container.querySelector('#btn-guardar-item-enlaces').click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar par', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
    });

    it('confirmado → llama eliminarItem con el id', async () => {
      await btnItem(container, 'eliminar', 'i2').click();
      expect(confirmMock).toHaveBeenCalledWith('¿Eliminar este par?');
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('i2');
    });

    it('cancelado → NO llama eliminarItem', async () => {
      confirmMock.mockReturnValue(false);
      await btnItem(container, 'eliminar', 'i2').click();
      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('recarga la lista tras eliminar', async () => {
      await btnItem(container, 'eliminar', 'i2').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('eliminar el item en edición limpia el form', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await btnItem(container, 'eliminar', 'i1').click();
      expect(container.querySelector('#form-item-titulo-enlaces').textContent).toBe('Agregar par');
      expect(container.querySelector('#item-concepto-a-enlaces').value).toBe('');
    });
  });

  describe('reordenar par', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsEnlaces(container, app, SET_ID);
    });

    it('bajar el primero intercambia con el segundo y usa [{id}]', async () => {
      await btnItem(container, 'bajar', 'i1').click();
      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
    });

    it('subir el segundo intercambia con el primero y usa [{id}]', async () => {
      await btnItem(container, 'subir', 'i2').click();
      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
    });

    it('subir el primero no hace nada', async () => {
      await btnItem(container, 'subir', 'i1').click();
      expect(app.services.set.reordenarItems).not.toHaveBeenCalled();
    });

    it('bajar el último no hace nada', async () => {
      await btnItem(container, 'bajar', 'i3').click();
      expect(app.services.set.reordenarItems).not.toHaveBeenCalled();
    });

    it('recarga la lista tras reordenar', async () => {
      await btnItem(container, 'bajar', 'i1').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });
});
