/* =============================================================
   TriviaGameUI — GameUI concreto para el juego Trivia.

   Renderiza:
   - Área de juego: pregunta + opciones + timer + marcador
   - Panel conductor: botones según fase con listeners

   Mecánica nueva: turnos alternados, set por equipo,
   validación automática por selección de opción.
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SET: 'Seleccionando set',
  MOSTRANDO_PREGUNTA: 'Mostrando pregunta',
  SELECCIONANDO_RESPUESTA: 'Seleccionando respuesta',
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
  return config?.tiempo_por_pregunta_seg || 30;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-trivia');
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

function _nombreEquipo(equipo, contexto) {
  const eq = contexto?.equipos?.[equipo - 1];
  return eq?.nombre || `Eq${equipo}`;
}

/* =============================================================
   GameUI
   ============================================================= */

export const TriviaGameUI = {
  codigo: 'TRIVIA',

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
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Trivia</p>
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
    const nombreEquipo = _nombreEquipo(equipo, contexto);
    const nombreFase = NOMBRE_FASES[fase] || fase.replace(/_/g, ' ');
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    let contenido = '';

    if (fase === 'SELECCIONANDO_SET') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Esperando selección de set…</p>
        </div>
      `;
    } else if (fase === 'MOSTRANDO_PREGUNTA' || fase === 'SELECCIONANDO_RESPUESTA' || fase === 'MOSTRANDO_RESULTADO') {
      const preguntas = equipo === 1 ? (estadoJuego.preguntas_equipo_1 || []) : (estadoJuego.preguntas_equipo_2 || []);
      const idx = estadoJuego.pregunta_actual_index || 0;
      const pregunta = preguntas[idx];
      const opciones = pregunta?.opciones || [];
      const seleccionada = estadoJuego.opcion_seleccionada;
      const esRespuesta = fase === 'SELECCIONANDO_RESPUESTA';
      const esResultado = fase === 'MOSTRANDO_RESULTADO';

      const gridCols = opciones.length <= 4 ? 'grid-cols-2' : 'grid-cols-1';

      const opcionesHTML = opciones.map((texto, i) => {
        let claseFondo = 'bg-surface-container-lowest border-on-surface';
        if (esResultado && pregunta && i === pregunta.respuesta_correcta_index) {
          claseFondo = 'bg-tertiary/20 border-tertiary';
        } else if (esResultado && i === seleccionada && seleccionada !== pregunta?.respuesta_correcta_index) {
          claseFondo = 'bg-error/20 border-error';
        } else if (esRespuesta && i === seleccionada) {
          claseFondo = 'bg-primary/20 border-primary ring-2 ring-primary';
        }

        const clickable = esRespuesta ? `data-opcion-index="${i}" role="button" tabindex="0"` : '';
        const cursor = esRespuesta ? 'cursor-pointer hover:bg-surface-container-high' : '';

        return `
          <div class="border-2.5 ${claseFondo} ${cursor} rounded-xl p-4 text-center shadow-comic-sm transition" ${clickable}>
            <span class="font-display-hero text-lg text-primary">${LETRAS[i] || i + 1}</span>
            <p class="font-body-md text-on-surface mt-1">${texto}</p>
          </div>
        `;
      }).join('');

      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${preguntas.length}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${nombreEquipo}</span>
          </div>
          <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-6">
            ${pregunta?.pregunta || 'Sin pregunta'}
          </p>
          <div class="grid ${gridCols} gap-3">
            ${opcionesHTML}
          </div>
        </div>
      `;
    } else if (fase === 'CAMBIO_TURNO') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Turno de ${nombreEquipo}</p>
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
      const res = estadoJuego.puntos_equipo_1 > estadoJuego.puntos_equipo_2
        ? `${equipo1.nombre} gana`
        : estadoJuego.puntos_equipo_2 > estadoJuego.puntos_equipo_1
          ? `${equipo2.nombre} gana`
          : 'Empate técnico';
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">${res}</p>
          <p class="font-body-md text-on-surface-variant">Juego finalizado.</p>
        </div>
      `;
    }

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
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${nombreFase}</span>
        </div>
        ${contenido}
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

    if (fase === 'SELECCIONANDO_RESPUESTA' && callbacks) {
      container.querySelectorAll('[data-opcion-index]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.getAttribute('data-opcion-index'), 10);
          callbacks.onAccion('seleccionar-opcion-trivia', { opcionIndex: idx });
        });
      });
    }
  },

  /**
   * Renderiza el panel del conductor.
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo = estadoJuego?.equipo_actual || 1;
    const nombreEquipo = _nombreEquipo(equipo, contexto);
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Comenzar ronda', variante: 'primary', id: 'btn-trivia-iniciar-ronda' })}
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
                <button type="button" data-set-id="${s.id}" id="btn-trivia-set-${s.id}"
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
            ${Boton({ texto: 'Iniciar respuesta', variante: 'primary', id: 'btn-trivia-iniciar-respuesta' })}
          </div>
        `;
        break;

      case 'SELECCIONANDO_RESPUESTA': {
        const seleccionada = estadoJuego?.opcion_seleccionada;
        const disabled = seleccionada === null || seleccionada === undefined ? 'disabled' : '';
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Validar', variante: 'primary', id: 'btn-trivia-validar', disabled })}
            ${Boton({ texto: 'Pasar', variante: 'ghost', id: 'btn-trivia-pasar' })}
          </div>
        `;
        break;
      }

      case 'MOSTRANDO_RESULTADO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente pregunta', variante: 'primary', id: 'btn-trivia-siguiente' })}
          </div>
        `;
        break;

      case 'CAMBIO_TURNO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar turno de ${nombreEquipo}`, variante: 'primary', id: 'btn-trivia-iniciar-turno' })}
          </div>
        `;
        break;

      case 'FIN_DE_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-trivia-siguiente-ronda' })}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-trivia-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Trivia — ${fase ? NOMBRE_FASES[fase] || fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-trivia-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-trivia');
      });
    }

    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-trivia-iniciar-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-ronda-trivia');
      });
    }

    if (fase === 'SELECCIONANDO_SET') {
      container.querySelectorAll('[data-set-id]').forEach((el) => {
        el.addEventListener('click', () => {
          const setId = el.getAttribute('data-set-id');
          const sets = contexto?.setsDisponibles || [];
          const set = sets.find((s) => s.id === setId);
          if (set) {
            callbacks.onAccion('seleccionar-set-trivia', { set });
          }
        });
      });
    }

    if (fase === 'MOSTRANDO_PREGUNTA') {
      container.querySelector('#btn-trivia-iniciar-respuesta')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-tiempo-trivia');
      });
    }

    if (fase === 'SELECCIONANDO_RESPUESTA') {
      container.querySelector('#btn-trivia-validar')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('validar-respuesta-trivia');
      });
      container.querySelector('#btn-trivia-pasar')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('pasar-pregunta-trivia');
      });
    }

    if (fase === 'MOSTRANDO_RESULTADO') {
      container.querySelector('#btn-trivia-siguiente')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-pregunta-trivia');
      });
    }

    if (fase === 'CAMBIO_TURNO') {
      container.querySelector('#btn-trivia-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-trivia');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-trivia-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-siguiente-ronda-trivia');
      });
    }
  },

  /**
   * Declara las acciones del panel conductor para la fase actual
   * (contrato nuevo — 8.5a). Si existe, el shell renderiza el panel
   * desde acá; si no o devuelve array vacío, el shell usa
   * renderizarPanelConductor (legacy, convivencia D8).
   *
   * Los `accion` son exactamente los strings que maneja el switch
   * de onAccion del shell (sin renombrar).
   *
   * @param {object} estadoJuego estado crudo del juego
   * @param {object} contexto - { partida, juegoEjecutado, equipos,
   *                              itemsDelJuego, setsDisponibles,
   *                              urlsImagenes, puedeControlar }
   * @returns {Array<object>} descriptores de acciones
   */
  accionesConductor(estadoJuego, contexto) {
    const fase = estadoJuego?.fase || '';
    const equipo = estadoJuego?.equipo_actual || 1;
    const nombreEquipo = _nombreEquipo(equipo, contexto);

    switch (fase) {
      case 'INICIO_RONDA':
        return [
          { tipo: 'primario', texto: 'Comenzar ronda', accion: 'iniciar-ronda-trivia' }
        ];

      case 'SELECCIONANDO_SET': {
        const sets = contexto?.setsDisponibles || [];
        if (sets.length === 0) {
          return [
            { tipo: 'mensaje', texto: 'No hay sets disponibles.', variante: 'error' }
          ];
        }
        return [
          { tipo: 'mensaje', texto: `Elegí un set para ${nombreEquipo}` },
          ...sets.map((s) => ({
            tipo: 'fantasma',
            texto: s.nombre || s.id,
            accion: 'seleccionar-set-trivia',
            payload: { set: s }
          }))
        ];
      }

      case 'MOSTRANDO_PREGUNTA':
        return [
          { tipo: 'primario', texto: 'Iniciar respuesta', accion: 'iniciar-tiempo-trivia' }
        ];

      case 'SELECCIONANDO_RESPUESTA': {
        const seleccionada = estadoJuego?.opcion_seleccionada;
        const disabled = seleccionada === null || seleccionada === undefined;
        return [
          { tipo: 'primario', texto: 'Validar', accion: 'validar-respuesta-trivia', disabled },
          { tipo: 'fantasma', texto: 'Pasar', accion: 'pasar-pregunta-trivia' }
        ];
      }

      case 'MOSTRANDO_RESULTADO':
        return [
          { tipo: 'primario', texto: 'Siguiente pregunta', accion: 'siguiente-pregunta-trivia' }
        ];

      case 'CAMBIO_TURNO':
        return [
          { tipo: 'primario', texto: `Iniciar turno de ${nombreEquipo}`, accion: 'iniciar-turno-trivia' }
        ];

      case 'FIN_DE_RONDA':
        return [
          { tipo: 'primario', texto: 'Siguiente ronda', accion: 'iniciar-siguiente-ronda-trivia' }
        ];

      default:
        return [];
    }
  },

  cleanup() {
    _timer?.cancelar();
  }
};
