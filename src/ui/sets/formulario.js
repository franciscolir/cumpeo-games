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
}
