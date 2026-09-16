/* =============================================================
   Dashboard — panel principal del conductor.
   ============================================================= */

import { Card } from './components/card.js';
import { Header, bindHeaderListeners } from './components/header.js';
import { Boton } from './components/boton.js';

/**
 * Renderiza el dashboard en el contenedor dado.
 *
 * @param {HTMLElement} container
 * @param {object} app - Objeto del bootstrap { adapter, session, services, registry }.
 */
export async function renderDashboard(container, app) {
  const { services, session } = app;

  const circuitos = await services.circuito.listarCircuitos();
  const juegos = services.registry.listarCodigos();

  const cardSesion = Card({
    titulo: 'Sesión',
    contenido: `
      <p class="font-body-md text-on-surface-variant">
        Sesión: <code class="font-label-md bg-surface-container px-2 py-1 rounded">${session.sessionId.slice(0, 8)}…</code>
      </p>
    `,
    color: 'tertiary'
  });

  const circuitosHTML = `
      ${circuitos.length === 0
        ? `<p class="font-body-md text-on-surface-variant italic">No hay circuitos creados.</p>`
        : `<ul class="space-y-2">
            ${circuitos.slice(0, 3).map((c) => `
              <li class="flex items-center justify-between border-2 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest">
                <span class="font-body-md">${c.nombre}</span>
                <span class="font-label-md uppercase text-xs ${c.estado === 'LISTO' ? 'text-tertiary' : 'text-on-surface-variant'}">${c.estado}</span>
              </li>
            `).join('')}
          </ul>`
      }
      <div class="mt-3">
        <a href="#/circuitos">${Boton({ texto: 'Ver circuitos', variante: 'ghost', clase: 'text-sm' })}</a>
      </div>
    `;

  const cardCircuitos = Card({
    titulo: `Circuitos (${circuitos.length})`,
    contenido: circuitosHTML,
    color: 'primary'
  });

  const juegosHTML = juegos.length === 0
    ? `<p class="font-body-md text-on-surface-variant italic">No hay juegos registrados.</p>`
    : `
      <ul class="space-y-2">
        ${juegos.map((codigo) => {
          const def = services.registry.obtener(codigo);
          return `
            <li class="flex items-center justify-between border-2 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest">
              <span class="font-body-md">${def.nombre}</span>
              <span class="font-label-md text-xs text-on-surface-variant">${def.requiere_set ? 'requiere set' : 'sin set'}</span>
            </li>
          `;
        }).join('')}
      </ul>
    `;

  const cardJuegos = Card({
    titulo: `Juegos disponibles (${juegos.length})`,
    contenido: juegosHTML,
    color: 'secondary-container'
  });

  const cardSets = Card({
    titulo: 'Sets',
    contenido: `
      <p class="font-body-md text-on-surface-variant">
        Administra los sets de contenido para cada juego.
      </p>
      <div class="mt-3">
        <a href="#/sets">${Boton({ texto: 'Ver sets', variante: 'ghost', clase: 'text-sm' })}</a>
      </div>
    `,
    color: 'tertiary'
  });

  const cardPartidas = Card({
    titulo: 'Partidas',
    contenido: `
      <p class="font-body-md text-on-surface-variant">
        Controlá las partidas en vivo.
      </p>
      <div class="mt-3">
        <a href="#/partidas">${Boton({ texto: 'Ver partidas', variante: 'ghost', clase: 'text-sm' })}</a>
      </div>
    `,
    color: 'primary'
  });

  container.innerHTML = `
    <main class="min-h-screen p-6">
      ${Header({ subtitulo: 'Panel del conductor' })}

      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${cardSesion}
        ${cardCircuitos}
        ${cardSets}
        ${cardPartidas}
        ${cardJuegos}
      </section>
    </main>
  `;

  bindHeaderListeners(container);
}
