/* =============================================================
   Editor de Items — Trivia
   ============================================================= */

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
          <option value="1">Fácil</option>
          <option value="2">Media</option>
          <option value="3">Difícil</option>
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

function _agregarOpcionTrivia(container, texto, esCorrecta) {
  const lista = container.querySelector('#lista-opciones-trivia');
  if (!lista) return;

  const count = lista.children.length;
  if (count >= 6) return;

  const index = count;
  const div = document.createElement('div');
  div.className = 'opcion-trivia flex gap-2 items-center';
  div.dataset.opcionIndex = index;

  div.innerHTML = `
    <input type="radio" name="respuesta-correcta-trivia" value="${index}" ${esCorrecta ? 'checked' : ''}
      class="shrink-0" />
    <input type="text" class="opcion-texto flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none"
      placeholder="Opción ${String.fromCharCode(65 + index)}" value="${texto || ''}" />
    <button type="button" class="btn-eliminar-opcion font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition" title="Eliminar">✗</button>
  `;

  lista.appendChild(div);
  _actualizarBotonesOpcionTrivia(container);
}

function _eliminarOpcionTrivia(container, index) {
  const lista = container.querySelector('#lista-opciones-trivia');
  if (!lista) return;

  const items = Array.from(lista.children);
  if (items.length <= 2) return;

  const toRemove = items.find((el) => Number(el.dataset.opcionIndex) === index);
  if (toRemove) toRemove.remove();

  Array.from(lista.children).forEach((el, i) => {
    el.dataset.opcionIndex = i;
    const radio = el.querySelector('input[type="radio"]');
    radio.value = i;
    const input = el.querySelector('.opcion-texto');
    input.placeholder = `Opción ${String.fromCharCode(65 + i)}`;
  });

  _actualizarBotonesOpcionTrivia(container);
}

function _actualizarBotonesOpcionTrivia(container) {
  const lista = container.querySelector('#lista-opciones-trivia');
  const btnAgregar = container.querySelector('#btn-agregar-opcion-trivia');
  if (!lista || !btnAgregar) return;

  const count = lista.children.length;
  btnAgregar.classList.toggle('hidden', count >= 6);

  Array.from(lista.children).forEach((el) => {
    const btnEliminar = el.querySelector('.btn-eliminar-opcion');
    if (btnEliminar) {
      btnEliminar.classList.toggle('hidden', count <= 2);
    }
  });
}

async function _cargarItemsTrivia(container, app, setId) {
  const lista = container.querySelector('#lista-items-preguntas-trivia');
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => a.orden - b.orden);

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
}

function _limpiarFormItemTrivia(container) {
  const titulo = container.querySelector('#form-item-titulo-trivia');
  const btnGuardar = container.querySelector('#btn-guardar-item-trivia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-trivia');
  const errorEl = container.querySelector('#item-error-trivia');
  const inputPregunta = container.querySelector('#item-pregunta-trivia');
  const selectDificultad = container.querySelector('#item-dificultad-trivia');
  const listaOpciones = container.querySelector('#lista-opciones-trivia');

  titulo.textContent = 'Agregar pregunta';
  btnGuardar.textContent = 'Agregar';
  btnCancelar.classList.add('hidden');
  errorEl.classList.add('hidden');
  inputPregunta.value = '';
  selectDificultad.value = '';
  listaOpciones.innerHTML = '';
  _agregarOpcionTrivia(container, '', true);
  _agregarOpcionTrivia(container, '', false);
}

function _cargarItemEnFormTrivia(container, item) {
  const titulo = container.querySelector('#form-item-titulo-trivia');
  const btnGuardar = container.querySelector('#btn-guardar-item-trivia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-trivia');
  const errorEl = container.querySelector('#item-error-trivia');
  const inputPregunta = container.querySelector('#item-pregunta-trivia');
  const selectDificultad = container.querySelector('#item-dificultad-trivia');
  const listaOpciones = container.querySelector('#lista-opciones-trivia');

  const c = item.contenido || {};
  const opciones = c.opciones || [];
  const idxCorrecta = c.respuesta_correcta_index;

  titulo.textContent = 'Editar pregunta';
  btnGuardar.textContent = 'Guardar cambios';
  btnCancelar.classList.remove('hidden');
  errorEl.classList.add('hidden');
  inputPregunta.value = c.pregunta || '';
  selectDificultad.value = c.dificultad != null ? String(c.dificultad) : '';
  listaOpciones.innerHTML = '';

  opciones.forEach((texto, i) => {
    _agregarOpcionTrivia(container, texto, i === idxCorrecta);
  });

  if (opciones.length < 2) {
    _agregarOpcionTrivia(container, '', false);
  }

  inputPregunta.focus();
}

function _validarItemTrivia(container) {
  const errorEl = container.querySelector('#item-error-trivia');
  const inputPregunta = container.querySelector('#item-pregunta-trivia');
  const listaOpciones = container.querySelector('#lista-opciones-trivia');
  const selectDificultad = container.querySelector('#item-dificultad-trivia');

  const pregunta = inputPregunta.value.trim();
  if (!pregunta) {
    errorEl.textContent = 'La pregunta es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const opcionesTextos = Array.from(listaOpciones.querySelectorAll('.opcion-texto'))
    .map((input) => input.value.trim());

  if (opcionesTextos.length < 2) {
    errorEl.textContent = 'Debe haber al menos 2 opciones';
    errorEl.classList.remove('hidden');
    return null;
  }

  if (opcionesTextos.length > 6) {
    errorEl.textContent = 'Máximo 6 opciones';
    errorEl.classList.remove('hidden');
    return null;
  }

  if (opcionesTextos.some((o) => !o)) {
    errorEl.textContent = 'Todas las opciones deben tener texto';
    errorEl.classList.remove('hidden');
    return null;
  }

  const radioChecked = listaOpciones.querySelector('input[name="respuesta-correcta-trivia"]:checked');
  if (!radioChecked) {
    errorEl.textContent = 'Marcá una respuesta correcta';
    errorEl.classList.remove('hidden');
    return null;
  }

  const respuestaCorrectaIndex = Number(radioChecked.value);
  if (respuestaCorrectaIndex < 0 || respuestaCorrectaIndex >= opcionesTextos.length) {
    errorEl.textContent = 'Respuesta correcta inválida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const contenido = {
    pregunta,
    opciones: opcionesTextos,
    respuesta_correcta_index: respuestaCorrectaIndex
  };

  const dificultadVal = selectDificultad.value;
  if (dificultadVal !== '') {
    const d = Number(dificultadVal);
    if (![1, 2, 3].includes(d)) {
      errorEl.textContent = 'Dificultad inválida';
      errorEl.classList.remove('hidden');
      return null;
    }
    contenido.dificultad = d;
  }

  return contenido;
}

function _bindEditorItemsTrivia(container, app, setId) {
  const lista = container.querySelector('#lista-items-preguntas-trivia');
  const btnAgregarOpcion = container.querySelector('#btn-agregar-opcion-trivia');
  const btnGuardar = container.querySelector('#btn-guardar-item-trivia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-trivia');
  const errorEl = container.querySelector('#item-error-trivia');

  let editandoId = null;

  _agregarOpcionTrivia(container, '', true);
  _agregarOpcionTrivia(container, '', false);

  btnAgregarOpcion.addEventListener('click', () => {
    _agregarOpcionTrivia(container, '', false);
  });

  container.querySelector('#lista-opciones-trivia').addEventListener('click', (e) => {
    const btnEliminar = e.target.closest('.btn-eliminar-opcion');
    if (!btnEliminar) return;
    const div = btnEliminar.closest('.opcion-trivia');
    if (div) {
      _eliminarOpcionTrivia(container, Number(div.dataset.opcionIndex));
    }
  });

  btnGuardar.addEventListener('click', async () => {
    const contenido = _validarItemTrivia(container);
    if (!contenido) return;

    try {
      if (editandoId) {
        await app.services.set.actualizarItem(editandoId, contenido);
      } else {
        await app.services.set.agregarItem(setId, contenido);
      }
      editandoId = null;
      _limpiarFormItemTrivia(container);
      await _cargarItemsTrivia(container, app, setId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  btnCancelar.addEventListener('click', () => {
    editandoId = null;
    _limpiarFormItemTrivia(container);
  });

  lista.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;
    if (!id) return;

    if (accion === 'editar') {
      const items = await app.services.set.listarItemsDeSet(setId);
      const item = items.find((i) => i.id === id);
      if (item) {
        editandoId = item.id;
        _cargarItemEnFormTrivia(container, item);
      }
      return;
    }

    if (accion === 'eliminar') {
      if (!confirm('¿Eliminar esta pregunta?')) return;
      try {
        await app.services.set.eliminarItem(id);
        if (editandoId === id) {
          editandoId = null;
          _limpiarFormItemTrivia(container);
        }
        await _cargarItemsTrivia(container, app, setId);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (accion === 'subir' || accion === 'bajar') {
      const items = await app.services.set.listarItemsDeSet(setId);
      items.sort((a, b) => a.orden - b.orden);
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) return;

      const swapIdx = accion === 'subir' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return;

      const temp = items[idx].orden;
      items[idx].orden = items[swapIdx].orden;
      items[swapIdx].orden = temp;

      const ordenFinal = items.map((i) => i.id);
      await app.services.set.reordenarItems(setId, ordenFinal);
      await _cargarItemsTrivia(container, app, setId);
    }
  });
}

export async function renderEditorItemsTrivia(container, app, setId) {
  const mount = container.querySelector('#editor-items-trivia');
  if (!mount) return;

  mount.outerHTML = _renderEditorItemsTrivia();
  _bindEditorItemsTrivia(container, app, setId);
  await _cargarItemsTrivia(container, app, setId);
}
