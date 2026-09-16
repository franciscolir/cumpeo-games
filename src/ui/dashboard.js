/* =============================================================
   Dashboard — panel principal del conductor.
   ============================================================= */

import { Card } from './components/card.js';

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

  const circuitosHTML = circuitos.length === 0
    ? `<p class="font-body-md text-on-surface-variant italic">No hay circuitos creados.</p>`
    : `
      <ul class="space-y-2">
        ${circuitos.map((c) => `
          <li class="flex items-center justify-between border-2 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest">
            <span class="font-body-md">${c.nombre}</span>
            <span class="font-label-md uppercase text-xs ${c.estado === 'LISTO' ? 'text-tertiary' : 'text-on-surface-variant'}">${c.estado}</span>
          </li>
        `).join('')}
      </ul>
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

  container.innerHTML = `
    <main class="min-h-screen p-6">
      <header class="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="font-display-hero text-display-hero text-primary uppercase -rotate-1 inline-block">
            CUMPEO
          </h1>
          <p class="font-body-md text-on-surface-variant mt-2">
            Panel del conductor
          </p>
        </div>
        <button
          id="toggle-theme"
          class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition"
        >
          Tema
        </button>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${cardSesion}
        ${cardCircuitos}
        ${cardJuegos}
      </section>
    </main>
  `;

  const btnTema = container.querySelector('#toggle-theme');
  if (btnTema) {
    btnTema.addEventListener('click', () => {
      const html = document.documentElement;
      const actual = html.dataset.theme;
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      html.dataset.theme = nuevo;
      html.classList.toggle('dark', nuevo === 'dark');
      localStorage.setItem('cumpeo.tema', nuevo === 'dark' ? 'oscuro' : 'claro');
    });
  }
}
