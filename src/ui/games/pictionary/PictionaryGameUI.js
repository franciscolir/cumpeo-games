/* =============================================================
   PictionaryGameUI — GameUI concreto para el juego Pictionary.

   Renderiza:
   - Área de juego: concepto actual, palabras prohibidas (modo 1),
     indicadores por modo, timer, marcador, fase/ronda/modo
   - Panel conductor: botones de control según fase + bonus siempre visible
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';
import { MODOS } from '../../../games/pictionary/PictionaryGameDefinition.js';

let _timer = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;

const NOMBRE_MODOS = {
  1: 'Palabras prohibidas',
  2: 'Gestos',
  3: 'Dibujo',
  4: 'Preguntas sí/no'
};

/* =============================================================
   Helpers de timer
   ============================================================= */

function _obtenerSegundosPorModo(contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.segundos_por_modo || 60;
}

function _onTimerCierre() {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-pictionary');
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const ronda = estadoJuego.ronda_actual || 1;
  const modo = estadoJuego.modo_actual || 1;
  const equipo = estadoJuego.equipo_actual || 1;
  const key = `${juegoId}:r${ronda}:m${modo}:eq${equipo}:${Date.now()}`;
  const segundos = estadoJuego.tiempo_restante_seg ?? _obtenerSegundosPorModo(contexto);

  _timer?.cancelar();
  _timer = crearTimer({
    duracionSeg: segundos,
    onTick: (restante) => {
      const el = container.querySelector('#pic-timer');
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

/* =============================================================
   PictionaryGameUI
   ============================================================= */

export const PictionaryGameUI = {
  codigo: 'PICTIONARY',

  /**
   * Renderiza el área de juego del conductor.
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto
   * @param {object} [callbacks]
   */
  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';

    if (!fase) {
      _cancelarTimer();
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Pictionary</p>
            <p class="font-body-md text-on-surface-variant">Inicia la partida para comenzar.</p>
          </div>
        </div>
      `;
      return;
    }

    if (callbacks) _latestCallbacks = callbacks;
    _latestEstadoJuego = estadoJuego;
    _latestContexto = contexto;

    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const ronda = estadoJuego.ronda_actual || 1;
    const totalRondas = estadoJuego.total_rondas || 1;
    const modo = estadoJuego.modo_actual || 1;
    const equipoActual = estadoJuego.equipo_actual || 1;
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;

    const concepto = estadoJuego.palabra_actual?.concepto || '';
    const prohibidas = estadoJuego.prohibidas_actuales || [];
    const mostrarTimer = fase === 'ADIVINANDO' && estadoJuego.timer_corriendo;
    const tiempoRestante = estadoJuego.tiempo_restante_seg ?? _obtenerSegundosPorModo(contexto);

    let indicadorModo = '';
    if (modo === 3) {
      indicadorModo = '<p class="font-body-sm text-on-surface-variant italic mt-2">Pizarra física. Dibujar en pizarra externa.</p>';
    } else if (modo === 4) {
      indicadorModo = '<p class="font-body-sm text-on-surface-variant italic mt-2">Adivinador de espaldas. Solo sí/no.</p>';
    }

    let prohibidasHTML = '';
    if (modo === 1 && prohibidas.length > 0) {
      prohibidasHTML = `
        <div class="mt-3">
          <p class="font-label-md uppercase text-on-surface-variant mb-1">Palabras prohibidas</p>
          <div class="flex flex-wrap gap-1">
            ${prohibidas.map((p) => `<span class="bg-error/20 text-error font-label-sm px-2 py-0.5 rounded">${p}</span>`).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Modo ${modo} — ${NOMBRE_MODOS[modo] || '?'}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo ${equipoActual}</span>
        </div>

        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          ${concepto
            ? `<p class="font-display-hero text-3xl text-on-surface uppercase mb-2">${concepto}</p>`
            : '<p class="font-body-md text-on-surface-variant italic">Esperando palabra...</p>'
          }
          ${prohibidasHTML}
          ${indicadorModo}
          <div class="mt-4">
            <p class="font-label-md uppercase text-on-surface-variant">Timer</p>
            <p id="pic-timer" class="font-display-hero text-3xl ${mostrarTimer ? 'text-tertiary' : 'text-on-surface-variant'}">${mostrarTimer ? '' : tiempoRestante + 's'}</p>
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

    if (fase === 'ADIVINANDO' && estadoJuego.timer_corriendo) {
      _iniciarTimer(estadoJuego, contexto, callbacks, container);
    } else {
      _cancelarTimer();
    }
  },

  /**
   * Renderiza el panel del conductor con botones de control.
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto
   * @param {object} callbacks
   */
  renderizarPanelConductor(estadoJuego, container, contexto, callbacks) {
    const fase = estadoJuego?.fase || '';
    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const equipoActual = estadoJuego?.equipo_actual || 1;
    const nombreEquipoActual = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
    const modo = estadoJuego?.modo_actual || 1;
    const config = contexto.juegoEjecutado?.configuracion_congelada || {};
    const bonusPuntos = config.bonus_puntos || 0;

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar modo — ${NOMBRE_MODOS[modo] || modo}`, variante: 'primary', id: 'btn-pic-iniciar-modo' })}
          </div>
        `;
        break;

      case 'MOSTRANDO_PALABRA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Iniciar tiempo', variante: 'primary', id: 'btn-pic-iniciar-tiempo' })}
          </div>
        `;
        break;

      case 'ADIVINANDO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Correcto', variante: 'primary', id: 'btn-pic-acierto' })}
            ${Boton({ texto: 'Incorrecto', variante: 'danger', id: 'btn-pic-error' })}
            ${Boton({ texto: 'Pasar palabra', variante: 'secondary', id: 'btn-pic-pasar' })}
          </div>
        `;
        break;

      case 'ESPERA_VALIDACION':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'Siguiente modo', variante: 'primary', id: 'btn-pic-siguiente-modo' })}
          </div>
        `;
        break;

      case 'CAMBIO_MODO': {
        const nuevoEquipo = equipoActual === 1 ? 2 : 1;
        const nombreNuevo = nuevoEquipo === 1 ? equipo1.nombre : equipo2.nombre;
        botonesHTML = `
          <div class="flex flex-col gap-3 items-center">
            <p class="font-headline-md uppercase text-on-surface">Cambio a ${nombreNuevo}</p>
            ${Boton({ texto: `Iniciar modo — ${NOMBRE_MODOS[modo] || modo}`, variante: 'primary', id: 'btn-pic-siguiente-equipo' })}
          </div>
        `;
        break;
      }

      case 'FIN_DE_RONDA': {
        const totalRondas = config.rondas || 1;
        const siguienteRonda = (estadoJuego.ronda_actual || 1) + 1;
        const esUltimaRonda = siguienteRonda > totalRondas;
        const texto = esUltimaRonda ? 'Finalizar juego' : 'Iniciar siguiente ronda';
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto, variante: 'primary', id: 'btn-pic-siguiente-ronda' })}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-pic-iniciar-juego' })}
        </div>`
      : '';

    const bonusHTML = `
      <div class="mt-3 pt-3 border-t-2 border-on-surface/20">
        <p class="font-label-sm text-on-surface-variant mb-1">Bonus: ${bonusPuntos} pts</p>
        ${Boton({ texto: 'Bonus Eq1', variante: 'ghost', id: 'btn-pic-bonus-eq1' })}
        ${Boton({ texto: 'Bonus Eq2', variante: 'ghost', id: 'btn-pic-bonus-eq2' })}
      </div>
    `;

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Pictionary — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
        ${bonusHTML}
      </div>
    `;

    // Bindings
    if (!fase) {
      container.querySelector('#btn-pic-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-juego-pictionary');
      });
    }

    if (fase === 'INICIO_RONDA') {
      container.querySelector('#btn-pic-iniciar-modo')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-modo-pictionary');
      });
    }

    if (fase === 'CAMBIO_MODO') {
      container.querySelector('#btn-pic-siguiente-equipo')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-equipo-pictionary');
      });
    }

    if (fase === 'MOSTRANDO_PALABRA') {
      container.querySelector('#btn-pic-iniciar-tiempo')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-tiempo-pictionary');
      });
    }

    if (fase === 'ADIVINANDO') {
      container.querySelector('#btn-pic-acierto')?.addEventListener('click', () => {
        _cancelarTimer();
        callbacks.onAccion('marcar-acierto-pictionary');
      });
      container.querySelector('#btn-pic-error')?.addEventListener('click', () => {
        _cancelarTimer();
        callbacks.onAccion('marcar-error-pictionary');
      });
      container.querySelector('#btn-pic-pasar')?.addEventListener('click', () => {
        _cancelarTimer();
        callbacks.onAccion('pasar-palabra-pictionary');
      });
    }

    if (fase === 'ESPERA_VALIDACION') {
      container.querySelector('#btn-pic-siguiente-modo')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-modo-pictionary');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-pic-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-ronda-pictionary');
      });
    }

    // Bonus bindings
    container.querySelector('#btn-pic-bonus-eq1')?.addEventListener('click', () => {
      const input = window.prompt(`¿Cuántos puntos para ${equipo1.nombre}?`);
      if (input === null) return;
      const puntos = parseInt(input, 10);
      if (isNaN(puntos) || puntos <= 0) {
        window.alert('Puntos inválidos');
        return;
      }
      callbacks.onAccion('aplicar-bonus-pictionary', { equipo: 1, puntos });
    });

    container.querySelector('#btn-pic-bonus-eq2')?.addEventListener('click', () => {
      const input = window.prompt(`¿Cuántos puntos para ${equipo2.nombre}?`);
      if (input === null) return;
      const puntos = parseInt(input, 10);
      if (isNaN(puntos) || puntos <= 0) {
        window.alert('Puntos inválidos');
        return;
      }
      callbacks.onAccion('aplicar-bonus-pictionary', { equipo: 2, puntos });
    });
  },

  cleanup() {
    _cancelarTimer();
  }
};
