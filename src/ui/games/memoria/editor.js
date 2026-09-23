/* =============================================================
   Editor de Items — Memoricé (grilla de N slots 6/8/10/12)

   Cada slot tiene: preview + ×, o file input.
   Un único botón "Guardar" persiste el set completo.

   Persistencia: items { imagen_url: storageRef } (sin contenido).
   imagen_url guarda un storageRef (UUID). Deuda técnica #101.
   ============================================================= */

import { MemoriaGameDefinition } from '../../../games/memoria/MemoriaGameDefinition.js';
import {
  subirImagenMemoria,
  obtenerUrlImagenMemoria,
  eliminarImagenMemoria
} from './storage-helpers.js';

const CANTIDADES = [6, 8, 10, 12];
const CANTIDAD_DEFAULT = 6;

function _esPredeterminado(set) {
  return set?.es_predeterminado === true;
}

function _renderEditorItemsMemoria(cantidad, soloLectura = false) {
  if (soloLectura) {
    return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-memoria">
      <h2 class="font-headline-md uppercase mb-4">Imágenes de Memoricé</h2>

      <p class="font-body-md text-on-surface-variant mb-4">Este set es predeterminado y no se puede editar.</p>

      <div id="grilla-slots-memoria" class="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6"></div>

      <button id="btn-guardar-memoria" type="button" disabled
        class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface-container-low text-on-surface-variant cursor-not-allowed opacity-60">Guardar</button>

      <p id="item-error-memoria" class="font-body-sm text-error mt-2 hidden"></p>
      <p id="item-ok-memoria" class="font-body-sm text-tertiary mt-2 hidden"></p>
    </section>
  `;
  }

  const botones = CANTIDADES.map((n) => `
    <button type="button" data-cantidad="${n}" id="btn-cantidad-${n}"
      class="font-label-md uppercase border-2 rounded-lg px-3 py-1 transition ${n === cantidad
        ? 'border-tertiary bg-tertiary/30 text-tertiary'
        : 'border-on-surface-variant text-on-surface-variant hover:bg-surface-container-lowest'}">${n}</button>
  `).join('');

  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-memoria">
      <h2 class="font-headline-md uppercase mb-4">Imágenes de Memoricé</h2>

      <div class="flex items-center gap-2 mb-4" id="selector-cantidad-memoria">
        <span class="font-label-md uppercase mr-1">Parejas:</span>
        ${botones}
      </div>

      <div id="grilla-slots-memoria" class="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6"></div>

      <button id="btn-guardar-memoria" type="button"
        class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Guardar</button>

      <p id="item-error-memoria" class="font-body-sm text-error mt-2 hidden"></p>
      <p id="item-ok-memoria" class="font-body-sm text-tertiary mt-2 hidden"></p>
    </section>
  `;
}

function _renderSlot(idx, storageRef, url, soloLectura = false) {
  if (soloLectura) {
    if (storageRef && storageRef.startsWith('emoji:')) {
      return `
      <div class="slot-memoria border-2 border-on-surface rounded-lg aspect-square flex items-center justify-center bg-surface-container-lowest" data-idx="${idx}">
        <span class="font-display-hero text-4xl text-on-surface">${storageRef.slice(6)}</span>
      </div>
    `;
    }
    if (storageRef && url) {
      return `
      <div class="slot-memoria border-2 border-on-surface rounded-lg aspect-square relative overflow-hidden bg-surface-container-lowest" data-idx="${idx}">
        <img src="${url}" alt="Imagen ${idx + 1}" class="w-full h-full object-cover" data-preview-idx="${idx}" />
      </div>
    `;
    }
    return `
    <div class="slot-memoria border-2 border-dashed border-on-surface-variant rounded-lg aspect-square flex items-center justify-center bg-surface-container-lowest" data-idx="${idx}">
      <span class="absolute font-body-sm text-on-surface-variant pointer-events-none">${idx + 1}</span>
    </div>
  `;
  }

  if (storageRef && url) {
    return `
      <div class="slot-memoria border-2 border-on-surface rounded-lg aspect-square relative overflow-hidden bg-surface-container-lowest" data-idx="${idx}">
        <img src="${url}" alt="Imagen ${idx + 1}" class="w-full h-full object-cover" data-preview-idx="${idx}" />
        <button type="button" data-quitar-idx="${idx}" data-accion="quitar" title="Quitar imagen"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-error text-background font-bold leading-none flex items-center justify-center">×</button>
      </div>
    `;
  }

  return `
    <div class="slot-memoria border-2 border-dashed border-on-surface-variant rounded-lg aspect-square flex items-center justify-center bg-surface-container-lowest" data-idx="${idx}">
      <input type="file" accept="image/*" data-file-idx="${idx}" data-accion="subir" title="Subir imagen ${idx + 1}"
        class="w-full h-full opacity-0 cursor-pointer" />
      <span class="absolute font-body-sm text-on-surface-variant pointer-events-none">${idx + 1}</span>
    </div>
  `;
}

function _pintarGrilla(container) {
  const estado = container.__memoriaEstado;
  const grilla = container.querySelector('#grilla-slots-memoria');
  if (!grilla) return;
  const soloLectura = estado.soloLectura === true;
  grilla.innerHTML = estado.slots
    .map((s, i) => _renderSlot(i, s.storageRef, s.url, soloLectura))
    .join('');
}

async function _cargarItems(container, app, setId) {
  const estado = container.__memoriaEstado;
  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const refs = items
    .map((it) => it.contenido?.imagen_url)
    .filter((r) => typeof r === 'string' && r !== '');

  estado.cantidad = CANTIDADES.includes(refs.length)
    ? refs.length
    : CANTIDAD_DEFAULT;

  estado.slots = [];
  for (let i = 0; i < estado.cantidad; i++) {
    const ref = refs[i] || null;
    let url = null;
    if (ref && !ref.startsWith('emoji:')) {
      url = await obtenerUrlImagenMemoria(app, ref);
    }
    estado.slots.push({ storageRef: ref, url });
  }

  for (let i = estado.cantidad; i < refs.length; i++) {
    estado.pendientesBorrar.add(refs[i]);
  }

  return items;
}

function _leerItems(container) {
  const estado = container.__memoriaEstado;
  return estado.slots
    .filter((s) => s.storageRef)
    .map((s) => ({ imagen_url: s.storageRef }));
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-memoria');
  const okEl = container.querySelector('#item-ok-memoria');
  if (okEl) {
    okEl.classList.add('hidden');
    okEl.textContent = '';
  }
  if (errorEl) {
    errorEl.textContent = mensaje;
    errorEl.classList.remove('hidden');
  }
}

function _mostrarOk(container, mensaje) {
  const errorEl = container.querySelector('#item-error-memoria');
  const okEl = container.querySelector('#item-ok-memoria');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
  if (okEl) {
    okEl.textContent = mensaje;
    okEl.classList.remove('hidden');
  }
}

async function _cambiarCantidad(container, app, nueva) {
  const estado = container.__memoriaEstado;
  const anterior = estado.cantidad;
  if (!CANTIDADES.includes(nueva) || nueva === anterior) return;

  estado.cantidad = nueva;

  if (nueva > anterior) {
    for (let i = anterior; i < nueva; i++) {
      estado.slots.push({ storageRef: null, url: null });
    }
  } else {
    for (let i = nueva; i < anterior; i++) {
      const slot = estado.slots[i];
      if (slot?.storageRef) {
        if (estado.subidosEnSesion.has(slot.storageRef)) {
          await eliminarImagenMemoria(app, slot.storageRef);
          estado.subidosEnSesion.delete(slot.storageRef);
        } else {
          estado.pendientesBorrar.add(slot.storageRef);
        }
      }
    }
    estado.slots = estado.slots.slice(0, nueva);
  }

  container.innerHTML = _renderEditorItemsMemoria(nueva, estado.soloLectura === true);
  _pintarGrilla(container);
  _bindEditorItemsMemoria(
    container,
    app,
    container.__memoriaCtx.setId,
    container.__memoriaCtx.set
  );
}

function _bindSlots(container, app) {
  const estado = container.__memoriaEstado;

  for (let idx = 0; idx < estado.slots.length; idx++) {
    const fileInput = container.querySelector(`[data-file-idx="${idx}"]`);
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0] || fileInput.file;
        if (!file) return;

        try {
          const storageRef = await subirImagenMemoria(app, file);
          const url = await obtenerUrlImagenMemoria(app, storageRef);
          estado.slots[idx] = { storageRef, url };
          estado.subidosEnSesion.add(storageRef);
          _pintarGrilla(container);
          _bindSlots(container, app);
        } catch (err) {
          _mostrarError(container, err.message);
        }
      });
    }

    const btnQuitar = container.querySelector(`[data-quitar-idx="${idx}"]`);
    if (btnQuitar) {
      btnQuitar.addEventListener('click', async () => {
        const slot = estado.slots[idx];
        if (slot?.storageRef) {
          if (estado.subidosEnSesion.has(slot.storageRef)) {
            await eliminarImagenMemoria(app, slot.storageRef);
            estado.subidosEnSesion.delete(slot.storageRef);
          } else {
            estado.pendientesBorrar.add(slot.storageRef);
          }
        }
        estado.slots[idx] = { storageRef: null, url: null };
        _pintarGrilla(container);
        _bindSlots(container, app);
      });
    }
  }
}

function _bindEditorItemsMemoria(container, app, setId, set) {
  const estado = container.__memoriaEstado;
  container.__memoriaCtx = { app, setId, set };

  if (estado.soloLectura === true) {
    return;
  }

  for (const n of CANTIDADES) {
    const btn = container.querySelector(`#btn-cantidad-${n}`);
    if (btn) {
      btn.addEventListener('click', () => _cambiarCantidad(container, app, n));
    }
  }

  _bindSlots(container, app);

  const btnGuardar = container.querySelector('#btn-guardar-memoria');
  if (!btnGuardar) return;

  btnGuardar.addEventListener('click', async () => {
    const faltantes = estado.slots
      .map((s, i) => (s.storageRef ? null : i))
      .filter((i) => i !== null);

    if (faltantes.length > 0) {
      _mostrarError(
        container,
        `Faltan imágenes en los slots: ${faltantes.join(', ')}`
      );
      return;
    }

    const items = _leerItems(container);

    try {
      MemoriaGameDefinition.validarContenidoSet(
        { items },
        { ...MemoriaGameDefinition.defaultConfig, parejas_por_ronda: estado.cantidad }
      );
    } catch (err) {
      _mostrarError(container, err.message);
      return;
    }

    try {
      for (const ref of estado.pendientesBorrar) {
        await eliminarImagenMemoria(app, ref);
      }
      estado.pendientesBorrar.clear();

      const existentes = await app.services.set.listarItemsDeSet(setId);
      for (const item of existentes) {
        await app.services.set.eliminarItem(item.id);
      }

      for (const item of items) {
        await app.services.set.agregarItem(setId, item);
      }

      _mostrarOk(container, 'Guardado');
    } catch (err) {
      _mostrarError(container, err.message);
    }
  });
}

/**
 * Renderiza la grilla de edición de imágenes de Memoricé.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 * @param {object} set
 */
export async function renderEditorItemsMemoria(container, app, setId, set) {
  const mount = container.querySelector('#editor-items-memoria');
  if (!mount) return;

  const soloLectura = _esPredeterminado(set);

  container.__memoriaEstado = {
    slots: [],
    cantidad: CANTIDAD_DEFAULT,
    subidosEnSesion: new Set(),
    pendientesBorrar: new Set(),
    soloLectura
  };
  container.__memoriaCtx = { app, setId, set };

  await _cargarItems(container, app, setId);

  mount.outerHTML = _renderEditorItemsMemoria(container.__memoriaEstado.cantidad, soloLectura);
  _pintarGrilla(container);
  _bindEditorItemsMemoria(container, app, setId, set);
}
