/* =============================================================
   TriviaGameUI — GameUI concreto para el juego Trivia.

   Renderiza:
   - Área de juego: pregunta + opciones + timer
   - Panel conductor: botones según fase con listeners
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

let _timer = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;

function _getItems(contexto) {
  return contexto.itemsDelJuego || contexto.juegoEjecutado?.snapshot?.items || [];
}

function _obtenerTiempoSeg(estadoJuego, contexto) {
  const items = _getItems(contexto);
  const idx = estadoJuego.pregunta_actual_index || 0;
  const item = items[idx];
  if (item?.tiempo_seg) return item.tiempo_seg;
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_por_pregunta_seg || 30;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-trivia');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const preguntaIdx = estadoJuego.pregunta_actual_index || 0;
  const key = `${juegoId}:${preguntaIdx}`;
  const segundos = _obtenerTiempoSeg(estadoJuego, contexto);

  if (!_timer) {
    _timer = crearTimer({
      duracionSeg: segundos,
      onTick: (restante) => {
        const el = container.querySelector('#trivia-timer');
        if (el) el.textContent = `${restante}s`;
      },
      onCierre: () => {
        _onTimerCierre();
      }
    });
  }

  _timer.iniciarSiCambio(key);
}

export const TriviaGameUI = {
  codigo: 'TRIVIA',

  /**
   * Renderiza el área de juego (pregunta + opciones + timer).
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto - { partida, juegoEjecutado, equipos, puedeControlar, itemsDelJuego }
   * @param {object} [callbacks] - { onAccion(tipo, payload) }
   */
  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    const items = _getItems(contexto);

    if (!estadoJuego || (!estadoJuego.pregunta_actual_index && estadoJuego.pregunta_actual_index !== 0) || items.length === 0) {
      _timer?.cancelar();
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

    if (callbacks) {
      _latestCallbacks = callbacks;
    }
    _latestEstadoJuego = estadoJuego;

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
      const mostrarCorrecta = fase === 'MOSTRANDO_RESULTADO' && esCorrecta;
      const claseFondo = mostrarCorrecta ? 'bg-tertiary/20 border-tertiary' : 'bg-surface-container-lowest border-on-surface';
      return `
        <div class="border-2.5 ${claseFondo} rounded-xl p-4 text-center shadow-comic-sm">
          <span class="font-display-hero text-lg text-primary">${LETRAS[i] || i + 1}</span>
          <p class="font-body-md text-on-surface mt-1">${texto}</p>
        </div>
      `;
    }).join('');

    let timerHTML = '';
    if (fase === 'SELECCIONANDO_RESPUESTA') {
      const segundos = _obtenerTiempoSeg(estadoJuego, contexto);
      const restanteMostrar = _timer?.estaActivo() ? _timer.restanteActual() : segundos;
      timerHTML = `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm text-center">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="trivia-timer" class="font-display-hero text-4xl text-primary">${restanteMostrar}s</p>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-4 overflow-y-auto">
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${total}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
            <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          </div>
          <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-6">
            ${pregunta?.pregunta || 'Sin pregunta'}
          </p>
          <div class="grid ${gridCols} gap-3">
            ${opcionesHTML}
          </div>
        </div>
        ${timerHTML}
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm flex items-center justify-center gap-8">
          <span class="font-headline-md uppercase text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-xl text-primary">${pts1}</span></span>
          <span class="font-headline-md text-on-surface-variant">-</span>
          <span class="font-headline-md uppercase text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-xl text-primary">${pts2}</span></span>
        </div>
      </div>
    `;

    if (fase === 'SELECCIONANDO_RESPUESTA' && callbacks) {
      _iniciarTimer(estadoJuego, contexto, callbacks, container);
    } else if (fase !== 'SELECCIONANDO_RESPUESTA') {
      _timer?.cancelar();
    }
  },

  /**
   * Renderiza el panel del conductor con botones de control según fase.
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto
   * @param {object} callbacks - { onAccion(tipo, payload) }
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const items = _getItems(contexto);
    const config = contexto.juegoEjecutado?.configuracion_congelada || {};
    const totalRondas = config.rondas || 1;

    let botonesHTML = '';

    switch (fase) {
      case 'MOSTRANDO_PREGUNTA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar pregunta', variante: 'primary', id: 'btn-trivia-iniciar-pregunta' })}
          </div>
        `;
        break;

      case 'SELECCIONANDO_RESPUESTA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Correcto — ${equipo1.nombre}`, variante: 'primary', id: 'btn-trivia-correcto-1' })}
            ${Boton({ texto: `Correcto — ${equipo2.nombre}`, variante: 'primary', id: 'btn-trivia-correcto-2' })}
          </div>
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Incorrecto — ${equipo1.nombre}`, variante: 'danger', id: 'btn-trivia-incorrecto-1' })}
            ${Boton({ texto: `Incorrecto — ${equipo2.nombre}`, variante: 'danger', id: 'btn-trivia-incorrecto-2' })}
          </div>
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Saltar pregunta', variante: 'ghost', id: 'btn-trivia-saltar' })}
          </div>
        `;
        break;

      case 'MOSTRANDO_RESULTADO': {
        const siguienteIdx = (estadoJuego.pregunta_actual_index || 0) + 1;
        const preguntasPorRonda = config.preguntas_por_ronda || items.length;
        const esUltimaPregunta = siguienteIdx >= preguntasPorRonda;
        const texto = esUltimaPregunta ? 'Siguiente ronda' : 'Siguiente pregunta';
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto, variante: 'primary', id: 'btn-trivia-siguiente' })}
          </div>
        `;
        break;
      }

      case 'FIN_DE_RONDA': {
        const siguienteRonda = (estadoJuego.ronda_actual || 1) + 1;
        const esUltimaRonda = siguienteRonda > totalRondas;
        const texto = esUltimaRonda ? 'Finalizar juego' : 'Iniciar siguiente ronda';
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto, variante: 'primary', id: 'btn-trivia-siguiente-ronda' })}
          </div>
        `;
        break;
      }

      case 'FIN_DE_JUEGO':
      default:
        botonesHTML = '';
        break;
    }

    const iniciarJuegoHTML = !fase
      ? `<div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-trivia-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Trivia — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-trivia-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-trivia');
      });
    }

    if (fase === 'MOSTRANDO_PREGUNTA') {
      container.querySelector('#btn-trivia-iniciar-pregunta')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-pregunta-trivia');
      });
    }

    if (fase === 'SELECCIONANDO_RESPUESTA') {
      container.querySelector('#btn-trivia-correcto-1')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-correcto-trivia', { equipo: 1 });
      });
      container.querySelector('#btn-trivia-correcto-2')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-correcto-trivia', { equipo: 2 });
      });
      container.querySelector('#btn-trivia-incorrecto-1')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-incorrecto-trivia', { equipo: 1 });
      });
      container.querySelector('#btn-trivia-incorrecto-2')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-incorrecto-trivia', { equipo: 2 });
      });
      container.querySelector('#btn-trivia-saltar')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('saltar-pregunta-trivia');
      });
    }

    if (fase === 'MOSTRANDO_RESULTADO') {
      container.querySelector('#btn-trivia-siguiente')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-pregunta-trivia');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-trivia-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-ronda-trivia');
      });
    }
  },

  cleanup() {
    _timer?.cancelar();
  }
};
