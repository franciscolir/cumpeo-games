import { Boton } from './boton.js';

/**
 * Renderiza el HTML de un modal con overlay.
 * Función pura: NO crea el elemento ni bindea listeners de acciones.
 * El caller lo monta (insertAdjacentHTML o embebiendo en un template)
 * y bindea los botones por id.
 *
 * @param {object} opciones
 * @param {string} [opciones.id='modal'] - id del overlay (raíz del modal).
 * @param {string} [opciones.titulo] - título del modal.
 * @param {string} opciones.contenido - HTML interno del cuerpo.
 * @param {Array<{texto:string, variante?:string, id?:string, disabled?:boolean}>} [opciones.acciones=[]]
 *   Botones del footer. Cada uno se renderiza con Boton().
 * @param {boolean} [opciones.cerrable=true] - si montarModal debe cerrar con click fuera / ESC.
 * @param {string} [opciones.ancho='max-w-md'] - clase de ancho máximo de la card.
 * @param {string} [opciones.padding='p-6'] - padding de la card ('p-6' | 'p-8' | ...).
 * @param {'left'|'center'} [opciones.alineacion='left'] - alineación del texto de la card.
 * @param {string} [opciones.claseTitulo='font-headline-md'] - clase tipográfica del título.
 * @param {boolean} [opciones.mostrarTitulo=true] - si renderiza el párrafo de título.
 * @returns {string} HTML completo del modal (overlay + card).
 */
export function Modal({
  id = 'modal',
  titulo = '',
  contenido,
  acciones = [],
  cerrable = true,
  ancho = 'max-w-md',
  padding = 'p-6',
  alineacion = 'left',
  claseTitulo = 'font-headline-md',
  mostrarTitulo = true
} = {}) {
  const clasesCard = [
    'bg-surface-container-lowest',
    'border-2.5',
    'border-on-surface',
    'rounded-2xl',
    padding,
    'shadow-comic-lg',
    'w-full',
    ancho,
    'mx-4',
    alineacion === 'center' ? 'text-center' : ''
  ].filter(Boolean).join(' ');

  const htmlTitulo = mostrarTitulo
    ? `<p class="${claseTitulo} uppercase text-on-surface mb-4">${titulo}</p>`
    : '';

  const htmlAcciones = acciones.length > 0
    ? `
      <div class="flex gap-2 justify-end flex-wrap">
        ${acciones.map((a) => Boton({
          texto: a.texto,
          variante: a.variante || 'primary',
          id: a.id || '',
          disabled: a.disabled === true
        })).join('')}
      </div>
    `
    : '';

  return `
    <div id="${id}" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="${clasesCard}">
        ${htmlTitulo}
        <div class="mb-4">${contenido}</div>
        ${htmlAcciones}
      </div>
    </div>
  `;
}

/**
 * Inserta el modal en el container y, si es cerrable, bindea
 * click en el overlay y tecla ESC para desmontarlo.
 * NO bindea los botones de acciones: eso lo hace el caller.
 *
 * @param {HTMLElement} container - contenedor donde montar.
 * @param {object} opciones - mismas opciones de Modal().
 * @returns {HTMLElement|null} el elemento del overlay montado.
 */
export function montarModal(container, opciones) {
  const html = Modal(opciones);
  container.insertAdjacentHTML('beforeend', html);
  const el = container.querySelector(`#${opciones.id}`);

  if (opciones.cerrable !== false && el) {
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        e.stopPropagation();
        desmontarModal(container, opciones.id);
      }
    });
  }

  if (opciones.cerrable !== false) {
    const handler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handler);
        desmontarModal(container, opciones.id);
      }
    };
    document.addEventListener('keydown', handler);
  }

  return el;
}

/**
 * Remueve el modal del container por id.
 * No falla si el modal no existe.
 *
 * @param {HTMLElement} container
 * @param {string} modalId
 * @returns {void}
 */
export function desmontarModal(container, modalId) {
  const el = container.querySelector(`#${modalId}`);
  if (el) el.remove();
}
