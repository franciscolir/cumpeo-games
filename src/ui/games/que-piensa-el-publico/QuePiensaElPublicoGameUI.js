/* =============================================================
   QuePiensaElPublicoGameUI — GameUI concreto para el juego
   "Que piensa el publico?".

   Renderiza:
   - Área de juego: pregunta + opciones A/B + fase + conteo en vivo
   - Panel conductor: botones según fase
   ============================================================= */

import { Boton } from '../../components/boton.js';

export const QuePiensaElPublicoGameUI = {
  codigo: 'QUE_PIENSA_EL_PUBLICO',

  /**
   * Renderiza el área de juego (pregunta + opciones A/B).
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto - { partida, juegoEjecutado, equipos, puedeControlar, acVisible }
   */
  renderizarAreaJuego(estadoJuego, container, contexto) {
    const snapshot = contexto.juegoEjecutado?.snapshot;
    const items = snapshot?.items || [];
    const fase = estadoJuego?.fase || '';

    if (!fase) {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Que piensa el publico?</p>
            <p class="font-body-md text-on-surface-variant">Presiona "Iniciar juego" para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    const idx = estadoJuego.pregunta_actual_index || 0;
    const pregunta = items[idx] || null;
    const ronda = estadoJuego.ronda_actual || 1;
    const total = items.length;
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    const respuestas = estadoJuego.respuestas_publico || { a: 0, b: 0 };
    const totalRespuestas = estadoJuego.total_respuestas || 0;
    const mostrarConteo = fase === 'ENCUESTA_ACTIVA' || fase === 'ENCUESTA_CERRADA';

    const resultado = estadoJuego.resultado_publico;
    const mostrarResultado = fase === 'REVELANDO' || fase === 'PUNTUANDO';

    const pronostico1 = estadoJuego.pronostico_equipo_1;
    const pronostico2 = estadoJuego.pronostico_equipo_2;

    const preguntaHTML = pregunta
      ? `
        <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-6">
          ${pregunta.pregunta}
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="border-2.5 ${mostrarResultado && resultado === 'A' ? 'bg-tertiary/20 border-tertiary' : 'bg-surface-container-lowest border-on-surface'} rounded-xl p-4 text-center shadow-comic-sm">
            <span class="font-display-hero text-lg text-primary">A</span>
            <p class="font-body-md text-on-surface mt-1">${pregunta.opcion_a}</p>
          </div>
          <div class="border-2.5 ${mostrarResultado && resultado === 'B' ? 'bg-tertiary/20 border-tertiary' : 'bg-surface-container-lowest border-on-surface'} rounded-xl p-4 text-center shadow-comic-sm">
            <span class="font-display-hero text-lg text-primary">B</span>
            <p class="font-body-md text-on-surface mt-1">${pregunta.opcion_b}</p>
          </div>
        </div>
      `
      : `<p class="font-body-md text-on-surface-variant">Sin pregunta disponible</p>`;

    let conteoHTML = '';
    if (mostrarConteo) {
      conteoHTML = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm">
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Votos: ${totalRespuestas}</p>
          <div class="flex gap-4">
            <span class="font-headline-md uppercase text-on-surface">A: <span class="font-display-hero text-xl text-primary">${respuestas.a}</span></span>
            <span class="font-headline-md uppercase text-on-surface">B: <span class="font-display-hero text-xl text-primary">${respuestas.b}</span></span>
          </div>
        </div>
      `;
    }

    let resultadoHTML = '';
    if (mostrarResultado && resultado) {
      resultadoHTML = `
        <div class="bg-surface-container-lowest border-2.5 border-tertiary rounded-xl p-4 shadow-comic-sm">
          <p class="font-label-md uppercase text-on-surface-variant mb-1">Resultado del publico</p>
          <p class="font-display-hero text-2xl text-primary uppercase">${resultado}</p>
          <p class="font-body-md text-on-surface-variant mt-1">${totalRespuestas} respuestas</p>
        </div>
      `;
    }

    let pronosticosHTML = '';
    if (pronostico1 || pronostico2) {
      pronosticosHTML = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm">
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Pronosticos</p>
          <div class="flex gap-4">
            <span class="font-body-md text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-lg text-primary">${pronostico1 || '-'}</span></span>
            <span class="font-body-md text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-lg text-primary">${pronostico2 || '-'}</span></span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-4 overflow-y-auto">
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${total}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda}</span>
            <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          </div>
          ${preguntaHTML}
        </div>
        ${conteoHTML}
        ${resultadoHTML}
        ${pronosticosHTML}
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

    let botonesHTML = '';

    switch (fase) {
      case 'SELECCIONANDO_PREGUNTA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar encuesta', variante: 'primary', id: 'btn-qpep-iniciar' })}
          </div>
        `;
        break;

      case 'ENCUESTA_ACTIVA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Cerrar encuesta', variante: 'danger', id: 'btn-qpep-cerrar' })}
          </div>
        `;
        break;

      case 'ENCUESTA_CERRADA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Registrar pronosticos', variante: 'primary', id: 'btn-qpep-pronosticos' })}
          </div>
        `;
        break;

      case 'PRONOSTICOS_REGISTRADOS':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Revelar resultado', variante: 'primary', id: 'btn-qpep-revelar' })}
          </div>
        `;
        break;

      case 'REVELANDO':
      case 'PUNTUANDO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente pregunta', variante: 'secondary', id: 'btn-qpep-siguiente' })}
          </div>
        `;
        break;

      case 'FIN_DE_JUEGO':
      default:
        botonesHTML = '';
        break;
    }

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Que Piensa el Publico — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${botonesHTML}
      </div>
    `;
  }
};
