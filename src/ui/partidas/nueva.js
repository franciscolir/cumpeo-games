/* =============================================================
   Nueva Partida — crea una partida desde un circuito LISTO.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { generarPublicCodigo, nuevoActionId } from './utils.js';

/**
 * Renderiza la pantalla de creación de partida.
 * @param {HTMLElement} container
 * @param {object} app
 */
export async function renderNuevaPartida(container, app) {
  const circuitos = await app.services.circuito.listarCircuitos();
  const listos = circuitos.filter((c) => c.estado === 'LISTO');

  if (listos.length === 0) {
    container.innerHTML = `
      <main class="min-h-screen p-6 max-w-3xl mx-auto">
        ${Header({ subtitulo: 'Nueva partida', volverA: '#/partidas' })}

        <div class="border-2.5 border-on-surface rounded-lg p-6 bg-surface-container-lowest shadow-comic-sm text-center">
          <p class="font-body-md text-on-surface-variant mb-4">
            No hay circuitos listos. Creá uno primero.
          </p>
          <a href="#/circuitos">
            ${Boton({ texto: 'Ir a circuitos' })}
          </a>
        </div>
      </main>
    `;
    bindHeaderListeners(container);
    return;
  }

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({ subtitulo: 'Nueva partida', volverA: '#/partidas' })}

      <form id="form-nueva-partida" class="space-y-6">
        <div class="mb-4">
          <label for="circuito_id" class="font-label-md uppercase block mb-1">Circuito</label>
          <select id="circuito_id" name="circuito_id" class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none">
            ${listos.map((c) => `
              <option value="${c.id}">${c.nombre}</option>
            `).join('')}
          </select>
        </div>

        <div class="flex gap-3">
          ${Boton({ texto: 'Crear partida', tipo: 'submit' })}
          <a href="#/partidas">${Boton({ texto: 'Cancelar', variante: 'ghost' })}</a>
        </div>

        <p id="form-error" class="font-body-sm text-error hidden"></p>
      </form>
    </main>
  `;

  bindHeaderListeners(container);

  const form = container.querySelector('#form-nueva-partida');
  const errorEl = container.querySelector('#form-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const circuitoId = form.querySelector('#circuito_id').value;
    let intentos = 0;
    let partida;

    while (intentos < 3) {
      try {
        const codigo = generarPublicCodigo();
        partida = await app.services.partida.crearPartida(
          { circuito_id: circuitoId, public_codigo: codigo },
          nuevoActionId()
        );
        break;
      } catch (err) {
        intentos++;
        if (intentos >= 3) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
          return;
        }
      }
    }

    window.location.hash = `#/partidas/${partida.id}`;
  });
}
