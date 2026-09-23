/* =============================================================
   Editor de Items — Rosco (grilla fija de 27 filas A–Z + Ñ)

   Cada fila tiene: letra fija, input de definición, input de
   respuesta. Un único botón "Guardar" persiste el set completo.
   ============================================================= */

import { ALFABETO, RoscoGameDefinition } from '../../../games/rosco/RoscoGameDefinition.js';

function _renderEditorItemsRosco() {
  const filas = ALFABETO.map((letra) => `
    <div class="rosco-editor-fila" data-letra="${letra}" style="display:grid; grid-template-columns:3rem 1fr 1fr; gap:0.5rem; align-items:center;">
      <span class="font-display-hero text-headline-sm text-center">${letra}</span>
      <input type="text" data-campo="def" data-letra="${letra}" placeholder="Definición de ${letra}"
        class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none" />
      <input type="text" data-campo="resp" data-letra="${letra}" placeholder="Respuesta de ${letra}"
        class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none" />
    </div>
  `).join('');

  return `
    <section class="mt-8 border-t-2.5 border-on-surface pt-6" id="editor-items-rosco">
      <h2 class="font-headline-md uppercase mb-4">Definiciones del rosco (27 letras)</h2>

      <div class="space-y-2 mb-6">${filas}</div>

      <button id="btn-guardar-rosco" type="button"
        class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">Guardar</button>

      <p id="item-error-rosco" class="font-body-sm text-error mt-2 hidden"></p>
      <p id="item-ok-rosco" class="font-body-sm text-tertiary mt-2 hidden"></p>
    </section>
  `;
}

async function _cargarItems(container, app, setId) {
  const items = await app.services.set.listarItemsDeSet(setId);

  for (const item of items) {
    const c = item.contenido || {};
    const letra = c.letra;
    if (!letra) continue;

    const def = container.querySelector(`[data-campo="def"][data-letra="${letra}"]`);
    const resp = container.querySelector(`[data-campo="resp"][data-letra="${letra}"]`);
    if (def) def.value = c.definicion || '';
    if (resp) resp.value = c.respuesta || '';
  }
}

function _leerItems(container) {
  const items = [];

  for (const letra of ALFABETO) {
    const def = container.querySelector(`[data-campo="def"][data-letra="${letra}"]`);
    const resp = container.querySelector(`[data-campo="resp"][data-letra="${letra}"]`);
    if (!def || !resp) continue;

    items.push({
      letra,
      definicion: def.value.trim(),
      respuesta: resp.value.trim()
    });
  }

  return items;
}

function _bindEditorItemsRosco(container, app, setId, set) {
  const btnGuardar = container.querySelector('#btn-guardar-rosco');
  const errorEl = container.querySelector('#item-error-rosco');
  const okEl = container.querySelector('#item-ok-rosco');

  btnGuardar.addEventListener('click', async () => {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    okEl.classList.add('hidden');
    okEl.textContent = '';

    const items = _leerItems(container);
    const resultado = RoscoGameDefinition.validarContenidoSet(
      { items },
      RoscoGameDefinition.defaultConfig
    );

    if (!resultado.ok) {
      errorEl.textContent = resultado.errores.join(' • ');
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      const existentes = await app.services.set.listarItemsDeSet(setId);
      for (const item of existentes) {
        await app.services.set.eliminarItem(item.id);
      }

      for (const item of items) {
        await app.services.set.agregarItem(setId, {
          letra: item.letra,
          definicion: item.definicion,
          respuesta: item.respuesta
        });
      }

      okEl.textContent = 'Guardado';
      okEl.classList.remove('hidden');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

/**
 * Renderiza la grilla de edición de 27 filas del Rosco.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 * @param {object} set
 */
export async function renderEditorItemsRosco(container, app, setId, set) {
  const mount = container.querySelector('#editor-items-rosco');
  if (!mount) return;

  mount.outerHTML = _renderEditorItemsRosco();
  _bindEditorItemsRosco(container, app, setId, set);
  await _cargarItems(container, app, setId);
}
