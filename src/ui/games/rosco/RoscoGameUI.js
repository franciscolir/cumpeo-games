/* =============================================================
   RoscoGameUI — GameUI concreto para el juego Rosco.

   Renderiza:
   - Área de juego: rosco de 27 letras + definición actual + timers + marcador
   - Panel conductor: botones de control según fase + configuración previa

   Decisión de diseño: el conductor NO ve la respuesta. Solo lee la
   definición en voz alta y el jugador responde verbalmente. La
   respuesta se muestra únicamente al público (en 5.2c).
   ============================================================= */

import { Boton } from '../../components/boton.js';
import { crearTimer } from '../_shared/index.js';
import { ALFABETO, ESTADO_LETRA } from '../../../games/rosco/RoscoGameDefinition.js';

let _timerEquipo1 = null;
let _timerEquipo2 = null;
let _latestCallbacks = null;
let _latestEstadoJuego = null;
let _latestContexto = null;
let _modalInicio = null;
let _lastPanelArgs = null;

/* =============================================================
   Helpers de timer
   ============================================================= */

function _obtenerSegundosPorEquipo(contexto) {
  const config = contexto.juegoEjecutado?.configuracion_congelada;
  return config?.segundos_por_equipo || 60;
}

function _onTimerCierre(equipo) {
  if (!_latestCallbacks || !_latestEstadoJuego) return;
  _latestCallbacks.onAccion('time-up-rosco', { equipo });
}

function _iniciarTimerEquipo(equipo, estadoJuego, contexto, callbacks, container) {
  _latestCallbacks = callbacks;
  _latestEstadoJuego = estadoJuego;
  _latestContexto = contexto;

  const juegoId = contexto.juegoEjecutado?.id || '';
  const ronda = estadoJuego.ronda_actual || 1;
  const key = `${juegoId}:r${ronda}:eq${equipo}`;
  const segundos = _obtenerSegundosPorEquipo(contexto);

  const timer = crearTimer({
    duracionSeg: segundos,
    onTick: (restante) => {
      const id = equipo === 1 ? '#rosco-timer-eq1' : '#rosco-timer-eq2';
      const el = container.querySelector(id);
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: () => _onTimerCierre(equipo)
  });

  timer.iniciarSiCambio(key);
  return timer;
}

function _cancelarTimers() {
  _timerEquipo1?.cancelar();
  _timerEquipo2?.cancelar();
}

/* =============================================================
   Helpers de rosco
   ============================================================= */

function _obtenerItemActual(estadoJuego) {
  const items = estadoJuego?.set_ronda_actual?.items || [];
  const letraActual = estadoJuego?.rosco?.[estadoJuego.indice_actual]?.letra;
  if (!letraActual) return null;
  return items.find((item) => item.letra === letraActual) || null;
}

function _renderRosco(estadoJuego) {
  const rosco = estadoJuego.rosco || [];
  const indiceActual = estadoJuego.indice_actual || 0;

  const colores = {
    [ESTADO_LETRA.PENDIENTE]: 'bg-surface-container-lowest border-on-surface',
    [ESTADO_LETRA.CORRECTA]: 'bg-tertiary/20 border-tertiary',
    [ESTADO_LETRA.INCORRECTA]: 'bg-error/20 border-error',
    [ESTADO_LETRA.PASADA]: 'bg-comicYellow/30 border-comicYellow'
  };

  const lettersHTML = rosco.map((item, i) => {
    const esActual = i === indiceActual;
    const esResuelta = item.estado === ESTADO_LETRA.CORRECTA || item.estado === ESTADO_LETRA.INCORRECTA;
    const claseFondo = colores[item.estado] || colores[ESTADO_LETRA.PENDIENTE];
    const claseActual = esActual ? 'ring-4 ring-primary scale-110 z-10' : '';
    const claseResuelta = esResuelta ? 'opacity-70' : '';

    let icono = '';
    if (item.estado === ESTADO_LETRA.CORRECTA) icono = '✓';
    else if (item.estado === ESTADO_LETRA.INCORRECTA) icono = '✗';
    else if (item.estado === ESTADO_LETRA.PASADA) icono = '→';

    return `
      <div data-letra="${item.letra}" data-index="${i}"
        class="relative border-2.5 ${claseFondo} ${claseActual} ${claseResuelta} rounded-lg aspect-square flex flex-col items-center justify-center shadow-comic-sm transition-all">
        <span class="font-display-hero text-lg text-on-surface">${item.letra}</span>
        ${icono ? `<span class="absolute -top-1 -right-1 text-xs font-bold ${item.estado === ESTADO_LETRA.CORRECTA ? 'text-tertiary' : item.estado === ESTADO_LETRA.INCORRECTA ? 'text-error' : 'text-comicYellow'}">${icono}</span>` : ''}
      </div>
    `;
  });

  return `
    <div class="grid grid-cols-6 gap-1.5 max-w-sm mx-auto">
      ${lettersHTML.slice(0, 6).join('')}
    </div>
    <div class="grid grid-cols-6 gap-1.5 max-w-sm mx-auto mt-1.5">
      ${lettersHTML.slice(6, 12).join('')}
      <div class="col-span-6 flex items-center justify-center min-h-[3rem]">
        <p class="font-body-md text-on-surface-variant text-center italic">Centro del rosco</p>
      </div>
      ${lettersHTML.slice(12, 18).join('')}
    </div>
    <div class="grid grid-cols-6 gap-1.5 max-w-sm mx-auto mt-1.5">
      ${lettersHTML.slice(18, 27).join('')}
    </div>
  `;
}

/* =============================================================
   Modal de inicio (N rondas = N sets)
   ============================================================= */

function _validarModalInicio(modal) {
  if (!modal) return { ok: false, error: 'Elegí al menos un set' };
  const rondas = modal.rondas || 1;
  const seleccion = (modal.seleccion || []).slice(0, rondas);
  if (seleccion.length < rondas || seleccion.some((id) => !id)) {
    return { ok: false, error: 'Elegí un set para cada ronda' };
  }
  if (new Set(seleccion).size !== seleccion.length) {
    return { ok: false, error: 'No podés repetir el mismo set en dos rondas' };
  }
  return { ok: true, error: null };
}

function _renderModalInicio(contexto, modal) {
  const sets = contexto.setsDisponibles || [];
  const haySets = sets.length > 0;
  const maxRondas = Math.max(sets.length, 1);
  const rondas = Math.min(Math.max(modal.rondas || 1, 1), maxRondas);
  const validacion = haySets ? _validarModalInicio({ ...modal, rondas }) : { ok: false, error: null };
  const haySeleccionParcial = haySets && (modal.seleccion || []).some((id) => id);
  const mensajeError = !haySets
    ? 'No hay sets disponibles.'
    : (!validacion.ok && haySeleccionParcial ? (modal.error || validacion.error) : null);

  const opcionesRondas = [];
  for (let n = 1; n <= maxRondas; n++) {
    opcionesRondas.push(`<option value="${n}" ${n === rondas ? 'selected' : ''}>${n}</option>`);
  }

  const selectsHTML = [];
  if (haySets) {
    for (let i = 0; i < rondas; i++) {
      const seleccionado = modal.seleccion?.[i] || '';
      const opciones = sets.map((s) => {
        const seleccionadoEnOtro = (modal.seleccion || []).some((id, j) => j !== i && id === s.id);
        const esActual = seleccionado === s.id;
        const disabled = (seleccionadoEnOtro && !esActual) ? 'disabled' : '';
        const selected = esActual ? 'selected' : '';
        return `<option value="${s.id}" ${selected} ${disabled}>${s.nombre || s.id}</option>`;
      }).join('');
      selectsHTML.push(`
        <div>
          <label class="font-label-sm uppercase text-on-surface-variant" for="rosco-select-set-${i}">Ronda ${i + 1}</label>
          <select id="rosco-select-set-${i}" data-set-index="${i}"
            class="mt-1 w-full border-2 border-on-surface rounded-lg p-2 bg-surface-container-lowest font-body-md">
            <option value="">Elegí un set</option>
            ${opciones}
          </select>
        </div>
      `);
    }
  }

  return `
    <div id="rosco-modal-inicio" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg w-full max-w-md mx-4">
        <p class="font-headline-md uppercase text-on-surface mb-4">Iniciar juego Rosco</p>
        ${haySets ? `
          <div class="mb-4">
            <label class="font-label-sm uppercase text-on-surface-variant" for="rosco-select-rondas">Rondas</label>
            <select id="rosco-select-rondas"
              class="mt-1 w-full border-2 border-on-surface rounded-lg p-2 bg-surface-container-lowest font-body-md">
              ${opcionesRondas.join('')}
            </select>
          </div>
          <div class="flex flex-col gap-3 mb-4">${selectsHTML.join('')}</div>
        ` : ''}
        ${mensajeError ? `<p id="rosco-modal-error" class="font-body-md text-error mb-4">${mensajeError}</p>` : ''}
        <div class="flex gap-2 justify-end">
          ${Boton({ texto: 'Cancelar', variante: 'ghost', id: 'btn-rosco-modal-cancelar' })}
          ${Boton({ texto: 'Iniciar', variante: 'primary', id: 'btn-rosco-modal-iniciar', disabled: !validacion.ok })}
        </div>
      </div>
    </div>
  `;
}

function _rerenderPanel() {
  if (!_lastPanelArgs) return;
  RoscoGameUI.renderizarPanelConductor(
    _lastPanelArgs.estadoJuego,
    _lastPanelArgs.container,
    _lastPanelArgs.contexto,
    _lastPanelArgs.callbacks
  );
}

function _abrirModalInicio() {
  _modalInicio = { rondas: 1, seleccion: [null], error: null };
  _rerenderPanel();
}

function _cerrarModalInicio() {
  _modalInicio = null;
  _rerenderPanel();
}

/* =============================================================
   RoscoGameUI
   ============================================================= */

export const RoscoGameUI = {
  codigo: 'ROSCO',

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
      _cancelarTimers();
      container.innerHTML = `
        <div class="flex items-center justify-center h-full min-h-[30vh]">
          <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center max-w-md">
            <p class="font-display-hero text-2xl text-on-surface-variant uppercase mb-2">Rosco</p>
            <p class="font-body-md text-on-surface-variant">Configura el juego y presiona "Iniciar juego" para comenzar.</p>
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
    const pts1 = estadoJuego.puntos_equipo_1 || 0;
    const pts2 = estadoJuego.puntos_equipo_2 || 0;
    const equipoActual = estadoJuego.equipo_actual || 1;

    const itemActual = _obtenerItemActual(estadoJuego);
    const definicion = itemActual?.definicion || '';
    const letraActual = estadoJuego.rosco?.[estadoJuego.indice_actual]?.letra || '?';

    const tiempo1 = estadoJuego.tiempo_equipo_1 ?? _obtenerSegundosPorEquipo(contexto);
    const tiempo2 = estadoJuego.tiempo_equipo_2 ?? _obtenerSegundosPorEquipo(contexto);

    const timerActivo1 = _timerEquipo1?.estaActivo();
    const timerActivo2 = _timerEquipo2?.estaActivo();
    const mostrarTimer1 = fase === 'TURNO_ACTIVO' && equipoActual === 1;
    const mostrarTimer2 = fase === 'TURNO_ACTIVO' && equipoActual === 2;

    container.innerHTML = `
      <div class="flex flex-col h-full p-4 gap-3 overflow-y-auto">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
          <span class="inline-block bg-secondary-container text-on-secondary-container font-label-sm uppercase px-2 py-1 rounded-md">${fase.replace(/_/g, ' ')}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo ${equipoActual}</span>
        </div>

        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-4 shadow-comic-lg">
          ${_renderRosco(estadoJuego)}
        </div>

        <div class="bg-surface-container-lowest border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm">
          <p class="font-label-md uppercase text-on-surface-variant mb-1">Letra ${letraActual}</p>
          <p class="font-display-hero text-xl text-on-surface">${definicion || 'Sin definición'}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="border-2.5 ${equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-2xl text-primary">${pts1}</p>
            <p id="rosco-timer-eq1" class="font-display-hero text-lg ${mostrarTimer1 ? 'text-tertiary' : 'text-on-surface-variant'}">
              ${mostrarTimer1 ? (timerActivo1 ? `${_timerEquipo1.restanteActual()}s` : `${tiempo1}s`) : `${tiempo1}s`}
            </p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? 'border-[#FF3344] bg-[#FF3344]/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-2xl text-primary">${pts2}</p>
            <p id="rosco-timer-eq2" class="font-display-hero text-lg ${mostrarTimer2 ? 'text-tertiary' : 'text-on-surface-variant'}">
              ${mostrarTimer2 ? (timerActivo2 ? `${_timerEquipo2.restanteActual()}s` : `${tiempo2}s`) : `${tiempo2}s`}
            </p>
          </div>
        </div>
      </div>
    `;

    if (fase === 'TURNO_ACTIVO') {
      _cancelarTimers();
      if (equipoActual === 1) {
        _timerEquipo1 = _iniciarTimerEquipo(1, estadoJuego, contexto, callbacks, container);
      } else {
        _timerEquipo2 = _iniciarTimerEquipo(2, estadoJuego, contexto, callbacks, container);
      }
    } else {
      _cancelarTimers();
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

    if (fase && _modalInicio) _modalInicio = null;
    if (contexto?.puedeControlar === false && _modalInicio) _modalInicio = null;

    _lastPanelArgs = { estadoJuego, container, contexto, callbacks };

    const equipo1 = contexto.equipos?.[0] || { nombre: 'Eq1' };
    const equipo2 = contexto.equipos?.[1] || { nombre: 'Eq2' };
    const equipoActual = estadoJuego?.equipo_actual || 1;
    const nombreEquipoActual = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;

    let botonesHTML = '';

    switch (fase) {
      case 'INICIO_RONDA':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: `Iniciar turno — ${nombreEquipoActual}`, variante: 'primary', id: 'btn-rosco-iniciar-turno' })}
          </div>
        `;
        break;

      case 'TURNO_ACTIVO':
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto: 'OK', variante: 'primary', id: 'btn-rosco-acierto' })}
            ${Boton({ texto: 'X', variante: 'danger', id: 'btn-rosco-error' })}
            ${Boton({ texto: 'Pasapalabra', variante: 'secondary', id: 'btn-rosco-pasapalabra' })}
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            ${Boton({ texto: 'Saltar letra', variante: 'ghost', id: 'btn-rosco-saltar' })}
            ${Boton({ texto: 'Siguiente equipo', variante: 'ghost', id: 'btn-rosco-siguiente-equipo' })}
          </div>
        `;
        break;

      case 'CAMBIO_TURNO': {
        const nuevoEquipo = equipoActual === 1 ? 2 : 1;
        const nombreNuevo = nuevoEquipo === 1 ? equipo1.nombre : equipo2.nombre;
        botonesHTML = `
          <div class="flex flex-col gap-3 items-center">
            <p class="font-headline-md uppercase text-on-surface">Cambio a ${nombreNuevo}</p>
            ${Boton({ texto: `Iniciar turno — ${nombreNuevo}`, variante: 'primary', id: 'btn-rosco-iniciar-turno' })}
          </div>
        `;
        break;
      }

      case 'FIN_DE_RONDA': {
        const config = contexto.juegoEjecutado?.configuracion_congelada || {};
        const totalRondas = estadoJuego.total_rondas || config.rondas || 1;
        const siguienteRonda = (estadoJuego.ronda_actual || 1) + 1;
        const esUltimaRonda = siguienteRonda > totalRondas;
        const texto = esUltimaRonda ? 'Finalizar juego' : 'Iniciar siguiente ronda';
        botonesHTML = `
          <div class="flex flex-wrap gap-2">
            ${Boton({ texto, variante: 'primary', id: 'btn-rosco-siguiente-ronda' })}
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
          ${Boton({ texto: 'Iniciar juego', variante: 'primary', id: 'btn-rosco-iniciar-juego' })}
        </div>`
      : '';

    const modalHTML = (!fase && _modalInicio) ? _renderModalInicio(contexto, _modalInicio) : '';

    container.innerHTML = `
      <div class="flex flex-col gap-4">
        <p class="font-label-md uppercase text-on-surface-variant">Panel Rosco — ${fase ? fase.replace(/_/g, ' ') : 'Sin fase'}</p>
        ${iniciarJuegoHTML}
        ${botonesHTML}
      </div>
      ${modalHTML}
    `;

    if (!fase) {
      container.querySelector('#btn-rosco-iniciar-juego')?.addEventListener('click', () => {
        _abrirModalInicio();
      });
    }

    if (modalHTML) {
      container.querySelector('#btn-rosco-modal-cancelar')?.addEventListener('click', () => {
        _cerrarModalInicio();
      });

      container.querySelector('#btn-rosco-modal-iniciar')?.addEventListener('click', () => {
        if (!_modalInicio) return;
        const validacion = _validarModalInicio(_modalInicio);
        if (!validacion.ok) {
          _modalInicio = { ..._modalInicio, error: validacion.error };
          _rerenderPanel();
          return;
        }
        const sets = _modalInicio.seleccion
          .slice(0, _modalInicio.rondas)
          .map((id) => ({ id }));
        callbacks.onAccion('iniciar-juego-rosco-con-sets', { sets });
      });

      const selectRondas = container.querySelector('#rosco-select-rondas');
      selectRondas?.addEventListener('change', () => {
        if (!_modalInicio) return;
        const n = parseInt(selectRondas.value, 10) || 1;
        const seleccion = (_modalInicio.seleccion || []).slice();
        while (seleccion.length < n) seleccion.push(null);
        _modalInicio = { ..._modalInicio, rondas: n, seleccion, error: null };
        _rerenderPanel();
      });

      const rondasVisibles = _modalInicio.rondas || 1;
      for (let i = 0; i < rondasVisibles; i++) {
        const sel = container.querySelector(`#rosco-select-set-${i}`);
        sel?.addEventListener('change', () => {
          if (!_modalInicio) return;
          const seleccion = (_modalInicio.seleccion || []).slice();
          seleccion[i] = sel.value || null;
          _modalInicio = { ..._modalInicio, seleccion, error: null };
          _rerenderPanel();
        });
      }
    }

    if (fase === 'INICIO_RONDA' || fase === 'CAMBIO_TURNO') {
      container.querySelector('#btn-rosco-iniciar-turno')?.addEventListener('click', () => {
        callbacks.onAccion('iniciar-turno-rosco');
      });
    }

    if (fase === 'TURNO_ACTIVO') {
      container.querySelector('#btn-rosco-acierto')?.addEventListener('click', () => {
        callbacks.onAccion('marcar-acierto-rosco');
      });
      container.querySelector('#btn-rosco-error')?.addEventListener('click', () => {
        callbacks.onAccion('marcar-error-rosco');
      });
      container.querySelector('#btn-rosco-pasapalabra')?.addEventListener('click', () => {
        callbacks.onAccion('pasapalabra-rosco');
      });
      container.querySelector('#btn-rosco-saltar')?.addEventListener('click', () => {
        callbacks.onAccion('saltar-letra-rosco');
      });
      container.querySelector('#btn-rosco-siguiente-equipo')?.addEventListener('click', () => {
        _cancelarTimers();
        callbacks.onAccion('siguiente-equipo-rosco');
      });
    }

    if (fase === 'FIN_DE_RONDA') {
      container.querySelector('#btn-rosco-siguiente-ronda')?.addEventListener('click', () => {
        callbacks.onAccion('siguiente-ronda-rosco');
      });
    }
  },

  cleanup() {
    _cancelarTimers();
    _modalInicio = null;
    _lastPanelArgs = null;
  }
};
