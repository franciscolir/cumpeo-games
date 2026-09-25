import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Input } from '../components/input.js';

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Renderiza el formulario de circuito (N juegos).
 * Si params.id está presente, es edición. Si no, es creación.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} [params={}]
 */
export async function renderFormularioCircuito(container, app, params = {}) {
  const esEdicion = !!params.id;
  let circuito = null;
  let completo = null;

  if (esEdicion) {
    completo = await app.services.circuito.obtenerCircuitoCompleto(params.id);
    if (!completo || !completo.circuito) {
      container.innerHTML = `<main class="min-h-screen p-6">${Header({ volverA: '#/circuitos' })}<p class="text-error">Circuito no encontrado</p></main>`;
      return;
    }
    circuito = completo.circuito;
    if (circuito.estado !== 'BORRADOR') {
      window.alert('Solo se pueden editar circuitos en estado BORRADOR.');
      window.location.hash = '#/circuitos';
      return;
    }
  }

  const nombre = circuito ? circuito.nombre : '';
  const equipos = completo ? completo.equipos : [
    { posicion: 1, nombre: 'Equipo 1', color: '#E53E3E' },
    { posicion: 2, nombre: 'Equipo 2', color: '#F6E05E' }
  ];
  const juegosDisponibles = await app.services.juego.listarJuegos();
  const juegosSeleccionados = completo ? completo.juegos : [];
  let juegosIds = juegosSeleccionados.length > 0
    ? juegosSeleccionados.map((j) => j.juego_id)
    : (juegosDisponibles[0]?.id ? [juegosDisponibles[0].id] : []);

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({
        subtitulo: esEdicion ? 'Editar circuito' : 'Nuevo circuito',
        volverA: '#/circuitos'
      })}

      <form id="form-circuito" class="space-y-6">
        ${Input({
          id: 'nombre',
          label: 'Nombre',
          valor: nombre,
          requerido: true,
          placeholder: 'Noche de Juegos'
        })}

        <fieldset class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
          <legend class="font-label-md uppercase px-2">Equipos</legend>
          ${equipos.map((eq, i) => `
            <div class="grid grid-cols-2 gap-4 mb-4">
              ${Input({
                id: `equipo_${i}_nombre`,
                label: `Equipo ${i + 1} — nombre`,
                valor: eq.nombre,
                requerido: true
              })}
              ${Input({
                id: `equipo_${i}_color`,
                label: `Equipo ${i + 1} — color`,
                valor: eq.color,
                tipo: 'text',
                requerido: true,
                placeholder: '#E53E3E'
              })}
            </div>
          `).join('')}
        </fieldset>

        <fieldset class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
          <legend class="font-label-md uppercase px-2">Juegos</legend>
          <div id="lista-juegos" class="mb-4"></div>
          <div>
            ${Boton({ texto: '+ Agregar juego', id: 'btn-agregar-juego', variante: 'secondary' })}
          </div>
        </fieldset>

        <div class="flex gap-3">
          ${Boton({ texto: esEdicion ? 'Guardar' : 'Crear', tipo: 'submit' })}
          <a href="#/circuitos">${Boton({ texto: 'Cancelar', variante: 'ghost' })}</a>
        </div>

        <p id="form-error" class="font-body-sm text-error hidden"></p>
      </form>
    </main>
  `;

  bindHeaderListeners(container);

  const form = container.querySelector('#form-circuito');
  const errorEl = container.querySelector('#form-error');
  const listaJuegos = container.querySelector('#lista-juegos');
  const btnAgregar = container.querySelector('#btn-agregar-juego');

  const opcionesJuegos = (seleccionadoId) => juegosDisponibles.map((d) => `
    <option value="${d.id}" ${d.id === seleccionadoId ? 'selected' : ''}>${d.nombre}</option>
  `).join('');

  function renderJuegos() {
    listaJuegos.innerHTML = juegosIds.map((jid, i) => `
      <div class="flex items-end gap-2 mb-3" data-fila-juego="${i}">
        <div class="flex-1">
          <label for="juego_${i}" class="font-label-md uppercase block mb-1">Juego ${i + 1}</label>
          <select
            id="juego_${i}"
            name="juego_${i}"
            class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none"
          >
            ${opcionesJuegos(jid)}
          </select>
        </div>
        ${juegosIds.length > 1 ? `
          <button
            type="button"
            data-quitar-juego="${i}"
            class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-error text-on-error shadow-comic-sm hover:shadow-comic-md transition"
          >
            Quitar
          </button>
        ` : ''}
      </div>
    `).join('');

    listaJuegos.querySelectorAll('[data-quitar-juego]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sincronizarJuegosDesdeDOM();
        const i = Number(btn.dataset.quitarJuego);
        juegosIds.splice(i, 1);
        renderJuegos();
      });
    });
  }

  function sincronizarJuegosDesdeDOM() {
    const selects = listaJuegos.querySelectorAll('select[id^="juego_"]');
    juegosIds = Array.from(selects).map((s) => s.value);
  }

  renderJuegos();

  btnAgregar.addEventListener('click', () => {
    sincronizarJuegosDesdeDOM();
    juegosIds.push(juegosDisponibles[0]?.id || '');
    renderJuegos();
    const ultima = listaJuegos.querySelector(`#juego_${juegosIds.length - 1}`);
    if (ultima) ultima.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const nombreValor = form.querySelector('#nombre').value.trim();
    if (!nombreValor) {
      errorEl.textContent = 'Ingresá un nombre.';
      errorEl.classList.remove('hidden');
      return;
    }

    const equiposValor = [0, 1].map((i) => ({
      posicion: i + 1,
      nombre: form.querySelector(`#equipo_${i}_nombre`).value.trim(),
      color: form.querySelector(`#equipo_${i}_color`).value.trim()
    }));

    if (equiposValor.some((eq) => !eq.nombre)) {
      errorEl.textContent = 'Completá el nombre de ambos equipos.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (equiposValor.some((eq) => !COLOR_REGEX.test(eq.color))) {
      errorEl.textContent = 'El color de cada equipo debe tener formato #RRGGBB.';
      errorEl.classList.remove('hidden');
      return;
    }

    const selects = listaJuegos.querySelectorAll('select[id^="juego_"]');
    const seleccionados = Array.from(selects).map((s) => s.value);

    if (seleccionados.length === 0) {
      errorEl.textContent = 'Agregá al menos un juego.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (new Set(seleccionados).size !== seleccionados.length) {
      errorEl.textContent = 'No podés agregar el mismo juego más de una vez.';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      nombre: nombreValor,
      juegos: seleccionados.map((juego_id) => ({ juego_id })),
      equipos: equiposValor
    };

    try {
      if (esEdicion) {
        await app.services.circuito.actualizarCircuito(circuito.id, circuito.version, payload);
      } else {
        await app.services.circuito.crearCircuito(payload);
      }
      window.location.hash = '#/circuitos';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
