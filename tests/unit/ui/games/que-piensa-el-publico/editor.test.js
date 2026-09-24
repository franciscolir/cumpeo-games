import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsQPEP } from '../../../../../src/ui/games/que-piensa-el-publico/editor.js';

const SET_ID = 'set-qpep-1';

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
      if (sel === '#editor-items-qpep') {
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
    {
      id: 'i1',
      orden: 1,
      contenido: {
        pregunta: '¿Invierno o verano?',
        opcion_a: 'Invierno',
        opcion_b: 'Verano'
      }
    },
    {
      id: 'i2',
      orden: 2,
      contenido: {
        pregunta: '¿Playa o montaña?',
        opcion_a: 'Playa',
        opcion_b: 'Montaña'
      }
    },
    {
      id: 'i3',
      orden: 3,
      contenido: {
        pregunta: '¿Mar o río?',
        opcion_a: 'Mar',
        opcion_b: 'Río'
      }
    }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector('#lista-items-preguntas-qpep').innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function llenarFormNuevo(container, { pregunta = '¿Nueva?', opcionA = 'Alpha', opcionB = 'Beta' } = {}) {
  container.querySelector('#item-pregunta-qpep').value = pregunta;
  container.querySelector('#item-opcion-a-qpep').value = opcionA;
  container.querySelector('#item-opcion-b-qpep').value = opcionB;
}

describe('renderEditorItemsQPEP', () => {
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
      expect(typeof renderEditorItemsQPEP).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-qpep', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsQPEP(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-qpep', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-qpep"');
      expect(container.innerHTML).toContain('<section');
    });

    it('NO usa el id genérico editor-items-section', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).not.toContain('id="editor-items-section"');
    });

    it('renderiza lista, form y controles con ids *-qpep', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-preguntas-qpep"');
      expect(container.innerHTML).toContain('id="form-item-pregunta-qpep"');
      expect(container.innerHTML).toContain('id="form-item-titulo-qpep"');
      expect(container.innerHTML).toContain('id="item-pregunta-qpep"');
      expect(container.innerHTML).toContain('id="item-opcion-a-qpep"');
      expect(container.innerHTML).toContain('id="item-opcion-b-qpep"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-qpep"');
    });

    it('arranca en modo "Agregar pregunta"', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-qpep"[^>]*>Agregar pregunta</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-qpep"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-qpep"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-qpep"[^>]*hidden/);
    });

    it('NO hay input de tiempo', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).not.toContain('id="item-tiempo"');
      expect(container.innerHTML).not.toContain('id="item-tiempo-qpep"');
      expect(container.innerHTML).not.toContain('tiempo_seg');
    });

    it('NO hay input de puntos', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.innerHTML).not.toContain('id="item-puntos"');
      expect(container.innerHTML).not.toContain('id="item-puntos-qpep"');
      expect(container.innerHTML).not.toContain('puntos_acierto');
    });

    it('set vacío muestra "No hay preguntas todavía"', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay preguntas todavía');
    });

    it('el estado vive en container.__qpepEstado', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.__qpepEstado).toBeDefined();
      expect(container.__qpepEstado.items).toEqual([]);
      expect(container.__qpepEstado.editandoId).toBeNull();
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada pregunta con A y B', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(listaHtml(container)).toContain('¿Invierno o verano?');
      expect(listaHtml(container)).toContain('A: Invierno | B: Verano');
      expect(listaHtml(container)).toContain('A: Playa | B: Montaña');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });

    it('NO muestra tiempo ni puntos aunque el item los tenga', async () => {
      app = crearApp([{
        id: 'i1',
        orden: 1,
        contenido: {
          pregunta: '¿Q?',
          opcion_a: 'A',
          opcion_b: 'B',
          tiempo_seg: 30,
          puntos_acierto: 10
        }
      }]);
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(listaHtml(container)).not.toContain('Tiempo:');
      expect(listaHtml(container)).not.toContain('Puntos:');
    });
  });

  describe('validación', () => {
    it('pregunta vacía → error y no persiste', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '  ' });
      await container.querySelector('#btn-guardar-item-qpep').click();

      const errorEl = container.querySelector('#item-error-qpep');
      expect(errorEl.textContent).toBe('La pregunta es requerida');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('opcion_a vacía → error y no persiste', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, { opcionA: '   ' });
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(container.querySelector('#item-error-qpep').textContent)
        .toBe('La opción A es requerida');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('opcion_b vacía → error y no persiste', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, { opcionB: '' });
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(container.querySelector('#item-error-qpep').textContent)
        .toBe('La opción B es requerida');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('NO valida tiempo ni pesos (no existen los inputs)', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      expect(container.querySelector('#item-tiempo-qpep')).toBeDefined();
      expect(container.innerHTML).not.toContain('id="item-tiempo-qpep"');
      expect(container.innerHTML).not.toContain('Tiempo debe ser');
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      await container.querySelector('#btn-guardar-item-qpep').click();
      const errorEl = container.querySelector('#item-error-qpep');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-qpep').click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta pregunta y opciones', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, {
        pregunta: '  ¿Q?  ',
        opcionA: '  A  ',
        opcionB: '  B  '
      });
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Q?',
        opcion_a: 'A',
        opcion_b: 'B'
      });
    });
  });

  describe('guardar — nuevo item', () => {
    it('llama agregarItem con el contenido', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', opcionA: 'X', opcionB: 'Y' });
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Q?',
        opcion_a: 'X',
        opcion_b: 'Y'
      });
    });

    it('el contenido guardado NO incluye tiempo_seg ni puntos_acierto', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-qpep').click();
      const contenido = app.services.set.agregarItem.mock.calls[0][1];
      expect(contenido).not.toHaveProperty('tiempo_seg');
      expect(contenido).not.toHaveProperty('puntos_acierto');
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-qpep').click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', opcionA: 'A', opcionB: 'B' });
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(container.querySelector('#form-item-titulo-qpep').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#btn-guardar-item-qpep').textContent).toBe('Agregar');
      expect(container.querySelector('#item-pregunta-qpep').value).toBe('');
      expect(container.querySelector('#item-opcion-a-qpep').value).toBe('');
      expect(container.querySelector('#item-opcion-b-qpep').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-qpep').classList.contains('hidden')).toBe(true);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsQPEP(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-qpep').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('editar item existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsQPEP(container, app, SET_ID);
    });

    it('clic en ✎ carga pregunta, título y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-pregunta-qpep').value).toBe('¿Invierno o verano?');
      expect(container.querySelector('#form-item-titulo-qpep').textContent).toBe('Editar pregunta');
      expect(container.querySelector('#btn-guardar-item-qpep').textContent).toBe('Guardar cambios');
      expect(container.querySelector('#btn-cancelar-edicion-qpep').classList.contains('hidden')).toBe(false);
    });

    it('carga las opciones A y B del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-opcion-a-qpep').value).toBe('Invierno');
      expect(container.querySelector('#item-opcion-b-qpep').value).toBe('Verano');
    });

    it('setea editandoId en el estado', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.__qpepEstado.editandoId).toBe('i1');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-qpep').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        pregunta: '¿Invierno o verano?',
        opcion_a: 'Invierno',
        opcion_b: 'Verano'
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('actualizarItem NO incluye tiempo_seg ni puntos_acierto', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-qpep').click();
      const contenido = app.services.set.actualizarItem.mock.calls[0][1];
      expect(contenido).not.toHaveProperty('tiempo_seg');
      expect(contenido).not.toHaveProperty('puntos_acierto');
    });

    it('Cancelar limpia el form y el modo edición', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-cancelar-edicion-qpep').click();

      expect(container.querySelector('#form-item-titulo-qpep').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-qpep').value).toBe('');
      expect(container.querySelector('#item-opcion-a-qpep').value).toBe('');
      expect(container.querySelector('#item-opcion-b-qpep').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-qpep').classList.contains('hidden')).toBe(true);
      expect(container.__qpepEstado.editandoId).toBeNull();

      llenarFormNuevo(container, { pregunta: '¿Nueva?', opcionA: 'X', opcionB: 'Y' });
      await container.querySelector('#btn-guardar-item-qpep').click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsQPEP(container, app, SET_ID);
    });

    it('confirmado → llama eliminarItem con el id', async () => {
      await btnItem(container, 'eliminar', 'i2').click();
      expect(confirmMock).toHaveBeenCalledWith('¿Eliminar esta pregunta?');
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
      expect(container.querySelector('#form-item-titulo-qpep').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-qpep').value).toBe('');
      expect(container.__qpepEstado.editandoId).toBeNull();
    });
  });

  describe('reordenar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsQPEP(container, app, SET_ID);
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

    it('NO pasa strings a reordenarItems (deuda #108)', async () => {
      await btnItem(container, 'bajar', 'i1').click();
      const llamada = app.services.set.reordenarItems.mock.calls[0][1];
      expect(llamada.every((x) => typeof x === 'object' && 'id' in x)).toBe(true);
    });
  });
});
