import { toggleTheme } from '../theme.js';

/**
 * Header común con logo, navegación y botón de tema.
 * @param {object} opciones
 * @param {string} [opciones.titulo='CUMPEO']
 * @param {string} [opciones.subtitulo='']
 * @param {string} [opciones.volverA=''] - Si se indica, muestra botón volver.
 * @returns {string} HTML del header.
 */
export function Header({ titulo = 'CUMPEO', subtitulo = '', volverA = '' }) {
  const botonVolver = volverA
    ? `<a href="${volverA}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition">← Volver</a>`
    : '';

  return `
    <header class="mb-8 flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-4">
        ${botonVolver}
        <div>
          <h1 class="font-display-hero text-display-hero text-primary uppercase -rotate-1 inline-block">
            ${titulo}
          </h1>
          ${subtitulo ? `<p class="font-body-md text-on-surface-variant mt-2">${subtitulo}</p>` : ''}
        </div>
      </div>
      <button
        id="toggle-theme"
        class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition"
      >
        Tema
      </button>
    </header>
  `;
}

/**
 * Conecta los listeners del header (ej: botón de tema).
 * Llamar después de montar el HTML.
 * @param {HTMLElement} container
 */
export function bindHeaderListeners(container) {
  const btnTema = container.querySelector('#toggle-theme');
  if (btnTema) {
    btnTema.addEventListener('click', () => toggleTheme());
  }
}
