/* =============================================================
   Formulario de Set — crea o edita metadatos de un set.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Input } from '../components/input.js';

/**
 * Renderiza el formulario de set.
 * Si params.id está presente, es edición. Si no, es creación.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} [params={}]
 */
export async function renderFormularioSet(container, app, params = {}) {
  const esEdicion = !!params.id;
  let set = null;

  if (esEdicion) {
    set = await app.services.set.obtenerSet(params.id);
    if (!set) {
      container.innerHTML = `<main class="min-h-screen p-6">${Header({ volverA: '#/sets' })}<p class="text-error">Set no encontrado</p></main>`;
      return;
    }
  }

  const juegos = await app.services.juego.listarJuegos();
  const query = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const juegoIdDefault = set?.juego_id || query.get('juego') || (juegos[0]?.id || '');

  const juegoDelSet = esEdicion ? juegos.find((j) => j.id === set.juego_id) : null;
  const esQPEP = juegoDelSet?.codigo === 'QUE_PIENSA_EL_PUBLICO';
  const esTrivia = juegoDelSet?.codigo === 'TRIVIA';

  const nombre = set ? set.nombre : '';
  const descripcion = set ? (set.descripcion || '') : '';
  const ordenCatalogo = set ? (set.orden_catalogo ?? '') : '';

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({
        subtitulo: esEdicion ? 'Editar set' : 'Nuevo set',
        volverA: set ? `#/sets?juego=${set.juego_id}` : '#/sets'
      })}

      <form id="form-set" class="space-y-6">
        ${Input({
          id: 'nombre',
          label: 'Nombre',
          valor: nombre,
          requerido: true,
          placeholder: 'Cultura General'
        })}

        ${Input({
          id: 'descripcion',
          label: 'Descripción (opcional)',
          valor: descripcion,
          placeholder: 'Set de preguntas de cultura general'
        })}

        <div class="mb-4">
          <label for="juego_id" class="font-label-md uppercase block mb-1">Juego</label>
          <select id="juego_id" name="juego_id" class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none" ${esEdicion ? 'disabled' : ''}>
            ${juegos.map((j) => `
              <option value="${j.id}" ${j.id === juegoIdDefault ? 'selected' : ''}>${j.nombre}</option>
            `).join('')}
          </select>
        </div>

        ${Input({
          id: 'orden_catalogo',
          label: 'Orden en catálogo (opcional)',
          valor: ordenCatalogo,
          tipo: 'number',
          placeholder: '0'
        })}

        <div class="flex gap-3">
          ${Boton({ texto: esEdicion ? 'Guardar' : 'Crear', tipo: 'submit' })}
          <a href="${set ? `#/sets?juego=${set.juego_id}` : '#/sets'}">${Boton({ texto: 'Cancelar', variante: 'ghost' })}</a>
        </div>

        <p id="form-error" class="font-body-sm text-error hidden"></p>
      </form>

      ${esEdicion && esQPEP ? _renderEditorItemsQPEP() : ''}
      ${esEdicion && esTrivia ? _renderEditorItemsTrivia() : ''}
      ${esEdicion && !esQPEP && !esTrivia ? '<p class="mt-8 font-body-sm text-on-surface-variant italic">Este juego aún no tiene editor de items.</p>' : ''}
    </main>
  `;

  bindHeaderListeners(container);

  const form = container.querySelector('#form-set');
  const errorEl = container.querySelector('#form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const ordenVal = form.querySelector('#orden_catalogo').value.trim();

    if (esEdicion) {
      const cambios = {
        nombre: form.querySelector('#nombre').value.trim(),
        descripcion: form.querySelector('#descripcion').value.trim() || null,
        orden_catalogo: ordenVal !== '' ? Number(ordenVal) : null
      };

      try {
        await app.services.set.actualizarSet(set.id, cambios);
        window.location.hash = `#/sets?juego=${set.juego_id}`;
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    } else {
      const payload = {
        juego_id: form.querySelector('#juego_id').value,
        nombre: form.querySelector('#nombre').value.trim(),
        descripcion: form.querySelector('#descripcion').value.trim() || null,
        orden_catalogo: ordenVal !== '' ? Number(ordenVal) : null
      };

      try {
        const creado = await app.services.set.crearSet(payload);
        window.location.hash = `#/sets?juego=${creado.juego_id}`;
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    }
  });

  if (esEdicion && esQPEP) {
    _bindEditorItemsQPEP(container, app, set.id);
    await _cargarItemsQPEP(container, app, set.id);
  } else if (esEdicion && esTrivia) {
    _bindEditorItemsTrivia(container, app, set.id);
    await _cargarItemsTrivia(container, app, set.id);
  }
}

/* =============================================================
   Editor de Items — ¿Qué piensa el público?
   ============================================================= */

function _renderEditorItemsQPEP() {
  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-section">
      <h2 class="font-headline-md uppercase mb-4">Preguntas del set</h2>

      <ul id="lista-items-preguntas" class="space-y-2 mb-6"></ul>

      <div id="form-item-pregunta" class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
        <h3 id="form-item-titulo" class="font-headline-sm uppercase mb-3">Agregar pregunta</h3>

        <input id="item-pregunta" type="text" placeholder="¿Le gusta más el invierno o el verano?"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />
        <input id="item-opcion-a" type="text" placeholder="Invierno"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />
        <input id="item-opcion-b" type="text" placeholder="Verano"
          class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background mb-3 focus:outline-none" />
        <div class="grid grid-cols-2 gap-3 mb-3">
          <input id="item-tiempo" type="number" placeholder="30 (opcional)"
            class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none" />
          <input id="item-puntos" type="number" placeholder="10 (opcional)"
            class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none" />
        </div>

        <div class="flex gap-2 mt-3">
          <button id="btn-guardar-item" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Agregar</button>
          <button id="btn-cancelar-edicion" type="button"
            class="font-label-md uppercase border-2 border-on-surface-variant rounded-lg px-4 py-2 bg-surface text-on-surface-variant hover:bg-surface-container-lowest transition hidden">Cancelar</button>
        </div>

        <p id="item-error" class="font-body-sm text-error mt-2 hidden"></p>
      </div>
    </section>
  `;
}

async function _cargarItemsQPEP(container, app, setId) {
  const lista = container.querySelector('#lista-items-preguntas');
  if (!lista) return;

  const items = await app.services.set.listarItemsDeSet(setId);
  items.sort((a, b) => a.orden - b.orden);

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
          ${c.tiempo_seg ? `<p class="font-body-sm text-on-surface-variant">Tiempo: ${c.tiempo_seg}s</p>` : ''}
          ${c.puntos_acierto != null ? `<p class="font-body-sm text-on-surface-variant">Puntos: ${c.puntos_acierto}</p>` : ''}
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

function _bindEditorItemsQPEP(container, app, setId) {
  const lista = container.querySelector('#lista-items-preguntas');
  const formItem = container.querySelector('#form-item-pregunta');
  const titulo = container.querySelector('#form-item-titulo');
  const btnGuardar = container.querySelector('#btn-guardar-item');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion');
  const errorEl = container.querySelector('#item-error');
  const inputPregunta = container.querySelector('#item-pregunta');
  const inputOpcionA = container.querySelector('#item-opcion-a');
  const inputOpcionB = container.querySelector('#item-opcion-b');
  const inputTiempo = container.querySelector('#item-tiempo');
  const inputPuntos = container.querySelector('#item-puntos');

  let editandoId = null;

  function _limpiarFormItemQPEP() {
    editandoId = null;
    titulo.textContent = 'Agregar pregunta';
    btnGuardar.textContent = 'Agregar';
    btnCancelar.classList.add('hidden');
    errorEl.classList.add('hidden');
    inputPregunta.value = '';
    inputOpcionA.value = '';
    inputOpcionB.value = '';
    inputTiempo.value = '';
    inputPuntos.value = '';
  }

  function _cargarItemEnFormQPEP(item) {
    const c = item.contenido || {};
    editandoId = item.id;
    titulo.textContent = 'Editar pregunta';
    btnGuardar.textContent = 'Guardar cambios';
    btnCancelar.classList.remove('hidden');
    errorEl.classList.add('hidden');
    inputPregunta.value = c.pregunta || '';
    inputOpcionA.value = c.opcion_a || '';
    inputOpcionB.value = c.opcion_b || '';
    inputTiempo.value = c.tiempo_seg || '';
    inputPuntos.value = c.puntos_acierto != null ? c.puntos_acierto : '';
    inputPregunta.focus();
  }

  function _validarQPEP() {
    const pregunta = inputPregunta.value.trim();
    const opcionA = inputOpcionA.value.trim();
    const opcionB = inputOpcionB.value.trim();

    if (!pregunta) { errorEl.textContent = 'La pregunta es requerida'; errorEl.classList.remove('hidden'); return null; }
    if (!opcionA) { errorEl.textContent = 'La opción A es requerida'; errorEl.classList.remove('hidden'); return null; }
    if (!opcionB) { errorEl.textContent = 'La opción B es requerida'; errorEl.classList.remove('hidden'); return null; }

    const contenido = { pregunta, opcion_a: opcionA, opcion_b: opcionB };

    const tiempoVal = inputTiempo.value.trim();
    if (tiempoVal !== '') {
      const t = Number(tiempoVal);
      if (!Number.isInteger(t) || t < 1) {
        errorEl.textContent = 'Tiempo debe ser un entero >= 1';
        errorEl.classList.remove('hidden');
        return null;
      }
      contenido.tiempo_seg = t;
    }

    const puntosVal = inputPuntos.value.trim();
    if (puntosVal !== '') {
      const p = Number(puntosVal);
      if (!Number.isInteger(p) || p < 0) {
        errorEl.textContent = 'Puntos debe ser un entero >= 0';
        errorEl.classList.remove('hidden');
        return null;
      }
      contenido.puntos_acierto = p;
    }

    return contenido;
  }

  btnGuardar.addEventListener('click', async () => {
    const contenido = _validarQPEP();
    if (!contenido) return;

    try {
      if (editandoId) {
        await app.services.set.actualizarItem(editandoId, contenido);
      } else {
        await app.services.set.agregarItem(setId, contenido);
      }
      _limpiarFormItemQPEP();
      await _cargarItemsQPEP(container, app, setId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  btnCancelar.addEventListener('click', () => {
    _limpiarFormItemQPEP();
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
      if (item) _cargarItemEnFormQPEP(item);
      return;
    }

    if (accion === 'eliminar') {
      if (!confirm('¿Eliminar esta pregunta?')) return;
      try {
        await app.services.set.eliminarItem(id);
        if (editandoId === id) _limpiarFormItemQPEP();
        await _cargarItemsQPEP(container, app, setId);
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
      await _cargarItemsQPEP(container, app, setId);
    }
  });
}

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
