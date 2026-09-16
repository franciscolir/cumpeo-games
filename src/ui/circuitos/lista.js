import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';

/**
 * Renderiza la lista de circuitos.
 * @param {HTMLElement} container
 * @param {object} app
 */
export async function renderListaCircuitos(container, app) {
  const circuitos = await app.services.circuito.listarCircuitos();

  const listaHTML = circuitos.length === 0
    ? `<p class="font-body-md text-on-surface-variant italic">No hay circuitos creados.</p>`
    : `
      <ul class="space-y-3">
        ${circuitos.map((c) => `
          <li class="border-2.5 border-on-surface rounded-lg px-4 py-3 bg-surface-container-lowest shadow-comic-sm flex items-center justify-between flex-wrap gap-3">
            <div>
              <p class="font-headline-sm">${c.nombre}</p>
              <p class="font-label-md text-xs text-on-surface-variant uppercase">
                Estado: ${c.estado} · v${c.version}
              </p>
            </div>
            <div class="flex gap-2">
              <a href="#/circuitos/${c.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-secondary-container shadow-comic-sm hover:shadow-comic-md transition">
                Editar
              </a>
              <button
                data-eliminar="${c.id}"
                data-nombre="${c.nombre}"
                class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-error text-on-error shadow-comic-sm hover:shadow-comic-md transition"
              >
                Eliminar
              </button>
            </div>
          </li>
        `).join('')}
      </ul>
    `;

  container.innerHTML = `
    <main class="min-h-screen p-6">
      ${Header({ subtitulo: 'Circuitos', volverA: '#/' })}

      <div class="mb-6">
        <a href="#/circuitos/nuevo">
          ${Boton({ texto: '+ Nuevo circuito' })}
        </a>
      </div>

      ${listaHTML}
    </main>
  `;

  bindHeaderListeners(container);

  container.querySelectorAll('[data-eliminar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.eliminar;
      const nombre = btn.dataset.nombre;
      if (!window.confirm(`¿Eliminar el circuito "${nombre}"?`)) return;
      try {
        await app.services.circuito.eliminarCircuito(id);
        await renderListaCircuitos(container, app);
      } catch (err) {
        window.alert(`Error: ${err.message}`);
      }
    });
  });
}
