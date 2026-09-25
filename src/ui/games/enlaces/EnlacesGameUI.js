/* =============================================================
   EnlacesGameUI — GameUI concreto para el juego Enlaces.

   Renderiza:
   - Área de juego: columna A (fija) + columna B (draggable)
     + timer + marcador
   - Panel conductor: botones según fase con listeners

   Mecánica: asociación 1:1. El conductor arrastra elementos de
   la columna B para alinearlos con la columna A.
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';
import { EnlacesGameDefinition } from '../../../games/enlaces/EnlacesGameDefinition.js';

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SET: 'Seleccionando set',
  PREPARANDO_TABLERO: 'Preparando tablero',
  ORDENANDO: 'Ordenando',
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
let _dragDesdeIdx = null;

/* =============================================================
   Helpers
   ============================================================= */

function _obtenerTiempoSeg(estadoJuego, contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_turno_seg || 60;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-enlaces');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const equipo = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const key = `${juegoId}:eq${equipo}:r${ronda}`;
  const segundos = _obtenerTiempoSeg(estadoJuego, contexto);

  if (!_timer) {
    _timer = crearTimer({
      duracionSeg: segundos,
      onTick: (restante) => {
        const el = container.querySelector('#enlaces-timer');
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

function _renderMarcador(equipo1, equipo2, pts1, pts2) {
  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm flex items-center justify-center gap-8">
      <span class="font-headline-md uppercase text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-xl text-primary">${pts1}</span></span>
      <span class="font-headline-md text-on-surface-variant">-</span>
      <span class="font-headline-md uppercase text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-xl text-primary">${pts2}</span></span>
    </div>
  `;
}

function _esFaseTablero(fase) {
  return fase === 'ORDENANDO' || fase === 'ESPERA_VALIDACION' || fase === 'MOSTRANDO_RESULTADO';
}

function _renderTablero(estadoJuego, opciones = {}) {
  const {
    draggable = false,
    mostrarIndicadores = false,
    mensaje = ''
  } = opciones;

  const columnaA = estadoJuego.columna_a || [];
  const columnaB = estadoJuego.columna_b || [];
  const pares = estadoJuego.pares_correctos || {};

  const itemsA = columnaA.map((a, i) => {
    let indicador = '';
    if (mostrarIndicadores) {
      const esAcierto = pares[a] === columnaB[i];
      indicador = esAcierto
        ? `<span class="ml-2 text-tertiary font-bold" data-enlaces-fila="${i}" data-enlaces-indicador="acierto">✓</span>`
        : `<span class="ml-2 text-error font-bold" data-enlaces-fila="${i}" data-enlaces-indicador="error">✗</span>`;
    }
    return `
      <li class="font-body-md text-on-surface bg-surface-container-high border border-on-surface-variant/40 rounded-md px-3 py-1.5 flex items-center justify-between" data-enlaces-fila-a="${i}">
        <span>${a}</span>${indicador}
      </li>
    `;
  }).join('');

  const itemsB = columnaB.map((b, i) => `
    <li class="font-body-md text-on-surface bg-comicYellow/40 border-2 border-on-surface rounded-md px-3 py-1.5 cursor-grab enlaces-columna-b-item"
        draggable="${draggable ? 'true' : 'false'}"
        data-idx="${i}"
        data-enlaces-fila-b="${i}">
      ${b}
    </li>
  `).join('');

  const mensajeHTML = mensaje
    ? `
      <div class="bg-comicYellow border-2 border-on-surface rounded-xl p-3 text-center mt-4" data-enlaces-mensaje>
        <p class="font-headline-sm uppercase text-on-surface">${mensaje}</p>
      </div>
    `
    : '';

  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${_nombreEquipo(estadoJuego.equipo_actual || 1, _latestContexto || {})}</span>
        <span class="font-label-md uppercase text-on-surface-variant">Pares: ${columnaA.length}</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Columna A (fija)</p>
          <ul class="flex flex-col gap-1" data-enlaces-columna-a>${itemsA}</ul>
        </div>
        <div>
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Columna B (ordenar)</p>
          <ul class="flex flex-col gap-1" data-enlaces-columna-b>${itemsB}</ul>
        </div>
      </div>
      ${mensajeHTML}
    </div>
  `;
}

function _bindDragAndDrop(container, callbacks) {
  container.querySelectorAll('.enlaces-columna-b-item').forEach((el) => {
    if (el.getAttribute && el.getAttribute('draggable') === 'false') return;
    if (el.getAttribute && el.getAttribute('draggable') === false) return;

    el.addEventListener('dragstart', (e) => {
      _dragDesdeIdx = parseInt(el.dataset.idx, 10);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const hastaIdx = parseInt(el.dataset.idx, 10);
      if (_dragDesdeIdx !== null && !Number.isNaN(_dragDesdeIdx) && _dragDesdeIdx !== hastaIdx) {
        callbacks.onAccion('mover-elemento-enlaces', {
          desdeIdx: _dragDesdeIdx,
          hastaIdx
        });
      }
      _dragDesdeIdx = null;
    });
    el.addEventListener('dragend', () => {
      _dragDesdeIdx = null;
    });
  });
}

/* =============================================================
   GameUI
   ============================================================= */

export const EnlacesGameUI = {
  codigo: 'ENLACES',

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
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Enlaces</p>
            <p class="font-body-md text-on-surface-variant">Iniciar juego</p>
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
    let bindDrag = false;

    if (fase === 'SELECCIONANDO_SET') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Esperando selección de set…</p>
        </div>
      `;
    } else if (fase === 'PREPARANDO_TABLERO') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Preparando tablero…</p>
        </div>
      `;
    } else if (fase === 'ORDENANDO') {
      const restante = _timer?.estaActivo() ? _timer.restanteActual() : estadoJuego.tiempo_restante_seg || _obtenerTiempoSeg(estadoJuego, contexto);
      contenido = `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm text-center mb-4">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="enlaces-timer" class="font-display-hero text-3xl text-primary">${restante}s</p>
        </div>
        ${_renderTablero(estadoJuego, { draggable: true })}
      `;
      bindDrag = true;
      if (callbacks && estadoJuego.timer_activo !== false && !tiempoAgotado) {
        _iniciarTimer(estadoJuego, contexto, callbacks, container);
        timerIniciado = true;
      }
    } else if (fase === 'ESPERA_VALIDACION') {
      contenido = _renderTablero(estadoJuego, {
        draggable: false,
        mensaje: 'Tiempo agotado. Esperando validación.'
      });
    } else if (fase === 'MOSTRANDO_RESULTADO') {
      const resultado = estadoJuego.resultado_turno;
      const resHTML = resultado
        ? `<p class="font-headline-sm uppercase text-on-surface-variant mt-3" data-enlaces-resultado>Aciertos: ${resultado.aciertos} / ${resultado.total}</p>`
        : '';
      contenido = `
        ${_renderTablero(estadoJuego, { draggable: false, mostrarIndicadores: true })}
        ${resHTML}
      `;
    } else if (fase === 'CAMBIO_TURNO') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Turno de ${_nombreEquipo(equipo, contexto)}</p>
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
      const { ganador } = EnlacesGameDefinition.calcularResultado(estadoJuego);
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

    if (!timerIniciado && fase !== 'ORDENANDO') {
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

    if (bindDrag && callbacks) {
      _bindDragAndDrop(container, callbacks);
    }
  },

  /**
   * Renderiza el panel del conductor.
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo = estadoJuego?.equipo_actual || 1;
    const nombreEquipo = _nombreEquipo(equipo, contexto);

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Comenzar ronda', variante: 'primary', id: 'btn-enlaces-iniciar-ronda' })}
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
                <button type="button" data-set-id="${s.id}" id="btn-enlaces-elegir-set-${s.id}"
                  class="text-left border-2 border-on-surface rounded-lg p-3 bg-surface-container-lowest hover:bg-surface-container-low transition">
                  <p class="font-headline-sm">${s.nombre || s.id}</p>
                </button>
              `).join('')}
            </div>
          `;
        }
        break;
      }

      case 'PREPARANDO_TABLERO':
        botonesHTML = '';
        break;

      case 'ORDENANDO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Validar', variante: 'primary', id: 'btn-enlaces-validar' })}
            ${Boton({ texto: 'Deshacer', variante: 'secondary', id: 'btn-enlaces-deshacer' })}
          </div>
        `;
        break;

      case 'ESPERA_VALIDACION':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Validar', variante: 'primary', id: 'btn-enlaces-validar' })}
          </div>
        `;
        break;

      case 'MOSTRANDO_RESULTADO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente turno', variante: 'primary', id: 'btn-enlaces-siguiente-turno' })}
          </div>
        `;
        break;

      case 'CAMBIO_TURNO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar turno de ${nombreEquipo}`, variante: 'primary', id: 'btn-enlaces-iniciar-turno' })}
          </div>
        `;
        break;

      case 'FIN_DE_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-enlaces-siguiente-ronda' })}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-enlaces-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Enlaces — ${fase ? NOMBRE_FASES[fase] || fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-enlaces-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-enlaces');
      });
    }

    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-enlaces-iniciar-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-ronda-enlaces');
      });
    }

    if (fase === 'SELECCIONANDO_SET') {
      container.querySelectorAll('[data-set-id]').forEach((el) => {
        el.addEventListener('click', () => {
          const setId = el.getAttribute('data-set-id');
          const sets = contexto?.setsDisponibles || [];
          const set = sets.find((s) => s.id === setId);
          if (set) {
            callbacks.onAccion('seleccionar-set-enlaces', { set });
          }
        });
      });
    }

    if (fase === 'ORDENANDO') {
      container.querySelector('#btn-enlaces-validar')?.addEventListener('click', () => {
        _timer?.cancelar();
        callbacks.onAccion('validar-enlaces');
      });
      container.querySelector('#btn-enlaces-deshacer')?.addEventListener('click', () => {
        callbacks.onAccion('deshacer-enlaces');
      });
    }

    if (fase === 'ESPERA_VALIDACION') {
      container.querySelector('#btn-enlaces-validar')?.addEventListener('click', () => {
        callbacks.onAccion('validar-enlaces');
      });
    }

    if (fase === 'MOSTRANDO_RESULTADO') {
      container.querySelector('#btn-enlaces-siguiente-turno')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-turno-enlaces');
      });
    }

    if (fase === 'CAMBIO_TURNO') {
      container.querySelector('#btn-enlaces-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-enlaces');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-enlaces-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-siguiente-ronda-enlaces');
      });
    }
  },

  /**
   * Declara las acciones del panel conductor para la fase actual
   * (contrato 8.5b.1). El shell renderiza desde estos descriptores;
   * si devuelve `[]` delega en `renderizarPanelConductor` legacy (D1/D8).
   *
   * El drag & drop vive en el área de juego (`_bindDragAndDrop`),
   * no en el panel — no se toca.
   *
   * @param {object} estadoJuego estado crudo del juego
   * @param {object} contexto
   * @returns {Array<object>} descriptores de acción
   */
  accionesConductor(estadoJuego, contexto) {
    const fase = estadoJuego?.fase || '';
    const equipo = estadoJuego?.equipo_actual || 1;
    const nombreEquipo = _nombreEquipo(equipo, contexto);

    switch (fase) {
      case '':
        return [
          { tipo: 'primario', texto: 'Iniciar juego', accion: 'iniciar-juego-enlaces' }
        ];

      case 'INICIO_RONDA':
        return [
          { tipo: 'primario', texto: 'Comenzar ronda', accion: 'iniciar-ronda-enlaces' }
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
            accion: 'seleccionar-set-enlaces',
            payload: { set: s }
          }))
        ];
      }

      case 'ORDENANDO':
        return [
          { tipo: 'primario', texto: 'Validar', accion: 'validar-enlaces' },
          { tipo: 'secundario', texto: 'Deshacer', accion: 'deshacer-enlaces' }
        ];

      case 'ESPERA_VALIDACION':
        return [
          { tipo: 'primario', texto: 'Validar', accion: 'validar-enlaces' }
        ];

      case 'MOSTRANDO_RESULTADO':
        return [
          { tipo: 'primario', texto: 'Siguiente turno', accion: 'siguiente-turno-enlaces' }
        ];

      case 'CAMBIO_TURNO':
        return [
          { tipo: 'primario', texto: `Iniciar turno de ${nombreEquipo}`, accion: 'iniciar-turno-enlaces' }
        ];

      case 'FIN_DE_RONDA':
        return [
          { tipo: 'primario', texto: 'Siguiente ronda', accion: 'iniciar-siguiente-ronda-enlaces' }
        ];

      default:
        return [];
    }
  },

  cleanup() {
    _timer?.cancelar();
    _dragDesdeIdx = null;
  }
};
