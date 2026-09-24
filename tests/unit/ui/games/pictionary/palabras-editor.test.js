import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsPictionaryPalabras } from '../../../../../src/ui/games/pictionary/palabras/editor.js';

const SET_ID = 'set-palabras-1';
const ID = 'pictionary-palabras';

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
      if (sel === `#editor-items-${ID}`) {
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
    { id: 'i1', orden: 1, contenido: { concepto: 'PERRO', prohibidas: ['mascota', 'guau'], dificultad: 2 } },
    { id: 'i2', orden: 2, contenido: { concepto: 'GATO', prohibidas: ['felino'] } },
    { id: 'i3', orden: 3, contenido: { concepto: 'CASA', prohibidas: ['hogar', 'techo', 'muro'], dificultad: 1 } }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector(`#lista-items-${ID}`).innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function inputProhibida(container, i) {
  return container.querySelector(`[data-prohibida-idx="${i}"]`);
}

function llenarFormNuevo(container, { concepto = 'NUEVA', prohibidas = ['pro1'], dificultad = '' } = {}) {
  container.querySelector(`#item-concepto-${ID}`).value = concepto;
  container.querySelector(`#item-dificultad-${ID}`).value = dificultad;
  container.__pictionaryPalabrasEstado.prohibidas = [...prohibidas];
  prohibidas.forEach((p, i) => { inputProhibida(container, i).value = p; });
}

describe('renderEditorItemsPictionaryPalabras', () => {
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
      expect(typeof renderEditorItemsPictionaryPalabras).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-pictionary-palabras', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsPictionaryPalabras(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-pictionary-palabras', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-pictionary-palabras"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista, prohibidas y controles del form', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-pictionary-palabras"');
      expect(container.innerHTML).toContain('id="item-concepto-pictionary-palabras"');
      expect(container.innerHTML).toContain('id="lista-prohibidas-pictionary-palabras"');
      expect(container.innerHTML).toContain('id="btn-agregar-prohibida-pictionary-palabras"');
      expect(container.innerHTML).toContain('id="item-dificultad-pictionary-palabras"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-pictionary-palabras"');
    });

    it('arranca en modo "Agregar concepto"', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-pictionary-palabras"[^>]*>Agregar concepto</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-pictionary-palabras"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-pictionary-palabras"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-pictionary-palabras"[^>]*hidden/);
    });

    it('set vacío muestra "No hay conceptos todavía"', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay conceptos todavía');
    });

    it('inicializa estado con una prohibida vacía', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['']);
      expect(container.__pictionaryPalabrasEstado.editandoId).toBeNull();
      expect(container.__pictionaryPalabrasEstado.items).toEqual([]);
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada concepto', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(listaHtml(container)).toContain('PERRO');
      expect(listaHtml(container)).toContain('GATO');
      expect(listaHtml(container)).toContain('CASA');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('renderiza las prohibidas de cada item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Prohibidas: mascota | guau');
      expect(listaHtml(container)).toContain('Prohibidas: felino');
      expect(listaHtml(container)).toContain('Prohibidas: hogar | techo | muro');
    });

    it('muestra la dificultad cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Dificultad: 2');
      expect(listaHtml(container)).toContain('Dificultad: 1');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });
  });

  describe('lista dinámica de prohibidas', () => {
    it('arranca con 1 input de prohibida y botón ✗ oculto', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      expect(inputProhibida(container, 0)).toBeDefined();
      const lista = container.querySelector(`#lista-prohibidas-${ID}`);
      expect(lista.innerHTML).toMatch(/data-quitar-prohibida="0"[^>]*hidden/);
    });

    it('agregar prohibida añade un input con la palabra', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      inputProhibida(container, 0).value = 'perro';
      await container.querySelector(`#btn-agregar-prohibida-${ID}`).click();

      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['perro', '']);
      expect(inputProhibida(container, 0).value).toBe('perro');
      expect(inputProhibida(container, 1).value).toBe('');
      const lista = container.querySelector(`#lista-prohibidas-${ID}`);
      expect(lista.innerHTML).not.toMatch(/data-quitar-prohibida="0"[^>]*hidden/);
    });

    it('agregar 2da prohibida desbloquea el botón ✗ de la 1era', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      await container.querySelector(`#btn-agregar-prohibida-${ID}`).click();
      const lista = container.querySelector(`#lista-prohibidas-${ID}`);
      expect(lista.innerHTML).not.toMatch(/data-quitar-prohibida="0"[^>]*hidden/);
    });

    it('quitar prohibida elimina el input correspondiente', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      inputProhibida(container, 0).value = 'a';
      await container.querySelector(`#btn-agregar-prohibida-${ID}`).click();
      inputProhibida(container, 1).value = 'b';
      await container.querySelector('[data-quitar-prohibida="1"]').click();

      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['a']);
      const lista = container.querySelector(`#lista-prohibidas-${ID}`);
      expect(lista.innerHTML).not.toContain('data-prohibida-idx="1"');
      expect(lista.innerHTML).toContain('data-prohibida-idx="0"');
    });

    it('NO permite quitar la última prohibida', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      await container.querySelector('[data-quitar-prohibida="0"]').click();
      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['']);
    });
  });

  describe('agregar concepto', () => {
    it('llama agregarItem con { concepto, prohibidas }', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { concepto: 'PERRO', prohibidas: ['mascota', 'guau'] });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        concepto: 'PERRO',
        prohibidas: ['mascota', 'guau']
      });
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { concepto: 'A', prohibidas: ['x'], dificultad: '3' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(container.querySelector(`#form-item-titulo-${ID}`).textContent).toBe('Agregar concepto');
      expect(container.querySelector(`#btn-guardar-item-${ID}`).textContent).toBe('Agregar');
      expect(container.querySelector(`#item-concepto-${ID}`).value).toBe('');
      expect(container.querySelector(`#item-dificultad-${ID}`).value).toBe('');
      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['']);
      expect(container.querySelector(`#btn-cancelar-edicion-${ID}`).classList.contains('hidden')).toBe(true);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('NO llama crearSet', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.crearSet).toBeUndefined();
    });
  });

  describe('validación — concepto', () => {
    it('concepto vacío → error y no persiste', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      container.querySelector(`#item-concepto-${ID}`).value = '   ';
      container.__pictionaryPalabrasEstado.prohibidas = ['ok'];
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      const errorEl = container.querySelector(`#item-error-${ID}`);
      expect(errorEl.textContent).toBe('El concepto es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('recorta whitespace del concepto', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { concepto: '  PERRO  ', prohibidas: ['x'] });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].concepto).toBe('PERRO');
    });
  });

  describe('validación — prohibidas', () => {
    it('prohibida vacía → error y no persiste', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      container.querySelector(`#item-concepto-${ID}`).value = 'PERRO';
      container.__pictionaryPalabrasEstado.prohibidas = ['   '];
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      const errorEl = container.querySelector(`#item-error-${ID}`);
      expect(errorEl.textContent).toBe('Las palabras prohibidas deben tener texto');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('una prohibida válida entre vacías → error', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      container.querySelector(`#item-concepto-${ID}`).value = 'PERRO';
      container.__pictionaryPalabrasEstado.prohibidas = ['ok', ''];
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(container.querySelector(`#item-error-${ID}`).textContent)
        .toBe('Las palabras prohibidas deben tener texto');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('recorta whitespace de prohibidas', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { concepto: 'PERRO', prohibidas: ['  mascota  ', ' guau '] });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(app.services.set.agregarItem.mock.calls[0][1].prohibidas).toEqual(['mascota', 'guau']);
    });

    it('guardar con 2 inputs del DOM toma sus valores', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      container.querySelector(`#item-concepto-${ID}`).value = 'PERRO';
      container.__pictionaryPalabrasEstado.prohibidas = ['a', 'b'];
      inputProhibida(container, 0).value = 'can';
      inputProhibida(container, 1).value = 'ladrar';
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        concepto: 'PERRO',
        prohibidas: ['can', 'ladrar']
      });
    });
  });

  describe('dificultad opcional', () => {
    it('dificultad vacía → no se incluye', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dificultad');
    });

    it('dificultad 1 → número 1', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '1' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(1);
    });

    it('dificultad 2 → número 2', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '2' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(2);
    });

    it('dificultad 3 → número 3', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '3' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(3);
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      const errorEl = container.querySelector(`#item-error-${ID}`);
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });
  });

  describe('editar concepto existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
    });

    it('clic en ✎ carga concepto, prohibidas, titulo y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector(`#item-concepto-${ID}`).value).toBe('PERRO');
      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['mascota', 'guau']);
      expect(inputProhibida(container, 0).value).toBe('mascota');
      expect(inputProhibida(container, 1).value).toBe('guau');
      expect(container.querySelector(`#form-item-titulo-${ID}`).textContent).toBe('Editar concepto');
      expect(container.querySelector(`#btn-guardar-item-${ID}`).textContent).toBe('Guardar cambios');
      expect(container.querySelector(`#btn-cancelar-edicion-${ID}`).classList.contains('hidden')).toBe(false);
    });

    it('carga la dificultad del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector(`#item-dificultad-${ID}`).value).toBe('2');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        concepto: 'PERRO',
        prohibidas: ['mascota', 'guau'],
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('editar permite modificar prohibidas', async () => {
      await btnItem(container, 'editar', 'i2').click();
      container.__pictionaryPalabrasEstado.prohibidas = ['gato', 'miau'];
      inputProhibida(container, 0).value = 'gato';
      inputProhibida(container, 1).value = 'miau';
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i2', {
        concepto: 'GATO',
        prohibidas: ['gato', 'miau']
      });
    });

    it('Cancelar limpia el form y reinicia prohibidas', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector(`#btn-cancelar-edicion-${ID}`).click();

      expect(container.querySelector(`#form-item-titulo-${ID}`).textContent).toBe('Agregar concepto');
      expect(container.querySelector(`#item-concepto-${ID}`).value).toBe('');
      expect(container.__pictionaryPalabrasEstado.prohibidas).toEqual(['']);
      expect(container.__pictionaryPalabrasEstado.editandoId).toBeNull();

      llenarFormNuevo(container, { concepto: 'OTRO' });
      await container.querySelector(`#btn-guardar-item-${ID}`).click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar concepto', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
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
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
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

  describe('errores de servicio', () => {
    it('error de agregarItem se muestra en #item-error', async () => {
      app.services.set.agregarItem.mockRejectedValue(new Error('fallo red'));
      await renderEditorItemsPictionaryPalabras(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector(`#btn-guardar-item-${ID}`).click();

      const errorEl = container.querySelector(`#item-error-${ID}`);
      expect(errorEl.textContent).toBe('fallo red');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });
  });
});
