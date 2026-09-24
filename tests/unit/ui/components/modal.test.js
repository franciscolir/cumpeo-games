import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal, montarModal, desmontarModal } from '../../../../src/ui/components/modal.js';

function crearContainer() {
  const elems = new Map();
  const state = { html: '' };
  return {
    get innerHTML() { return state.html; },
    set innerHTML(v) { state.html = v; elems.clear(); },
    insertAdjacentHTML(_pos, html) {
      state.html += html;
    },
    querySelector(sel) {
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        if (state.html.includes(`id="${id}"`)) {
          if (!elems.has(sel)) {
            const clases = new Set();
            elems.set(sel, {
              id,
              listeners: {},
              removed: false,
              classList: {
                add: (c) => clases.add(c),
                remove: (c) => clases.delete(c),
                contains: (c) => clases.has(c)
              },
              addEventListener(ev, fn) { this.listeners[ev] = fn; },
              remove() { this.removed = true; }
            });
          }
          return elems.get(sel);
        }
      }
      return null;
    }
  };
}

function stubDocument() {
  const handlers = [];
  vi.stubGlobal('document', {
    addEventListener: vi.fn((ev, fn) => { if (ev === 'keydown') handlers.push(fn); }),
    removeEventListener: vi.fn((ev, fn) => {
      if (ev === 'keydown') {
        const i = handlers.indexOf(fn);
        if (i >= 0) handlers.splice(i, 1);
      }
    }),
    _handlers: handlers
  });
  return handlers;
}

describe('Modal', () => {
  it('es una función exportada', () => {
    expect(typeof Modal).toBe('function');
  });

  it('devuelve string HTML', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: '<p>c</p>' });
    expect(typeof html).toBe('string');
  });

  it('renderiza overlay con clases base', () => {
    const html = Modal({ id: 'm1', titulo: 'Hola', contenido: 'x' });
    expect(html).toContain('id="m1"');
    expect(html).toContain('fixed inset-0 bg-black/50');
    expect(html).toContain('flex items-center justify-center z-50');
  });

  it('renderiza card con clases base y padding default p-6', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x' });
    expect(html).toContain('bg-surface-container-lowest');
    expect(html).toContain('border-2.5');
    expect(html).toContain('border-on-surface');
    expect(html).toContain('rounded-2xl');
    expect(html).toContain('shadow-comic-lg');
    expect(html).toContain('p-6');
    expect(html).toContain('w-full');
    expect(html).toContain('max-w-md');
    expect(html).toContain('mx-4');
  });

  it('renderiza título con font-headline-md por defecto', () => {
    const html = Modal({ id: 'm1', titulo: 'Iniciar juego', contenido: 'x' });
    expect(html).toContain('font-headline-md');
    expect(html).toContain('Iniciar juego');
  });

  it('renderiza contenido dentro de div.mb-4', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: '<p>hola</p>' });
    expect(html).toContain('<div class="mb-4"><p>hola</p></div>');
  });

  it('sin acciones no renderiza el footer de botones', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x', acciones: [] });
    expect(html).not.toContain('flex gap-2 justify-end');
  });

  it('con 1 acción renderiza 1 botón', () => {
    const html = Modal({
      id: 'm1',
      titulo: 'T',
      contenido: 'x',
      acciones: [{ texto: 'Aceptar', variante: 'primary', id: 'btn-ok' }]
    });
    expect(html).toContain('id="btn-ok"');
    expect(html).toContain('Aceptar');
    expect(html).toContain('flex gap-2 justify-end');
  });

  it('con N acciones renderiza N botones', () => {
    const html = Modal({
      id: 'm1',
      titulo: 'T',
      contenido: 'x',
      acciones: [
        { texto: 'Cancelar', variante: 'ghost', id: 'btn-c' },
        { texto: 'Iniciar', variante: 'primary', id: 'btn-i' },
        { texto: 'Borrar', variante: 'danger', id: 'btn-b' }
      ]
    });
    expect(html).toContain('id="btn-c"');
    expect(html).toContain('id="btn-i"');
    expect(html).toContain('id="btn-b"');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Iniciar');
    expect(html).toContain('Borrar');
  });

  it('acción con disabled renderiza atributo disabled', () => {
    const html = Modal({
      id: 'm1',
      titulo: 'T',
      contenido: 'x',
      acciones: [{ texto: 'Iniciar', id: 'btn-i', disabled: true }]
    });
    expect(html).toMatch(/id="btn-i"[\s\S]*?disabled/);
  });

  it('acción sin disabled no lo lleva', () => {
    const html = Modal({
      id: 'm1',
      titulo: 'T',
      contenido: 'x',
      acciones: [{ texto: 'Iniciar', id: 'btn-i', disabled: false }]
    });
    expect(html).not.toContain('disabled');
  });

  it('variante default es primary', () => {
    const html = Modal({
      id: 'm1',
      titulo: 'T',
      contenido: 'x',
      acciones: [{ texto: 'Ok', id: 'btn-ok' }]
    });
    expect(html).toContain('bg-primary text-on-primary');
  });

  it('ancho default es max-w-md', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x' });
    expect(html).toContain('max-w-md');
  });

  it('ancho custom se aplica', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x', ancho: 'max-w-lg' });
    expect(html).toContain('max-w-lg');
    expect(html).not.toContain('max-w-md');
  });

  it('padding custom reemplaza al default', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x', padding: 'p-8' });
    expect(html).toContain('p-8');
    expect(html).not.toContain('p-6');
  });

  it('alineacion left default no agrega text-center', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x' });
    expect(html).not.toContain('text-center');
  });

  it('alineacion center agrega text-center a la card', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x', alineacion: 'center' });
    expect(html).toContain('text-center');
  });

  it('claseTitulo custom', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: 'x', claseTitulo: 'font-display-hero' });
    expect(html).toContain('font-display-hero');
    expect(html).not.toContain('font-headline-md');
  });

  it('mostrarTitulo false no renderiza párrafo de título', () => {
    const html = Modal({ id: 'm1', titulo: 'T', contenido: '<p>c</p>', mostrarTitulo: false });
    expect(html).not.toContain('font-headline-md');
    expect(html).not.toContain('>T<');
    expect(html).toContain('<p>c</p>');
  });

  it('mostrarTitulo true (default) renderiza título', () => {
    const html = Modal({ id: 'm1', titulo: 'Visible', contenido: 'x' });
    expect(html).toContain('Visible');
  });
});

describe('montarModal', () => {
  let container;
  let keyHandlers;

  beforeEach(() => {
    container = crearContainer();
    keyHandlers = stubDocument();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('inserta el HTML del modal en el container', () => {
    montarModal(container, { id: 'm-insert', titulo: 'T', contenido: 'x' });
    expect(container.innerHTML).toContain('id="m-insert"');
    expect(container.innerHTML).toContain('fixed inset-0');
  });

  it('devuelve el elemento del overlay', () => {
    const el = montarModal(container, { id: 'm-ret', titulo: 'T', contenido: 'x' });
    expect(el).not.toBeNull();
    expect(el.id).toBe('m-ret');
  });

  it('bindea click en overlay (fuera de la card) si cerrable default', () => {
    const el = montarModal(container, { id: 'm-click', titulo: 'T', contenido: 'x' });
    expect(typeof el.listeners.click).toBe('function');
  });

  it('click en overlay desmonta el modal', () => {
    const el = montarModal(container, { id: 'm-close', titulo: 'T', contenido: 'x' });
    const fakeEvent = { target: el, stopPropagation: vi.fn() };
    el.listeners.click(fakeEvent);
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(el.removed).toBe(true);
  });

  it('click en hijo de overlay NO desmonta', () => {
    const el = montarModal(container, { id: 'm-child', titulo: 'T', contenido: 'x' });
    const fakeEvent = { target: {}, stopPropagation: vi.fn() };
    el.listeners.click(fakeEvent);
    expect(fakeEvent.stopPropagation).not.toHaveBeenCalled();
    expect(el.removed).toBe(false);
  });

  it('bindea ESC en document si cerrable default', () => {
    montarModal(container, { id: 'm-esc', titulo: 'T', contenido: 'x' });
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(keyHandlers.length).toBeGreaterThan(0);
  });

  it('ESC desmonta el modal', () => {
    const el = montarModal(container, { id: 'm-esc-close', titulo: 'T', contenido: 'x' });
    expect(el.removed).toBe(false);
    keyHandlers[0]({ key: 'Escape' });
    expect(el.removed).toBe(true);
  });

  it('cerrable false NO bindea click en overlay', () => {
    const el = montarModal(container, { id: 'm-nc', titulo: 'T', contenido: 'x', cerrable: false });
    expect(el.listeners.click).toBeUndefined();
  });

  it('cerrable false NO bindea ESC', () => {
    montarModal(container, { id: 'm-nc2', titulo: 'T', contenido: 'x', cerrable: false });
    expect(document.addEventListener).not.toHaveBeenCalled();
    expect(keyHandlers).toHaveLength(0);
  });

  it('NO bindea botones de acciones (responsabilidad del caller)', () => {
    const el = montarModal(container, {
      id: 'm-acciones',
      titulo: 'T',
      contenido: 'x',
      acciones: [{ texto: 'Ok', id: 'btn-ok' }]
    });
    expect(el.listeners.click).toBeDefined();
    expect(container.innerHTML).toContain('id="btn-ok"');
    const btn = container.querySelector('#btn-ok');
    expect(btn).not.toBeNull();
    expect(btn.listeners.click).toBeUndefined();
  });
});

describe('desmontarModal', () => {
  let container;

  beforeEach(() => {
    container = crearContainer();
    stubDocument();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('remueve el elemento si existe', () => {
    montarModal(container, { id: 'm-del', titulo: 'T', contenido: 'x' });
    expect(container.innerHTML).toContain('id="m-del"');
    desmontarModal(container, 'm-del');
    const el = container.querySelector('#m-del');
    expect(el.removed).toBe(true);
  });

  it('no falla si el modal no existe', () => {
    expect(() => desmontarModal(container, 'no-existe')).not.toThrow();
  });

  it('no falla con container sin el id', () => {
    const vacio = { querySelector: () => null };
    expect(() => desmontarModal(vacio, 'otro')).not.toThrow();
  });
});
