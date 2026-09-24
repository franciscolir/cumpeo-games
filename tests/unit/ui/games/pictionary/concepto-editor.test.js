import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsConceptoPictionary } from '../../../../../src/ui/games/pictionary/_shared/editor-concepto.js';

const SET_ID = 'set-pic-1';
const PREFIX = 'pictionary-gestos';
const PARAMS = {
  submodo: 'GESTOS',
  instruccion: 'El representante usa gestos, sin hablar ni hacer sonidos.',
  idPrefix: PREFIX,
  titulo: 'Conceptos del set — Gestos'
};

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

function crearContainer({ mountSel = `#editor-items-${PREFIX}`, conMount = true } = {}) {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === mountSel) {
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
    { id: 'i1', orden: 1, contenido: { concepto: 'NADAR', dificultad: 2 } },
    { id: 'i2', orden: 2, contenido: { concepto: 'SALTAR' } },
    { id: 'i3', orden: 3, contenido: { concepto: 'CORRER', dificultad: 1 } }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector(`#lista-items-${PREFIX}`).innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function llenarFormNuevo(container, { concepto = 'NUEVO', dificultad = '' } = {}) {
  container.querySelector(`#item-concepto-${PREFIX}`).value = concepto;
  container.querySelector(`#item-dificultad-${PREFIX}`).value = dificultad;
}

describe('renderEditorItemsConceptoPictionary (shared)', () => {
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
      expect(typeof renderEditorItemsConceptoPictionary).toBe('function');
    });

    it('no hace nada si falta el mount', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsConceptoPictionary(c, app, SET_ID, PARAMS);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-pictionary-gestos', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toContain('id="editor-items-pictionary-gestos"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista y controles con idPrefix', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toContain('id="lista-items-pictionary-gestos"');
      expect(container.innerHTML).toContain('id="item-concepto-pictionary-gestos"');
      expect(container.innerHTML).toContain('id="item-dificultad-pictionary-gestos"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-pictionary-gestos"');
    });

    it('arranca en modo "Agregar concepto"', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-pictionary-gestos"[^>]*>Agregar concepto</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-pictionary-gestos"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-pictionary-gestos"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-pictionary-gestos"[^>]*hidden/);
    });

    it('muestra la instrucción del submodo', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toContain('El representante usa gestos, sin hablar ni hacer sonidos.');
    });

    it('muestra el título parametrizado', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).toContain('Conceptos del set — Gestos');
    });

    it('NO incluye campos de palabras prohibidas', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.innerHTML).not.toContain('lista-prohibidas-');
      expect(container.innerHTML).not.toContain('btn-agregar-prohibida-');
      expect(container.innerHTML).not.toContain('prohibida');
    });

    it('set vacío muestra "No hay conceptos todavía"', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(listaHtml(container)).toContain('No hay conceptos todavía');
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada concepto', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(listaHtml(container)).toContain('NADAR');
      expect(listaHtml(container)).toContain('SALTAR');
      expect(listaHtml(container)).toContain('CORRER');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('muestra la dificultad cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(listaHtml(container)).toContain('Dificultad: 2');
      expect(listaHtml(container)).toContain('Dificultad: 1');
    });

    it('item sin dificultad no muestra ese campo', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(listaHtml(container)).not.toContain('Dificultad: undefined');
      expect(listaHtml(container)).not.toContain('Dificultad: SALTAR');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });
  });

  describe('agregar concepto', () => {
    it('llama agregarItem con { concepto }', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { concepto: 'CANTAR' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, { concepto: 'CANTAR' });
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { concepto: 'A', dificultad: '3' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      expect(container.querySelector(`#form-item-titulo-${PREFIX}`).textContent).toBe('Agregar concepto');
      expect(container.querySelector(`#btn-guardar-item-${PREFIX}`).textContent).toBe('Agregar');
      expect(container.querySelector(`#item-concepto-${PREFIX}`).value).toBe('');
      expect(container.querySelector(`#item-dificultad-${PREFIX}`).value).toBe('');
      expect(container.querySelector(`#btn-cancelar-edicion-${PREFIX}`).classList.contains('hidden')).toBe(true);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('NO llama crearSet', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.crearSet).toBeUndefined();
    });
  });

  describe('validación', () => {
    it('concepto vacío → error y no persiste', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      container.querySelector(`#item-concepto-${PREFIX}`).value = '   ';
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      const errorEl = container.querySelector(`#item-error-${PREFIX}`);
      expect(errorEl.textContent).toBe('El concepto es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      const errorEl = container.querySelector(`#item-error-${PREFIX}`);
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta whitespace del concepto', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { concepto: '  NADAR  ' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, { concepto: 'NADAR' });
    });

    it('dificultad vacía → no se incluye en el contenido', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { dificultad: '' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dificultad');
    });

    it('dificultad 1 → número 1', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { dificultad: '1' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(1);
    });

    it('dificultad 2 → número 2', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { dificultad: '2' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(2);
    });

    it('dificultad 3 → número 3', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container, { dificultad: '3' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(3);
    });
  });

  describe('editar concepto existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
    });

    it('clic en ✎ carga concepto, titulo y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector(`#item-concepto-${PREFIX}`).value).toBe('NADAR');
      expect(container.querySelector(`#form-item-titulo-${PREFIX}`).textContent).toBe('Editar concepto');
      expect(container.querySelector(`#btn-guardar-item-${PREFIX}`).textContent).toBe('Guardar cambios');
      expect(container.querySelector(`#btn-cancelar-edicion-${PREFIX}`).classList.contains('hidden')).toBe(false);
    });

    it('carga la dificultad del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector(`#item-dificultad-${PREFIX}`).value).toBe('2');
    });

    it('item sin dificultad → select vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector(`#item-dificultad-${PREFIX}`).value).toBe('');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        concepto: 'NADAR',
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('Cancelar limpia el form y el modo edición', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector(`#btn-cancelar-edicion-${PREFIX}`).click();

      expect(container.querySelector(`#form-item-titulo-${PREFIX}`).textContent).toBe('Agregar concepto');
      expect(container.querySelector(`#item-concepto-${PREFIX}`).value).toBe('');
      expect(container.querySelector(`#btn-cancelar-edicion-${PREFIX}`).classList.contains('hidden')).toBe(true);

      llenarFormNuevo(container, { concepto: 'OTRO' });
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar concepto', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
    });

    it('confirmado → llama eliminarItem con el id', async () => {
      await btnItem(container, 'eliminar', 'i2').click();
      expect(confirmMock).toHaveBeenCalledWith('¿Eliminar este concepto?');
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
  });

  describe('reordenar — deuda #108', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
    });

    it('bajar el primero usa reordenarItems con [{id}]', async () => {
      await btnItem(container, 'bajar', 'i1').click();
      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
    });

    it('subir el segundo usa reordenarItems con [{id}]', async () => {
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
  });

  describe('estado por idPrefix', () => {
    it('guarda estado en container.__pictionaryEditorEstado[idPrefix]', async () => {
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      expect(container.__pictionaryEditorEstado[PREFIX]).toBeDefined();
      expect(container.__pictionaryEditorEstado[PREFIX].items).toEqual([]);
      expect(container.__pictionaryEditorEstado[PREFIX].editandoId).toBeNull();
      expect(container.__pictionaryEditorEstado[PREFIX].submodo).toBe('GESTOS');
    });

    it('aisla estado entre dos idPrefix en el mismo container', async () => {
      const c = crearContainer();
      const other = {
        ...PARAMS,
        submodo: 'DIBUJO',
        idPrefix: 'pictionary-dibujo',
        titulo: 'Conceptos del set — Dibujo'
      };

      c.innerHTML = '';
      const mountA = c.querySelector('#editor-items-pictionary-gestos');
      mountA.outerHTML = '<div id="editor-items-pictionary-gestos"></div>';
      await renderEditorItemsConceptoPictionary(c, app, SET_ID, PARAMS);

      const c2 = crearContainer();
      await renderEditorItemsConceptoPictionary(c2, app, SET_ID, other);

      expect(c.__pictionaryEditorEstado[PREFIX].submodo).toBe('GESTOS');
      expect(c2.__pictionaryEditorEstado['pictionary-dibujo'].submodo).toBe('DIBUJO');
      expect(c.__pictionaryEditorEstado['pictionary-dibujo']).toBeUndefined();
    });

    it('re-render resetea items y editandoId', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      await btnItem(container, 'editar', 'i1').click();
      expect(container.__pictionaryEditorEstado[PREFIX].editandoId).toBe('i1');

      const c2 = crearContainer();
      const app2 = crearApp(itemsBase());
      await renderEditorItemsConceptoPictionary(c2, app2, SET_ID, PARAMS);
      expect(c2.__pictionaryEditorEstado[PREFIX].editandoId).toBeNull();
      expect(c2.__pictionaryEditorEstado[PREFIX].items.length).toBe(3);
    });
  });

  describe('errores de servicio', () => {
    it('error de agregarItem se muestra en #item-error', async () => {
      app.services.set.agregarItem.mockRejectedValue(new Error('fallo red'));
      await renderEditorItemsConceptoPictionary(container, app, SET_ID, PARAMS);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${PREFIX}`).click();

      const errorEl = container.querySelector(`#item-error-${PREFIX}`);
      expect(errorEl.textContent).toBe('fallo red');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });
  });
});
