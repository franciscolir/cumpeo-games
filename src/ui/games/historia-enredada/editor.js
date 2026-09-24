/* =============================================================
   Editor de Items — Historia Enredada

   Lista de historias + form con:
   - input titulo
   - input descripcion
   - textarea guion
   - upload de imagen (dibujo, opcional)

   Estado en container.__historiaEnredadaEstado (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   ============================================================= */

import {
  subirImagenHistoria,
  obtenerUrlImagenHistoria,
  eliminarImagenHistoria
} from './storage-helpers.js';

function _renderEditorItemsHistoria() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-historia-enredada">
      <h2 class="font-headline-md uppercase mb-4">Historias del set</h2>

      <ul id="lista-items-historias-he" class="space-y-2 mb-6"></ul>

      <div id="form-item-historia-he" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-he" class="font-headline-sm uppercase mb-3">Agregar historia</h3>

        <input id="item-titulo-he" type="text" placeholder="Título"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <input id="item-descripcion-he" type="text" placeholder="Resumen breve"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <textarea id="item-guion-he" rows="6" placeholder="Guion completo"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none"></textarea>

        <div id="item-dibujo-he" class="mb-3"></div>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-he" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-he" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-he" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _renderDibujo(container) {
  const estado = container.__historiaEnredadaEstado;
  const cont = container.querySelector('#item-dibujo-he');
  if (!cont || !estado) return;

  const { storageRef, url } = estado.dibujo;

  if (storageRef && url) {
    cont.innerHTML = `
      <div class="relative inline-block border-2 border-on-surface rounded-lg overflow-hidden max-w-xs">
        <img src="${url}" alt="Imagen de la historia" class="block max-w-full" data-preview-dibujo-he />
        <button type="button" data-accion="quitar-dibujo-he" title="Quitar imagen"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-error text-background font-bold leading-none flex items-center justify-center">×</button>
      </div>
    `;
  } else {
    cont.innerHTML = `
      <input type="file" accept="image/*" id="file-dibujo-he" data-accion="subir-dibujo-he" title="Subir imagen"
        class="font-body-sm file:mr-3 file:px-3 file:py-1 file:border-2 file:border-on-surface file:rounded-lg file:bg-surface file:font-label-sm file:uppercase cursor-pointer" />
    `;
  }

  _bindDibujo(container);
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-he');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _limpiarError(container) {
  const errorEl = container.querySelector('#item-error-he');
  if (!errorEl) return;
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function _limpiarFormItem(container) {
  const estado = container.__historiaEnredadaEstado;

  container.querySelector('#form-item-titulo-he').textContent = 'Agregar historia';
  container.querySelector('#btn-guardar-item-he').textContent = 'Agregar';
  container.querySelector('#btn-cancelar-edicion-he').classList.add('hidden');

  _limpiarError(container);

  container.querySelector('#item-titulo-he').value = '';
  container.querySelector('#item-descripcion-he').value = '';
  container.querySelector('#item-guion-he').value = '';

  estado.editandoId = null;
  estado.dibujo = { storageRef: null, url: null };
  estado.dibujoOriginalRef = null;
  estado.pendientesBorrar.clear();
  _renderDibujo(container);
}

function _cargarItemEnForm(container, app, item) {
  const estado = container.__historiaEnredadaEstado;
  const c = item.contenido || {};

  container.querySelector('#form-item-titulo-he').textContent = 'Editar historia';
  container.querySelector('#btn-guardar-item-he').textContent = 'Guardar cambios';
  container.querySelector('#btn-cancelar-edicion-he').classList.remove('hidden');

  _limpiarError(container);

  container.querySelector('#item-titulo-he').value = c.titulo || '';
  container.querySelector('#item-descripcion-he').value = c.descripcion || '';
  container.querySelector('#item-guion-he').value = c.guion || '';

  estado.editandoId = item.id;
  estado.dibujoOriginalRef = typeof c.dibujo === 'string' && c.dibujo !== '' ? c.dibujo : null;
  estado.pendientesBorrar.clear();

  if (estado.dibujoOriginalRef) {
    const url = estado.urlsPorRef.get(estado.dibujoOriginalRef) || null;
    estado.dibujo = { storageRef: estado.dibujoOriginalRef, url };
  } else {
    estado.dibujo = { storageRef: null, url: null };
  }

  _renderDibujo(container);

  container.querySelector('#item-titulo-he').focus();
}

function _validarItem(container) {
  const errorEl = container.querySelector('#item-error-he');

  const titulo = container.querySelector('#item-titulo-he').value.trim();
  if (!titulo) {
    errorEl.textContent = 'El título es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const descripcion = container.querySelector('#item-descripcion-he').value.trim();
  if (!descripcion) {
    errorEl.textContent = 'La descripción es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const guion = container.querySelector('#item-guion-he').value.trim();
  if (!guion) {
    errorEl.textContent = 'El guion es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const contenido = { titulo, descripcion, guion };

  const estado = container.__historiaEnredadaEstado;
  if (estado.dibujo.storageRef) {
    contenido.dibujo = estado.dibujo.storageRef;
  }

  _limpiarError(container);

  return contenido;
}

async function _cargarItems(container, app, setId) {
  const estado = container.__historiaEnredadaEstado;
  const lista = container.querySelector('#lista-items-historias-he');
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  estado.items = items;

  estado.urlsPorRef = new Map();
  for (const item of items) {
    const ref = item.contenido?.dibujo;
    if (typeof ref === 'string' && ref && !estado.urlsPorRef.has(ref)) {
      const url = await obtenerUrlImagenHistoria(app, ref);
      estado.urlsPorRef.set(ref, url);
    }
  }

  if (items.length === 0) {
    lista.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">No hay historias todavía</li>';
    return;
  }

  lista.innerHTML = items.map((item) => {
    const c = item.contenido || {};
    const guionTruncado = typeof c.guion === 'string' && c.guion.length > 80
      ? `${c.guion.slice(0, 80)}…`
      : (c.guion || '');
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.titulo || '(sin título)'}</p>
          <p class="font-body-sm text-on-surface-variant">${c.descripcion || ''}</p>
          <p class="font-body-sm text-on-surface-variant italic">${guionTruncado}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button data-accion="subir" data-id="${item.id}" title="Subir"
            class="font-label-sm border-2 border-on-surface-variant rounded px-2 py-1 hover:bg-surface-container-lowest transition">↑</button>
          <button data-accion="bajar" data-id="${item.id}" title="Bajar"
            class="font-label-sm border-2 border-on-surface-variant rounded px-2 py-1 hover:bg-surface-container-lowest transition">↓</button>
          <button data-accion="editar" data-id="${item.id}" title="Editar"
            class="font-label-sm border-2 border-tertiary rounded px-2 py-1 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">✎</button>
          <button data-accion="eliminar" data-id="${item.id}" title="Eliminar"
            class="font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition">✗</button>
        </div>
      </li>
    `;
  }).join('');

  _bindItems(container, app, setId);
}

async function _reordenar(container, app, setId, id, accion) {
  const estado = container.__historiaEnredadaEstado;
  const items = estado.items;

  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;

  const swapIdx = accion === 'subir' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return;

  const temp = items[idx].orden;
  items[idx].orden = items[swapIdx].orden;
  items[swapIdx].orden = temp;
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const ordenFinal = items.map((i) => ({ id: i.id }));
  await app.services.set.reordenarItems(setId, ordenFinal);
  await _cargarItems(container, app, setId);
}

function _bindItems(container, app, setId) {
  const estado = container.__historiaEnredadaEstado;

  for (const item of estado.items) {
    const id = item.id;

    const btnEditar = container.querySelector(`[data-accion="editar"][data-id="${id}"]`);
    if (btnEditar) {
      btnEditar.addEventListener('click', () => _cargarItemEnForm(container, app, item));
    }

    const btnEliminar = container.querySelector(`[data-accion="eliminar"][data-id="${id}"]`);
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta historia?')) return;
        try {
          const ref = item.contenido?.dibujo;
          await app.services.set.eliminarItem(id);
          if (typeof ref === 'string' && ref) {
            await eliminarImagenHistoria(app, ref);
          }
          if (estado.editandoId === id) {
            _limpiarFormItem(container);
          }
          await _cargarItems(container, app, setId);
        } catch (err) {
          _mostrarError(container, err.message);
        }
      });
    }

    const btnSubir = container.querySelector(`[data-accion="subir"][data-id="${id}"]`);
    if (btnSubir) {
      btnSubir.addEventListener('click', async () => {
        await _reordenar(container, app, setId, id, 'subir');
      });
    }

    const btnBajar = container.querySelector(`[data-accion="bajar"][data-id="${id}"]`);
    if (btnBajar) {
      btnBajar.addEventListener('click', async () => {
        await _reordenar(container, app, setId, id, 'bajar');
      });
    }
  }
}

function _bindDibujo(container) {
  const estado = container.__historiaEnredadaEstado;

  const fileInput = container.querySelector('#file-dibujo-he');
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0] || fileInput.file;
      if (!file) return;

      try {
        const storageRef = await subirImagenHistoria(container.__historiaEnredadaCtx.app, file);
        const url = await obtenerUrlImagenHistoria(container.__historiaEnredadaCtx.app, storageRef);

        if (estado.dibujo.storageRef && estado.dibujo.storageRef !== storageRef) {
          const viejo = estado.dibujo.storageRef;
          if (estado.subidosEnSesion.has(viejo)) {
            await eliminarImagenHistoria(container.__historiaEnredadaCtx.app, viejo);
            estado.subidosEnSesion.delete(viejo);
          } else if (viejo !== estado.dibujoOriginalRef) {
            estado.pendientesBorrar.add(viejo);
          } else {
            estado.pendientesBorrar.add(viejo);
          }
        }

        estado.dibujo = { storageRef, url };
        estado.subidosEnSesion.add(storageRef);
        _renderDibujo(container);
      } catch (err) {
        _mostrarError(container, err.message);
      }
    });
  }

  const btnQuitar = container.querySelector('[data-accion="quitar-dibujo-he"]');
  if (btnQuitar) {
    btnQuitar.addEventListener('click', async () => {
      const ref = estado.dibujo.storageRef;
      if (ref) {
        if (estado.subidosEnSesion.has(ref)) {
          await eliminarImagenHistoria(container.__historiaEnredadaCtx.app, ref);
          estado.subidosEnSesion.delete(ref);
        } else {
          estado.pendientesBorrar.add(ref);
        }
      }
      estado.dibujo = { storageRef: null, url: null };
      _renderDibujo(container);
    });
  }
}

function _bindEditorItemsHistoria(container, app, setId) {
  const estado = container.__historiaEnredadaEstado;
  container.__historiaEnredadaCtx = { app, setId };

  const btnGuardar = container.querySelector('#btn-guardar-item-he');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-he');

  btnGuardar.addEventListener('click', async () => {
    const contenido = _validarItem(container);
    if (!contenido) return;

    try {
      if (estado.editandoId) {
        if (
          estado.dibujoOriginalRef &&
          estado.dibujoOriginalRef !== contenido.dibujo
        ) {
          estado.pendientesBorrar.add(estado.dibujoOriginalRef);
        }
        await app.services.set.actualizarItem(estado.editandoId, contenido);
      } else {
        await app.services.set.agregarItem(setId, contenido);
      }

      for (const ref of estado.pendientesBorrar) {
        await eliminarImagenHistoria(app, ref);
      }
      estado.pendientesBorrar.clear();

      _limpiarFormItem(container);
      await _cargarItems(container, app, setId);
    } catch (err) {
      _mostrarError(container, err.message);
    }
  });

  btnCancelar.addEventListener('click', async () => {
    for (const ref of estado.pendientesBorrar) {
      if (estado.subidosEnSesion.has(ref)) {
        await eliminarImagenHistoria(app, ref);
        estado.subidosEnSesion.delete(ref);
      }
    }
    estado.pendientesBorrar.clear();

    if (
      estado.dibujo.storageRef &&
      estado.subidosEnSesion.has(estado.dibujo.storageRef) &&
      estado.dibujo.storageRef !== estado.dibujoOriginalRef
    ) {
      await eliminarImagenHistoria(app, estado.dibujo.storageRef);
      estado.subidosEnSesion.delete(estado.dibujo.storageRef);
    }

    _limpiarFormItem(container);
  });
}

/**
 * Renderiza el editor de historias de Historia Enredada.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsHistoria(container, app, setId) {
  const mount = container.querySelector('#editor-items-historia-enredada');
  if (!mount) return;

  container.__historiaEnredadaEstado = {
    items: [],
    editandoId: null,
    dibujo: { storageRef: null, url: null },
    dibujoOriginalRef: null,
    subidosEnSesion: new Set(),
    pendientesBorrar: new Set(),
    urlsPorRef: new Map()
  };
  container.__historiaEnredadaCtx = { app, setId };

  mount.outerHTML = _renderEditorItemsHistoria();
  _renderDibujo(container);
  _bindEditorItemsHistoria(container, app, setId);
  await _cargarItems(container, app, setId);
}
