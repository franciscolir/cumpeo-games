import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsAntiTrivia } from '../../../../../src/ui/games/anti-trivia/editor.js';

const SET_ID = 'set-anti-trivia-1';

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
      if (sel === '#editor-items-anti-trivia') {
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
    { id: 'i1', orden: 1, contenido: { pregunta: '¿P1?', respuestas_correctas: ['A1', 'B1'], categoria: 'Cat1', dificultad: 2 } },
    { id: 'i2', orden: 2, contenido: { pregunta: '¿P2?', respuestas_correctas: ['A2'] } },
    { id: 'i3', orden: 3, contenido: { pregunta: '¿P3?', respuestas_correctas: ['A3', 'B3', 'C3'], dificultad: 1 } }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector('#lista-items-preguntas-anti-trivia').innerHTML;
}

function respuestasHtml(container) {
  return container.querySelector('#lista-respuestas-anti-trivia').innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function inputRespuesta(container, i) {
  return container.querySelector(`[data-respuesta-idx="${i}"]`);
}

function llenarFormNuevo(container, { pregunta = '¿Nueva?', respuestas = ['R1'], categoria = '', dificultad = '' } = {}) {
  container.querySelector('#item-pregunta-anti-trivia').value = pregunta;
  container.querySelector('#item-categoria-anti-trivia').value = categoria;
  container.querySelector('#item-dificultad-anti-trivia').value = dificultad;
  container.__antiTriviaEstado.respuestas = [...respuestas];
  respuestas.forEach((r, i) => { inputRespuesta(container, i).value = r; });
}

describe('renderEditorItemsAntiTrivia', () => {
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
      expect(typeof renderEditorItemsAntiTrivia).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-anti-trivia', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsAntiTrivia(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-anti-trivia', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-anti-trivia"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista de preguntas y controles del form', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-preguntas-anti-trivia"');
      expect(container.innerHTML).toContain('id="item-pregunta-anti-trivia"');
      expect(container.innerHTML).toContain('id="lista-respuestas-anti-trivia"');
      expect(container.innerHTML).toContain('id="btn-agregar-respuesta-anti-trivia"');
      expect(container.innerHTML).toContain('id="item-categoria-anti-trivia"');
      expect(container.innerHTML).toContain('id="item-dificultad-anti-trivia"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-anti-trivia"');
    });

    it('arranca en modo "Agregar pregunta"', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-anti-trivia"[^>]*>Agregar pregunta</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-anti-trivia"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-anti-trivia"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-anti-trivia"[^>]*hidden/);
    });

    it('arranca con 1 respuesta', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);
    });

    it('set vacío muestra "No hay preguntas todavía"', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay preguntas todavía');
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza cada pregunta con sus respuestas', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('¿P1?');
      expect(listaHtml(container)).toContain('A1 | B1');
      expect(listaHtml(container)).toContain('A2');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('muestra la categoría cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Categoría: Cat1');
    });

    it('muestra la dificultad cuando existe', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Dificultad: 2');
      expect(listaHtml(container)).toContain('Dificultad: 1');
    });

    it('item sin categoría ni dificultad no muestra esos campos', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(listaHtml(container)).not.toContain('Categoría: undefined');
      expect(listaHtml(container)).not.toContain('Dificultad: undefined');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });
  });

  describe('lista dinámica de respuestas', () => {
    it('"+ Agregar respuesta" agrega un input', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(2);
    });

    it('agregar tres veces → 4 respuestas (1 inicial + 3)', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      const btn = container.querySelector('#btn-agregar-respuesta-anti-trivia');
      await btn.click();
      await btn.click();
      await btn.click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(4);
    });

    it('× elimina la respuesta indicada', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      await container.querySelector('[data-quitar-respuesta="1"]').click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);
    });

    it('no permite bajar de 1 respuesta', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('[data-quitar-respuesta="0"]').click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);
    });

    it('con 1 respuesta el × está oculto; con 2 se muestra', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      expect(respuestasHtml(container)).toMatch(/data-quitar-respuesta="0"[^>]*hidden/);
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      expect(respuestasHtml(container)).not.toMatch(/data-quitar-respuesta="0"[^>]*hidden/);
      expect(respuestasHtml(container)).not.toMatch(/data-quitar-respuesta="1"[^>]*hidden/);
    });

    it('al agregar se preservan los valores tipeados', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      inputRespuesta(container, 0).value = 'R1';
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      expect(inputRespuesta(container, 0).value).toBe('R1');
      expect(inputRespuesta(container, 1).value).toBe('');
    });

    it('al eliminar se preservan los valores de las restantes', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      inputRespuesta(container, 0).value = 'A';
      inputRespuesta(container, 1).value = 'B';
      await container.querySelector('[data-quitar-respuesta="0"]').click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);
      expect(inputRespuesta(container, 0).value).toBe('B');
    });
  });

  describe('validación', () => {
    it('pregunta vacía → error y no persiste', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      container.querySelector('#item-pregunta-anti-trivia').value = '  ';
      inputRespuesta(container, 0).value = 'R1';
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      const errorEl = container.querySelector('#item-error-anti-trivia');
      expect(errorEl.textContent).toBe('La pregunta es requerida');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('respuesta vacía → error y no persiste', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      container.querySelector('#item-pregunta-anti-trivia').value = '¿Q?';
      inputRespuesta(container, 0).value = '   ';
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      const errorEl = container.querySelector('#item-error-anti-trivia');
      expect(errorEl.textContent).toBe('Todas las respuestas deben tener texto');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('una respuesta vacía entre varias válidas → error', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('#btn-agregar-respuesta-anti-trivia').click();
      container.querySelector('#item-pregunta-anti-trivia').value = '¿Q?';
      inputRespuesta(container, 0).value = 'R1';
      inputRespuesta(container, 1).value = '';
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      expect(container.querySelector('#item-error-anti-trivia').textContent)
        .toBe('Todas las respuestas deben tener texto');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      const errorEl = container.querySelector('#item-error-anti-trivia');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container, { pregunta: '¿Q?', respuestas: ['R1'] });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta pregunta y respuestas', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '  ¿Q?  ', respuestas: ['  R1  '] });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Q?',
        respuestas_correctas: ['R1']
      });
    });
  });

  describe('guardar — nuevo item', () => {
    it('llama agregarItem con el contenido', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Capital?', respuestas: ['París', 'Lima'] });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        pregunta: '¿Capital?',
        respuestas_correctas: ['París', 'Lima']
      });
    });

    it('NO llama actualizarItem cuando no se está editando', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('categoría vacía → no se incluye en el contenido', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', respuestas: ['R1'], categoria: '' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('categoria');
    });

    it('categoría con texto → se incluye en el contenido', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', respuestas: ['R1'], categoria: 'Geografía' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].categoria).toBe('Geografía');
    });

    it('dificultad vacía → no se incluye en el contenido', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dificultad');
    });

    it('dificultad 1 → se incluye como número 1', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '1' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(1);
    });

    it('dificultad 2 → se incluye como número 2', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '2' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(2);
    });

    it('dificultad 3 → se incluye como número 3', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { dificultad: '3' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem.mock.calls[0][1].dificultad).toBe(3);
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container, { pregunta: '¿Q?', respuestas: ['R1', 'R2'], categoria: 'Cat', dificultad: '3' });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      expect(container.querySelector('#form-item-titulo-anti-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#btn-guardar-item-anti-trivia').textContent).toBe('Agregar');
      expect(container.querySelector('#item-pregunta-anti-trivia').value).toBe('');
      expect(container.querySelector('#item-categoria-anti-trivia').value).toBe('');
      expect(container.querySelector('#item-dificultad-anti-trivia').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-anti-trivia').classList.contains('hidden')).toBe(true);
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('editar item existente', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
    });

    it('clic en ✎ carga pregunta, titulo y cancel', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-pregunta-anti-trivia').value).toBe('¿P1?');
      expect(container.querySelector('#form-item-titulo-anti-trivia').textContent).toBe('Editar pregunta');
      expect(container.querySelector('#btn-guardar-item-anti-trivia').textContent).toBe('Guardar cambios');
      expect(container.querySelector('#btn-cancelar-edicion-anti-trivia').classList.contains('hidden')).toBe(false);
    });

    it('carga las respuestas correctas del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(2);
      expect(respuestasHtml(container)).toContain('value="A1"');
      expect(respuestasHtml(container)).toContain('value="B1"');
      expect(inputRespuesta(container, 0).value).toBe('A1');
      expect(inputRespuesta(container, 1).value).toBe('B1');
    });

    it('carga la categoría del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-categoria-anti-trivia').value).toBe('Cat1');
    });

    it('item sin categoría → input vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector('#item-categoria-anti-trivia').value).toBe('');
    });

    it('carga la dificultad del item', async () => {
      await btnItem(container, 'editar', 'i1').click();
      expect(container.querySelector('#item-dificultad-anti-trivia').value).toBe('2');
    });

    it('item sin dificultad → select vacío', async () => {
      await btnItem(container, 'editar', 'i2').click();
      expect(container.querySelector('#item-dificultad-anti-trivia').value).toBe('');
    });

    it('guardar tras editar llama actualizarItem con su id', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-anti-trivia').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        pregunta: '¿P1?',
        respuestas_correctas: ['A1', 'B1'],
        categoria: 'Cat1',
        dificultad: 2
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('Cancelar limpia el form y el modo edición', async () => {
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-cancelar-edicion-anti-trivia').click();

      expect(container.querySelector('#form-item-titulo-anti-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-anti-trivia').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-anti-trivia').classList.contains('hidden')).toBe(true);
      expect(contar(respuestasHtml(container), /data-respuesta-idx=/g)).toBe(1);

      llenarFormNuevo(container, { pregunta: '¿Nueva?', respuestas: ['X'] });
      await container.querySelector('#btn-guardar-item-anti-trivia').click();
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(1);
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });
  });

  describe('eliminar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
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
      expect(container.querySelector('#form-item-titulo-anti-trivia').textContent).toBe('Agregar pregunta');
      expect(container.querySelector('#item-pregunta-anti-trivia').value).toBe('');
    });
  });

  describe('reordenar item', () => {
    beforeEach(async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsAntiTrivia(container, app, SET_ID);
    });

    it('bajar el primero intercambia con el segundo', async () => {
      await btnItem(container, 'bajar', 'i1').click();
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

    it('subir el segundo intercambia con el primero', async () => {
      await btnItem(container, 'subir', 'i2').click();
      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
    });

    it('recarga la lista tras reordenar', async () => {
      await btnItem(container, 'bajar', 'i1').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });
});
