/* =============================================================
   CancionIncompletaGameUI — UI del conductor para Canción Incompleta.

   El conductor controla la canción externa, marca acierto/error,
   gestiona timer por canción y marcador.
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';

let _timer = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;

function _obtenerSegundosPorCancion(contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.segundos_por_cancion || 60;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-cancion-incompleta');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const ronda = estadoJuego.ronda_actual || 1;
  const cancion = estadoJuego.cancion_actual || 1;
  const key = `${juegoId}:r${ronda}:c${cancion}:${estadoJuego.timer_corriendo ? 'run' : 'idle'}`;
  const segundos = estadoJuego.tiempo_restante_seg ?? _obtenerSegundosPorCancion(contexto);

  _timer?.cancelar();
  _timer = crearTimer({
    duracionSeg: segundos,
    onTick: (restante) => {
      const el = container.querySelector('#ci-timer');
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: _onTimerCierre
  });
  _timer.iniciarSiCambio(key);
  return _timer;
}

function _cancelarTimer() {
  _timer?.cancelar();
}

export const CancionIncompletaGameUI = {
  codigo: 'CANCION_INCOMPLETA',

  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    if (!estadoJuego || !estadoJuego.fase) {
      _cancelarTimer();
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Canción Incompleta</p>
            <p class="font-body-md text-on-surface-variant">Inicia la partida para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    _latestCallbacks = callbacks;
    _latestEstadoJuego = estadoJuego;
    _latestContexto = contexto;

    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const ronda = estadoJuego.ronda_actual || 1;
    const totalRondas = estadoJuego.total_rondas || 1;
    const cancion = estadoJuego.cancion_actual || 1;
    const equipoActual = estadoJuego.equipo_actual || 1;
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const fase = estadoJuego.fase;

    const mostrarTimer = fase === 'TURNO_ACTIVO' && estadoJuego.timer_corriendo;

    const tiempoRestante = estadoJuego.tiempo_restante_seg ?? _obtenerSegundosPorCancion(contexto);
    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas} — Canción ${cancion}/2</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo ${equipoActual}</span>
        </div>

        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          <p class="font-display-hero text-3xl text-on-surface uppercase mb-2">Canción Incompleta</p>
          <p class="font-body-md text-on-surface-variant">Reproductor externo. Equipo ${equipoActual} responde.</p>
          <div class="mt-4">
            <p class="font-label-md uppercase text-on-surface-variant">Timer</p>
            <p id="ci-timer" class="font-display-hero text-3xl ${mostrarTimer ? 'text-tertiary' : 'text-on-surface-variant'}">${mostrarTimer ? '' : tiempoRestante + 's'}</p>
          </div>
        </div>

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

    if (fase === 'TURNO_ACTIVO' && estadoJuego.timer_corriendo) {
      _iniciarTimer(estadoJuego, contexto, callbacks, container);
    } else {
      _cancelarTimer();
    }
  },

  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const equipoActual = estadoJuego?.equipo_actual || 1;
    const nombreEquipoActual = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
    const timerCorriendo = !!estadoJuego?.timer_corriendo;

    let controles = '';

    if (!fase) {
      controles = Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-ci-iniciar-juego' });
    } else if (fase === 'INICIO_RONDA') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: `Iniciar turno — ${nombreEquipoActual}`, variante: 'primary', id: 'btn-ci-iniciar-turno' })}
        </div>
      `;
    } else if (fase === 'TURNO_ACTIVO') {
      if (!timerCorriendo) {
        controles = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar tiempo', variante: 'primary', id: 'btn-ci-iniciar-tiempo' })}
          </div>
        `;
      } else {
        controles = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Detener tiempo', variante: 'ghost', id: 'btn-ci-detener-tiempo' })}
          </div>
        `;
      }
    } else if (fase === 'ESPERA_VALIDACION') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Correcto', variante: 'primary', id: 'btn-ci-acierto' })}
          ${Boton({ texto: 'Incorrecto', variante: 'danger', id: 'btn-ci-error' })}
        </div>
      `;
    } else if (fase === 'FIN_DE_RONDA') {
      controles = `
        <div class="flex flex-wrap gap-2">
          ${Boton({ texto: 'Siguiente ronda', variante: 'primary', id: 'btn-ci-siguiente-ronda' })}
        </div>
      `;
    } else if (fase === 'FIN_DE_JUEGO') {
      controles = '';
    }

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Canción Incompleta — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${controles}
      </div>
    `;

    // Bindings
    if (!fase) {
      container.querySelector('#btn-ci-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-cancion-incompleta');
      });
    }
    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-ci-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-cancion-incompleta');
      });
    }
    if (fase === 'TURNO_ACTIVO') {
      const btnIniciar = container.querySelector('#btn-ci-iniciar-tiempo');
      if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
          callbacks.onAccion('iniciar-tiempo-cancion-incompleta');
        });
      }
      const btnDetener = container.querySelector('#btn-ci-detener-tiempo');
      if (btnDetener) {
        btnDetener.addEventListener('click', () => {
          _cancelarTimer();
          callbacks.onAccion('detener-tiempo-cancion-incompleta');
        });
      }
    }
    if (fase === 'ESPERA_VALIDACION') {
      container.querySelector('#btn-ci-acierto')?.addEventListener('click', () => {
        _cancelarTimer();
        callbacks.onAccion('marcar-acierto-cancion-incompleta');
      });
      container.querySelector('#btn-ci-error')?.addEventListener('click', () => {
        _cancelarTimer();
        callbacks.onAccion('marcar-error-cancion-incompleta');
      });
    }
    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-ci-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-ronda-cancion-incompleta');
      });
    }
  },

  cleanup() {
    _cancelarTimer();
  }
};
