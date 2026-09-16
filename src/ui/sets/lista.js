/* =============================================================
   Lista de Sets — renderiza #/sets con filtro por juego.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';

/**
 * Parsea query string de un hash.
 * @param {string} hash - ej: '#/sets?juego=abc'
 * @returns {object} - { juego: 'abc' }
 */
function parseQuery(hash) {
  const idx = hash.indexOf('?');
  if (idx === -1) return {};
  const query = hash.slice(idx + 1);
  const params = {};
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return params;
}

/**
 * Construye hash con query param juego.
 * @param {string} [juegoId]
 * @returns {string}
 */
function buildHashSets(juegoId) {
  return juegoId ? `#/sets?juego=${encodeURIComponent(juegoId)}` : '#/sets';
}

/**
 * Renderiza la lista de sets con filtro por juego via URL query.
 * @param {HTMLElement} container
 * @param {object} app
 */
export async function renderListaSets(container, app) {
  const query = parseQuery(window.location.hash);
  const juegoId = query.juego || '';

  const juegos = await app.services.juego.listarJuegos();
  let sets = [];

  if (juegoId) {
    sets = await app.services.set.listarSetsPorJuego(juegoId);
  }

  const juegoNombre = juegoId
    ? (juegos.find((j) => j.id === juegoId)?.nombre || 'Juego desconocido')
    : '';

  const selectHTML = `
    <div class="mb-6">
      <label for="filtro-juego" class="font-label-md uppercase block mb-1">Filtrar por juego</label>
      <select id="filtro-juego" class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none">
        <option value="">Seleccioná un juego</option>
        ${juegos.map((j) => `
          <option value="${j.id}" ${j.id === juegoId ? 'selected' : ''}>${j.nombre}</option>
        `).join('')}
      </select>
    </div>
  `;

  let contenido;

  if (!juegoId) {
    contenido = `<p class="font-body-md text-on-surface-variant italic">Seleccioná un juego para ver sus sets.</p>`;
  } else if (sets.length === 0) {
    contenido = `<p class="font-body-md text-on-surface-variant italic">No hay sets para este juego.</p>`;
  } else {
    contenido = `
      <ul class="space-y-3">
        ${sets.map((s) => `
          <li class="border-2.5 border-on-surface rounded-lg px-4 py-3 bg-surface-container-lowest shadow-comic-sm flex items-center justify-between flex-wrap gap-3">
            <div>
              <p class="font-headline-sm">${s.nombre}</p>
              ${s.descripcion ? `<p class="font-body-sm text-on-surface-variant">${s.descripcion}</p>` : ''}
              <p class="font-label-md text-xs text-on-surface-variant uppercase">
                ${s.activo ? 'Activo' : 'Inactivo'} · v${s.version}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/sets/${s.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-secondary-container shadow-comic-sm hover:shadow-comic-md transition">
                Editar
              </a>
              ${s.activo ? `
                <button
                  data-desactivar="${s.id}"
                  data-nombre="${s.nombre}"
                  class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition"
                >
                  Desactivar
                </button>
              ` : ''}
              <button
                data-eliminar="${s.id}"
                data-nombre="${s.nombre}"
                class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-error text-on-error shadow-comic-sm hover:shadow-comic-md transition"
              >
                Eliminar
              </button>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({ subtitulo: 'Sets', volverA: '#/' })}

      ${selectHTML}

      ${juegoId ? `
        <div class="mb-6">
          <a href="#/sets/nuevo?juego=${encodeURIComponent(juegoId)}">
            ${Boton({ texto: '+ Nuevo set' })}
          </a>
        </div>
      ` : ''}

      ${contenido}
    </main>
  `;

  bindHeaderListeners(container);

  const selectFiltro = container.querySelector('#filtro-juego');
  if (selectFiltro) {
    selectFiltro.addEventListener('change', () => {
      window.location.hash = buildHashSets(selectFiltro.value);
    });
  }

  container.querySelectorAll('[data-desactivar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.desactivar;
      const nombre = btn.dataset.nombre;
      if (!window.confirm(`¿Desactivar el set "${nombre}"?`)) return;
      try {
        await app.services.set.desactivarSet(id);
        await renderListaSets(container, app);
      } catch (err) {
        window.alert(`Error: ${err.message}`);
      }
    });
  });

  container.querySelectorAll('[data-eliminar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.eliminar;
      const nombre = btn.dataset.nombre;
      if (!window.confirm(`¿Eliminar el set "${nombre}"?`)) return;
      try {
        await app.services.set.eliminarSet(id);
        await renderListaSets(container, app);
      } catch (err) {
        window.alert(`Error: ${err.message}`);
      }
    });
  });
}
