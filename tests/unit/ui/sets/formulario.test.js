import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderFormularioSet } from '../../../../src/ui/sets/formulario.js';
import { renderEditorItemsQPEP } from '../../../../src/ui/games/que-piensa-el-publico/editor.js';
import { renderEditorItemsTrivia } from '../../../../src/ui/games/trivia/editor.js';
import { renderEditorItemsRosco } from '../../../../src/ui/games/rosco/editor.js';
import { renderEditorItemsMemoria } from '../../../../src/ui/games/memoria/editor.js';
import { renderEditorItemsAntiTrivia } from '../../../../src/ui/games/anti-trivia/editor.js';
import { renderEditorItemsEnlaces } from '../../../../src/ui/games/enlaces/editor.js';
import { renderEditorItemsPictionaryPalabras } from '../../../../src/ui/games/pictionary/palabras/editor.js';
import { renderEditorItemsPictionaryGestos } from '../../../../src/ui/games/pictionary/gestos/editor.js';
import { renderEditorItemsPictionaryPreguntas } from '../../../../src/ui/games/pictionary/preguntas/editor.js';
import { renderEditorItemsPictionaryDibujo } from '../../../../src/ui/games/pictionary/dibujo/editor.js';

vi.mock('../../../../src/ui/games/que-piensa-el-publico/editor.js', () => ({
  renderEditorItemsQPEP: vi.fn()
}));
vi.mock('../../../../src/ui/games/trivia/editor.js', () => ({
  renderEditorItemsTrivia: vi.fn()
}));
vi.mock('../../../../src/ui/games/rosco/editor.js', () => ({
  renderEditorItemsRosco: vi.fn()
}));
vi.mock('../../../../src/ui/games/memoria/editor.js', () => ({
  renderEditorItemsMemoria: vi.fn()
}));
vi.mock('../../../../src/ui/games/anti-trivia/editor.js', () => ({
  renderEditorItemsAntiTrivia: vi.fn()
}));
vi.mock('../../../../src/ui/games/enlaces/editor.js', () => ({
  renderEditorItemsEnlaces: vi.fn()
}));
vi.mock('../../../../src/ui/games/pictionary/palabras/editor.js', () => ({
  renderEditorItemsPictionaryPalabras: vi.fn()
}));
vi.mock('../../../../src/ui/games/pictionary/gestos/editor.js', () => ({
  renderEditorItemsPictionaryGestos: vi.fn()
}));
vi.mock('../../../../src/ui/games/pictionary/preguntas/editor.js', () => ({
  renderEditorItemsPictionaryPreguntas: vi.fn()
}));
vi.mock('../../../../src/ui/games/pictionary/dibujo/editor.js', () => ({
  renderEditorItemsPictionaryDibujo: vi.fn()
}));

const JUEGOS = [
  { id: 'g1', nombre: 'Trivia', codigo: 'TRIVIA' },
  { id: 'g2', nombre: 'QPEP', codigo: 'QUE_PIENSA_EL_PUBLICO' },
  { id: 'g3', nombre: 'Rosco', codigo: 'ROSCO' },
  { id: 'g4', nombre: 'Memoricé', codigo: 'MEMORIA' },
  { id: 'g5', nombre: 'Anti-Trivia', codigo: 'ANTI_TRIVIA' },
  { id: 'g6', nombre: 'Enlaces', codigo: 'ENLACES' },
  { id: 'g7', nombre: 'Pictionary', codigo: 'PICTIONARY' },
  { id: 'g8', nombre: 'Canción', codigo: 'CANCION_INCOMPLETA' }
];

function crearElem() {
  const clases = new Set();
  const el = {
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
  return el;
}

function crearContainer() {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#editor-items-pictionary') {
        if (!elems.has(sel)) {
          elems.set(sel, {
            outerHTMLSet: null,
            set outerHTML(html) { this.outerHTMLSet = html; container.innerHTML = container.innerHTML.replace(/<div id="editor-items-pictionary"><\/div>/, html); }
          });
        }
        return elems.get(sel);
      }

      if (!elems.has(sel)) {
        const el = crearElem();
        if (sel === '#form-set') {
          el.querySelector = (s) => container.querySelector(s);
        }
        elems.set(sel, el);
      }
      return elems.get(sel);
    }
  };
  return container;
}

function crearApp({ set = null, juegos = JUEGOS } = {}) {
  return {
    services: {
      juego: {
        listarJuegos: vi.fn().mockResolvedValue(juegos)
      },
      set: {
        obtenerSet: vi.fn().mockResolvedValue(set),
        crearSet: vi.fn().mockResolvedValue({ id: 'nuevo', juego_id: 'g1' }),
        actualizarSet: vi.fn().mockResolvedValue({})
      }
    }
  };
}

async function submitForm(container, app) {
  const form = container.querySelector('#form-set');
  await form.listeners.submit({ preventDefault: vi.fn() });
}

describe('renderFormularioSet', () => {
  let container;
  let confirmMock;

  beforeEach(() => {
    container = crearContainer();
    confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
    vi.stubGlobal('window', {
      location: { hash: '#/sets/nuevo' },
      URLSearchParams: globalThis.URLSearchParams
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('render — creación', () => {
    it('renderiza form de creación sin params.id', async () => {
      const app = crearApp();
      await renderFormularioSet(container, app, {});
      expect(container.innerHTML).toContain('Nuevo set');
      expect(container.innerHTML).toContain('id="form-set"');
      expect(app.services.set.obtenerSet).not.toHaveBeenCalled();
    });

    it('NO muestra select de submodo para un juego no Pictionary', async () => {
      const app = crearApp();
      window.location.hash = '#/sets/nuevo?juego=g1';
      await renderFormularioSet(container, app, {});
      expect(container.innerHTML).not.toContain('id="submodo"');
    });

    it('muestra select de submodo #submodo al crear set de Pictionary', async () => {
      const app = crearApp();
      window.location.hash = '#/sets/nuevo?juego=g7';
      await renderFormularioSet(container, app, {});
      expect(container.innerHTML).toContain('id="submodo"');
      expect(container.innerHTML).toContain('value="PALABRAS"');
      expect(container.innerHTML).toContain('value="GESTOS"');
      expect(container.innerHTML).toContain('value="PREGUNTAS"');
      expect(container.innerHTML).toContain('value="DIBUJO"');
    });

    it('NO muestra editor de items en creación', async () => {
      const app = crearApp();
      window.location.hash = '#/sets/nuevo?juego=g7';
      await renderFormularioSet(container, app, {});
      expect(container.innerHTML).not.toContain('id="editor-items-pictionary"');
      expect(renderEditorItemsPictionaryPalabras).not.toHaveBeenCalled();
    });
  });

  describe('render — detección de juego', () => {
    it('detecta el juego del set por código en edición', async () => {
      const app = crearApp({ set: { id: 's1', juego_id: 'g1', nombre: 'X' } });
      await renderFormularioSet(container, app, { id: 's1' });
      expect(container.innerHTML).toContain('Editar set');
      expect(app.services.set.obtenerSet).toHaveBeenCalledWith('s1');
    });

    it('juego sin editor muestra mensaje "aún no tiene editor"', async () => {
      const app = crearApp({ set: { id: 's8', juego_id: 'g8', nombre: 'C' } });
      await renderFormularioSet(container, app, { id: 's8' });
      expect(container.innerHTML).toContain('Este juego aún no tiene editor de items.');
    });

    it('set no encontrado muestra error', async () => {
      const app = crearApp({ set: null });
      await renderFormularioSet(container, app, { id: 'no-existe' });
      expect(container.innerHTML).toContain('Set no encontrado');
    });
  });

  describe('payload de creación', () => {
    it('payload de crearSet incluye submodo solo para Pictionary', async () => {
      const app = crearApp({
        set: null,
        juegos: JUEGOS
      });
      app.services.set.crearSet.mockResolvedValue({ id: 's9', juego_id: 'g7' });
      window.location.hash = '#/sets/nuevo?juego=g7';
      await renderFormularioSet(container, app, {});

      container.querySelector('#nombre').value = 'Set Pic';
      container.querySelector('#juego_id').value = 'g7';
      container.querySelector('#submodo').value = 'GESTOS';
      container.querySelector('#orden_catalogo').value = '';

      await submitForm(container, app);

      expect(app.services.set.crearSet).toHaveBeenCalledWith(expect.objectContaining({
        juego_id: 'g7',
        nombre: 'Set Pic',
        submodo: 'GESTOS'
      }));
      expect(window.location.hash).toBe('#/sets?juego=g7');
    });

    it('payload de crearSet NO incluye submodo para otros juegos', async () => {
      const app = crearApp();
      app.services.set.crearSet.mockResolvedValue({ id: 's10', juego_id: 'g1' });
      window.location.hash = '#/sets/nuevo?juego=g1';
      await renderFormularioSet(container, app, {});

      container.querySelector('#nombre').value = 'Set Trivia';
      container.querySelector('#juego_id').value = 'g1';
      container.querySelector('#orden_catalogo').value = '';

      await submitForm(container, app);

      const payload = app.services.set.crearSet.mock.calls[0][0];
      expect(payload).not.toHaveProperty('submodo');
      expect(payload.juego_id).toBe('g1');
      expect(window.location.hash).toBe('#/sets?juego=g1');
    });

    it('error de crearSet se muestra en #form-error', async () => {
      const app = crearApp();
      app.services.set.crearSet.mockRejectedValue(new Error('boom crear'));
      window.location.hash = '#/sets/nuevo?juego=g1';
      await renderFormularioSet(container, app, {});

      container.querySelector('#nombre').value = 'X';
      container.querySelector('#juego_id').value = 'g1';
      await submitForm(container, app);

      const err = container.querySelector('#form-error');
      expect(err.textContent).toBe('boom crear');
      expect(err.classList.contains('hidden')).toBe(false);
    });
  });

  describe('render — edición de Pictionary', () => {
    function setPic(submodo) {
      return { id: 'sp', juego_id: 'g7', nombre: 'Pic', submodo };
    }

    it('muestra div mount #editor-items-pictionary en edición', async () => {
      const app = crearApp({ set: setPic('PALABRAS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(container.querySelector('#editor-items-pictionary').outerHTMLSet)
        .toBe('<div id="editor-items-pictionary-palabras"></div>');
    });

    it('NO muestra select de submodo en edición', async () => {
      const app = crearApp({ set: setPic('PALABRAS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(container.innerHTML).not.toContain('id="submodo"');
    });

    it('submodo PALABRAS → renderiza editor de palabras', async () => {
      const app = crearApp({ set: setPic('PALABRAS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(renderEditorItemsPictionaryPalabras).toHaveBeenCalledWith(container, app, 'sp');
      expect(renderEditorItemsPictionaryGestos).not.toHaveBeenCalled();
    });

    it('submodo GESTOS → renderiza editor de gestos', async () => {
      const app = crearApp({ set: setPic('GESTOS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(renderEditorItemsPictionaryGestos).toHaveBeenCalledWith(container, app, 'sp');
      expect(renderEditorItemsPictionaryPalabras).not.toHaveBeenCalled();
    });

    it('submodo PREGUNTAS → renderiza editor de preguntas', async () => {
      const app = crearApp({ set: setPic('PREGUNTAS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(renderEditorItemsPictionaryPreguntas).toHaveBeenCalledWith(container, app, 'sp');
      expect(renderEditorItemsPictionaryPalabras).not.toHaveBeenCalled();
    });

    it('submodo DIBUJO → renderiza editor de dibujo', async () => {
      const app = crearApp({ set: setPic('DIBUJO') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(renderEditorItemsPictionaryDibujo).toHaveBeenCalledWith(container, app, 'sp');
      expect(renderEditorItemsPictionaryPalabras).not.toHaveBeenCalled();
    });

    it('reemplaza el mount con div id por submodo', async () => {
      const app = crearApp({ set: setPic('GESTOS') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(container.querySelector('#editor-items-pictionary').outerHTMLSet)
        .toBe('<div id="editor-items-pictionary-gestos"></div>');
    });

    it('case-insensitive: submodo en minúsculas funciona', async () => {
      const app = crearApp({ set: setPic('dibujo') });
      await renderFormularioSet(container, app, { id: 'sp' });
      expect(renderEditorItemsPictionaryDibujo).toHaveBeenCalledWith(container, app, 'sp');
    });
  });

  describe('dispatch de edición por juego', () => {
    it('TRIVIA → renderEditorItemsTrivia', async () => {
      const app = crearApp({ set: { id: 's1', juego_id: 'g1', nombre: 'T' } });
      await renderFormularioSet(container, app, { id: 's1' });
      expect(renderEditorItemsTrivia).toHaveBeenCalledWith(container, app, 's1');
      expect(renderEditorItemsQPEP).not.toHaveBeenCalled();
    });

    it('QPEP → renderEditorItemsQPEP', async () => {
      const app = crearApp({ set: { id: 's2', juego_id: 'g2', nombre: 'Q' } });
      await renderFormularioSet(container, app, { id: 's2' });
      expect(renderEditorItemsQPEP).toHaveBeenCalledWith(container, app, 's2');
    });

    it('ROSCO → renderEditorItemsRosco con set', async () => {
      const set = { id: 's3', juego_id: 'g3', nombre: 'R' };
      const app = crearApp({ set });
      await renderFormularioSet(container, app, { id: 's3' });
      expect(renderEditorItemsRosco).toHaveBeenCalledWith(container, app, 's3', set);
    });

    it('MEMORIA → renderEditorItemsMemoria con set', async () => {
      const set = { id: 's4', juego_id: 'g4', nombre: 'M' };
      const app = crearApp({ set });
      await renderFormularioSet(container, app, { id: 's4' });
      expect(renderEditorItemsMemoria).toHaveBeenCalledWith(container, app, 's4', set);
    });

    it('ANTI_TRIVIA → renderEditorItemsAntiTrivia', async () => {
      const app = crearApp({ set: { id: 's5', juego_id: 'g5', nombre: 'A' } });
      await renderFormularioSet(container, app, { id: 's5' });
      expect(renderEditorItemsAntiTrivia).toHaveBeenCalledWith(container, app, 's5');
    });

    it('ENLACES → renderEditorItemsEnlaces', async () => {
      const app = crearApp({ set: { id: 's6', juego_id: 'g6', nombre: 'E' } });
      await renderFormularioSet(container, app, { id: 's6' });
      expect(renderEditorItemsEnlaces).toHaveBeenCalledWith(container, app, 's6');
    });
  });

  describe('edición — actualizarSet', () => {
    it('submit en edición llama actualizarSet y redirige', async () => {
      const set = { id: 's1', juego_id: 'g1', nombre: 'Viejo', descripcion: 'd', orden_catalogo: 1 };
      const app = crearApp({ set });
      await renderFormularioSet(container, app, { id: 's1' });

      container.querySelector('#nombre').value = 'Nuevo';
      container.querySelector('#descripcion').value = 'desc';
      container.querySelector('#orden_catalogo').value = '5';

      await submitForm(container, app);

      expect(app.services.set.actualizarSet).toHaveBeenCalledWith('s1', {
        nombre: 'Nuevo',
        descripcion: 'desc',
        orden_catalogo: 5
      });
      expect(app.services.set.crearSet).not.toHaveBeenCalled();
      expect(window.location.hash).toBe('#/sets?juego=g1');
    });

    it('error de actualizarSet se muestra en #form-error', async () => {
      const set = { id: 's1', juego_id: 'g1', nombre: 'V' };
      const app = crearApp({ set });
      app.services.set.actualizarSet.mockRejectedValue(new Error('boom actualizar'));
      await renderFormularioSet(container, app, { id: 's1' });

      container.querySelector('#nombre').value = 'X';
      await submitForm(container, app);

      const err = container.querySelector('#form-error');
      expect(err.textContent).toBe('boom actualizar');
      expect(err.classList.contains('hidden')).toBe(false);
    });

    it('descripción vacía se envía como null', async () => {
      const set = { id: 's1', juego_id: 'g1', nombre: 'V' };
      const app = crearApp({ set });
      await renderFormularioSet(container, app, { id: 's1' });

      container.querySelector('#nombre').value = 'OK';
      container.querySelector('#descripcion').value = '';
      container.querySelector('#orden_catalogo').value = '';
      await submitForm(container, app);

      expect(app.services.set.actualizarSet).toHaveBeenCalledWith('s1', {
        nombre: 'OK',
        descripcion: null,
        orden_catalogo: null
      });
    });
  });

  describe('cancelar', () => {
    it('en creación el cancelar apunta a #/sets', async () => {
      const app = crearApp();
      window.location.hash = '#/sets/nuevo?juego=g1';
      await renderFormularioSet(container, app, {});
      expect(container.innerHTML).toContain('href="#/sets"');
    });

    it('en edición el cancelar apunta al listado filtrado por juego', async () => {
      const app = crearApp({ set: { id: 's1', juego_id: 'g1', nombre: 'V' } });
      await renderFormularioSet(container, app, { id: 's1' });
      expect(container.innerHTML).toContain('href="#/sets?juego=g1"');
    });
  });
});
