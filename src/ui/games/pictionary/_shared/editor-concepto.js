/* =============================================================
   Editor de Items — Pictionary (compartido: GESTOS / PREGUNTAS / DIBUJO)

   Lista de conceptos + form con:
   - input concepto
   - select dificultad (opcional: 1 | 2 | 3)

   Sin palabras prohibidas (solo PALABRAS las incluye).

   Estado en container.__pictionaryEditorEstado[idPrefix]
   (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   ============================================================= */

function _renderEditorItemsConcepto({ instruccion, idPrefix, titulo }) {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-${idPrefix}">
      <h2 class="font-headline-md uppercase mb-4">${titulo}</h2>
      <p class="font-body-sm text-on-surface-variant mb-4" id="instruccion-${idPrefix}">${instruccion}</p>

      <ul id="lista-items-${idPrefix}" class="space-y-2 mb-6"></ul>

      <div id="form-item-${idPrefix}" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-${idPrefix}" class="font-headline-sm uppercase mb-3">Agregar concepto</h3>

        <input id="item-concepto-${idPrefix}" type="text" placeholder="Concepto"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <select id="item-dificultad-${idPrefix}"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none">
          <option value="">Dificultad (opcional)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-${idPrefix}" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-${idPrefix}" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-${idPrefix}" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _estadoDe(container, idPrefix) {
  if (!container.__pictionaryEditorEstado) container.__pictionaryEditorEstado = {};
  if (!container.__pictionaryEditorEstado[idPrefix]) {
    container.__pictionaryEditorEstado[idPrefix] = { items: [], editandoId: null };
  }
  return container.__pictionaryEditorEstado[idPrefix];
}

function _mostrarError(container, idPrefix, mensaje) {
  const errorEl = container.querySelector(`#item-error-${idPrefix}`);
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _limpiarFormItem(container, idPrefix) {
  const estado = _estadoDe(container, idPrefix);

  container.querySelector(`#form-item-titulo-${idPrefix}`).textContent = 'Agregar concepto';
  container.querySelector(`#btn-guardar-item-${idPrefix}`).textContent = 'Agregar';
  container.querySelector(`#btn-cancelar-edicion-${idPrefix}`).classList.add('hidden');

  const errorEl = container.querySelector(`#item-error-${idPrefix}`);
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector(`#item-concepto-${idPrefix}`).value = '';
  container.querySelector(`#item-dificultad-${idPrefix}`).value = '';

  estado.editandoId = null;
}

function _cargarItemEnForm(container, idPrefix, item) {
  const estado = _estadoDe(container, idPrefix);
  const c = item.contenido || {};

  container.querySelector(`#form-item-titulo-${idPrefix}`).textContent = 'Editar concepto';
  container.querySelector(`#btn-guardar-item-${idPrefix}`).textContent = 'Guardar cambios';
  container.querySelector(`#btn-cancelar-edicion-${idPrefix}`).classList.remove('hidden');

  const errorEl = container.querySelector(`#item-error-${idPrefix}`);
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector(`#item-concepto-${idPrefix}`).value = c.concepto || '';
  container.querySelector(`#item-dificultad-${idPrefix}`).value =
    c.dificultad !== undefined && c.dificultad !== null ? String(c.dificultad) : '';

  estado.editandoId = item.id;

  container.querySelector(`#item-concepto-${idPrefix}`).focus();
}

function _validarItem(container, idPrefix) {
  const errorEl = container.querySelector(`#item-error-${idPrefix}`);

  const concepto = container.querySelector(`#item-concepto-${idPrefix}`).value.trim();
  if (!concepto) {
    errorEl.textContent = 'El concepto es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const contenido = { concepto };

  const dificultad = container.querySelector(`#item-dificultad-${idPrefix}`).value;
  if (dificultad !== '') {
    contenido.dificultad = Number(dificultad);
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return contenido;
}

async function _cargarItems(container, app, setId, idPrefix) {
  const estado = _estadoDe(container, idPrefix);
  const lista = container.querySelector(`#lista-items-${idPrefix}`);
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  estado.items = items;

  if (items.length === 0) {
    lista.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">No hay conceptos todavía</li>';
    return;
  }

  lista.innerHTML = items.map((item) => {
    const c = item.contenido || {};
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.concepto || '(sin concepto)'}</p>
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

  _bindItems(container, app, setId, idPrefix);
}

async function _reordenar(container, app, setId, idPrefix, id, accion) {
  const estado = _estadoDe(container, idPrefix);
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
  await _cargarItems(container, app, setId, idPrefix);
}

function _bindItems(container, app, setId, idPrefix) {
  const estado = _estadoDe(container, idPrefix);

  for (const item of estado.items) {
    const id = item.id;

    const btnEditar = container.querySelector(`[data-accion="editar"][data-id="${id}"]`);
    if (btnEditar) {
      btnEditar.addEventListener('click', () => _cargarItemEnForm(container, idPrefix, item));
    }

    const btnEliminar = container.querySelector(`[data-accion="eliminar"][data-id="${id}"]`);
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este concepto?')) return;
        try {
          await app.services.set.eliminarItem(id);
          if (estado.editandoId === id) {
            _limpiarFormItem(container, idPrefix);
          }
          await _cargarItems(container, app, setId, idPrefix);
        } catch (err) {
          _mostrarError(container, idPrefix, err.message);
        }
      });
    }

    const btnSubir = container.querySelector(`[data-accion="subir"][data-id="${id}"]`);
    if (btnSubir) {
      btnSubir.addEventListener('click', async () => {
        await _reordenar(container, app, setId, idPrefix, id, 'subir');
      });
    }

    const btnBajar = container.querySelector(`[data-accion="bajar"][data-id="${id}"]`);
    if (btnBajar) {
      btnBajar.addEventListener('click', async () => {
        await _reordenar(container, app, setId, idPrefix, id, 'bajar');
      });
    }
  }
}

function _bindEditorItemsConcepto(container, app, setId, idPrefix) {
  const estado = _estadoDe(container, idPrefix);

  const btnGuardar = container.querySelector(`#btn-guardar-item-${idPrefix}`);
  const btnCancelar = container.querySelector(`#btn-cancelar-edicion-${idPrefix}`);

  btnGuardar.addEventListener('click', async () => {
    const contenido = _validarItem(container, idPrefix);
    if (!contenido) return;

    try {
      if (estado.editandoId) {
        await app.services.set.actualizarItem(estado.editandoId, contenido);
      } else {
        await app.services.set.agregarItem(setId, contenido);
      }
      _limpiarFormItem(container, idPrefix);
      await _cargarItems(container, app, setId, idPrefix);
    } catch (err) {
      _mostrarError(container, idPrefix, err.message);
    }
  });

  btnCancelar.addEventListener('click', () => {
    _limpiarFormItem(container, idPrefix);
  });
}

/**
 * Renderiza el editor de conceptos compartido de Pictionary.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 * @param {object} opciones
 * @param {string} opciones.submodo - 'GESTOS' | 'PREGUNTAS' | 'DIBUJO'
 * @param {string} opciones.instruccion
 * @param {string} opciones.idPrefix
 * @param {string} opciones.titulo
 */
export async function renderEditorItemsConceptoPictionary(container, app, setId, { submodo, instruccion, idPrefix, titulo }) {
  const mount = container.querySelector(`#editor-items-${idPrefix}`);
  if (!mount) return;

  if (!container.__pictionaryEditorEstado) container.__pictionaryEditorEstado = {};
  container.__pictionaryEditorEstado[idPrefix] = {
    items: [],
    editandoId: null,
    submodo
  };

  mount.outerHTML = _renderEditorItemsConcepto({ instruccion, idPrefix, titulo });
  _bindEditorItemsConcepto(container, app, setId, idPrefix);
  await _cargarItems(container, app, setId, idPrefix);
}
