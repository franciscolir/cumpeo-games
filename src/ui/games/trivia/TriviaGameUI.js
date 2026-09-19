/* =============================================================
   TriviaGameUI — GameUI concreto para el juego Trivia.

   Renderiza:
   - Área de juego: pregunta + opciones
   - Panel conductor: botones de control
   ============================================================= */

import { Boton } from '../../components/boton.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const TriviaGameUI = {
  codigo: 'TRIVIA',

  /**
   * Renderiza el área de juego (pregunta + opciones).
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto - { partida, juegoEjecutado, equipos, puedeControlar, acVisible }
   */
  renderizarAreaJuego(estadoJuego, container, contexto) {
    const snapshot = contexto.juegoEjecutado?.snapshot;
    const items = snapshot?.items || [];

    if (!estadoJuego || !estadoJuego.pregunta_actual_index && estadoJuego.pregunta_actual_index !== 0 || items.length === 0) {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Trivia</p>
            <p class="font-body-md text-on-surface-variant">Presioná "Iniciar juego" para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    const total = items.length;
    const idx = estadoJuego.pregunta_actual_index || 0;
    const pregunta = items[idx];
    const opciones = pregunta?.opciones || [];
    const ronda = estadoJuego.ronda_actual || 1;
    const totalRondas = estadoJuego.total_rondas || 1;
    const fase = estadoJuego.fase || '';
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    const gridCols = opciones.length <= 4 ? 'grid-cols-2' : 'grid-cols-1';

    const opcionesHTML = opciones.map((texto, i) => {
      const esCorrecta = i === pregunta.respuesta_correcta_index;
      const mostrarCorrecta = fase === 'MOSTRANDO_RESULTADO' && contexto.acVisible && esCorrecta;
      const claseFondo = mostrarCorrecta ? 'bg-tertiary/20 border-tertiary' : 'bg-surface-container-lowest border-on-surface';
      return `
        <div class="border-2.5 ${claseFondo} rounded-xl p-4 text-center shadow-comic-sm">
          <span class="font-display-hero text-lg text-primary">${LETRAS[i] || i + 1}</span>
          <p class="font-body-md text-on-surface mt-1">${texto}</p>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-4 overflow-y-auto">
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${total}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          </div>
          <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-6">
            ${pregunta?.pregunta || 'Sin pregunta'}
          </p>
          <div class="grid ${gridCols} gap-3">
            ${opcionesHTML}
          </div>
        </div>
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm flex items-center justify-center gap-8">
          <span class="font-headline-md uppercase text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-xl text-primary">${pts1}</span></span>
          <span class="font-headline-md text-on-surface-variant">-</span>
          <span class="font-headline-md uppercase text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-xl text-primary">${pts2}</span></span>
        </div>
      </div>
    `;
  },

  /**
   * Renderiza el panel del conductor con botones de control.
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto
   * @param {object} callbacks - { onAccion(tipo, payload) }
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Trivia — ${fase || 'Sin fase'}</p>
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: `Marcar correcto — ${equipo1.nombre}`, variante: 'primary', clase: 'btn-trivia-correcto', id: 'btn-trivia-correcto-1' })}
          ${Boton({ texto: `Marcar correcto — ${equipo2.nombre}`, variante: 'primary', clase: 'btn-trivia-correcto', id: 'btn-trivia-correcto-2' })}
        </div>
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: `Incorrecto — ${equipo1.nombre}`, variante: 'danger', clase: 'btn-trivia-incorrecto', id: 'btn-trivia-incorrecto-1' })}
          ${Boton({ texto: `Incorrecto — ${equipo2.nombre}`, variante: 'danger', clase: 'btn-trivia-incorrecto', id: 'btn-trivia-incorrecto-2' })}
        </div>
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Siguiente pregunta', variante: 'secondary', id: 'btn-trivia-siguiente' })}
          ${Boton({ texto: 'Saltar', variante: 'ghost', id: 'btn-trivia-saltar' })}
        </div>
      </div>
    `;

    container.querySelector('#btn-trivia-correcto-1')?.addEventListener('click', () => {
      callbacks.onAccion('marcar-correcto', { equipo: 1 });
    });
    container.querySelector('#btn-trivia-correcto-2')?.addEventListener('click', () => {
      callbacks.onAccion('marcar-correcto', { equipo: 2 });
    });
    container.querySelector('#btn-trivia-incorrecto-1')?.addEventListener('click', () => {
      callbacks.onAccion('marcar-incorrecto', { equipo: 1 });
    });
    container.querySelector('#btn-trivia-incorrecto-2')?.addEventListener('click', () => {
      callbacks.onAccion('marcar-incorrecto', { equipo: 2 });
    });
    container.querySelector('#btn-trivia-siguiente')?.addEventListener('click', () => {
      callbacks.onAccion('siguiente-pregunta');
    });
    container.querySelector('#btn-trivia-saltar')?.addEventListener('click', () => {
      callbacks.onAccion('saltar-pregunta');
    });
  }
};
