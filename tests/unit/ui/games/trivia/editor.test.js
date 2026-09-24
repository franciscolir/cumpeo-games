import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsTrivia } from '../../../../../src/ui/games/trivia/editor.js';

const SET_ID = 'set-trivia-1';

function crearElem() {
  const clases = new Set();
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
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
      if (sel === '#editor-items-trivia') {
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
        pregunta: '¿Capital de Francia?',
        opciones: ['París', 'Lima', 'Roma'],
        respuesta_correcta_index: 0,
        dificultad: 2
      }
    },
    {
      id: 'i2',
      orden: 2,
      contenido: {
        pregunta: '¿2+2?',
        opciones: ['3', '4'],
        respuesta_correcta_index: 1
      }
    },
    {
      id: 'i3',
      orden: 3,
      contenido: {
        pregunta: '¿Color del cielo?',
        opciones: ['Azul', 'Verde'],
        respuesta_correcta_index: 0,
        dificultad: 1
      }
    }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector('#lista-items-preguntas-trivia').innerHTML;
}

function opcionesHtml(container) {
  return container.querySelector('#lista-opciones-trivia').innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function inputOpcion(container, i) {
  return container.querySelector(`[data-opcion-texto="${i}"]`);
}

function radioOpcion(container, i) {
  return container.querySelector(`[data-opcion-radio="${i}"]`);
}

function llenarFormNuevo(container, { pregunta = '¿Nueva?', opciones = ['Op A', 'Op B'], correcta = 0, dificultad = '' } = {}) {
  container.querySelector('#item-pregunta-trivia').value = pregunta;
  container.querySelector('#item-dificultad-trivia').value = dificultad;
  container.__triviaEstado.opciones = [...opciones];
  container.__triviaEstado.correctaIndex = correcta;
  opciones.forEach((_, i) => { inputOpcion(container, i).value = opciones[i]; });
}

describe('renderEditorItemsTrivia', () => {
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
      expect(typeof renderEditorItemsTrivia).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-trivia', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsTrivia(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-trivia', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-trivia"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista, form y controles', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-preguntas-trivia"');
      expect(container.innerHTML).toContain('id="item-pregunta-trivia"');
      expect(container.innerHTML).toContain('id="lista-opciones-trivia"');
      expect(container.innerHTML).toContain('id="btn-agregar-opcion-trivia"');
      expect(container.innerHTML).toContain('id="item-dificultad-trivia"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-trivia"');
    });

    it('arranca en modo "Agregar pregunta"', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-trivia"[^>]*>Agregar pregunta</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-trivia"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-trivia"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-trivia"[^>]*hidden/);
    });

    it('arranca con 2 opciones', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(2);
    });

    it('arranca con el radio de la opción 0 marcado', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.__triviaEstado.correctaIndex).toBe(0);
      expect(radioOpcion(container, 0).checked).toBe(true);
      expect(radioOpcion(container, 1).checked).toBe(false);
    });

    it('set vacío muestra "No hay preguntas todavía"', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay preguntas todavía');
    });

    it('el estado vive en container.__triviaEstado', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(container.__triviaEstado).toBeDefined();
      expect(container.__triviaEstado.items).toEqual([]);
      expect(container.__triviaEstado.editandoId).toBeNull();
      expect(container.__triviaEstado.opciones).toEqual(['', '']);
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada pregunta con sus opciones', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('¿Capital de Francia?');
      expect(listaHtml(container)).toContain('A: París');
      expect(listaHtml(container)).toContain('B: Lima');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('marca ✓ en la opción correcta', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('A: París ✓');
      expect(listaHtml(container)).toContain('B: 4 ✓');
    });

    it('muestra la dificultad cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Dificultad: Media');
      expect(listaHtml(container)).toContain('Dificultad: Fácil');
    });

    it('item sin dificultad no muestra la línea', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
      const items = listaHtml(container).split('data-item-id=');
      expect(items[2]).not.toContain('Dificultad:');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });
  });

  describe('agregar opción', () => {
    it('"+ Agregar opción" agrega una opción', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(3);
    });

    it('agregar hasta 6 y el botón se oculta', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      const btn = container.querySelector('#btn-agregar-opcion-trivia');
      await btn.click();
      await btn.click();
      await btn.click();
      await btn.click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(6);
      expect(container.querySelector('#btn-agregar-opcion-trivia').classList.contains('hidden')).toBe(true);
    });

    it('NO agrega más allá de 6', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      const btn = container.querySelector('#btn-agregar-opcion-trivia');
      for (let i = 0; i < 6; i++) await btn.click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(6);
    });

    it('con 2 opciones el ✗ está oculto', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      expect(opcionesHtml(container)).toMatch(/data-opcion-quitar="0"[^>]*hidden/);
      expect(opcionesHtml(container)).toMatch(/data-opcion-quitar="1"[^>]*hidden/);
    });

    it('con 3+ opciones el ✗ es visible', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      expect(opcionesHtml(container)).not.toMatch(/data-opcion-quitar="0"[^>]*hidden/);
      expect(opcionesHtml(container)).not.toMatch(/data-opcion-quitar="2"[^>]*hidden/);
    });

    it('al agregar se preservan los valores tipeados', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      inputOpcion(container, 0).value = 'Keep';
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      expect(inputOpcion(container, 0).value).toBe('Keep');
      expect(inputOpcion(container, 2).value).toBe('');
    });
  });

  describe('eliminar opción', () => {
    it('✗ elimina la opción indicada', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      await container.querySelector('[data-opcion-quitar="1"]').click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(2);
    });

    it('no permite bajar de 2 opciones', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('[data-opcion-quitar="0"]').click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(2);
    });

    it('re-indexa data-opcion-index tras eliminar', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      await container.querySelector('[data-opcion-quitar="0"]').click();
      expect(opcionesHtml(container)).not.toContain('data-opcion-index="2"');
      expect(opcionesHtml(container)).toContain('data-opcion-index="1"');
      expect(inputOpcion(container, 1).value).toBe('');
    });

    it('re-indexa el value del radio tras eliminar', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      await container.querySelector('[data-opcion-quitar="0"]').click();
      expect(radioOpcion(container, 1).value).toBe('1');
      expect(opcionesHtml(container)).not.toContain('value="2"');
    });

    it('si se elimina la correcta, correctaIndex queda null', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      container.__triviaEstado.correctaIndex = 2;
      await container.querySelector('[data-opcion-quitar="2"]').click();
      expect(container.__triviaEstado.correctaIndex).toBeNull();
    });

    it('si la correcta estaba después, se decrementa el índice', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-opcion-trivia').click();
      container.__triviaEstado.correctaIndex = 2;
      await container.querySelector('[data-opcion-quitar="0"]').click();
      expect(container.__triviaEstado.correctaIndex).toBe(1);
    });
  });

  describe('validación', () => {
    it('pregunta vacía → error y no persiste', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.querySelector('#item-pregunta-trivia').value = '  ';
      inputOpcion(container, 0).value = 'A';
      inputOpcion(container, 1).value = 'B';
      await container.querySelector('#btn-guardar-item-trivia').click();

      const errorEl = container.querySelector('#item-error-trivia');
      expect(errorEl.textContent).toBe('La pregunta es requerida');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('menos de 2 opciones → error', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.__triviaEstado.opciones = ['Única'];
      container.querySelector('#item-pregunta-trivia').value = '¿Q?';
      inputOpcion(container, 0).value = 'Única';
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#item-error-trivia').textContent)
        .toBe('Debe haber al menos 2 opciones');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('más de 6 opciones → error', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.__triviaEstado.opciones = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      container.querySelector('#item-pregunta-trivia').value = '¿Q?';
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#item-error-trivia').textContent)
        .toBe('Máximo 6 opciones');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('opción vacía → error', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.querySelector('#item-pregunta-trivia').value = '¿Q?';
      inputOpcion(container, 0).value = 'A';
      inputOpcion(container, 1).value = '   ';
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#item-error-trivia').textContent)
        .toBe('Todas las opciones deben tener texto');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it("sin radio marcado → 'Elegí la respuesta correcta'", async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.querySelector('#item-pregunta-trivia').value = '¿Q?';
      inputOpcion(container, 0).value = 'A';
      inputOpcion(container, 1).value = 'B';
      container.__triviaEstado.correctaIndex = null;
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#item-error-trivia').textContent)
        .toBe('Elegí la respuesta correcta');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('dificultad inválida → error', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      container.querySelector('#item-dificultad-trivia').value = '9';
      llenarFormNuevo(container, { pregunta: '¿Q?', opciones: ['A', 'B'], correcta: 0, dificultad: '9' });
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#item-error-trivia').textContent)
        .toBe('Dificultad inválida');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      await container.querySelector('#btn-guardar-item-trivia').click();
      const errorEl = container.querySelector('#item-error-trivia');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta pregunta y opciones', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '  ¿Q?  ', opciones: ['  A  ', '  B  '] });
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Q?',
        opciones: ['A', 'B'],
        respuesta_correcta_index: 0
      });
    });
  });

  describe('guardar — nuevo item', () => {
    it('llama agregarItem con el contenido', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Capital?', opciones: ['París', 'Lima'], correcta: 0 });
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Capital?',
        opciones: ['París', 'Lima'],
        respuesta_correcta_index: 0
      });
    });

    it('incluye respuesta_correcta_index correcto', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { opciones: ['A', 'B', 'C'], correcta: 2 });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].respuesta_correcta_index).toBe(2);
    });

    it('dificultad vacía → no se incluye', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '' });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dificultad');
    });

    it('dificultad 1 → número 1', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '1' });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(1);
    });

    it('dificultad 2 → número 2', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '2' });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(2);
    });

    it('dificultad 3 → número 3', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '3' });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(3);
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', opciones: ['A', 'B'], correcta: 1, dificultad: '3' });
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(container.querySelector('#form-item-titulo-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#btn-guardar-item-trivia').textContent).toBe('Agregar');
      expect(container.querySelector('#item-pregunta-trivia').value).toBe('');
      expect(container.querySelector('#item-dificultad-trivia').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-trivia').classList.contains('hidden')).toBe(true);
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(2);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsTrivia(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('editar item existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
    });

    it('clic en ✎ carga pregunta, título y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-pregunta-trivia').value).toBe('¿Capital de Francia?');
      expect(container.querySelector('#form-item-titulo-trivia').textContent).toBe('Editar pregunta');
      expect(container.querySelector('#btn-guardar-item-trivia').textContent).toBe('Guardar cambios');
      expect(container.querySelector('#btn-cancelar-edicion-trivia').classList.contains('hidden')).toBe(false);
    });

    it('carga las opciones del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(3);
      expect(inputOpcion(container, 0).value).toBe('París');
      expect(inputOpcion(container, 1).value).toBe('Lima');
      expect(inputOpcion(container, 2).value).toBe('Roma');
    });

    it('marca el radio de la respuesta correcta', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.__triviaEstado.correctaIndex).toBe(0);
      expect(radioOpcion(container, 0).checked).toBe(true);
      expect(radioOpcion(container, 1).checked).toBe(false);
    });

    it('carga la dificultad del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-dificultad-trivia').value).toBe('2');
    });

    it('item sin dificultad → select vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector('#item-dificultad-trivia').value).toBe('');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-trivia').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        pregunta: '¿Capital de Francia?',
        opciones: ['París', 'Lima', 'Roma'],
        respuesta_correcta_index: 0,
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('Cancelar limpia el form y el modo edición', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-cancelar-edicion-trivia').click();

      expect(container.querySelector('#form-item-titulo-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-trivia').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-trivia').classList.contains('hidden')).toBe(true);
      expect(contar(opcionesHtml(container), /data-opcion-index=/g)).toBe(2);

      llenarFormNuevo(container, { pregunta: '¿Nueva?', opciones: ['X', 'Y'] });
      await container.querySelector('#btn-guardar-item-trivia').click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
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
      expect(container.querySelector('#form-item-titulo-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-trivia').value).toBe('');
    });
  });

  describe('reordenar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsTrivia(container, app, SET_ID);
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
