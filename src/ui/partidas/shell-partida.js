/* =============================================================
   ShellPartida — estructura visual del conductor de una partida.

   Muestra: top bar, hero scoreboard, game container, panel conductor.
   Integra GameUIRegistry para renderizar el área y panel del juego.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Card } from '../components/card.js';
import { nuevoActionId, fmtPuntos } from './utils.js';

let cleanupSuscripciones = null;
let intervalId = null;
let cleanupsGameUI = [];

/**
 * Renderiza el shell completo del conductor de una partida.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { id: partidaId }
 */
export async function renderShellPartida(container, app, params) {
  _limpiarSuscripciones();
  _limpiarGameUIs();

  await _renderContenido(container, app, params.id);

  if (_adapterSoportaRealtime(app)) {
    _iniciarRealtime(container, app, params.id);
  } else {
    _iniciarPolling(container, app, params.id);
  }
}

function _adapterSoportaRealtime(app) {
  return app.adapter && app.adapter.modo === 'supabase';
}

async function _iniciarRealtime(container, app, partidaId) {
  const tablas = ['partidas', 'juego_ejecutados', 'equipo_partidas', 'control_partidas'];
  const unsubs = await Promise.all(tablas.map((tabla) => {
    const filter = tabla === 'partidas'
      ? `id=eq.${partidaId}`
      : `partida_id=eq.${partidaId}`;
    return app.adapter.suscribir(tabla, { filter }, () => {
      _renderContenido(container, app, partidaId);
    });
  }));
  cleanupSuscripciones = () => {
    for (const unsub of unsubs) {
      try { unsub(); } catch (_) {}
    }
  };
}

function _iniciarPolling(container, app, partidaId) {
  intervalId = setInterval(async () => {
    if (!window.location.hash.match(/^#\/partidas\/[^/?]+$/)) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    await _renderContenido(container, app, partidaId);
  }, 2000);
}

function _limpiarSuscripciones() {
  if (cleanupSuscripciones) {
    cleanupSuscripciones();
    cleanupSuscripciones = null;
  }
}

function _limpiarGameUIs() {
  for (const fn of cleanupsGameUI) {
    try { fn(); } catch (_) {}
  }
  cleanupsGameUI = [];
}

/* =============================================================
   Render principal
   ============================================================= */

async function _renderContenido(container, app, partidaId) {
  _limpiarGameUIs();

  let contexto;
  try {
    contexto = await app.services.partida.obtenerContextoEspera(partidaId);
  } catch {
    container.innerHTML = `
      <main class="min-h-screen p-6 max-w-3xl mx-auto">
        ${Header({ subtitulo: 'Consola', volverA: '#/partidas' })}
        <p class="text-error">Partida no encontrada.</p>
      </main>
    `;
    bindHeaderListeners(container);
    _limpiarSuscripciones();
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    return;
  }

  const { partida, juegos, equipos } = contexto;
  if (!partida) {
    container.innerHTML = `
      <main class="min-h-screen p-6 max-w-3xl mx-auto">
        ${Header({ subtitulo: 'Consola', volverA: '#/partidas' })}
        <p class="text-error">Partida no encontrada.</p>
      </main>
    `;
    bindHeaderListeners(container);
    _limpiarSuscripciones();
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    return;
  }

  const sessionId = app.session.sessionId;
  const tieneControl = await app.services.partida.verificarControl(partidaId, sessionId);
  const puedeControlar = tieneControl && partida.estado === 'EN_CURSO';

  const juegoActivo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');
  const codigoJuego = juegoActivo ? (juegoActivo.juego_codigo || null) : null;
  const gameUI = codigoJuego ? app.uiRegistry.obtener(codigoJuego) : null;
  const estadoJuego = juegoActivo ? (juegoActivo.estado_juego || {}) : {};

  const contextoGameUI = {
    partida,
    juegoEjecutado: juegoActivo,
    equipos,
    puedeControlar,
    acVisible: false
  };

  const callbacks = {
    onAccion: (tipo, payload) => {
      console.log(`[ShellPartida] onAccion: ${tipo}`, payload);
    }
  };

  container.innerHTML = `
    <div class="min-h-screen flex flex-col">
      ${_renderTopBar(partida, tieneControl, app, partidaId)}
      ${_renderHeroScoreboard(partida, juegoActivo, equipos)}
      <div id="shell-game-container" class="flex-1 min-h-0 overflow-hidden p-4">
        ${gameUI ? '' : _renderPlaceholder('Este juego aún no tiene UI implementada')}
      </div>
      <div id="shell-panel-conductor" class="min-h-[200px] border-t-2.5 border-on-surface bg-surface-container-lowest p-4">
        ${gameUI ? '' : _renderPlaceholder('Este juego aún no tiene panel conductor')}
      </div>
    </div>
  `;

  bindHeaderListeners(container);

  if (gameUI) {
    const gameContainer = container.querySelector('#shell-game-container');
    if (gameUI.renderizarAreaJuego) {
      const cleanupArea = gameUI.renderizarAreaJuego(estadoJuego, gameContainer, contextoGameUI);
      if (typeof cleanupArea === 'function') cleanupsGameUI.push(cleanupArea);
    }

    const panelContainer = container.querySelector('#shell-panel-conductor');
    if (gameUI.renderizarPanelConductor) {
      const cleanupPanel = gameUI.renderizarPanelConductor(estadoJuego, panelContainer, contextoGameUI, callbacks);
      if (typeof cleanupPanel === 'function') cleanupsGameUI.push(cleanupPanel);
    }
  }

  _bindAcciones(container, app, partidaId, juegoActivo);
}

/* =============================================================
   Top Bar
   ============================================================= */

function _renderTopBar(partida, tieneControl, app, partidaId) {
  const estadoColor = {
    CONFIGURANDO: 'text-on-surface-variant',
    EN_CURSO: 'text-tertiary',
    PAUSADO: 'text-on-error',
    FINALIZADA: 'text-on-surface-variant',
    DESCARTADA: 'text-error'
  };
  const colorClase = estadoColor[partida.estado] || 'text-on-surface-variant';

  const btnPausar = tieneControl && partida.estado === 'EN_CURSO'
    ? Boton({ texto: 'Pausar', variante: 'ghost', id: 'btn-pausar' })
    : '';

  const btnReanudar = tieneControl && partida.estado === 'PAUSADO'
    ? Boton({ texto: 'Reanudar', variante: 'ghost', id: 'btn-reanudar' })
    : '';

  const btnFin = tieneControl && (partida.estado === 'EN_CURSO' || partida.estado === 'PAUSADO')
    ? Boton({ texto: 'Fin', variante: 'danger', id: 'btn-fin' })
    : '';

  const btnPublica = partida.public_codigo
    ? `<a href="#/publica/${partida.public_codigo}" target="_blank" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition inline-flex items-center gap-2">
        Ver pública ↗
       </a>`
    : '';

  return `
    <div class="h-16 border-b-2.5 border-on-surface bg-surface-container-lowest flex items-center justify-between px-4 gap-4 flex-wrap shrink-0">
      <div class="flex items-center gap-4">
        <span class="font-display-hero text-2xl text-primary uppercase -rotate-1">CUMPEO</span>
        <span class="font-body-md text-on-surface-variant hidden sm:inline">Partida: ${partida.circuito_nombre || 'Sin nombre'}</span>
        <span class="font-label-md uppercase ${colorClase}">${partida.estado}</span>
        ${partida.public_codigo ? `<span class="font-display-hero text-xl text-primary">${partida.public_codigo}</span>` : ''}
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        ${btnPausar}
        ${btnReanudar}
        ${btnFin}
        ${btnPublica}
      </div>
    </div>
  `;
}

/* =============================================================
   Hero Scoreboard
   ============================================================= */

function _renderHeroScoreboard(partida, juegoActivo, equipos) {
  const equipo1 = equipos[0] || { nombre: '—', puntaje: 0 };
  const equipo2 = equipos[1] || { nombre: '—', puntaje: 0 };

  const juegoNombre = juegoActivo
    ? (juegoActivo.juego_nombre || juegoActivo.juego_codigo || 'Juego')
    : 'Sin juego activo';

  const juegoEstado = juegoActivo ? juegoActivo.estado : '';
  const ronda = juegoActivo && juegoActivo.estado_juego?.ronda
    ? `Ronda ${juegoActivo.estado_juego.ronda}`
    : '';

  return `
    <div class="grid grid-cols-12 gap-2 p-4 border-b-2.5 border-on-surface bg-surface-container-lowest shrink-0">
      <div class="col-span-5 flex flex-col justify-center">
        <p class="font-headline-md text-headline-md uppercase">${juegoNombre}</p>
        ${ronda ? `<p class="font-body-sm text-on-surface-variant">${ronda}</p>` : ''}
        ${juegoEstado ? `<p class="font-label-sm text-on-surface-variant uppercase">${juegoEstado}</p>` : ''}
      </div>
      <div class="col-span-3 flex flex-col items-center justify-center border-2 border-[#00D2FF] rounded-xl p-2 bg-[#00D2FF]/15">
        <p class="font-body-md uppercase">${equipo1.nombre}</p>
        <p class="font-display-hero text-3xl">${fmtPuntos(equipo1.puntaje || 0)}</p>
      </div>
      <div class="col-span-1 flex items-center justify-center">
        <span class="font-display-hero text-2xl text-on-surface-variant">VS</span>
      </div>
      <div class="col-span-3 flex flex-col items-center justify-center border-2 border-[#FF3344] rounded-xl p-2 bg-[#FF3344]/15">
        <p class="font-body-md uppercase">${equipo2.nombre}</p>
        <p class="font-display-hero text-3xl">${fmtPuntos(equipo2.puntaje || 0)}</p>
      </div>
    </div>
  `;
}

/* =============================================================
   Placeholder
   ============================================================= */

function _renderPlaceholder(mensaje) {
  return `
    <div class="flex items-center justify-center h-full">
      <p class="font-body-md text-on-surface-variant italic text-center">${mensaje}</p>
    </div>
  `;
}

/* =============================================================
   Acciones
   ============================================================= */

function _bindAcciones(container, app, partidaId, juegoActivo) {
  const sessionId = app.session.sessionId;

  const btnPausar = container.querySelector('#btn-pausar');
  if (btnPausar) {
    btnPausar.addEventListener('click', async () => {
      try {
        await app.services.partida.pausarJuego(partidaId, juegoActivo.id, sessionId, nuevoActionId());
        await _renderContenido(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

  const btnReanudar = container.querySelector('#btn-reanudar');
  if (btnReanudar) {
    btnReanudar.addEventListener('click', async () => {
      try {
        await app.services.partida.reanudarJuego(partidaId, juegoActivo.id, sessionId, nuevoActionId());
        await _renderContenido(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

  const btnFin = container.querySelector('#btn-fin');
  if (btnFin) {
    btnFin.addEventListener('click', async () => {
      if (!window.confirm('¿Finalizar el circuito completo?')) return;
      try {
        await app.services.partida.finalizarCircuito(partidaId, sessionId, nuevoActionId());
        window.location.hash = '#/partidas';
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }
}
