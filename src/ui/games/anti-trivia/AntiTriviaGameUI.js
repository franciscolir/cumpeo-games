/* =============================================================
   AntiTriviaGameUI — GameUI concreto para el juego Anti-Trivia.

   Renderiza:
   - Área de juego: pregunta + lista de respuestas correctas
     a evitar + timer + marcador
   - Panel conductor: botones según fase con listeners

   Mecánica: anti-juego de preguntas. El jugador debe dar una
   respuesta INCORRECTA (que no esté en la lista mostrada).
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';
import { AntiTriviaGameDefinition } from '../../../games/anti-trivia/AntiTriviaGameDefinition.js';

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SET: 'Seleccionando set',
  MOSTRANDO_PREGUNTA: 'Mostrando pregunta',
  RESPONDIENDO: 'Respondiendo',
  ESPERA_VALIDACION: 'Espera de validación',
  MOSTRANDO_RESULTADO: 'Mostrando resultado',
  CAMBIO_TURNO: 'Cambio de turno',
  FIN_DE_RONDA: 'Fin de ronda',
  FIN_DE_JUEGO: 'Fin de juego'
};

let _timer = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;

/* =============================================================
   Helpers
   ============================================================= */

function _obtenerTiempoSeg(estadoJuego, contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_respuesta_seg || 30;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-antitrivia');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const preguntaIdx = estadoJuego.pregunta_actual_index || 0;
  const equipo = estadoJuego.equipo_actual || 1;
  const key = `${juegoId}:eq${equipo}:p${preguntaIdx}`;
  const segundos = _obtenerTiempoSeg(estadoJuego, contexto);

  if (!_timer) {
    _timer = crearTimer({
      duracionSeg: segundos,
      onTick: (restante) => {
        const el = container.querySelector('#antitrivia-timer');
        if (el) el.textContent = `${restante}s`;
      },
      onCierre: () => {
        _onTimerCierre();
      }
    });
  }

  _timer.iniciarSiCambio(key);
}

function _nombreEquipo(equipo, contexto) {
  const eq = contexto?.equipos?.[equipo - 1];
  return eq?.nombre || `Eq${equipo}`;
}

function _preguntasDeEquipo(estadoJuego) {
  const equipo = estadoJuego.equipo_actual || 1;
  return equipo === 1
    ? (estadoJuego.preguntas_equipo_1 || [])
    : (estadoJuego.preguntas_equipo_2 || []);
}

function _ultimaRespuesta(estadoJuego) {
  const idx = estadoJuego.pregunta_actual_index || 0;
  const equipo = estadoJuego.equipo_actual || 1;
  const respuestas = estadoJuego.respuestas || [];
  for (let i = respuestas.length - 1; i >= 0; i--) {
    const r = respuestas[i];
    if (r.pregunta_index === idx && r.equipo === equipo) return r;
  }
  return null;
}

function _renderMarcador(equipo1, equipo2, pts1, pts2) {
  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm flex items-center justify-center gap-8">
      <span class="font-headline-md uppercase text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-xl text-primary">${pts1}</span></span>
      <span class="font-headline-md text-on-surface-variant">-</span>
      <span class="font-headline-md uppercase text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-xl text-primary">${pts2}</span></span>
    </div>
  `;
}

function _renderCardPregunta(estadoJuego, contexto, opciones = {}) {
  const {
    mostrarTimer = false,
    restanteMostrar = 0,
    mostrarTiempoAgotado = false,
    mostrarEsperandoValidacion = false,
    mostrarResultado = false
  } = opciones;

  const preguntas = _preguntasDeEquipo(estadoJuego);
  const idx = estadoJuego.pregunta_actual_index || 0;
  const pregunta = preguntas[idx];
  const respuestasCorrectas = pregunta?.respuestas_correctas || [];
  const equipo = estadoJuego.equipo_actual || 1;

  let indicadorHTML = '';
  if (mostrarTiempoAgotado) {
    indicadorHTML = `
      <div class="bg-error/20 border-2 border-error rounded-xl p-3 text-center mt-4" data-antitrivia-tiempo-agotado>
        <p class="font-headline-sm uppercase text-error">Tiempo agotado</p>
      </div>
    `;
  } else if (mostrarEsperandoValidacion) {
    indicadorHTML = `
      <div class="bg-comicYellow border-2 border-on-surface rounded-xl p-3 text-center mt-4">
        <p class="font-headline-sm uppercase text-on-surface">El conductor está validando…</p>
      </div>
    `;
  } else if (mostrarResultado) {
    const ultima = _ultimaRespuesta(estadoJuego);
    if (ultima?.resultado === 'acierto') {
      indicadorHTML = `
        <div class="bg-tertiary/30 border-2 border-tertiary rounded-xl p-3 text-center mt-4" data-antitrivia-resultado="acierto">
          <p class="font-headline-sm uppercase text-on-surface">¡Acierto!</p>
        </div>
      `;
    } else if (ultima?.resultado === 'error') {
      indicadorHTML = `
        <div class="bg-error/30 border-2 border-error rounded-xl p-3 text-center mt-4" data-antitrivia-resultado="error">
          <p class="font-headline-sm uppercase text-on-surface">Error</p>
        </div>
      `;
    } else {
      indicadorHTML = `
        <div class="bg-surface-container-high border-2 border-on-surface-variant rounded-xl p-3 text-center mt-4" data-antitrivia-resultado="sin_respuesta">
          <p class="font-headline-sm uppercase text-on-surface-variant">Sin respuesta</p>
        </div>
      `;
    }
  }

  const timerHTML = mostrarTimer
    ? `
      <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm text-center mt-4">
        <p class="font-label-md uppercase">Tiempo restante</p>
        <p id="antitrivia-timer" class="font-display-hero text-3xl text-primary">${restanteMostrar}s</p>
      </div>
    `
    : '';

  const listaHTML = respuestasCorrectas.length > 0
    ? `
      <p class="font-label-md uppercase text-on-surface-variant mt-4 mb-2">Respuestas correctas a evitar</p>
      <ul class="flex flex-col gap-1">
        ${respuestasCorrectas.map((r) => `
          <li class="font-body-md text-on-surface bg-surface-container-high border border-on-surface-variant/40 rounded-md px-3 py-1.5">${r}</li>
        `).join('')}
      </ul>
    `
    : '';

  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${preguntas.length}</span>
        <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${_nombreEquipo(equipo, contexto)}</span>
      </div>
      <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-2">
        ${pregunta?.pregunta || 'Sin pregunta'}
      </p>
      ${listaHTML}
      ${indicadorHTML}
      ${timerHTML}
    </div>
  `;
}

/* =============================================================
   GameUI
   ============================================================= */

export const AntiTriviaGameUI = {
  codigo: 'ANTI_TRIVIA',

  /**
   * Renderiza el área de juego.
   */
  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';

    if (!fase || fase === 'INICIO_RONDA') {
      _timer?.cancelar();
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Anti-Trivia</p>
            <p class="font-body-md text-on-surface-variant">Iniciá la partida para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    if (callbacks) {
      _latestCallbacks = callbacks;
    }
    _latestEstadoJuego = estadoJuego;
    _latestContexto = contexto;

    const ronda = estadoJuego.ronda_actual || 1;
    const totalRondas = estadoJuego.total_rondas || 1;
    const equipo = estadoJuego.equipo_actual || 1;
    const nombreFase = NOMBRE_FASES[fase] || fase.replace(/_/g, ' ');
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const tiempoAgotado = estadoJuego.tiempo_agotado === true;

    let contenido = '';
    let timerIniciado = false;

    if (fase === 'SELECCIONANDO_SET') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Esperando selección de set…</p>
        </div>
      `;
    } else if (fase === 'MOSTRANDO_PREGUNTA') {
      contenido = _renderCardPregunta(estadoJuego, contexto);
    } else if (fase === 'RESPONDIENDO') {
      const restante = _timer?.estaActivo() ? _timer.restanteActual() : estadoJuego.tiempo_restante_seg || _obtenerTiempoSeg(estadoJuego, contexto);
      contenido = _renderCardPregunta(estadoJuego, contexto, {
        mostrarTimer: !tiempoAgotado,
        restanteMostrar: restante,
        mostrarTiempoAgotado: tiempoAgotado
      });
      if (!tiempoAgotado && callbacks && estadoJuego.timer_activo !== false) {
        _iniciarTimer(estadoJuego, contexto, callbacks, container);
        timerIniciado = true;
      }
    } else if (fase === 'ESPERA_VALIDACION') {
      contenido = _renderCardPregunta(estadoJuego, contexto, {
        mostrarEsperandoValidacion: true
      });
    } else if (fase === 'MOSTRANDO_RESULTADO') {
      contenido = _renderCardPregunta(estadoJuego, contexto, {
        mostrarResultado: true
      });
    } else if (fase === 'CAMBIO_TURNO') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Turno de ${_nombreEquipo(equipo, contexto)}</p>
          <p class="font-body-md text-on-surface-variant">Elegí un set para comenzar.</p>
        </div>
      `;
    } else if (fase === 'FIN_DE_RONDA') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Fin de ronda</p>
          <p class="font-body-md text-on-surface-variant">Ronda ${ronda} completada.</p>
        </div>
      `;
    } else if (fase === 'FIN_DE_JUEGO') {
      const { ganador } = AntiTriviaGameDefinition.calcularResultado(estadoJuego);
      const res = ganador === 1
        ? `${equipo1.nombre} gana`
        : ganador === 2
          ? `${equipo2.nombre} gana`
          : 'Empate técnico';
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">${res}</p>
          <p class="font-body-md text-on-surface-variant">Juego finalizado.</p>
        </div>
      `;
    }

    if (!timerIniciado && fase !== 'RESPONDIENDO') {
      _timer?.cancelar();
    }

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-4 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${nombreFase}</span>
        </div>
        ${contenido}
        ${_renderMarcador(equipo1, equipo2, pts1, pts2)}
      </div>
    `;
  },

  /**
   * Renderiza el panel del conductor.
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo = estadoJuego?.equipo_actual || 1;
    const nombreEquipo = _nombreEquipo(equipo, contexto);
    const tiempoAgotado = estadoJuego?.tiempo_agotado === true;

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Comenzar ronda', variante: 'primary', id: 'btn-antitrivia-iniciar-ronda' })}
          </div>
        `;
        break;

      case 'SELECCIONANDO_SET': {
        const sets = contexto?.setsDisponibles || [];
        if (sets.length === 0) {
          botonesHTML = `<p class="font-body-sm text-error">No hay sets disponibles.</p>`;
        } else {
          botonesHTML = `
            <p class="font-label-md uppercase text-on-surface-variant mb-2">Elegí un set para ${nombreEquipo}</p>
            <div class="flex flex-col gap-2">
              ${sets.map((s) => `
                <button type="button" data-set-id="${s.id}" id="btn-antitrivia-elegir-set-${s.id}"
                  class="text-left border-2 border-on-surface rounded-lg p-3 bg-surface-container-lowest hover:bg-surface-container-low transition">
                  <p class="font-headline-sm">${s.nombre || s.id}</p>
                </button>
              `).join('')}
            </div>
          `;
        }
        break;
      }

      case 'MOSTRANDO_PREGUNTA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar respuesta', variante: 'primary', id: 'btn-antitrivia-iniciar-respuesta' })}
          </div>
        `;
        break;

      case 'RESPONDIENDO':
        if (tiempoAgotado) {
          botonesHTML = `
            <div class="flex flex-col gap-2">
              <p class="font-label-md uppercase text-error">Tiempo agotado</p>
              <div class="flex flex-wrap gap-2">
                ${Boton({ texto: 'El jugador respondió', variante: 'primary', id: 'btn-antitrivia-jugador-respondio' })}
                ${Boton({ texto: 'No respondió', variante: 'secondary', id: 'btn-antitrivia-no-respondio' })}
              </div>
            </div>
          `;
        } else {
          botonesHTML = `
            <div class="flex flex-wrap gap-2">
              ${Boton({ texto: 'Acierto', variante: 'primary', id: 'btn-antitrivia-acierto' })}
              ${Boton({ texto: 'Error', variante: 'danger', id: 'btn-antitrivia-error' })}
            </div>
          `;
        }
        break;

      case 'ESPERA_VALIDACION':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Acierto', variante: 'primary', id: 'btn-antitrivia-acierto' })}
            ${Boton({ texto: 'Error', variante: 'danger', id: 'btn-antitrivia-error' })}
          </div>
        `;
        break;

      case 'MOSTRANDO_RESULTADO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente pregunta', variante: 'primary', id: 'btn-antitrivia-siguiente-pregunta' })}
          </div>
        `;
        break;

      case 'CAMBIO_TURNO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar turno de ${nombreEquipo}`, variante: 'primary', id: 'btn-antitrivia-iniciar-turno' })}
          </div>
        `;
        break;

      case 'FIN_DE_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-antitrivia-siguiente-ronda' })}
          </div>
        `;
        break;

      case 'FIN_DE_JUEGO':
      default:
        botonesHTML = '';
        break;
    }

    const iniciarJuegoHTML = !fase
      ? `<div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-antitrivia-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Anti-Trivia — ${fase ? NOMBRE_FASES[fase] || fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-antitrivia-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-antitrivia');
      });
    }

    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-antitrivia-iniciar-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-ronda-antitrivia');
      });
    }

    if (fase === 'SELECCIONANDO_SET') {
      container.querySelectorAll('[data-set-id]').forEach((el) => {
        el.addEventListener('click', () => {
          const setId = el.getAttribute('data-set-id');
          const sets = contexto?.setsDisponibles || [];
          const set = sets.find((s) => s.id === setId);
          if (set) {
            callbacks.onAccion('seleccionar-set-antitrivia', { set });
          }
        });
      });
    }

    if (fase === 'MOSTRANDO_PREGUNTA') {
      container.querySelector('#btn-antitrivia-iniciar-respuesta')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-respuesta-antitrivia');
      });
    }

    if (fase === 'RESPONDIENDO' && !tiempoAgotado) {
      container.querySelector('#btn-antitrivia-acierto')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-acierto-antitrivia');
      });
      container.querySelector('#btn-antitrivia-error')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('marcar-error-antitrivia');
      });
    }

    if (fase === 'RESPONDIENDO' && tiempoAgotado) {
      container.querySelector('#btn-antitrivia-jugador-respondio')?.addEventListener('click', () => {
        callbacks.onAccion('jugador-respondio-antitrivia');
      });
      container.querySelector('#btn-antitrivia-no-respondio')?.addEventListener('click', () => {
        callbacks.onAccion('no-respondio-antitrivia');
      });
    }

    if (fase === 'ESPERA_VALIDACION') {
      container.querySelector('#btn-antitrivia-acierto')?.addEventListener('click', () => {
        callbacks.onAccion('marcar-acierto-antitrivia');
      });
      container.querySelector('#btn-antitrivia-error')?.addEventListener('click', () => {
        callbacks.onAccion('marcar-error-antitrivia');
      });
    }

    if (fase === 'MOSTRANDO_RESULTADO') {
      container.querySelector('#btn-antitrivia-siguiente-pregunta')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-pregunta-antitrivia');
      });
    }

    if (fase === 'CAMBIO_TURNO') {
      container.querySelector('#btn-antitrivia-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-antitrivia');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-antitrivia-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-siguiente-ronda-antitrivia');
      });
    }
  },

  cleanup() {
    _timer?.cancelar();
  }
};
