/* =============================================================
   HistoriaEnredadaGameUI — UI del conductor para Historia Enredada.
   ============================================================= */

import { Boton } from '../../components/boton.js';

let _latestCallbacks = null;

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_HISTORIA: 'Seleccionando historia',
  PREPARANDO: 'Preparando',
  ACTUANDO: 'Actuando',
  VOTANDO: 'Votando',
  FIN_DE_RONDA: 'Fin de ronda',
  FIN_DE_JUEGO: 'Fin de juego'
};

function _historiaDe(estadoJuego, contexto) {
  const id = estadoJuego?.historia_elegida_id;
  if (!id) return null;
  const items = contexto?.itemsDelJuego || [];
  return items.find((it) => it.id === id) || null;
}

function _historiasDisponibles(estadoJuego, contexto) {
  const usadas = new Set(estadoJuego?.historias_usadas || []);
  const items = contexto?.itemsDelJuego || [];
  return items.filter((it) => !usadas.has(it.id));
}

export const HistoriaEnredadaGameUI = {
  codigo: 'HISTORIA_ENREDADA',

  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    if (!estadoJuego || !estadoJuego.fase) {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Historia Enredada</p>
            <p class="font-body-md text-on-surface-variant">Iniciá la partida para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    _latestCallbacks = callbacks;

    const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
    const ronda = estadoJuego.ronda_actual || 1;
    const totalRondas = estadoJuego.total_rondas || 1;
    const equipoActual = estadoJuego.equipo_actual || 1;
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const fase = estadoJuego.fase;
    const historia = _historiaDe(estadoJuego, contexto);

    const nombreFase = NOMBRE_FASES[fase] || fase.replace(/_/g, ' ');
    const nombreEquipo = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;

    const cardHistoria = historia
      ? `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-label-md uppercase text-on-surface-variant mb-1">Historia elegida</p>
          <p class="font-display-hero text-3xl text-on-surface uppercase mb-2">${historia.titulo}</p>
          <p class="font-body-md text-on-surface-variant">${historia.descripcion}</p>
        </div>
      `
      : `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Esperando selección de historia…</p>
        </div>
      `;

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${nombreFase}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${nombreEquipo}</span>
        </div>

        ${cardHistoria}

        <div class="grid grid-cols-2 gap-3">
          <div class="border-2.5 ${equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-2xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? 'border-[#FF3344] bg-[#FF3344]/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-2xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    `;
  },

  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    _latestCallbacks = callbacks;

    const fase = estadoJuego?.fase || '';
    const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
    const equipoActual = estadoJuego?.equipo_actual || 1;
    const nombreEquipoActual = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;

    let controles = '';

    if (!fase) {
      controles = Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-he-iniciar-juego' });
    } else if (fase === 'INICIO_RONDA') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Comenzar ronda', variante: 'primary', id: 'btn-he-iniciar-ronda' })}
        </div>
      `;
    } else if (fase === 'SELECCIONANDO_HISTORIA') {
      const disponibles = _historiasDisponibles(estadoJuego, contexto);
      if (disponibles.length === 0) {
        controles = `
          <p class="font-body-sm text-error">No hay historias disponibles. Cargá más items en el set.</p>
        `;
      } else {
        controles = `
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Elegí una historia para ${nombreEquipoActual}</p>
          <div class="flex flex-col gap-2">
            ${disponibles.map((h) => `
              <button type="button" data-historia-id="${h.id}" id="btn-he-historia-${h.id}"
                class="text-left border-2 border-on-surface rounded-lg p-3 bg-surface-container-lowest hover:bg-surface-container-low transition">
                <p class="font-headline-sm">${h.titulo}</p>
                <p class="font-body-sm text-on-surface-variant">${h.descripcion}</p>
              </button>
            `).join('')}
          </div>
        `;
      }
    } else if (fase === 'PREPARANDO') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Empezar actuación', variante: 'primary', id: 'btn-he-empezar-actuacion' })}
        </div>
      `;
    } else if (fase === 'ACTUANDO') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Empezar votación', variante: 'primary', id: 'btn-he-empezar-votacion' })}
        </div>
      `;
    } else if (fase === 'VOTANDO') {
      controles = `
        <div class="flex flex-col gap-2">
          <label class="font-label-md uppercase text-on-surface-variant">Puntos para ${nombreEquipoActual}</label>
          <div class="flex gap-2 items-center">
            <input type="number" min="0" id="input-puntos-historia"
              class="w-24 border-2 border-on-surface rounded px-2 py-1 bg-background focus:outline-none"
              placeholder="0" />
            <button type="button" id="btn-he-asignar-puntos"
              class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">
              Asignar
            </button>
          </div>
          <p id="input-puntos-error" class="font-body-sm text-error hidden"></p>
        </div>
      `;
    } else if (fase === 'FIN_DE_RONDA') {
      const ronda = estadoJuego?.ronda_actual || 1;
      const totalRondas = estadoJuego?.total_rondas || 1;
      const hayMas = ronda < totalRondas;
      controles = `
        <div class="flex flex-wrap gap-2">
          ${hayMas
            ? Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-he-siguiente-ronda' })
            : Boton({ texto: 'Finalizar juego', variante: 'primary', id: 'btn-he-finalizar-juego' })}
        </div>
      `;
    } else if (fase === 'FIN_DE_JUEGO') {
      controles = '<p class="font-headline-md uppercase text-on-surface">Juego terminado</p>';
    }

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Historia Enredada — ${fase ? (NOMBRE_FASES[fase] || fase.replace(/_/g, ' ')) : 'Sin fase'}</p>
        ${controles}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-he-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-historia');
      });
    }
    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-he-iniciar-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-ronda-historia');
      });
    }
    if (fase === 'SELECCIONANDO_HISTORIA') {
      container.querySelectorAll('[data-historia-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const historiaId = btn.dataset.historiaId;
          callbacks.onAccion('seleccionar-historia-historia', { historiaId });
        });
      });
    }
    if (fase === 'PREPARANDO') {
      container.querySelector('#btn-he-empezar-actuacion')?.addEventListener('click', () => {
        callbacks.onAccion('empezar-actuacion-historia');
      });
    }
    if (fase === 'ACTUANDO') {
      container.querySelector('#btn-he-empezar-votacion')?.addEventListener('click', () => {
        callbacks.onAccion('empezar-votacion-historia');
      });
    }
    if (fase === 'VOTANDO') {
      container.querySelector('#btn-he-asignar-puntos')?.addEventListener('click', () => {
        const input = container.querySelector('#input-puntos-historia');
        const errorEl = container.querySelector('#input-puntos-error');
        const puntos = parseInt(input?.value, 10);
        if (isNaN(puntos) || puntos < 0) {
          if (errorEl) {
            errorEl.textContent = 'Ingresá un número entero >= 0';
            errorEl.classList.remove('hidden');
          }
          return;
        }
        if (errorEl) errorEl.classList.add('hidden');
        callbacks.onAccion('asignar-puntos-historia', { puntos });
      });
    }
    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-he-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-siguiente-ronda-historia');
      });
      container.querySelector('#btn-he-finalizar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('finalizar-historia');
      });
    }
  },

  cleanup() {
    _latestCallbacks = null;
  }
};
