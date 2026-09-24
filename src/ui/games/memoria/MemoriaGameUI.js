/* =============================================================
   MemoriaGameUI — GameUI concreto para el juego Memoricé.

   Renderiza:
   - Área de juego: grilla de elementos + timer + marcador
   - Panel conductor: botones según fase con listeners

   Mecánica: 2 equipos, parejas de elementos boca abajo,
   evaluación automática al 2º volteo.
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { Modal } from '../../components/modal.js';
import { crearTimer } from '../_shared/index.js';

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SET: 'Seleccionando set',
  PREPARANDO_GRILLA: 'Preparando grilla',
  JUGANDO: 'Jugando',
  CAMBIO_TURNO: 'Cambio de turno',
  FIN_DE_RONDA: 'Fin de ronda',
  FIN_DE_JUEGO: 'Fin de juego'
};

let _timer = null;
let _timerModal = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;

/* =============================================================
   Helpers
   ============================================================= */

function _obtenerTiempoSeg(estadoJuego, contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_turno_seg || 20;
}

function _obtenerTiempoModalSeg(estadoJuego, contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_modal_cambio_turno_seg || 2;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-memoria');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const equipo = estadoJuego.equipo_actual || 1;
  const key = `${juegoId}:eq${equipo}:jugar`;
  const segundos = _obtenerTiempoSeg(estadoJuego, contexto);

  if (!_timer) {
    _timer = crearTimer({
      duracionSeg: segundos,
      onTick: (restante) => {
        const el = container.querySelector('#memoria-timer');
        if (el) el.textContent = `${restante}s`;
      },
      onCierre: () => {
        _onTimerCierre();
      }
    });
  }

  _timer.iniciarSiCambio(key);
}

function _iniciarTimerModal(contexto, callbacks) {
  const segundos = _obtenerTiempoModalSeg({}, contexto);

  if (_timerModal) {
    _timerModal.cancelar();
  }

  _timerModal = crearTimer({
    duracionSeg: segundos,
    onTick: () => {},
    onCierre: () => {
      if (_latestCallbacks) {
        _latestCallbacks.onAccion('iniciar-turno-memoria');
      }
    }
  });

  _timerModal.iniciarSiCambio('modal-cambio-turno');
}

function _nombreEquipo(equipo, contexto) {
  const eq = contexto?.equipos?.[equipo - 1];
  return eq?.nombre || `Eq${equipo}`;
}

function _calcularColumnas(numElementos) {
  if (numElementos <= 4) return 2;
  if (numElementos <= 9) return 3;
  if (numElementos <= 16) return 4;
  return Math.ceil(Math.sqrt(numElementos));
}

function _renderGrilla(elementos, elementosVolteados, elementosDescubiertos, esCambioTurno, urlsImagenes) {
  if (!elementos || elementos.length === 0) return '';
  const columnas = _calcularColumnas(elementos.length);

  const cells = elementos.map((el, i) => {
    const esDescubierto = elementosDescubiertos.includes(i);
    const esVolteado = elementosVolteados.includes(i);
    const visible = esDescubierto || esVolteado || esCambioTurno;

    let claseFondo = 'bg-on-surface/80 border-on-surface';
    if (esDescubierto) {
      claseFondo = 'bg-tertiary/20 border-tertiary';
    } else if (esVolteado || esCambioTurno) {
      claseFondo = 'bg-surface-container-lowest border-on-surface';
    }

    const url = el.imagen_url ? (urlsImagenes?.[el.imagen_url] || el.imagen_url) : null;
    const esEmoji = typeof url === 'string' && url.startsWith('emoji:');
    const contenido = visible ? (url
      ? (esEmoji
        ? `<span class="font-display-hero text-4xl text-on-surface">${url.slice(6)}</span>`
        : `<img src="${url}" alt="${el.contenido || ''}" class="max-h-full max-w-full object-contain">`)
      : `<span class="font-display-hero text-lg text-on-surface">${el.contenido || '?'}</span>`)
      : `<span class="font-display-hero text-2xl text-on-surface/60">?</span>`;

    const clickable = !esDescubierto && !esVolteado && !esCambioTurno
      ? `data-elemento-index="${i}" role="button" tabindex="0"`
      : '';
    const cursor = clickable ? 'cursor-pointer hover:bg-surface-container-high' : '';

    return `
      <button type="button"
        class="border-2.5 ${claseFondo} ${cursor} rounded-xl aspect-square flex items-center justify-center shadow-comic-sm transition min-h-[60px]"
        ${clickable}>
        ${contenido}
      </button>
    `;
  }).join('');

  return `
    <div class="grid gap-2" style="grid-template-columns: repeat(${columnas}, 1fr);">
      ${cells}
    </div>
  `;
}

/* =============================================================
   GameUI
   ============================================================= */

export const MemoriaGameUI = {
  codigo: 'MEMORIA',

  /**
   * Renderiza el área de juego.
   */
  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';

    if (!fase || fase === 'INICIO_RONDA') {
      _timer?.cancelar();
      _timerModal?.cancelar();
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Memoricé</p>
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
    const elementos = estadoJuego.elementos || [];
    const elementosVolteados = estadoJuego.elementos_volteados || [];
    const elementosDescubiertos = estadoJuego.elementos_descubiertos || [];
    const parejasEncontradas = estadoJuego.parejas_encontradas || 0;
    const totalParejas = elementos.length / 2;
    const urlsImagenes = contexto?.urlsImagenes || {};

    let contenido = '';

    if (fase === 'SELECCIONANDO_SET') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Esperando selección de set…</p>
        </div>
      `;
    } else if (fase === 'PREPARANDO_GRILLA') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-body-md text-on-surface-variant italic">Preparando grilla…</p>
        </div>
      `;
    } else if (fase === 'JUGANDO') {
      const grillaHTML = _renderGrilla(elementos, elementosVolteados, elementosDescubiertos, false, urlsImagenes);
      const segundos = _obtenerTiempoSeg(estadoJuego, contexto);
      const restanteMostrar = _timer?.estaActivo() ? _timer.restanteActual() : segundos;

      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-4 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${nombreEquipo}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Parejas: ${parejasEncontradas} / ${totalParejas}</span>
          </div>
          <div id="memoria-grilla">
            ${grillaHTML}
          </div>
        </div>
      `;

      let timerHTML = `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm text-center">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="memoria-timer" class="font-display-hero text-3xl text-primary">${restanteMostrar}s</p>
        </div>
      `;

      container.innerHTML = `
        <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
            <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${nombreFase}</span>
          </div>
          ${contenido}
          ${timerHTML}
          ${_renderMarcador(equipo1, equipo2, pts1, pts2)}
        </div>
      `;

      if (callbacks) {
        _iniciarTimer(estadoJuego, contexto, callbacks, container);
        container.querySelectorAll('[data-elemento-index]').forEach((el) => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.getAttribute('data-elemento-index'), 10);
            callbacks.onAccion('voltear-elemento-memoria', { indice: idx });
          });
        });
      }
      return;
    } else if (fase === 'CAMBIO_TURNO') {
      const grillaHTML = _renderGrilla(elementos, elementosVolteados, elementosDescubiertos, true, urlsImagenes);

      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-4 shadow-comic-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span class="font-label-md uppercase text-on-surface-variant">Equipo: ${nombreEquipo}</span>
            <span class="font-label-md uppercase text-on-surface-variant">Parejas: ${parejasEncontradas} / ${totalParejas}</span>
          </div>
          <div id="memoria-grilla">
            ${grillaHTML}
          </div>
        </div>
      `;

      container.innerHTML = `
        <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
            <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${nombreFase}</span>
          </div>
          ${contenido}
          ${Modal({
            id: 'memoria-modal-cambio-turno',
            mostrarTitulo: false,
            padding: 'p-8',
            alineacion: 'center',
            contenido: `
              <p class="font-display-hero text-2xl text-on-surface uppercase mb-2">Turno de ${nombreEquipo}</p>
              <p class="font-body-md text-on-surface-variant">Prepará al equipo para jugar.</p>
            `,
            acciones: []
          })}
          ${_renderMarcador(equipo1, equipo2, pts1, pts2)}
        </div>
      `;

      _timer?.cancelar();
      if (callbacks) {
        _iniciarTimerModal(contexto, callbacks);
      }
      return;
    } else if (fase === 'FIN_DE_RONDA') {
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Fin de ronda</p>
          <p class="font-body-md text-on-surface-variant">Ronda ${ronda} completada.</p>
        </div>
      `;
    } else if (fase === 'FIN_DE_JUEGO') {
      const res = pts1 > pts2
        ? `${equipo1.nombre} gana`
        : pts2 > pts1
          ? `${equipo2.nombre} gana`
          : 'Empate técnico';
      contenido = `
        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">${res}</p>
          <p class="font-body-md text-on-surface-variant">Juego finalizado.</p>
        </div>
      `;
    }

    _timer?.cancelar();

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
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
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Comenzar ronda', variante: 'primary', id: 'btn-memoria-iniciar-ronda' })}
          </div>
        `;
        break;

      case 'SELECCIONANDO_SET': {
        const sets = contexto?.setsDisponibles || [];
        if (sets.length === 0) {
          botonesHTML = `<p class="font-body-sm text-error">No hay sets disponibles.</p>`;
        } else {
          botonesHTML = `
            <p class="font-label-md uppercase text-on-surface-variant mb-2">Elegí un set</p>
            <div class="flex flex-col gap-2">
              ${sets.map((s) => `
                <button type="button" data-set-id="${s.id}" id="btn-memoria-set-${s.id}"
                  class="text-left border-2 border-on-surface rounded-lg p-3 bg-surface-container-lowest hover:bg-surface-container-low transition">
                  <p class="font-headline-sm">${s.nombre || s.id}</p>
                </button>
              `).join('')}
            </div>
          `;
        }
        break;
      }

      case 'PREPARANDO_GRILLA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar turno', variante: 'primary', id: 'btn-memoria-confirmar-grilla' })}
          </div>
        `;
        break;

      case 'JUGANDO':
        botonesHTML = `
          <div class="flex flex-col gap-2">
            <p class="font-label-md uppercase text-on-surface-variant">Cambiar a:</p>
            <div class="flex flex-wrap gap-2">
              ${Boton({ texto: equipo1.nombre, variante: 'secondary', id: 'btn-memoria-cambiar-eq1' })}
              ${Boton({ texto: equipo2.nombre, variante: 'secondary', id: 'btn-memoria-cambiar-eq2' })}
            </div>
          </div>
        `;
        break;

      case 'CAMBIO_TURNO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar turno de ${nombreEquipo}`, variante: 'primary', id: 'btn-memoria-iniciar-turno' })}
          </div>
        `;
        break;

      case 'FIN_DE_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-memoria-siguiente-ronda' })}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-memoria-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Memoricé — ${fase ? NOMBRE_FASES[fase] || fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-memoria-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-memoria');
      });
    }

    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-memoria-iniciar-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-ronda-memoria');
      });
    }

    if (fase === 'SELECCIONANDO_SET') {
      container.querySelectorAll('[data-set-id]').forEach((el) => {
        el.addEventListener('click', () => {
          const setId = el.getAttribute('data-set-id');
          const sets = contexto?.setsDisponibles || [];
          const set = sets.find((s) => s.id === setId);
          if (set) {
            callbacks.onAccion('seleccionar-set-memoria', { set });
          }
        });
      });
    }

    if (fase === 'PREPARANDO_GRILLA') {
      container.querySelector('#btn-memoria-confirmar-grilla')?.addEventListener('click', () => {
        callbacks.onAccion('confirmar-grilla-memoria');
      });
    }

    if (fase === 'JUGANDO') {
      container.querySelector('#btn-memoria-cambiar-eq1')?.addEventListener('click', () => {
        callbacks.onAccion('cambiar-turno-manual-memoria', { equipo: 1 });
      });
      container.querySelector('#btn-memoria-cambiar-eq2')?.addEventListener('click', () => {
        callbacks.onAccion('cambiar-turno-manual-memoria', { equipo: 2 });
      });
    }

    if (fase === 'CAMBIO_TURNO') {
      container.querySelector('#btn-memoria-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-memoria');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-memoria-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-siguiente-ronda-memoria');
      });
    }
  },

  cleanup() {
    _timer?.cancelar();
    _timerModal?.cancelar();
  }
};

/* =============================================================
   Helpers de render
   ============================================================= */

function _renderMarcador(equipo1, equipo2, pts1, pts2) {
  return `
    <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-3 shadow-comic-sm flex items-center justify-center gap-8">
      <span class="font-headline-md uppercase text-on-surface">${equipo1.nombre}: <span class="font-display-hero text-xl text-primary">${pts1}</span></span>
      <span class="font-headline-md text-on-surface-variant">-</span>
      <span class="font-headline-md uppercase text-on-surface">${equipo2.nombre}: <span class="font-display-hero text-xl text-primary">${pts2}</span></span>
    </div>
  `;
}
