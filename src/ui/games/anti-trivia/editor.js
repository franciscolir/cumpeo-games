/* =============================================================
   Editor de Items — Anti-Trivia

   Lista de preguntas + form con:
   - input pregunta
   - lista dinámica de respuestas_correctas (+ / ×)
   - input categoría (opcional)

   Estado en container.__antiTriviaEstado (precedente deuda #102).
   Pintado vía innerHTML + re-bind directo por atributos
   (testeable en environment node, sin document).
   ============================================================= */

function _renderEditorItemsAntiTrivia() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-anti-trivia">
      <h2 class="font-headline-md uppercase mb-4">Preguntas del set</h2>

      <ul id="lista-items-preguntas-anti-trivia" class="space-y-2 mb-6"></ul>

      <div id="form-item-pregunta-anti-trivia" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo-anti-trivia" class="font-headline-sm uppercase mb-3">Agregar pregunta</h3>

        <input id="item-pregunta-anti-trivia" type="text" placeholder="¿Cuál es la capital de Francia?"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <div id="lista-respuestas-anti-trivia" class="space-y-2 mb-3"></div>

        <button id="btn-agregar-respuesta-anti-trivia" type="button"
          class="font-label-sm uppercase border-2 border-on-surface-variant rounded-lg px-3 py-1 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition mb-3">+ Agregar respuesta</button>

        <input id="item-categoria-anti-trivia" type="text" placeholder="Categoría (opcional)"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item-anti-trivia" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion-anti-trivia" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error-anti-trivia" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#item-error-anti-trivia');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _sincronizarRespuestas(container) {
  const estado = container.__antiTriviaEstado;
  for (let i = 0; i < estado.respuestas.length; i++) {
    const input = container.querySelector(`[data-respuesta-idx="${i}"]`);
    if (input) estado.respuestas[i] = input.value;
  }
}

function _actualizarBotonesRespuesta(container) {
  const estado = container.__antiTriviaEstado;
  const lista = container.querySelector('#lista-respuestas-anti-trivia');
  if (!lista || !estado) return;

  const puedeEliminar = estado.respuestas.length > 1;

  lista.innerHTML = estado.respuestas.map((texto, i) => `
    <div class="respuesta-anti-trivia flex gap-2 items-center" data-respuesta-idx="${i}">
      <input type="text" class="respuesta-texto flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none"
        placeholder="Respuesta ${i + 1}" value="${texto || ''}" />
      <button type="button" data-quitar-respuesta="${i}" title="Eliminar respuesta"
        class="btn-eliminar-respuesta font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition${puedeEliminar ? '' : ' hidden'}">✗</button>
    </div>
  `).join('');

  for (let i = 0; i < estado.respuestas.length; i++) {
    const input = container.querySelector(`[data-respuesta-idx="${i}"]`);
    if (input) input.value = estado.respuestas[i];

    const btnQuitar = container.querySelector(`[data-quitar-respuesta="${i}"]`);
    if (btnQuitar) {
      btnQuitar.addEventListener('click', () => _eliminarRespuesta(container, i));
    }
  }
}

function _agregarRespuesta(container, texto) {
  _sincronizarRespuestas(container);
  container.__antiTriviaEstado.respuestas.push(texto ?? '');
  _actualizarBotonesRespuesta(container);
}

function _eliminarRespuesta(container, index) {
  const estado = container.__antiTriviaEstado;
  if (estado.respuestas.length <= 1) return;
  _sincronizarRespuestas(container);
  estado.respuestas.splice(index, 1);
  _actualizarBotonesRespuesta(container);
}

function _limpiarFormItem(container) {
  const estado = container.__antiTriviaEstado;

  container.querySelector('#form-item-titulo-anti-trivia').textContent = 'Agregar pregunta';
  container.querySelector('#btn-guardar-item-anti-trivia').textContent = 'Agregar';
  container.querySelector('#btn-cancelar-edicion-anti-trivia').classList.add('hidden');

  const errorEl = container.querySelector('#item-error-anti-trivia');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-anti-trivia').value = '';
  container.querySelector('#item-categoria-anti-trivia').value = '';

  estado.editandoId = null;
  estado.respuestas = [''];
  _actualizarBotonesRespuesta(container);
}

function _cargarItemEnForm(container, item) {
  const estado = container.__antiTriviaEstado;
  const c = item.contenido || {};

  const respuestas = Array.isArray(c.respuestas_correctas) && c.respuestas_correctas.length > 0
    ? [...c.respuestas_correctas]
    : [''];

  container.querySelector('#form-item-titulo-anti-trivia').textContent = 'Editar pregunta';
  container.querySelector('#btn-guardar-item-anti-trivia').textContent = 'Guardar cambios';
  container.querySelector('#btn-cancelar-edicion-anti-trivia').classList.remove('hidden');

  const errorEl = container.querySelector('#item-error-anti-trivia');
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  container.querySelector('#item-pregunta-anti-trivia').value = c.pregunta || '';
  container.querySelector('#item-categoria-anti-trivia').value = c.categoria || '';

  estado.editandoId = item.id;
  estado.respuestas = respuestas;
  _actualizarBotonesRespuesta(container);

  container.querySelector('#item-pregunta-anti-trivia').focus();
}

function _validarItem(container) {
  const estado = container.__antiTriviaEstado;
  const errorEl = container.querySelector('#item-error-anti-trivia');

  _sincronizarRespuestas(container);

  const pregunta = container.querySelector('#item-pregunta-anti-trivia').value.trim();
  if (!pregunta) {
    errorEl.textContent = 'La pregunta es requerida';
    errorEl.classList.remove('hidden');
    return null;
  }

  const respuestas = estado.respuestas.map((r) => String(r).trim());

  if (respuestas.length === 0) {
    errorEl.textContent = 'Debe haber al menos 1 respuesta';
    errorEl.classList.remove('hidden');
    return null;
  }

  if (respuestas.some((r) => r === '')) {
    errorEl.textContent = 'Todas las respuestas deben tener texto';
    errorEl.classList.remove('hidden');
    return null;
  }

  estado.respuestas = respuestas;

  const contenido = { pregunta, respuestas_correctas: respuestas };

  const categoria = container.querySelector('#item-categoria-anti-trivia').value.trim();
  if (categoria !== '') {
    contenido.categoria = categoria;
  }

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  return contenido;
}

async function _cargarItems(container, app, setId) {
  const estado = container.__antiTriviaEstado;
  const lista = container.querySelector('#lista-items-preguntas-anti-trivia');
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
    const respuestas = c.respuestas_correctas || [];
    return `
      <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start gap-3" data-item-id="${item.id}">
        <div class="min-w-0 flex-1">
          <p class="font-headline-sm">${c.pregunta || '(sin pregunta)'}</p>
          <p class="font-body-sm text-on-surface-variant">${respuestas.join(' | ')}</p>
          ${c.categoria ? `<p class="font-body-sm text-on-surface-variant">Categoría: ${c.categoria}</p>` : ''}
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
  const estado = container.__antiTriviaEstado;
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
  const estado = container.__antiTriviaEstado;

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

function _bindEditorItemsAntiTrivia(container, app, setId) {
  const estado = container.__antiTriviaEstado;

  const btnAgregarRespuesta = container.querySelector('#btn-agregar-respuesta-anti-trivia');
  const btnGuardar = container.querySelector('#btn-guardar-item-anti-trivia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion-anti-trivia');

  _actualizarBotonesRespuesta(container);

  btnAgregarRespuesta.addEventListener('click', () => {
    _agregarRespuesta(container, '');
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
 * Renderiza el editor de preguntas de Anti-Trivia.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export async function renderEditorItemsAntiTrivia(container, app, setId) {
  const mount = container.querySelector('#editor-items-anti-trivia');
  if (!mount) return;

  container.__antiTriviaEstado = {
    items: [],
    respuestas: [''],
    editandoId: null
  };

  mount.outerHTML = _renderEditorItemsAntiTrivia();
  _bindEditorItemsAntiTrivia(container, app, setId);
  await _cargarItems(container, app, setId);
}
