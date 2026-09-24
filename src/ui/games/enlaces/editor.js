/* =============================================================
   Editor de Items — Enlaces

   Lista de pares + form con:
   - input concepto_a
   - input concepto_b
   - input categoría (opcional)
   - select dificultad (opcional: 1 | 2 | 3)

   Validación extra: unicidad de concepto_a y concepto_b
   en el set (excepto el item en edición).

   Estado en container.__enlacesEstado (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   ============================================================= */

function _renderEditorItemsEnlaces() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-enlaces">
      <h2 class="font-headline-md uppercase mb-4">Pares del set</h2>

      <ul id="lista-items-pares-enlaces" class="space-y-2 mb-6"></ul>

      <div id="form-item-par-enlaces" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-enlaces" class="font-headline-sm uppercase mb-3">Agregar par</h3>

        <input id="item-concepto-a-enlaces" type="text" placeholder="Concepto A"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <input id="item-concepto-b-enlaces" type="text" placeholder="Concepto B"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <input id="item-categoria-enlaces" type="text" placeholder="Categoría (opcional)"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <select id="item-dificultad-enlaces"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none">
          <option value="">Dificultad (opcional)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-enlaces" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-enlaces" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-enlaces" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-enlaces');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _limpiarFormItem(container) {
  const estado = container.__enlacesEstado;

  container.querySelector('#form-item-titulo-enlaces').textContent = 'Agregar par';
  container.querySelector('#btn-guardar-item-enlaces').textContent = 'Agregar';
  container.querySelector('#btn-cancelar-edicion-enlaces').classList.add('hidden');

  const errorEl = container.querySelector('#item-error-enlaces');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-concepto-a-enlaces').value = '';
  container.querySelector('#item-concepto-b-enlaces').value = '';
  container.querySelector('#item-categoria-enlaces').value = '';
  container.querySelector('#item-dificultad-enlaces').value = '';

  estado.editandoId = null;
}

function _cargarItemEnForm(container, item) {
  const estado = container.__enlacesEstado;
  const c = item.contenido || {};

  container.querySelector('#form-item-titulo-enlaces').textContent = 'Editar par';
  container.querySelector('#btn-guardar-item-enlaces').textContent = 'Guardar cambios';
  container.querySelector('#btn-cancelar-edicion-enlaces').classList.remove('hidden');

  const errorEl = container.querySelector('#item-error-enlaces');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-concepto-a-enlaces').value = c.concepto_a || '';
  container.querySelector('#item-concepto-b-enlaces').value = c.concepto_b || '';
  container.querySelector('#item-categoria-enlaces').value = c.categoria || '';
  container.querySelector('#item-dificultad-enlaces').value =
    c.dificultad !== undefined && c.dificultad !== null ? String(c.dificultad) : '';

  estado.editandoId = item.id;

  container.querySelector('#item-concepto-a-enlaces').focus();
}

function _validarItem(container) {
  const estado = container.__enlacesEstado;
  const errorEl = container.querySelector('#item-error-enlaces');

  const conceptoA = container.querySelector('#item-concepto-a-enlaces').value.trim();
  if (!conceptoA) {
    errorEl.textContent = 'El concepto A es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const conceptoB = container.querySelector('#item-concepto-b-enlaces').value.trim();
  if (!conceptoB) {
    errorEl.textContent = 'El concepto B es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const otros = estado.items.filter((i) => i.id !== estado.editandoId);

  if (otros.some((i) => (i.contenido?.concepto_a || '').trim() === conceptoA)) {
    errorEl.textContent = `El concepto A "${conceptoA}" ya existe en el set`;
    errorEl.classList.remove('hidden');
    return null;
  }

  if (otros.some((i) => (i.contenido?.concepto_b || '').trim() === conceptoB)) {
    errorEl.textContent = `El concepto B "${conceptoB}" ya existe en el set`;
    errorEl.classList.remove('hidden');
    return null;
  }

  const contenido = { concepto_a: conceptoA, concepto_b: conceptoB };

  const categoria = container.querySelector('#item-categoria-enlaces').value.trim();
  if (categoria !== '') {
    contenido.categoria = categoria;
  }

  const dificultad = container.querySelector('#item-dificultad-enlaces').value;
  if (dificultad !== '') {
    contenido.dificultad = Number(dificultad);
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return contenido;
}

async function _cargarItems(container, app, setId) {
  const estado = container.__enlacesEstado;
  const lista = container.querySelector('#lista-items-pares-enlaces');
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  estado.items = items;

  if (items.length === 0) {
    lista.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">No hay pares todavía</li>';
    return;
  }

  lista.innerHTML = items.map((item) => {
    const c = item.contenido || {};
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.concepto_a || '(sin concepto A)'} ↔ ${c.concepto_b || '(sin concepto B)'}</p>
          ${c.categoria ? `<p class="font-body-sm text-on-surface-variant">Categoría: ${c.categoria}</p>` : ''}
          ${c.dificultad !== undefined && c.dificultad !== null ? `<p class="font-body-sm text-on-surface-variant">Dificultad: ${c.dificultad}</p>` : ''}
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
  const estado = container.__enlacesEstado;
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
  const estado = container.__enlacesEstado;

  for (const item of estado.items) {
    const id = item.id;

    const btnEditar = container.querySelector(`[data-accion="editar"][data-id="${id}"]`);
    if (btnEditar) {
      btnEditar.addEventListener('click', () => _cargarItemEnForm(container, item));
    }

    const btnEliminar = container.querySelector(`[data-accion="eliminar"][data-id="${id}"]`);
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este par?')) return;
        try {
          await app.services.set.eliminarItem(id);
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

function _bindEditorItemsEnlaces(container, app, setId) {
  const estado = container.__enlacesEstado;

  const btnGuardar = container.querySelector('#btn-guardar-item-enlaces');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-enlaces');

  btnGuardar.addEventListener('click', async () => {
    const contenido = _validarItem(container);
    if (!contenido) return;

    try {
      if (estado.editandoId) {
        await app.services.set.actualizarItem(estado.editandoId, contenido);
      } else {
        await app.services.set.agregarItem(setId, contenido);
      }
      _limpiarFormItem(container);
      await _cargarItems(container, app, setId);
    } catch (err) {
      _mostrarError(container, err.message);
    }
  });

  btnCancelar.addEventListener('click', () => {
    _limpiarFormItem(container);
  });
}

/**
 * Renderiza el editor de pares de Enlaces.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsEnlaces(container, app, setId) {
  const mount = container.querySelector('#editor-items-enlaces');
  if (!mount) return;

  container.__enlacesEstado = {
    items: [],
    editandoId: null
  };

  mount.outerHTML = _renderEditorItemsEnlaces();
  _bindEditorItemsEnlaces(container, app, setId);
  await _cargarItems(container, app, setId);
}
