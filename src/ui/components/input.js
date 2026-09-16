/**
 * Input cómic reutilizable.
 * @param {object} opciones
 * @param {string} opciones.id
 * @param {string} opciones.label
 * @param {string} [opciones.valor='']
 * @param {string} [opciones.tipo='text']
 * @param {boolean} [opciones.requerido=false]
 * @param {string} [opciones.placeholder='']
 * @returns {string} HTML del input.
 */
export function Input({ id, label, valor = '', tipo = 'text', requerido = false, placeholder = '' }) {
  const req = requerido ? 'required' : '';
  return `
    <div class="mb-4">
      <label for="${id}" class="font-label-md uppercase block mb-1">${label}</label>
      <input
        type="${tipo}"
        id="${id}"
        name="${id}"
        value="${valor}"
        placeholder="${placeholder}"
        ${req}
        class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none focus:shadow-comic-md transition"
      />
    </div>
  `;
}
