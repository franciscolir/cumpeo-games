import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderEditorItemsHistoria } from '../../../../../src/ui/games/historia-enredada/editor.js';

const SET_ID = 'set-historia-1';

function crearElem() {
  const clases = new Set();
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    files: null,
    file: null,
    listeners: {},
    classList: {
      add: (c) => { clases.add(c); },
      remove: (c) => { clases.delete(c); },
      contains: (c) => clases.has(c),
      toggle: (c, force) => { if (force) clases.add(c); else clases.delete(c); }
    },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    click() { return this.listeners.click?.(); },
    async change() { return this.listeners.change?.(); },
    focus() {}
  };
}

function crearContainer({ conMount = true } = {}) {
  const elems = new Map();
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (sel === '#editor-items-historia-enredada') {
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
    },
    storage: {
      subirArchivo: vi.fn(async () => 'ref-nuevo-uuid'),
      obtenerUrlPublica: vi.fn(async (ref) => `https://cdn.example.com/${ref}.png`),
      eliminarArchivo: vi.fn(async () => undefined)
    }
  };
}

function itemsBase() {
  return [
    { id: 'i1', orden: 1, contenido: { titulo: 'El dragón', descripcion: 'Un dragón amigable', guion: 'Érase una vez un dragón que no sabía rugir.' } },
    { id: 'i2', orden: 2, contenido: { titulo: 'La sirena', descripcion: 'Una sirena curiosa', guion: 'Bajo el mar vivía una sirena que quería volar.', dibujo: 'ref-viejo-1' } },
    { id: 'i3', orden: 3, contenido: { titulo: 'El astronauta', descripcion: 'Un astronauta perdido', guion: 'En el espacio profundo, un astronauta encontró una estrella.' } }
  ];
}

function contar(html, re) {
  return (html.match(re) || []).length;
}

function listaHtml(container) {
  return container.querySelector('#lista-items-historias-he').innerHTML;
}

function btnItem(container, accion, id) {
  return container.querySelector(`[data-accion="${accion}"][data-id="${id}"]`);
}

function llenarFormNuevo(container, { titulo = 'Nueva', descripcion = 'Desc', guion = 'Guion completo' } = {}) {
  container.querySelector('#item-titulo-he').value = titulo;
  container.querySelector('#item-descripcion-he').value = descripcion;
  container.querySelector('#item-guion-he').value = guion;
}

function crearFileImagen(name = 'foto.png') {
  return new File(['contenido'], name, { type: 'image/png' });
}

async function subirDibujo(container, file = crearFileImagen()) {
  const input = container.querySelector('#file-dibujo-he');
  input.files = [file];
  input.file = file;
  await input.change();
}

async function quitarDibujo(container) {
  await container.querySelector('[data-accion="quitar-dibujo-he"]').click();
}

describe('renderEditorItemsHistoria', () => {
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
      expect(typeof renderEditorItemsHistoria).toBe('function');
    });

    it('no hace nada si falta el mount #editor-items-historia-enredada', async () => {
      const c = crearContainer({ conMount: false });
      await renderEditorItemsHistoria(c, app, SET_ID);
      expect(c.innerHTML).toBe('');
    });

    it('reemplaza el mount con section#editor-items-historia-enredada', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="editor-items-historia-enredada"');
      expect(container.innerHTML).toContain('<section');
    });

    it('renderiza lista y form con todos los campos', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.innerHTML).toContain('id="lista-items-historias-he"');
      expect(container.innerHTML).toContain('id="form-item-historia-he"');
      expect(container.innerHTML).toContain('id="form-item-titulo-he"');
      expect(container.innerHTML).toContain('id="item-titulo-he"');
      expect(container.innerHTML).toContain('id="item-descripcion-he"');
      expect(container.innerHTML).toContain('id="item-guion-he"');
      expect(container.innerHTML).toContain('id="item-dibujo-he"');
      expect(container.innerHTML).toContain('id="btn-guardar-item-he"');
      expect(container.innerHTML).toContain('id="btn-cancelar-edicion-he"');
      expect(container.innerHTML).toContain('id="item-error-he"');
    });

    it('el guion es un textarea con rows=6', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/<textarea[^>]*id="item-guion-he"[^>]*rows="6"/);
    });

    it('arranca en modo "Agregar historia"', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="form-item-titulo-he"[^>]*>Agregar historia</);
      expect(container.innerHTML).toMatch(/id="btn-guardar-item-he"[^>]*>Agregar</);
    });

    it('btn cancelar y error nacen ocultos', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.innerHTML).toMatch(/id="btn-cancelar-edicion-he"[^>]*hidden/);
      expect(container.innerHTML).toMatch(/id="item-error-he"[^>]*hidden/);
    });

    it('set vacío muestra "No hay historias todavía"', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(listaHtml(container)).toContain('No hay historias todavía');
    });

    it('inicializa el estado con las estructuras esperadas', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      const estado = container.__historiaEnredadaEstado;
      expect(estado.items).toEqual([]);
      expect(estado.editandoId).toBeNull();
      expect(estado.dibujo).toEqual({ storageRef: null, url: null });
      expect(estado.dibujoOriginalRef).toBeNull();
      expect(estado.subidosEnSesion).toBeInstanceOf(Set);
      expect(estado.pendientesBorrar).toBeInstanceOf(Set);
      expect(estado.urlsPorRef).toBeInstanceOf(Map);
    });
  });

  describe('carga de items existentes', () => {
    it('llama listarItemsDeSet con el setId', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledWith(SET_ID);
    });

    it('renderiza titulo, descripcion y guion truncado', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(listaHtml(container)).toContain('El dragón');
      expect(listaHtml(container)).toContain('Un dragón amigable');
      expect(listaHtml(container)).toContain('Érase una vez un dragón');
      expect(contar(listaHtml(container), /data-item-id=/g)).toBe(3);
    });

    it('trunca guion largo a ~80 chars con "…"', async () => {
      const guionLargo = 'A'.repeat(120);
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { titulo: 'Largo', descripcion: 'd', guion: guionLargo } }
      ]);
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(listaHtml(container)).toContain(`${'A'.repeat(80)}…`);
      expect(listaHtml(container)).not.toContain('A'.repeat(81));
    });

    it('guion corto no se trunca', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { titulo: 'Corto', descripcion: 'd', guion: 'Corto guion.' } }
      ]);
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(listaHtml(container)).toContain('Corto guion.');
      expect(listaHtml(container)).not.toContain('…');
    });

    it('renderiza 4 botones de acción por item', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(contar(listaHtml(container), /data-accion="subir"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="bajar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="editar"/g)).toBe(3);
      expect(contar(listaHtml(container), /data-accion="eliminar"/g)).toBe(3);
    });

    it('resuelve URL de dibujo existente con obtenerUrlPublica', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-viejo-1');
      expect(container.__historiaEnredadaEstado.urlsPorRef.get('ref-viejo-1'))
        .toBe('https://cdn.example.com/ref-viejo-1.png');
    });

    it('item sin dibujo no llama obtenerUrlPublica para ese item', async () => {
      app = crearApp([
        { id: 'i1', orden: 1, contenido: { titulo: 'A', descripcion: 'd', guion: 'g' } }
      ]);
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(app.storage.obtenerUrlPublica).not.toHaveBeenCalled();
    });

    it('ordena items por orden', async () => {
      app = crearApp([
        { id: 'i2', orden: 2, contenido: { titulo: 'Segundo', descripcion: 'd', guion: 'g' } },
        { id: 'i1', orden: 1, contenido: { titulo: 'Primero', descripcion: 'd', guion: 'g' } }
      ]);
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.__historiaEnredadaEstado.items[0].id).toBe('i1');
      expect(listaHtml(container).indexOf('Primero')).toBeLessThan(listaHtml(container).indexOf('Segundo'));
    });
  });

  describe('validación', () => {
    it('titulo vacío → error y no persiste', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container, { titulo: '   ' });
      await container.querySelector('#btn-guardar-item-he').click();

      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.textContent).toBe('El título es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('descripcion vacía → error y no persiste', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container, { descripcion: '   ' });
      await container.querySelector('#btn-guardar-item-he').click();

      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.textContent).toBe('La descripción es requerida');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guion vacío → error y no persiste', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container, { guion: '   ' });
      await container.querySelector('#btn-guardar-item-he').click();

      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.textContent).toBe('El guion es requerido');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('guardado válido oculta el error previo', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await container.querySelector('#btn-guardar-item-he').click();
      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.classList.contains('hidden')).toBe(false);

      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-he').click();
      expect(errorEl.classList.contains('hidden')).toBe(true);
      expect(errorEl.textContent).toBe('');
    });

    it('recorta whitespace de titulo, descripcion y guion', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container, { titulo: '  T  ', descripcion: '  D  ', guion: '  G  ' });
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        titulo: 'T',
        descripcion: 'D',
        guion: 'G'
      });
    });
  });

  describe('guardar nuevo', () => {
    it('sin dibujo → agregarItem con { titulo, descripcion, guion }', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        titulo: 'Nueva',
        descripcion: 'Desc',
        guion: 'Guion completo'
      });
      expect(app.services.set.agregarItem.mock.calls[0][1]).not.toHaveProperty('dibujo');
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('con dibujo → incluye dibujo (storageRef)', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container);
      await subirDibujo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.agregarItem).toHaveBeenCalledWith(SET_ID, {
        titulo: 'Nueva',
        descripcion: 'Desc',
        guion: 'Guion completo',
        dibujo: 'ref-nuevo-uuid'
      });
    });

    it('limpia el form tras guardar', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container, { titulo: 'T', descripcion: 'D', guion: 'G' });
      await container.querySelector('#btn-guardar-item-he').click();

      expect(container.querySelector('#form-item-titulo-he').textContent).toBe('Agregar historia');
      expect(container.querySelector('#btn-guardar-item-he').textContent).toBe('Agregar');
      expect(container.querySelector('#item-titulo-he').value).toBe('');
      expect(container.querySelector('#item-descripcion-he').value).toBe('');
      expect(container.querySelector('#item-guion-he').value).toBe('');
      expect(container.querySelector('#btn-cancelar-edicion-he').classList.contains('hidden')).toBe(true);
      expect(container.__historiaEnredadaEstado.editandoId).toBeNull();
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({ storageRef: null, url: null });
    });

    it('recarga la lista de items tras guardar', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-he').click();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('error de agregarItem se muestra en #item-error-he', async () => {
      app.services.set.agregarItem.mockRejectedValue(new Error('boom agregar'));
      await renderEditorItemsHistoria(container, app, SET_ID);
      llenarFormNuevo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.textContent).toBe('boom agregar');
      expect(errorEl.classList.contains('hidden')).toBe(false);
    });
  });

  describe('editar item existente', () => {
    it('cargar item → modo "Editar historia" y campos poblados', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();

      expect(container.querySelector('#form-item-titulo-he').textContent).toBe('Editar historia');
      expect(container.querySelector('#btn-guardar-item-he').textContent).toBe('Guardar cambios');
      expect(container.querySelector('#btn-cancelar-edicion-he').classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#item-titulo-he').value).toBe('El dragón');
      expect(container.querySelector('#item-descripcion-he').value).toBe('Un dragón amigable');
      expect(container.querySelector('#item-guion-he').value).toBe('Érase una vez un dragón que no sabía rugir.');
      expect(container.__historiaEnredadaEstado.editandoId).toBe('i1');
    });

    it('cargar item con dibujo → preview y dibujoOriginalRef', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();

      expect(container.__historiaEnredadaEstado.dibujoOriginalRef).toBe('ref-viejo-1');
      expect(container.__historiaEnredadaEstado.dibujo.storageRef).toBe('ref-viejo-1');
      expect(container.querySelector('#item-dibujo-he').innerHTML).toContain('data-preview-dibujo-he');
      expect(container.querySelector('#item-dibujo-he').innerHTML).toContain('https://cdn.example.com/ref-viejo-1.png');
    });

    it('cargar item sin dibujo → file input visible', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();

      expect(container.__historiaEnredadaEstado.dibujoOriginalRef).toBeNull();
      expect(container.querySelector('#item-dibujo-he').innerHTML).toContain('id="file-dibujo-he"');
    });

    it('guardar en edición → actualizarItem (no agregarItem)', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();
      container.querySelector('#item-titulo-he').value = 'Editado';
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i1', {
        titulo: 'Editado',
        descripcion: 'Un dragón amigable',
        guion: 'Érase una vez un dragón que no sabía rugir.'
      });
      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
    });

    it('editar conserva dibujo original si no cambia', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i2', {
        titulo: 'La sirena',
        descripcion: 'Una sirena curiosa',
        guion: 'Bajo el mar vivía una sirena que quería volar.',
        dibujo: 'ref-viejo-1'
      });
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
    });

    it('error de actualizarItem se muestra', async () => {
      app = crearApp(itemsBase());
      app.services.set.actualizarItem.mockRejectedValue(new Error('boom actualizar'));
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-guardar-item-he').click();

      expect(container.querySelector('#item-error-he').textContent).toBe('boom actualizar');
    });

    it('cancelar edición limpia el form', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();
      await container.querySelector('#btn-cancelar-edicion-he').click();

      expect(container.querySelector('#form-item-titulo-he').textContent).toBe('Agregar historia');
      expect(container.querySelector('#item-titulo-he').value).toBe('');
      expect(container.__historiaEnredadaEstado.editandoId).toBeNull();
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({ storageRef: null, url: null });
    });
  });

  describe('upload de imagen', () => {
    it('file input tiene accept="image/*"', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      expect(container.querySelector('#file-dibujo-he').listeners.change).toBeTypeOf('function');
      const html = container.querySelector('#item-dibujo-he').innerHTML;
      expect(html).toContain('accept="image/*"');
      expect(html).toContain('type="file"');
    });

    it('subir imagen → llama storage.subirArchivo con path historia-enredada/', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);

      expect(app.storage.subirArchivo).toHaveBeenCalledTimes(1);
      const [path, , mimeType] = app.storage.subirArchivo.mock.calls[0];
      expect(path).toMatch(/^historia-enredada\/.+\.png$/);
      expect(mimeType).toBe('image/png');
    });

    it('subir imagen → muestra preview con URL y botón quitar', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);

      expect(app.storage.obtenerUrlPublica).toHaveBeenCalledWith('ref-nuevo-uuid');
      const html = container.querySelector('#item-dibujo-he').innerHTML;
      expect(html).toContain('https://cdn.example.com/ref-nuevo-uuid.png');
      expect(html).toContain('data-accion="quitar-dibujo-he"');
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({
        storageRef: 'ref-nuevo-uuid',
        url: 'https://cdn.example.com/ref-nuevo-uuid.png'
      });
    });

    it('subir imagen NO persiste hasta guardar', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);

      expect(app.services.set.agregarItem).not.toHaveBeenCalled();
      expect(app.services.set.actualizarItem).not.toHaveBeenCalled();
    });

    it('imagen nueva se registra en subidosEnSesion', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);

      expect(container.__historiaEnredadaEstado.subidosEnSesion.has('ref-nuevo-uuid')).toBe(true);
    });

    it('file no-imagen → error y no sube', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      const txt = new File(['hola'], 'notas.txt', { type: 'text/plain' });
      await subirDibujo(container, txt);

      expect(app.storage.subirArchivo).not.toHaveBeenCalled();
      const errorEl = container.querySelector('#item-error-he');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(errorEl.textContent).toMatch(/image/);
    });

    it('quitar imagen recién subida → elimina del Storage', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);
      await quitarDibujo(container);

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-nuevo-uuid');
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({ storageRef: null, url: null });
      expect(container.__historiaEnredadaEstado.subidosEnSesion.has('ref-nuevo-uuid')).toBe(false);
      expect(container.__historiaEnredadaEstado.pendientesBorrar.size).toBe(0);
      expect(container.querySelector('#item-dibujo-he').innerHTML).toContain('id="file-dibujo-he"');
    });

    it('quitar imagen existente (editando) → marca pendientesBorrar, no borra aún', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await quitarDibujo(container);

      expect(container.__historiaEnredadaEstado.pendientesBorrar.has('ref-viejo-1')).toBe(true);
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({ storageRef: null, url: null });
    });
  });

  describe('guardar con cambio de imagen (borrar vieja)', () => {
    it('reemplazar dibujo existente al guardar → borra el viejo', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await subirDibujo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i2', {
        titulo: 'La sirena',
        descripcion: 'Una sirena curiosa',
        guion: 'Bajo el mar vivía una sirena que quería volar.',
        dibujo: 'ref-nuevo-uuid'
      });
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-viejo-1');
      expect(container.__historiaEnredadaEstado.pendientesBorrar.size).toBe(0);
    });

    it('quitar dibujo existente y guardar → borra el viejo y no incluye dibujo', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await quitarDibujo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      expect(app.services.set.actualizarItem).toHaveBeenCalledWith('i2', {
        titulo: 'La sirena',
        descripcion: 'Una sirena curiosa',
        guion: 'Bajo el mar vivía una sirena que quería volar.'
      });
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-viejo-1');
    });

    it('pendientesBorrar se limpia tras guardar', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await quitarDibujo(container);
      await container.querySelector('#btn-guardar-item-he').click();

      expect(container.__historiaEnredadaEstado.pendientesBorrar.size).toBe(0);
    });
  });

  describe('eliminar item', () => {
    it('eliminar item sin dibujo → solo eliminarItem', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'eliminar', 'i1').click();

      expect(confirmMock).toHaveBeenCalled();
      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('i1');
      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });

    it('eliminar item con dibujo → eliminarItem + eliminarImagen', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'eliminar', 'i2').click();

      expect(app.services.set.eliminarItem).toHaveBeenCalledWith('i2');
      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-viejo-1');
    });

    it('confirm=false → no elimina', async () => {
      confirmMock.mockReturnValue(false);
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'eliminar', 'i1').click();

      expect(app.services.set.eliminarItem).not.toHaveBeenCalled();
    });

    it('eliminar item que se estaba editando → limpia el form', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i1').click();
      await btnItem(container, 'eliminar', 'i1').click();

      expect(container.__historiaEnredadaEstado.editandoId).toBeNull();
      expect(container.querySelector('#form-item-titulo-he').textContent).toBe('Agregar historia');
    });
  });

  describe('reordenar (deuda #108)', () => {
    it('subir → reordenarItems con [{ id }]', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'subir', 'i2').click();

      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
      const ordenFinal = app.services.set.reordenarItems.mock.calls[0][1];
      expect(Array.isArray(ordenFinal)).toBe(true);
      for (const entry of ordenFinal) {
        expect(Object.keys(entry)).toEqual(['id']);
      }
    });

    it('bajar → reordenarItems con [{ id }]', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'bajar', 'i1').click();

      expect(app.services.set.reordenarItems).toHaveBeenCalledWith(SET_ID, [
        { id: 'i2' },
        { id: 'i1' },
        { id: 'i3' }
      ]);
    });

    it('subir el primero → no llama reordenarItems', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'subir', 'i1').click();

      expect(app.services.set.reordenarItems).not.toHaveBeenCalled();
    });

    it('bajar el último → no llama reordenarItems', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'bajar', 'i3').click();

      expect(app.services.set.reordenarItems).not.toHaveBeenCalled();
    });

    it('recarga la lista tras reordenar', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'subir', 'i2').click();

      expect(app.services.set.listarItemsDeSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelar con imagen subida en sesión', () => {
    it('cancelar tras subir imagen nueva → elimina del Storage', async () => {
      await renderEditorItemsHistoria(container, app, SET_ID);
      await subirDibujo(container);
      await container.querySelector('#btn-cancelar-edicion-he').click();

      expect(app.storage.eliminarArchivo).toHaveBeenCalledWith('ref-nuevo-uuid');
      expect(container.__historiaEnredadaEstado.dibujo).toEqual({ storageRef: null, url: null });
    });

    it('cancelar tras quitar dibujo existente → NO borra (pendientes se limpian sin persistir)', async () => {
      app = crearApp(itemsBase());
      await renderEditorItemsHistoria(container, app, SET_ID);
      await btnItem(container, 'editar', 'i2').click();
      await quitarDibujo(container);
      await container.querySelector('#btn-cancelar-edicion-he').click();

      expect(app.storage.eliminarArchivo).not.toHaveBeenCalled();
      expect(container.__historiaEnredadaEstado.pendientesBorrar.size).toBe(0);
    });
  });
});
