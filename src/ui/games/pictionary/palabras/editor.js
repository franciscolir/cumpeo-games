/* =============================================================
   Editor de Items — Pictionary — PALABRAS

   Lista de conceptos + form con:
   - input concepto
   - lista dinámica de palabras prohibidas (+ / ×)
   - select dificultad (opcional: 1 | 2 | 3)

   Estado en container.__pictionaryPalabrasEstado
   (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   ============================================================= */

const ID = 'pictionary-palabras';

function _renderEditorItemsPalabras() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-${ID}">
      <h2 class="font-headline-md uppercase mb-4">Palabras del set</h2>
      <p class="font-body-sm text-on-surface-variant mb-4" id="instruccion-${ID}">El adivinador mira la pantalla. El representante no puede decir las palabras prohibidas.</p>

      <ul id="lista-items-${ID}" class="space-y-2 mb-6"></ul>

      <div id="form-item-${ID}" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-${ID}" class="font-headline-sm uppercase mb-3">Agregar concepto</h3>

        <input id="item-concepto-${ID}" type="text" placeholder="Concepto"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <div id="lista-prohibidas-${ID}" class="space-y-2 mb-3"></div>

        <button id="btn-agregar-prohibida-${ID}" type="button"
          class="font-label-sm uppercase border-2 border-on-surface-variant rounded-lg px-3 py-1 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition mb-3">+ Agregar palabra prohibida</button>

        <select id="item-dificultad-${ID}"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none">
          <option value="">Dificultad (opcional)</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-${ID}" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-${ID}" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-${ID}" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector(`#item-error-${ID}`);
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _sincronizarProhibidas(container) {
  const estado = container.__pictionaryPalabrasEstado;
  for (let i = 0; i < estado.prohibidas.length; i++) {
    const input = container.querySelector(`[data-prohibida-idx="${i}"]`);
    if (input) estado.prohibidas[i] = input.value;
  }
}

function _actualizarBotonesProhibida(container) {
  const estado = container.__pictionaryPalabrasEstado;
  const lista = container.querySelector(`#lista-prohibidas-${ID}`);
  if (!lista || !estado) return;

  const puedeEliminar = estado.prohibidas.length > 1;

  lista.innerHTML = estado.prohibidas.map((texto, i) => `
    <div class="prohibida-pictionary flex gap-2 items-center">
      <input type="text" class="prohibida-texto flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none"
        placeholder="Palabra prohibida ${i + 1}" value="${texto || ''}" data-prohibida-idx="${i}" />
      <button type="button" data-quitar-prohibida="${i}" title="Eliminar palabra prohibida"
        class="btn-eliminar-prohibida font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition${puedeEliminar ? '' : ' hidden'}">✗</button>
    </div>
  `).join('');

  for (let i = 0; i < estado.prohibidas.length; i++) {
    const input = container.querySelector(`[data-prohibida-idx="${i}"]`);
    if (input) input.value = estado.prohibidas[i];

    const btnQuitar = container.querySelector(`[data-quitar-prohibida="${i}"]`);
    if (btnQuitar) {
      btnQuitar.addEventListener('click', () => _eliminarProhibida(container, i));
    }
  }
}

function _agregarProhibida(container, texto) {
  _sincronizarProhibidas(container);
  container.__pictionaryPalabrasEstado.prohibidas.push(texto ?? '');
  _actualizarBotonesProhibida(container);
}

function _eliminarProhibida(container, index) {
  const estado = container.__pictionaryPalabrasEstado;
  if (estado.prohibidas.length <= 1) return;
  _sincronizarProhibidas(container);
  estado.prohibidas.splice(index, 1);
  _actualizarBotonesProhibida(container);
}

function _limpiarFormItem(container) {
  const estado = container.__pictionaryPalabrasEstado;

  container.querySelector(`#form-item-titulo-${ID}`).textContent = 'Agregar concepto';
  container.querySelector(`#btn-guardar-item-${ID}`).textContent = 'Agregar';
  container.querySelector(`#btn-cancelar-edicion-${ID}`).classList.add('hidden');

  const errorEl = container.querySelector(`#item-error-${ID}`);
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector(`#item-concepto-${ID}`).value = '';
  container.querySelector(`#item-dificultad-${ID}`).value = '';

  estado.editandoId = null;
  estado.prohibidas = [''];
  _actualizarBotonesProhibida(container);
}

function _cargarItemEnForm(container, item) {
  const estado = container.__pictionaryPalabrasEstado;
  const c = item.contenido || {};

  const prohibidas = Array.isArray(c.prohibidas) && c.prohibidas.length > 0
    ? [...c.prohibidas]
    : [''];

  container.querySelector(`#form-item-titulo-${ID}`).textContent = 'Editar concepto';
  container.querySelector(`#btn-guardar-item-${ID}`).textContent = 'Guardar cambios';
  container.querySelector(`#btn-cancelar-edicion-${ID}`).classList.remove('hidden');

  const errorEl = container.querySelector(`#item-error-${ID}`);
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector(`#item-concepto-${ID}`).value = c.concepto || '';
  container.querySelector(`#item-dificultad-${ID}`).value =
    c.dificultad !== undefined && c.dificultad !== null ? String(c.dificultad) : '';

  estado.editandoId = item.id;
  estado.prohibidas = prohibidas;
  _actualizarBotonesProhibida(container);

  container.querySelector(`#item-concepto-${ID}`).focus();
}

function _validarItem(container) {
  const estado = container.__pictionaryPalabrasEstado;
  const errorEl = container.querySelector(`#item-error-${ID}`);

  _sincronizarProhibidas(container);

  const concepto = container.querySelector(`#item-concepto-${ID}`).value.trim();
  if (!concepto) {
    errorEl.textContent = 'El concepto es requerido';
    errorEl.classList.remove('hidden');
    return null;
  }

  const prohibidas = estado.prohibidas.map((p) => String(p).trim());

  if (prohibidas.length === 0) {
    errorEl.textContent = 'Debe haber al menos 1 palabra prohibida';
    errorEl.classList.remove('hidden');
    return null;
  }

  if (prohibidas.some((p) => p === '')) {
    errorEl.textContent = 'Las palabras prohibidas deben tener texto';
    errorEl.classList.remove('hidden');
    return null;
  }

  estado.prohibidas = prohibidas;

  const contenido = { concepto, prohibidas };

  const dificultad = container.querySelector(`#item-dificultad-${ID}`).value;
  if (dificultad !== '') {
    contenido.dificultad = Number(dificultad);
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return contenido;
}

async function _cargarItems(container, app, setId) {
  const estado = container.__pictionaryPalabrasEstado;
  const lista = container.querySelector(`#lista-items-${ID}`);
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
    const prohibidas = c.prohibidas || [];
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.concepto || '(sin concepto)'}</p>
          <p class="font-body-sm text-on-surface-variant">Prohibidas: ${prohibidas.join(' | ')}</p>
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
  const estado = container.__pictionaryPalabrasEstado;
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
  const estado = container.__pictionaryPalabrasEstado;

  for (const item of estado.items) {
    const id = item.id;

    const btnEditar = container.querySelector(`[data-accion="editar"][data-id="${id}"]`);
    if (btnEditar) {
      btnEditar.addEventListener('click', () => _cargarItemEnForm(container, item));
    }

    const btnEliminar = container.querySelector(`[data-accion="eliminar"][data-id="${id}"]`);
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este concepto?')) return;
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

function _bindEditorItemsPalabras(container, app, setId) {
  const estado = container.__pictionaryPalabrasEstado;

  const btnAgregarProhibida = container.querySelector(`#btn-agregar-prohibida-${ID}`);
  const btnGuardar = container.querySelector(`#btn-guardar-item-${ID}`);
  const btnCancelar = container.querySelector(`#btn-cancelar-edicion-${ID}`);

  _actualizarBotonesProhibida(container);

  btnAgregarProhibida.addEventListener('click', () => {
    _agregarProhibida(container, '');
  });

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
 * Renderiza el editor de PALABRAS de Pictionary.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsPictionaryPalabras(container, app, setId) {
  const mount = container.querySelector(`#editor-items-${ID}`);
  if (!mount) return;

  container.__pictionaryPalabrasEstado = {
    items: [],
    editandoId: null,
    prohibidas: ['']
  };

  mount.outerHTML = _renderEditorItemsPalabras();
  _bindEditorItemsPalabras(container, app, setId);
  await _cargarItems(container, app, setId);
}
