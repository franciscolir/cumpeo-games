/* =============================================================
   QuePiensaElPublicoGameUI — GameUI concreto para el juego
   "Que piensa el publico?".

   Renderiza:
   - Área de juego: pregunta + opciones A/B + fase + conteo en vivo + timer
   - Panel conductor: botones según fase con listeners
   ============================================================= */

import { Boton } from '../../components/boton.js';

let _timerAutoCierre = null;
let _timerContador = null;
let _timerKey = null;
let _timerRestante = 0;
let _latestCallbacks = null;
let _latestEstadoJuego = null;

function _cancelarTimer() {
  if (_timerAutoCierre !== null) {
    clearTimeout(_timerAutoCierre);
    _timerAutoCierre = null;
  }
  if (_timerContador !== null) {
    clearInterval(_timerContador);
    _timerContador = null;
  }
  _timerKey = null;
  _timerRestante = 0;
}

function _obtenerTiempoSeg(estadoJuego, contexto) {
  const snapshot = contexto.juegoEjecutado?.snapshot;
  const items = snapshot?.items || [];
  const idx = estadoJuego.pregunta_actual_index || 0;
  const item = items[idx];
  if (item?.tiempo_seg) return item.tiempo_seg;
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.tiempo_por_pregunta_seg || 30;
}

function _calcularResultadoPublico(estadoJuego) {
  const { a, b } = estadoJuego.respuestas_publico || { a: 0, b: 0 };
  if (a > b) return 'A';
  if (b > a) return 'B';
  return 'EMPATE';
}

function _estadoInicial() {
  return {
    ronda_actual: 1,
    pregunta_actual_index: 0,
    fase: 'SELECCIONANDO_PREGUNTA',
    respuestas_publico: { a: 0, b: 0 },
    total_respuestas: 0,
    pronostico_equipo_1: null,
    pronostico_equipo_2: null,
    pronosticador_equipo_1: null,
    pronosticador_equipo_2: null,
    resultado_publico: null,
    puntos_equipo_1: 0,
    puntos_equipo_2: 0
  };
}

function _onTimerCierre() {
  _cancelarTimer();
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  const resultado = _calcularResultadoPublico(_latestEstadoJuego);
  _latestCallbacks.onAccion('cambiar-estado-juego', {
    estadoJuego: {
      ..._latestEstadoJuego,
      fase: 'ENCUESTA_CERRADA',
      resultado_publico: resultado
    }
  });
}

function _iniciarTimer(estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const preguntaIdx = estadoJuego.pregunta_actual_index || 0;
  const key = `${juegoId}:${preguntaIdx}`;

  if (_timerKey === key) return;
  _cancelarTimer();
  _timerKey = key;

  const segundos = _obtenerTiempoSeg(estadoJuego, contexto);
  _timerRestante = segundos;

  const timerEl = container.querySelector('#qpep-timer');
  if (timerEl) {
    timerEl.textContent = `${_timerRestante}s`;
  }

  _timerContador = setInterval(() => {
    _timerRestante--;
    const el = container.querySelector('#qpep-timer');
    if (el) {
      el.textContent = `${_timerRestante}s`;
    }
    if (_timerRestante <= 0) {
      _onTimerCierre();
    }
  }, 1000);
}

function _calcularPuntos(estadoJuego, contexto) {
  const resultado = estadoJuego.resultado_publico;
  const snapshot = contexto.juegoEjecutado?.snapshot;
  const items = snapshot?.items || [];
  const idx = estadoJuego.pregunta_actual_index || 0;
  const item = items[idx];
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  const puntos = item?.puntos_acierto || config?.puntos_por_acierto || 0;

  const acierto1 = estadoJuego.pronostico_equipo_1 === resultado;
  const acierto2 = estadoJuego.pronostico_equipo_2 === resultado;

  return {
    acierto1,
    acierto2,
    puntos,
    puntosGanados1: acierto1 ? puntos : 0,
    puntosGanados2: acierto2 ? puntos : 0
  };
}

function _renderBotonSiguiente(estadoJuego, contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  const items = contexto.juegoEjecutado?.snapshot?.items || [];
  const totalItems = items.length;
  const rondas = totalItems > 0
    ? Math.min(config?.rondas || totalItems, totalItems)
    : (config?.rondas || 1);
  const siguienteIdx = (estadoJuego.pregunta_actual_index || 0) + 1;
  const esUltima = siguienteIdx >= rondas;

  const texto = esUltima ? 'Finalizar juego' : 'Siguiente ronda';
  return `<button id="btn-qpep-siguiente" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition">${texto}</button>`;
}

export const QuePiensaElPublicoGameUI = {
  codigo: 'QUE_PIENSA_EL_PUBLICO',

  /**
   * Renderiza el área de juego (pregunta + opciones A/B).
   * @param {object} estadoJuego
   * @param {HTMLElement} container
   * @param {object} contexto - { partida, juegoEjecutado, equipos, puedeControlar, acVisible }
   * @param {object} [callbacks] - { onAccion(tipo, payload) }
   */
  renderizarAreaJuego(estadoJuego, container, contexto, callbacks) {
    const snapshot = contexto.juegoEjecutado?.snapshot;
    const items = snapshot?.items || [];
    const fase = estadoJuego?.fase || '';

    if (!fase) {
      _cancelarTimer();
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

    if (callbacks) {
      _latestCallbacks = callbacks;
    }
    _latestEstadoJuego = estadoJuego;

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
    const mostrarResultado = fase === 'ENCUESTA_CERRADA' || fase === 'REVELANDO' || fase === 'FIN_DE_JUEGO';

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

    let timerHTML = '';
    if (fase === 'ENCUESTA_ACTIVA') {
      const segundos = _obtenerTiempoSeg(estadoJuego, contexto);
      const restanteMostrar = _timerKey ? _timerRestante : segundos;
      timerHTML = `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm text-center">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="qpep-timer" class="font-display-hero text-4xl text-primary">${restanteMostrar}s</p>
        </div>
      `;
    }

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
    if (fase === 'ENCUESTA_CERRADA' || fase === 'REVELANDO' || fase === 'FIN_DE_JUEGO') {
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
            <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${total}</span>
            <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          </div>
          ${preguntaHTML}
        </div>
        ${timerHTML}
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

    if (fase === 'ENCUESTA_ACTIVA' && callbacks) {
      _iniciarTimer(estadoJuego, contexto, callbacks, container);
    } else if (fase !== 'ENCUESTA_ACTIVA') {
      _cancelarTimer();
    }
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
    const pron1 = estadoJuego.pronostico_equipo_1 || '';
    const pron2 = estadoJuego.pronostico_equipo_2 || '';
    const puedeRevelar = pron1 && pron2;

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

      case 'ENCUESTA_CERRADA': {
        const btnA = (team, label) => (texto, valor) =>
          `<button data-team="${team}" data-valor="${valor}"
            class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-1 shadow-comic-sm transition ${label === valor ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-lowest text-on-surface hover:shadow-comic-md'}"
          >${texto}</button>`;

        const btns1A = btnA(1, pron1)('A', 'A');
        const btns1B = btnA(1, pron1)('B', 'B');
        const btns1E = btnA(1, pron1)('EMPATE', 'EMPATE');
        const btns2A = btnA(2, pron2)('A', 'A');
        const btns2B = btnA(2, pron2)('B', 'B');
        const btns2E = btnA(2, pron2)('EMPATE', 'EMPATE');

        botonesHTML = `
          <div class="flex flex-col gap-4">
            <div class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
              <p class="font-headline-md uppercase mb-3">${equipo1.nombre}</p>
              <div class="flex gap-2">${btns1A}${btns1B}${btns1E}</div>
            </div>
            <div class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
              <p class="font-headline-md uppercase mb-3">${equipo2.nombre}</p>
              <div class="flex gap-2">${btns2A}${btns2B}${btns2E}</div>
            </div>
            ${Boton({ texto: 'Revelar resultado', variante: 'primary', id: 'btn-qpep-revelar', disabled: !puedeRevelar })}
          </div>
        `;
        break;
      }

      case 'REVELANDO': {
        const { acierto1, acierto2, puntos, puntosGanados1, puntosGanados2 } =
          _calcularPuntos(estadoJuego, contexto);

        botonesHTML = `
          <div class="flex flex-col gap-4">
            <div class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
              <p class="font-label-md uppercase text-on-surface-variant">Resultado del publico</p>
              <p class="font-display-hero text-3xl text-primary">${estadoJuego.resultado_publico || '—'}</p>
            </div>

            <div class="border-2.5 ${acierto1 ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-lg p-4">
              <p class="font-headline-sm uppercase">${equipo1.nombre}</p>
              <p class="font-body-md">Pronostico: <strong>${estadoJuego.pronostico_equipo_1}</strong></p>
              <p class="font-body-md ${acierto1 ? 'text-tertiary font-bold' : 'text-on-surface-variant'}">
                ${acierto1 ? `\u2713 ACERT\u00d3 (+${puntosGanados1})` : '\u2717 No acert\u00f3'}
              </p>
            </div>

            <div class="border-2.5 ${acierto2 ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-lg p-4">
              <p class="font-headline-sm uppercase">${equipo2.nombre}</p>
              <p class="font-body-md">Pronostico: <strong>${estadoJuego.pronostico_equipo_2}</strong></p>
              <p class="font-body-md ${acierto2 ? 'text-tertiary font-bold' : 'text-on-surface-variant'}">
                ${acierto2 ? `\u2713 ACERT\u00d3 (+${puntosGanados2})` : '\u2717 No acert\u00f3'}
              </p>
            </div>

            <div class="flex justify-between items-center border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
              <span class="font-headline-sm">${equipo1.nombre}: ${estadoJuego.puntos_equipo_1}</span>
              <span class="font-headline-sm">${equipo2.nombre}: ${estadoJuego.puntos_equipo_2}</span>
            </div>

            ${_renderBotonSiguiente(estadoJuego, contexto)}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-qpep-iniciar-juego' })}
        </div>`
      : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Que Piensa el Publico — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
    `;

    if (!fase) {
      container.querySelector('#btn-qpep-iniciar-juego')?.addEventListener('click', () => {
        callbacks.onAccion('cambiar-estado-juego', { estadoJuego: _estadoInicial() });
      });
    }

    if (fase === 'SELECCIONANDO_PREGUNTA') {
      container.querySelector('#btn-qpep-iniciar')?.addEventListener('click', () => {
        callbacks.onAccion('cambiar-estado-juego', {
          estadoJuego: {
            ...estadoJuego,
            fase: 'ENCUESTA_ACTIVA',
            respuestas_publico: { a: 0, b: 0 },
            total_respuestas: 0
          }
        });
      });
    }

    if (fase === 'ENCUESTA_ACTIVA') {
      container.querySelector('#btn-qpep-cerrar')?.addEventListener('click', () => {
        _cancelarTimer();
        const resultado = _calcularResultadoPublico(estadoJuego);
        callbacks.onAccion('cambiar-estado-juego', {
          estadoJuego: {
            ...estadoJuego,
            fase: 'ENCUESTA_CERRADA',
            resultado_publico: resultado
          }
        });
      });
    }

    if (fase === 'ENCUESTA_CERRADA') {
      container.querySelectorAll('[data-team]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const team = parseInt(btn.dataset.team, 10);
          const valor = btn.dataset.valor;
          const key = team === 1 ? 'pronostico_equipo_1' : 'pronostico_equipo_2';
          callbacks.onAccion('cambiar-estado-juego', {
            estadoJuego: { ...estadoJuego, [key]: valor }
          });
        });
      });

      container.querySelector('#btn-qpep-revelar')?.addEventListener('click', () => {
        if (!pron1 || !pron2) return;
        const { puntosGanados1, puntosGanados2 } = _calcularPuntos(estadoJuego, contexto);
        callbacks.onAccion('cambiar-estado-juego', {
          estadoJuego: {
            ...estadoJuego,
            fase: 'REVELANDO',
            puntos_equipo_1: estadoJuego.puntos_equipo_1 + puntosGanados1,
            puntos_equipo_2: estadoJuego.puntos_equipo_2 + puntosGanados2
          }
        });
      });
    }

    if (fase === 'REVELANDO') {
      container.querySelector('#btn-qpep-siguiente')?.addEventListener('click', () => {
        const config = contexto.juegoEjecutado?.configuracion_congelada;
        const items = contexto.juegoEjecutado?.snapshot?.items || [];
        const totalItems = items.length;
        const rondas = totalItems > 0
          ? Math.min(config?.rondas || totalItems, totalItems)
          : (config?.rondas || 1);
        const siguienteIdx = (estadoJuego.pregunta_actual_index || 0) + 1;

        if (siguienteIdx >= rondas) {
          callbacks.onAccion('cambiar-estado-juego', {
            estadoJuego: { ...estadoJuego, fase: 'FIN_DE_JUEGO' }
          });
        } else {
          callbacks.onAccion('cambiar-estado-juego', {
            estadoJuego: {
              ...estadoJuego,
              pregunta_actual_index: siguienteIdx,
              ronda_actual: siguienteIdx + 1,
              fase: 'SELECCIONANDO_PREGUNTA',
              respuestas_publico: { a: 0, b: 0 },
              total_respuestas: 0,
              resultado_publico: null,
              pronostico_equipo_1: null,
              pronostico_equipo_2: null
            }
          });
        }
      });
    }
  },

  /** Cancela timers pendientes (cleanup externo). */
  cleanup() {
    _cancelarTimer();
  }
};
