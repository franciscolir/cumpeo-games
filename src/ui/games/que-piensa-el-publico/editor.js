/* =============================================================
   Editor de Items — ¿Qué piensa el público?

   Lista de preguntas + form con:
   - input pregunta
   - input opcion_a
   - input opcion_b

   Sin tiempo_seg ni puntos_acierto en el editor (el dominio
   los sigue aceptando como opcionales).

   Estado en container.__qpepEstado (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   Deuda #108 corregida: reordenarItems recibe [{id}].
   ============================================================= */

function _renderEditorItemsQPEP() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-qpep">
      <h2 class="font-headline-md uppercase mb-4">Preguntas del set</h2>

      <ul id="lista-items-preguntas-qpep" class="space-y-2 mb-6"></ul>

      <div id="form-item-pregunta-qpep" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-qpep" class="font-headline-sm uppercase mb-3">Agregar pregunta</h3>

        <input id="item-pregunta-qpep" type="text" placeholder="¿Le gusta más el invierno o el verano?"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />
        <input id="item-opcion-a-qpep" type="text" placeholder="Invierno"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />
        <input id="item-opcion-b-qpep" type="text" placeholder="Verano"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-qpep" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-qpep" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-qpep" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-qpep');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _limpiarFormItem(container) {
  const estado = container.__qpepEstado;

  container.querySelector('#form-item-titulo-qpep').textContent = 'Agregar pregunta';
  container.querySelector('#btn-guardar-item-qpep').textContent = 'Agregar';
  container.querySelector('#btn-cancelar-edicion-qpep').classList.add('hidden');

  const errorEl = container.querySelector('#item-error-qpep');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-qpep').value = '';
  container.querySelector('#item-opcion-a-qpep').value = '';
  container.querySelector('#item-opcion-b-qpep').value = '';

  estado.editandoId = null;
}

function _cargarItemEnForm(container, item) {
  const estado = container.__qpepEstado;
  const c = item.contenido || {};

  container.querySelector('#form-item-titulo-qpep').textContent = 'Editar pregunta';
  container.querySelector('#btn-guardar-item-qpep').textContent = 'Guardar cambios';
  container.querySelector('#btn-cancelar-edicion-qpep').classList.remove('hidden');

  const errorEl = container.querySelector('#item-error-qpep');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-qpep').value = c.pregunta || '';
  container.querySelector('#item-opcion-a-qpep').value = c.opcion_a || '';
  container.querySelector('#item-opcion-b-qpep').value = c.opcion_b || '';

  estado.editandoId = item.id;

  container.querySelector('#item-pregunta-qpep').focus();
}

function _validarItem(container) {
  const errorEl = container.querySelector('#item-error-qpep');

  const pregunta = container.querySelector('#item-pregunta-qpep').value.trim();
  if (!pregunta) {
    errorEl.textContent = 'La pregunta es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const opcionA = container.querySelector('#item-opcion-a-qpep').value.trim();
  if (!opcionA) {
    errorEl.textContent = 'La opción A es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const opcionB = container.querySelector('#item-opcion-b-qpep').value.trim();
  if (!opcionB) {
    errorEl.textContent = 'La opción B es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return { pregunta, opcion_a: opcionA, opcion_b: opcionB };
}

async function _cargarItems(container, app, setId) {
  const estado = container.__qpepEstado;
  const lista = container.querySelector('#lista-items-preguntas-qpep');
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  estado.items = items;

  if (items.length === 0) {
    lista.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">No hay preguntas todavía</li>';
    return;
  }

  lista.innerHTML = items.map((item) => {
    const c = item.contenido || {};
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.pregunta || '(sin pregunta)'}</p>
          <p class="font-body-sm text-on-surface-variant">
            A: ${c.opcion_a || '—'} | B: ${c.opcion_b || '—'}
          </p>
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
  const estado = container.__qpepEstado;
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
  const estado = container.__qpepEstado;

  for (const item of estado.items) {
    const id = item.id;

    const btnEditar = container.querySelector(`[data-accion="editar"][data-id="${id}"]`);
    if (btnEditar) {
      btnEditar.addEventListener('click', () => _cargarItemEnForm(container, item));
    }

    const btnEliminar = container.querySelector(`[data-accion="eliminar"][data-id="${id}"]`);
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
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

function _bindEditorItemsQPEP(container, app, setId) {
  const estado = container.__qpepEstado;

  const btnGuardar = container.querySelector('#btn-guardar-item-qpep');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-qpep');

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
 * Renderiza el editor de preguntas de ¿Qué piensa el público?
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsQPEP(container, app, setId) {
  const mount = container.querySelector('#editor-items-qpep');
  if (!mount) return;

  container.__qpepEstado = {
    items: [],
    editandoId: null
  };

  mount.outerHTML = _renderEditorItemsQPEP();
  _bindEditorItemsQPEP(container, app, setId);
  await _cargarItems(container, app, setId);
}
