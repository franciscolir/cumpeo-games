/* =============================================================
   Editor de Items — Trivia

   Lista de preguntas + form con:
   - input pregunta
   - lista dinámica de opciones (2–6) con radio para la correcta
   - select dificultad (opcional: 1 | 2 | 3)

   Estado en container.__triviaEstado (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   Deuda #108 corregida: reordenarItems recibe [{id}].
   ============================================================= */

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;

function _renderEditorItemsTrivia() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-trivia">
      <h2 class="font-headline-md uppercase mb-4">Preguntas del set</h2>

      <ul id="lista-items-preguntas-trivia" class="space-y-2 mb-6"></ul>

      <div id="form-item-pregunta-trivia" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-trivia" class="font-headline-sm uppercase mb-3">Agregar pregunta</h3>

        <input id="item-pregunta-trivia" type="text" placeholder="¿Cuál es la capital de Francia?"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <div id="lista-opciones-trivia" class="space-y-2 mb-3"></div>

        <button id="btn-agregar-opcion-trivia" type="button"
          class="font-label-sm uppercase border-2 border-on-surface-variant rounded-lg px-3 py-1 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition mb-3">+ Agregar opción</button>

        <select id="item-dificultad-trivia"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none">
          <option value="">Sin dificultad</option>
          <option value="1">1 Fácil</option>
          <option value="2">2 Media</option>
          <option value="3">3 Difícil</option>
        </select>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-trivia" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-trivia" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-trivia" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-trivia');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _sincronizarOpcionesDelForm(container) {
  const estado = container.__triviaEstado;
  for (let i = 0; i < estado.opciones.length; i++) {
    const input = container.querySelector(`[data-opcion-texto="${i}"]`);
    if (input) estado.opciones[i] = input.value;
  }
}

function _actualizarBotonesOpcion(container) {
  const estado = container.__triviaEstado;
  const lista = container.querySelector('#lista-opciones-trivia');
  const btnAgregar = container.querySelector('#btn-agregar-opcion-trivia');
  if (!lista || !btnAgregar || !estado) return;

  const count = estado.opciones.length;
  const puedeEliminar = count > MIN_OPCIONES;

  lista.innerHTML = estado.opciones.map((texto, i) => `
    <div class="opcion-trivia flex gap-2 items-center" data-opcion-index="${i}">
      <input type="radio" name="respuesta-correcta-trivia" value="${i}"
        data-opcion-radio="${i}" ${estado.correctaIndex === i ? 'checked' : ''}
        class="shrink-0" />
      <input type="text" class="opcion-texto flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none"
        data-opcion-texto="${i}"
        placeholder="Opción ${String.fromCharCode(65 + i)}" value="${texto || ''}" />
      <button type="button" data-opcion-quitar="${i}"
        class="btn-eliminar-opcion font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition${puedeEliminar ? '' : ' hidden'}"
        title="Eliminar">✗</button>
    </div>
  `).join('');

  btnAgregar.classList.toggle('hidden', count >= MAX_OPCIONES);

  for (let i = 0; i < count; i++) {
    const input = container.querySelector(`[data-opcion-texto="${i}"]`);
    if (input) input.value = estado.opciones[i] || '';

    const radio = container.querySelector(`[data-opcion-radio="${i}"]`);
    if (radio) {
      radio.value = String(i);
      radio.checked = estado.correctaIndex === i;
      radio.addEventListener('click', () => {
        container.__triviaEstado.correctaIndex = i;
      });
    }

    const btnQuitar = container.querySelector(`[data-opcion-quitar="${i}"]`);
    if (btnQuitar) {
      btnQuitar.addEventListener('click', () => _eliminarOpcionDelForm(container, i));
    }
  }
}

function _agregarOpcionAlForm(container, texto, esCorrecta) {
  const estado = container.__triviaEstado;
  _sincronizarOpcionesDelForm(container);
  if (estado.opciones.length >= MAX_OPCIONES) return;
  estado.opciones.push(texto ?? '');
  if (esCorrecta) {
    estado.correctaIndex = estado.opciones.length - 1;
  }
  _actualizarBotonesOpcion(container);
}

function _eliminarOpcionDelForm(container, index) {
  const estado = container.__triviaEstado;
  if (estado.opciones.length <= MIN_OPCIONES) return;
  _sincronizarOpcionesDelForm(container);
  estado.opciones.splice(index, 1);
  if (estado.correctaIndex === index) {
    estado.correctaIndex = null;
  } else if (estado.correctaIndex !== null && estado.correctaIndex > index) {
    estado.correctaIndex -= 1;
  }
  _actualizarBotonesOpcion(container);
}

function _limpiarFormItem(container) {
  const estado = container.__triviaEstado;

  container.querySelector('#form-item-titulo-trivia').textContent = 'Agregar pregunta';
  container.querySelector('#btn-guardar-item-trivia').textContent = 'Agregar';
  container.querySelector('#btn-cancelar-edicion-trivia').classList.add('hidden');

  const errorEl = container.querySelector('#item-error-trivia');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-trivia').value = '';
  container.querySelector('#item-dificultad-trivia').value = '';

  estado.editandoId = null;
  estado.opciones = ['', ''];
  estado.correctaIndex = 0;
  _actualizarBotonesOpcion(container);
}

function _cargarItemEnForm(container, item) {
  const estado = container.__triviaEstado;
  const c = item.contenido || {};

  const opciones = Array.isArray(c.opciones) && c.opciones.length > 0
    ? [...c.opciones]
    : ['', ''];
  if (opciones.length < MIN_OPCIONES) {
    while (opciones.length < MIN_OPCIONES) opciones.push('');
  }

  container.querySelector('#form-item-titulo-trivia').textContent = 'Editar pregunta';
  container.querySelector('#btn-guardar-item-trivia').textContent = 'Guardar cambios';
  container.querySelector('#btn-cancelar-edicion-trivia').classList.remove('hidden');

  const errorEl = container.querySelector('#item-error-trivia');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-trivia').value = c.pregunta || '';
  container.querySelector('#item-dificultad-trivia').value =
    c.dificultad !== undefined && c.dificultad !== null ? String(c.dificultad) : '';

  estado.editandoId = item.id;
  estado.opciones = opciones;
  estado.correctaIndex = Number.isInteger(c.respuesta_correcta_index)
    ? c.respuesta_correcta_index
    : null;
  _actualizarBotonesOpcion(container);

  container.querySelector('#item-pregunta-trivia').focus();
}

function _validarItem(container) {
  const estado = container.__triviaEstado;
  const errorEl = container.querySelector('#item-error-trivia');

  _sincronizarOpcionesDelForm(container);

  const pregunta = container.querySelector('#item-pregunta-trivia').value.trim();
  if (!pregunta) {
    errorEl.textContent = 'La pregunta es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const opciones = estado.opciones.map((o) => String(o).trim());

  if (opciones.length < MIN_OPCIONES) {
    errorEl.textContent = `Debe haber al menos ${MIN_OPCIONES} opciones`;
    errorEl.classList.remove('hidden');
    return null;
  }

  if (opciones.length > MAX_OPCIONES) {
    errorEl.textContent = `Máximo ${MAX_OPCIONES} opciones`;
    errorEl.classList.remove('hidden');
    return null;
  }

  if (opciones.some((o) => o === '')) {
    errorEl.textContent = 'Todas las opciones deben tener texto';
    errorEl.classList.remove('hidden');
    return null;
  }

  const correctaIndex = estado.correctaIndex;
  if (correctaIndex === null || correctaIndex === undefined ||
      !Number.isInteger(correctaIndex)) {
    errorEl.textContent = 'Elegí la respuesta correcta';
    errorEl.classList.remove('hidden');
    return null;
  }

  if (correctaIndex < 0 || correctaIndex >= opciones.length) {
    errorEl.textContent = 'Respuesta correcta inválida';
    errorEl.classList.remove('hidden');
    return null;
  }

  estado.opciones = opciones;

  const contenido = {
    pregunta,
    opciones,
    respuesta_correcta_index: correctaIndex
  };

  const dificultad = container.querySelector('#item-dificultad-trivia').value;
  if (dificultad !== '') {
    const d = Number(dificultad);
    if (![1, 2, 3].includes(d)) {
      errorEl.textContent = 'Dificultad inválida';
      errorEl.classList.remove('hidden');
      return null;
    }
    contenido.dificultad = d;
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return contenido;
}

async function _cargarItems(container, app, setId) {
  const estado = container.__triviaEstado;
  const lista = container.querySelector('#lista-items-preguntas-trivia');
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
    const opciones = c.opciones || [];
    const idxCorrecta = c.respuesta_correcta_index;
    const dificultad = c.dificultad;
    const dificultadLabel = dificultad === 1 ? 'Fácil' : dificultad === 2 ? 'Media' : dificultad === 3 ? 'Difícil' : '';
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.pregunta || '(sin pregunta)'}</p>
          <p class="font-body-sm text-on-surface-variant">
            ${opciones.map((o, i) => `${String.fromCharCode(65 + i)}: ${o}${i === idxCorrecta ? ' ✓' : ''}`).join(' | ')}
          </p>
          ${dificultadLabel ? `<p class="font-body-sm text-on-surface-variant">Dificultad: ${dificultadLabel}</p>` : ''}
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
  const estado = container.__triviaEstado;
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
  const estado = container.__triviaEstado;

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

function _bindEditorItemsTrivia(container, app, setId) {
  const estado = container.__triviaEstado;

  const btnAgregarOpcion = container.querySelector('#btn-agregar-opcion-trivia');
  const btnGuardar = container.querySelector('#btn-guardar-item-trivia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-trivia');

  _actualizarBotonesOpcion(container);

  btnAgregarOpcion.addEventListener('click', () => {
    _agregarOpcionAlForm(container, '', false);
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
 * Renderiza el editor de preguntas de Trivia.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsTrivia(container, app, setId) {
  const mount = container.querySelector('#editor-items-trivia');
  if (!mount) return;

  container.__triviaEstado = {
    items: [],
    editandoId: null,
    opciones: ['', ''],
    correctaIndex: 0
  };

  mount.outerHTML = _renderEditorItemsTrivia();
  _bindEditorItemsTrivia(container, app, setId);
  await _cargarItems(container, app, setId);
}
