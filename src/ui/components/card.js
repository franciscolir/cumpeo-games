/* =============================================================
   Card — tarjeta cómic reutilizable.
   Devuelve string HTML.
   ============================================================= */

/**
 * Renderiza una tarjeta cómic con título y contenido.
 *
 * @param {object} opciones
 * @param {string} opciones.titulo - Título de la tarjeta.
 * @param {string} opciones.contenido - HTML del contenido (ya sanitizado).
 * @param {string} [opciones.color='primary'] - Color del borde superior.
 * @param {string} [opciones.clase=''] - Clases adicionales para el contenedor.
 * @returns {string} HTML de la tarjeta.
 */
export function Card({ titulo, contenido, color = 'primary', clase = '' }) {
  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl shadow-comic-md overflow-hidden ${clase}">
      <div class="bg-${color} text-on-primary px-4 py-2 border-b-2.5 border-on-surface">
        <h2 class="font-headline-md text-headline-md uppercase tracking-tight">${titulo}</h2>
      </div>
      <div class="p-4">
        ${contenido}
      </div>
    </div>
  `;
}
