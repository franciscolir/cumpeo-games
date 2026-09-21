/**
 * Botón cómic reutilizable.
 * @param {object} opciones
 * @param {string} opciones.texto
 * @param {string} [opciones.variante='primary'] - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} [opciones.id]
 * @param {string} [opciones.tipo='button'] - 'button' | 'submit'
 * @param {string} [opciones.clase='']
 * @returns {string} HTML del botón.
 */
export function Boton({ texto, variante = 'primary', id = '', tipo = 'button', clase = '', disabled = false }) {
  const variantes = {
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-secondary-container text-on-secondary-container',
    danger: 'bg-error text-on-error',
    ghost: 'bg-surface-container-lowest text-on-surface'
  };
  const clases = variantes[variante] || variantes.primary;
  const idAttr = id ? `id="${id}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const disabledCls = disabled ? 'opacity-50 cursor-not-allowed hover:shadow-comic-sm' : '';

  return `
    <button
      type="${tipo}"
      ${idAttr}
      ${disabledAttr}
      class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 ${clases} shadow-comic-sm hover:shadow-comic-md transition ${disabledCls} ${clase}"
    >
      ${texto}
    </button>
  `;
}
