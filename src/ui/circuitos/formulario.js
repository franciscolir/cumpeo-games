import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Input } from '../components/input.js';

/**
 * Renderiza el formulario de circuito.
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
  const juegosSeleccionados = completo ? completo.juegos : [];
  const juegosDisponibles = app.services.registry.listar();
  const juegoSeleccionadoId = juegosSeleccionados[0]?.juego_id || (juegosDisponibles[0]?.codigo || '');

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
          <div class="mb-4">
            <label for="juego_id" class="font-label-md uppercase block mb-1">Juego principal</label>
            <select id="juego_id" name="juego_id" class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest focus:outline-none">
              ${juegosDisponibles.map((d) => `
                <option value="${d.codigo}" ${d.codigo === juegoSeleccionadoId ? 'selected' : ''}>${d.nombre}</option>
              `).join('')}
            </select>
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const payload = {
      nombre: form.querySelector('#nombre').value.trim(),
      juegos: [
        { juego_id: form.querySelector('#juego_id').value }
      ],
      equipos: [
        {
          posicion: 1,
          nombre: form.querySelector('#equipo_0_nombre').value.trim(),
          color: form.querySelector('#equipo_0_color').value.trim()
        },
        {
          posicion: 2,
          nombre: form.querySelector('#equipo_1_nombre').value.trim(),
          color: form.querySelector('#equipo_1_color').value.trim()
        }
      ]
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
