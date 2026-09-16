/* =============================================================
   Lista de Partidas — renderiza #/partidas.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';

/**
 * Renderiza la lista de partidas recuperables.
 * @param {HTMLElement} container
 * @param {object} app
 */
export async function renderListaPartidas(container, app) {
  const partidas = await app.services.partida.listarPartidasRecuperables();

  let contenido;

  if (partidas.length === 0) {
    contenido = `<p class="font-body-md text-on-surface-variant italic">No hay partidas activas.</p>`;
  } else {
    contenido = `
      <ul class="space-y-3">
        ${partidas.map((p) => `
          <li class="border-2.5 border-on-surface rounded-lg px-4 py-3 bg-surface-container-lowest shadow-comic-sm flex items-center justify-between flex-wrap gap-3">
            <div>
              <p class="font-headline-sm">${p.circuito_nombre || 'Sin nombre'}</p>
              <p class="font-label-md text-xs text-on-surface-variant uppercase">
                ${p.estado} · Código: ${p.public_codigo || '—'}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/partidas/${p.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition">
                Ir a la consola
              </a>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({ subtitulo: 'Partidas', volverA: '#/' })}

      <div class="mb-6">
        <a href="#/partidas/nueva">
          ${Boton({ texto: '+ Nueva partida' })}
        </a>
      </div>

      ${contenido}
    </main>
  `;

  bindHeaderListeners(container);
}
