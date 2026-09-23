import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderEditorItemsMemoria } from '../../../../../src/ui/games/memoria/editor.js';
import { MemoriaGameDefinition } from '../../../../../src/games/memoria/MemoriaGameDefinition.js';

const SET_ID = 'set-memoria-1';

function crearElem() {
  const clases = new Set();
  const el = {
    value: '',
    textContent: '',
    innerHTML: '',
    files: null,
    file: null,
    listeners: {},
    classList: {
      add: (c) => { clases.add(c); },
      remove: (c) => { clases.delete(c); },
      contains: (c) => clases.has(c)
    },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    click() { return this.listeners.click?.(); },
    async change() { return this.listeners.change?.(); }
  };
  return el;
}

function crearContainer({ conMount = true } = {}) {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#editor-items-memoria') {
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
        eliminarItem: vi.fn().mockResolvedValue(undefined),
        crearSetCompleto: vi.fn()
      }
    },
    storage: {
      subirArchivo: vi.fn(async () => 'ref-nuevo-uuid'),
      obtenerUrlPublica: vi.fn(async (ref) => `https://cdn.example.com/${ref}.png`),
      eliminarArchivo: vi.fn(async () => undefined)
    }
  };
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function grillaHtml(container) {
  return container.querySelector('#grilla-slots-memoria').innerHTML;
}

async function subirEnSlot(container, app, idx, file) {
  const input = container.querySelector(`[data-file-idx="${idx}"]`);
  input.files = [file];
  input.file = file;
  await input.change();
}

function crearFileImagen(name = 'foto.png') {
  return new File(['contenido'], name, { type: 'image/png' });
}

async function llenarTodos(container, app) {
  for (let i = 0; i < container.__memoriaEstado.cantidad; i++) {
    await subirEnSlot(container, app, i, crearFileImagen(`img-${i}.png`));
  }
}

describe('renderEditorItemsMemoria', () => {
  let container;
  let app;

  beforeEach(() => {
    container = crearContainer();
    app = crearApp();
  });

  describe('render', () => {
    it('es una función exportada', () => {
      expect(typeof renderEditorItemsMemoria).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-memoria', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsMemoria(c, app, SET_ID, { id: SET_ID });
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-memoria', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('id="editor-items-memoria"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza 6 slots por defecto (set vacío)', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(6);
      expect(container.__memoriaEstado.slots).toHaveLength(6);
    });

    it('renderiza 6 file inputs en set vacío', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(contar(grillaHtml(container), /type="file"/g)).toBe(6);
    });

    it('incluye selector de cantidad 6/8/10/12', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('data-cantidad="6"');
      expect(container.innerHTML).toContain('data-cantidad="8"');
      expect(container.innerHTML).toContain('data-cantidad="10"');
      expect(container.innerHTML).toContain('data-cantidad="12"');
    });

    it('marca 6 como cantidad activa por defecto', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toMatch(/id="btn-cantidad-6"[^>]*border-tertiary/);
    });

    it('tiene botón #btn-guardar-memoria', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toContain('id="btn-guardar-memoria"');
    });

    it('#item-error-memoria y #item-ok-memoria nacen ocultos', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(container.innerHTML).toMatch(/id="item-error-memoria"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-ok-memoria"[^>]*hidden/);
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('con 6 items existentes → cantidad 6 y preview', async () => {
      const items = Array.from({ length: 6 }, (_, i) => ({
        id: `i${i}`,
        orden: i + 1,
        contenido: { imagen_url: `ref-${i}` }
      }));
      app = crearApp(items);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });

      expect(container.__memoriaEstado.cantidad).toBe(6);
      expect(contar(grillaHtml(container), /<img /g)).toBe(6);
      expect(contar(grillaHtml(container), /data-quitar-idx=/g)).toBe(6);
      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledTimes(6);
    });

    it('con 8 items existentes → cantidad 8', async () => {
      const items = Array.from({ length: 8 }, (_, i) => ({
        id: `i${i}`,
        orden: i + 1,
        contenido: { imagen_url: `ref-${i}` }
      }));
      app = crearApp(items);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });

      expect(container.__memoriaEstado.cantidad).toBe(8);
      expect(contar(container.innerHTML, /data-cantidad="8"[^>]*border-tertiary/)).toBe(1);
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(8);
    });

    it('con 7 items (cantidad inválida) → default 6', async () => {
      const items = Array.from({ length: 7 }, (_, i) => ({
        id: `i${i}`,
        orden: i + 1,
        contenido: { imagen_url: `ref-${i}` }
      }));
      app = crearApp(items);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });

      expect(container.__memoriaEstado.cantidad).toBe(6);
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(6);
    });

    it('resuelve URL de preview con obtenerUrlPublica', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { imagen_url: 'ref-abc' } }
      ]);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-abc');
      expect(grillaHtml(container)).toContain('https://cdn.example.com/ref-abc.png');
    });
  });

  describe('selector de cantidad', () => {
    it('cambiar a 8 → 8 slots', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-cantidad-8').click();

      expect(container.__memoriaEstado.cantidad).toBe(8);
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(8);
      expect(contar(grillaHtml(container), /type="file"/g)).toBe(8);
    });

    it('cambiar a 12 → 12 slots vacíos', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-cantidad-12').click();

      expect(container.__memoriaEstado.cantidad).toBe(12);
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(12);
      expect(container.__memoriaEstado.slots.every((s) => !s.storageRef)).toBe(true);
    });

    it('reducir de 8 a 6 → elimina slots extra', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-cantidad-8').click();
      await container.querySelector('#btn-cantidad-6').click();

      expect(container.__memoriaEstado.cantidad).toBe(6);
      expect(container.__memoriaEstado.slots).toHaveLength(6);
      expect(contar(grillaHtml(container), /class="slot-memoria/g)).toBe(6);
    });

    it('reducir con slot subido en sesión → elimina del Storage', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-cantidad-8').click();
      await subirEnSlot(container, app, 7, crearFileImagen('extra.png'));
      expect(app.storage.subirArchivo).toHaveBeenCalledTimes(1);

      await container.querySelector('#btn-cantidad-6').click();
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-nuevo-uuid');
      expect(container.__memoriaEstado.slots).toHaveLength(6);
    });

    it('aumentar conserva slots existentes', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());
      await container.querySelector('#btn-cantidad-8').click();

      expect(container.__memoriaEstado.slots[0].storageRef).toBe('ref-nuevo-uuid');
      expect(container.__memoriaEstado.slots[7].storageRef).toBeNull();
    });
  });

  describe('subida de imágenes', () => {
    it('slot vacío tiene file input', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      expect(grillaHtml(container)).toContain('data-file-idx="0"');
      expect(grillaHtml(container)).toContain('accept="image/*"');
    });

    it('subir imagen → llama subirImagenMemoria (via storage.subirArchivo)', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());

      expect(app.storage.subirArchivo).toHaveBeenCalledTimes(1);
      const [path, , mimeType] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^memoria\/.+\.png$/);
      expect(mimeType).toBe('image/png');
    });

    it('subir imagen → muestra preview con la URL', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());

      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-nuevo-uuid');
      expect(grillaHtml(container)).toContain('https://cdn.example.com/ref-nuevo-uuid.png');
      expect(grillaHtml(container)).toContain('data-quitar-idx="0"');
    });

    it('subir imagen → guarda storageRef en el slot y NO persiste aún', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());

      expect(container.__memoriaEstado.slots[0].storageRef).toBe('ref-nuevo-uuid');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('slot con imagen reemplaza file input por preview + ×', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());

      expect(grillaHtml(container)).not.toContain('data-file-idx="0"');
      expect(grillaHtml(container)).toContain('data-preview-idx="0"');
      expect(grillaHtml(container)).toContain('data-quitar-idx="0"');
    });

    it('file no-imagen → muestra error y no sube', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      const txt = new File(['hola'], 'notas.txt', { type: 'text/plain' });
      await subirEnSlot(container, app, 0, txt);

      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
      const errorEl = container.querySelector('#item-error-memoria');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toMatch(/image/);
    });
  });

  describe('eliminar slot', () => {
    it('× borra el ref del slot', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());
      await container.querySelector('[data-quitar-idx="0"]').click();

      expect(container.__memoriaEstado.slots[0].storageRef).toBeNull();
      expect(container.__memoriaEstado.slots[0].url).toBeNull();
    });

    it('× de slot subido en sesión → elimina del Storage', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());
      await container.querySelector('[data-quitar-idx="0"]').click();

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-nuevo-uuid');
      expect(container.__memoriaEstado.pendientesBorrar.size).toBe(0);
    });

    it('× de slot existente → marca para eliminar al guardar (no borra aún)', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { imagen_url: 'ref-viejo' } }
      ]);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('[data-quitar-idx="0"]').click();

      expect(container.__memoriaEstado.pendientesBorrar.has('ref-viejo')).toBe(true);
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('× restaura file input en el slot', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());
      await container.querySelector('[data-quitar-idx="0"]').click();

      expect(grillaHtml(container)).toContain('data-file-idx="0"');
      expect(grillaHtml(container)).not.toContain('data-preview-idx="0"');
    });
  });

  describe('guardar', () => {
    it('con todos los slots llenos → agregarItem × N', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(6);
      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        imagen_url: 'ref-nuevo-uuid'
      });
    });

    it('items guardados tienen SOLO imagen_url (sin contenido)', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      for (const call of app.services.set.agregarItem.mock.calls) {
        const contenido = call[1];
        expect(Object.keys(contenido).sort()).toEqual(['imagen_url']);
        expect(contenido).not.toHaveProperty('contenido');
        expect(typeof contenido.imagen_url).toBe('string');
        expect(contenido.imagen_url).not.toBe('');
      }
    });

    it('validarContenidoSet pasa con los items { imagen_url }', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      const items = app.services.set.agregarItem.mock.calls.map((c) => c[1]);
      expect(() =>
        MemoriaGameDefinition.validarContenidoSet(
          { items },
          { ...MemoriaGameDefinition.defaultConfig, parejas_por_ronda: 6 }
        )
      ).not.toThrow();
    });

    it('guardar sin imágenes → error y NO persiste', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-guardar-memoria').click();

      const errorEl = container.querySelector('#item-error-memoria');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toContain('Faltan imágenes');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('guardar con un slot vacío → error y NO persiste', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await subirEnSlot(container, app, 0, crearFileImagen());
      await container.querySelector('#btn-guardar-memoria').click();

      expect(container.querySelector('#item-error-memoria').textContent).toContain('1');
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('muestra "Guardado" al completar', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      const okEl = container.querySelector('#item-ok-memoria');
      expect(okEl.textContent).toBe('Guardado');
      expect(okEl.classList.contains('hidden')).toBe(false);
    });

    it('NO llama crearSetCompleto', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();
      expect(app.services.set.crearSetCompleto).not.toHaveBeenCalled();
    });

    it('con items existentes → elimina los viejos antes de agregar', async () => {
      const existentes = Array.from({ length: 6 }, (_, i) => ({
        id: `old-${i}`,
        orden: i + 1,
        contenido: { imagen_url: `ref-old-${i}` }
      }));
      app = crearApp(existentes);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-guardar-memoria').click();

      expect(app.services.set.eliminarItem).toHaveBeenCalledTimes(6);
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('old-0');
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('old-5');

      const finElim = Math.max(...app.services.set.eliminarItem.mock.invocationCallOrder);
      const iniAgrega = Math.min(...app.services.set.agregarItem.mock.invocationCallOrder);
      expect(finElim).toBeLessThan(iniAgrega);
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(6);
    });

    it('al guardar elimina refs marcados pendientes de Storage', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { imagen_url: 'ref-viejo' } }
      ]);
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('[data-quitar-idx="0"]').click();
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-viejo');
      expect(container.__memoriaEstado.pendientesBorrar.size).toBe(0);
    });

    it('re-fetch de items antes de eliminar (2× listarItemsDeSet)', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('limpia error previo y muestra ok al volver a guardar', async () => {
      await renderEditorItemsMemoria(container, app, SET_ID, { id: SET_ID });
      await container.querySelector('#btn-guardar-memoria').click();
      const errorEl = container.querySelector('#item-error-memoria');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      await llenarTodos(container, app);
      await container.querySelector('#btn-guardar-memoria').click();

      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
      expect(container.querySelector('#item-ok-memoria').classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).toHaveBeenCalledTimes(6);
    });
  });
});
