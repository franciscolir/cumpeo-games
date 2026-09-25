/* =============================================================
   PictionaryGameUI — GameUI concreto para el juego Pictionary.

   Renderiza:
   - Área de juego: concepto actual, palabras prohibidas (PALABRAS),
     indicadores por submodo, timer, marcador, fase/ronda/submodo
   - Panel conductor: botones de control según fase + bonus siempre visible
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';
import { SUBMODOS } from '../../../games/pictionary/PictionaryGameDefinition.js';

let _timer = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;

const NOMBRE_SUBMODOS = {
  PALABRAS: 'Palabras prohibidas',
  GESTOS: 'Gestos',
  PREGUNTAS: 'Preguntas sí/no',
  DIBUJO: 'Dibujo'
};

const NOMBRE_FASES = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SUBMODO: 'Seleccionando submodo',
  SELECCIONANDO_SET: 'Seleccionando set',
  MOSTRANDO_PALABRA: 'Mostrando palabra',
  ADIVINANDO: 'Adivinando',
  ESPERA_VALIDACION: 'Esperando validación',
  CAMBIO_TURNO: 'Cambio de turno',
  FIN_DE_RONDA: 'Fin de ronda',
  FIN_DE_JUEGO: 'Fin de juego'
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
  const submodo = estadoJuego.submodo_actual || 'PALABRAS';
  const equipo = estadoJuego.equipo_actual || 1;
  const key = `${juegoId}:r${ronda}:s${submodo}:eq${equipo}:${Date.now()}`;
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
    const submodo = estadoJuego.submodo_actual || 'PALABRAS';
    const equipoActual = estadoJuego.equipo_actual || 1;
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;

    const concepto = estadoJuego.palabra_actual?.concepto || '';
    const prohibidas = estadoJuego.prohibidas_actuales || [];
    const mostrarTimer = fase === 'ADIVINANDO' && estadoJuego.timer_corriendo;
    const tiempoRestante = estadoJuego.tiempo_restante_seg ?? _obtenerSegundosPorModo(contexto);

    let indicadorSubmodo = '';
    if (submodo === 'GESTOS') {
      indicadorSubmodo = '<p class="font-body-sm text-on-surface-variant italic mt-2">El representante usa gestos. Sin palabras en pantalla.</p>';
    } else if (submodo === 'PREGUNTAS') {
      indicadorSubmodo = '<p class="font-body-sm text-on-surface-variant italic mt-2">Adivinador de espaldas. Solo sí/no.</p>';
    } else if (submodo === 'DIBUJO') {
      indicadorSubmodo = '<p class="font-body-sm text-on-surface-variant italic mt-2">Pizarra física. Dibujar en pizarra externa.</p>';
    }

    let prohibidasHTML = '';
    if (submodo === 'PALABRAS' && prohibidas.length > 0) {
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
          <span class="font-label-md uppercase text-on-surface-variant">Submodo — ${NOMBRE_SUBMODOS[submodo] || submodo}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo ${equipoActual}</span>
        </div>

        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center">
          ${concepto
            ? `<p class="font-display-hero text-3xl text-on-surface uppercase mb-2">${concepto}</p>`
            : '<p class="font-body-md text-on-surface-variant italic">Esperando palabra...</p>'
          }
          ${prohibidasHTML}
          ${indicadorSubmodo}
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
    const config = contexto.juegoEjecutado?.configuracion_congelada || {};
    const bonusPuntos = config.bonus_puntos || 0;

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
      case 'CAMBIO_TURNO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            <p class="font-body-sm text-on-surface-variant">Preparando turno…</p>
          </div>
        `;
        break;

      case 'SELECCIONANDO_SUBMODO': {
        botonesHTML = `
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Elegí el submodo de representación</p>
          <div class="flex flex-wrap gap-2">
            ${SUBMODOS.map((sub) => Boton({
              texto: NOMBRE_SUBMODOS[sub] || sub,
              variante: estadoJuego?.submodo_actual === sub ? 'primary' : 'secondary',
              id: `btn-pic-submodo-${sub}`
            })).join('')}
          </div>
        `;
        break;
      }

      case 'SELECCIONANDO_SET': {
        const sets = (contexto?.setsDisponibles || [])
          .filter((s) => !s.submodo || s.submodo === (estadoJuego?.submodo_actual || 'PALABRAS'));
        if (sets.length === 0) {
          botonesHTML = `<p class="font-body-sm text-error">No hay sets disponibles para este submodo.</p>`;
        } else {
          botonesHTML = `
            <p class="font-label-md uppercase text-on-surface-variant mb-2">Elegí un set — ${NOMBRE_SUBMODOS[estadoJuego?.submodo_actual] || estadoJuego?.submodo_actual || ''}</p>
            <div class="flex flex-wrap gap-2 items-end">
              <select id="pic-set-select" class="border-2 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest text-sm">
                ${sets.map((s) => `<option value="${s.id}">${s.nombre || s.id}</option>`).join('')}
              </select>
              ${Boton({ texto: 'Elegir set', variante: 'primary', id: 'btn-pic-elegir-set' })}
            </div>
          `;
        }
        break;
      }

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
            ${Boton({ texto: 'Siguiente turno', variante: 'primary', id: 'btn-pic-siguiente-turno' })}
          </div>
        `;
        break;

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
        <div class="flex flex-wrap gap-2 items-end">
          <div class="flex flex-col gap-1">
            <label class="font-label-xs text-on-surface-variant">${equipo1.nombre}</label>
            <input type="number" min="1" id="pic-bonus-input-eq1" class="w-20 border-2 border-on-surface rounded px-2 py-1 text-sm" placeholder="Pts" />
          </div>
          <button type="button" id="btn-pic-bonus-eq1" class="font-label-md uppercase border-2 border-on-surface rounded-lg px-3 py-1 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition">Aplicar</button>
          <div class="flex flex-col gap-1">
            <label class="font-label-xs text-on-surface-variant">${equipo2.nombre}</label>
            <input type="number" min="1" id="pic-bonus-input-eq2" class="w-20 border-2 border-on-surface rounded px-2 py-1 text-sm" placeholder="Pts" />
          </div>
          <button type="button" id="btn-pic-bonus-eq2" class="font-label-md uppercase border-2 border-on-surface rounded-lg px-3 py-1 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition">Aplicar</button>
        </div>
        <p id="pic-bonus-error" class="font-label-xs text-error mt-1 hidden"></p>
      </div>
    `;

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Pictionary — ${fase ? NOMBRE_FASES[fase] || fase.replace(/_/g, ' ') : 'Sin fase'}</p>
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

    if (fase === 'SELECCIONANDO_SUBMODO') {
      for (const sub of SUBMODOS) {
        container.querySelector(`#btn-pic-submodo-${sub}`)?.addEventListener('click', () => {
          callbacks.onAccion('elegir-submodo-pictionary', { submodo: sub });
        });
      }
    }

    if (fase === 'SELECCIONANDO_SET') {
      container.querySelector('#btn-pic-elegir-set')?.addEventListener('click', () => {
        const select = container.querySelector('#pic-set-select');
        const set_id = select?.value;
        if (!set_id) return;
        callbacks.onAccion('elegir-set-pictionary', { set_id });
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
      container.querySelector('#btn-pic-siguiente-turno')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-turno-pictionary');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-pic-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-ronda-pictionary');
      });
    }

    // Bonus bindings
    const errorEl = container.querySelector('#pic-bonus-error');

    function _aplicarBonus(equipo) {
      const input = container.querySelector(`#pic-bonus-input-eq${equipo}`);
      if (!input) return;
      const valor = input.value.trim();
      const puntos = parseInt(valor, 10);
      if (isNaN(puntos) || puntos <= 0) {
        if (errorEl) {
          errorEl.textContent = 'Ingresá un número entero mayor a 0';
          errorEl.classList.remove('hidden');
        }
        return;
      }
      if (errorEl) errorEl.classList.add('hidden');
      input.value = '';
      callbacks.onAccion('aplicar-bonus-pictionary', { equipo, puntos });
    }

    container.querySelector('#btn-pic-bonus-eq1')?.addEventListener('click', () => _aplicarBonus(1));
    container.querySelector('#btn-pic-bonus-eq2')?.addEventListener('click', () => _aplicarBonus(2));
  },

  /**
   * Descriptores de acciones del panel conductor (contrato 8.5a).
   *
   * M2-A (8.5b.2): devuelve [] en todas las fases → fallback
   * completo a renderizarPanelConductor legacy. El bonus del panel
   * requiere payload compuesto { equipo, puntos } que el contrato
   * no expresa (el binding `input` envía { valor } y el payload de
   * botón es estático) y el bonus vive en todas las fases, así que
   * migrar parcialmente el panel lo rompería. Deuda #131.
   *
   * @returns {Array<object>} siempre [] (fallback legacy)
   */
  accionesConductor() {
    return [];
  },

  cleanup() {
    _cancelarTimer();
  }
};
