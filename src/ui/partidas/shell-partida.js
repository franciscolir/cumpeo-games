/* =============================================================
   ShellPartida — estructura visual del conductor de una partida.

   Muestra: top bar, hero scoreboard, game container, panel conductor.
   Integra GameUIRegistry para renderizar el área y panel del juego.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Card } from '../components/card.js';
import { nuevoActionId, fmtPuntos } from './utils.js';
import { cargarItemsDeJuego } from '../games/_shared/index.js';

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

  const itemsQPEP = codigoJuego === 'QUE_PIENSA_EL_PUBLICO'
    ? await cargarItemsDeJuego(app, juegoActivo)
    : null;

  const contextoGameUI = {
    partida,
    juegoEjecutado: juegoActivo,
    equipos,
    puedeControlar,
    acVisible: false,
    stateVersion: juegoActivo ? juegoActivo.state_version : null,
    itemsQPEP
  };

  const callbacks = {
    onAccion: async (tipo, payload = {}) => {
      if (!puedeControlar || !juegoActivo) {
        console.warn(`[ShellPartida] Ignorando acción ${tipo}: sin control o sin juego activo`);
        return;
      }

      try {
        if (tipo === 'cambiar-estado-juego') {
          if (!payload.estadoJuego || typeof payload.estadoJuego !== 'object') {
            console.warn(`[ShellPartida] cambiar-estado-juego requiere estadoJuego`);
            return;
          }
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            payload.estadoJuego,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'cerrar-encuesta') {
          if (!app.services.respuestaEncuesta) {
            console.warn(`[ShellPartida] cerrar-encuesta requiere respuestaEncuesta service`);
            return;
          }
          const preguntaIdx = payload.preguntaIndex ?? (estadoJuego?.pregunta_actual_index ?? 0);
          const conteo = await app.services.respuestaEncuesta.contarRespuestasDeJuego(
            juegoActivo.id,
            preguntaIdx
          );
          const { a, b, total } = conteo;
          const resultado = a > b ? 'A' : b > a ? 'B' : 'EMPATE';
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            {
              ...estadoJuego,
              fase: 'ENCUESTA_CERRADA',
              respuestas_publico: { a, b },
              total_respuestas: total,
              resultado_publico: resultado
            },
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'finalizar-juego') {
          if (!payload.resultado || !payload.finishReason) {
            console.warn(`[ShellPartida] finalizar-juego requiere resultado y finishReason`);
            return;
          }
          await app.services.partida.finalizarJuego(
            partidaId,
            juegoActivo.id,
            payload.resultado,
            payload.finishReason,
            sessionId,
            nuevoActionId()
          );
        } else {
          console.warn(`[ShellPartida] Acción desconocida: ${tipo}`);
          return;
        }

        await _renderContenido(container, app, partidaId);
      } catch (err) {
        console.error(`[ShellPartida] Error en acción ${tipo}:`, err);
        window.alert(`Error: ${err.message}`);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.__shellPartidaCallbacks = callbacks;
  }

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
      ${puedeControlar ? _renderColaModeracion() : ''}
    </div>
  `;

  bindHeaderListeners(container);

  if (puedeControlar) {
    _bindModeracion(container, app, partidaId);
    await _cargarModeracion(container, app, partidaId);
  }

  if (gameUI) {
    const gameContainer = container.querySelector('#shell-game-container');
    if (gameUI.renderizarAreaJuego) {
      const cleanupArea = gameUI.renderizarAreaJuego(estadoJuego, gameContainer, contextoGameUI, callbacks);
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

  const btnTomarControl = !tieneControl && partida.estado === 'CONFIGURANDO'
    ? Boton({ texto: 'Tomar control', variante: 'primary', id: 'btn-tomar-control' })
    : '';

  const btnComenzar = tieneControl && partida.estado === 'CONFIGURANDO'
    ? Boton({ texto: 'Comenzar', variante: 'secondary', id: 'btn-comenzar' })
    : '';

  const btnPausar = tieneControl && partida.estado === 'EN_CURSO'
    ? Boton({ texto: 'Pausar', variante: 'ghost', id: 'btn-pausar' })
    : '';

  const btnReanudar = tieneControl && partida.estado === 'PAUSADO'
    ? Boton({ texto: 'Reanudar', variante: 'ghost', id: 'btn-reanudar' })
    : '';

  const btnDescartar = tieneControl && partida.estado === 'EN_CURSO'
    ? Boton({ texto: 'Descartar', variante: 'danger', id: 'btn-descartar' })
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
        ${btnTomarControl}
        ${btnComenzar}
        ${btnPausar}
        ${btnReanudar}
        ${btnDescartar}
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
   Cola de Moderación
   ============================================================= */

function _renderColaModeracion() {
  return `
    <section id="cola-moderacion" class="border-t-2.5 border-on-surface bg-surface p-4">
      <h3 class="font-headline-md uppercase text-on-surface mb-4">Moderación</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="font-label-md uppercase text-on-surface-variant mb-2">Mensajes pendientes</h4>
          <ul id="lista-mensajes-pendientes" class="space-y-2">
            <li class="font-body-sm text-on-surface-variant italic">Cargando...</li>
          </ul>
        </div>
        <div>
          <h4 class="font-label-md uppercase text-on-surface-variant mb-2">Fotos pendientes</h4>
          <ul id="lista-fotos-pendientes" class="space-y-2">
            <li class="font-body-sm text-on-surface-variant italic">Cargando...</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

async function _cargarModeracion(container, app, partidaId) {
  const sessionId = app.session.sessionId;
  const mensajesEl = container.querySelector('#lista-mensajes-pendientes');
  const fotosEl = container.querySelector('#lista-fotos-pendientes');
  if (!mensajesEl || !fotosEl) return;

  try {
    const [mensajes, fotos] = await Promise.all([
      app.services.mensaje.listarPendientesDePartida(partidaId),
      app.services.foto.listarPendientesDePartida(partidaId)
    ]);

    if (mensajes.length === 0) {
      mensajesEl.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">Sin mensajes pendientes</li>';
    } else {
      mensajesEl.innerHTML = mensajes.map((m) => `
        <li class="border-2 border-on-surface rounded-lg p-3 flex justify-between items-start">
          <div class="min-w-0 flex-1 mr-2">
            <p class="font-body-sm text-on-surface-variant">${m.participante_nombre || 'Anónimo'}</p>
            <p class="font-body-md text-on-surface break-words">${m.texto}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-accion="aprobar-mensaje" data-id="${m.id}" class="font-label-md uppercase border-2 border-tertiary rounded-lg px-3 py-1 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">✓</button>
            <button data-accion="rechazar-mensaje" data-id="${m.id}" class="font-label-md uppercase border-2 border-error rounded-lg px-3 py-1 bg-error/15 text-error hover:bg-error/30 transition">✗</button>
          </div>
        </li>
      `).join('');
    }

    if (fotos.length === 0) {
      fotosEl.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">Sin fotos pendientes</li>';
    } else {
      const fotosConUrl = await Promise.all(fotos.map(async (f) => {
        let url = '';
        try { url = await app.services.foto.obtenerUrlPublica(f.id); } catch (_) {}
        return { ...f, url };
      }));
      fotosEl.innerHTML = fotosConUrl.map((f) => `
        <li class="border-2 border-on-surface rounded-lg p-3">
          ${f.url ? `<img src="${f.url}" class="w-full h-24 object-cover rounded mb-2" alt="Foto pendiente" />` : '<p class="font-body-sm text-on-surface-variant italic mb-2">Vista previa no disponible</p>'}
          <div class="flex gap-2">
            <button data-accion="aprobar-foto" data-id="${f.id}" class="font-label-md uppercase border-2 border-tertiary rounded-lg px-3 py-1 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">✓</button>
            <button data-accion="rechazar-foto" data-id="${f.id}" class="font-label-md uppercase border-2 border-error rounded-lg px-3 py-1 bg-error/15 text-error hover:bg-error/30 transition">✗</button>
          </div>
        </li>
      `).join('');
    }
  } catch (err) {
    console.error('[Moderación] Error cargando:', err);
    mensajesEl.innerHTML = '<li class="font-body-sm text-error">Error al cargar</li>';
    fotosEl.innerHTML = '<li class="font-body-sm text-error">Error al cargar</li>';
  }
}

function _bindModeracion(container, app, partidaId) {
  const sessionId = app.session.sessionId;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;
    if (!id) return;

    btn.disabled = true;

    try {
      if (accion === 'aprobar-mensaje') {
        await app.services.mensaje.aprobarMensaje(id, sessionId);
      } else if (accion === 'rechazar-mensaje') {
        await app.services.mensaje.rechazarMensaje(id, sessionId);
      } else if (accion === 'aprobar-foto') {
        await app.services.foto.aprobarFoto(id, sessionId);
      } else if (accion === 'rechazar-foto') {
        await app.services.foto.rechazarFoto(id, sessionId);
      } else {
        return;
      }
      await _cargarModeracion(container, app, partidaId);
    } catch (err) {
      console.error(`[Moderación] Error en ${accion}:`, err);
      btn.disabled = false;
    }
  });
}

/* =============================================================
   Acciones
   ============================================================= */

function _bindAcciones(container, app, partidaId, juegoActivo) {
  const sessionId = app.session.sessionId;

  const btnTomarControl = container.querySelector('#btn-tomar-control');
  if (btnTomarControl) {
    btnTomarControl.addEventListener('click', async () => {
      try {
        await app.services.partida.tomarControl(partidaId, sessionId);
        await _renderContenido(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

  const btnComenzar = container.querySelector('#btn-comenzar');
  if (btnComenzar) {
    btnComenzar.addEventListener('click', async () => {
      if (!window.confirm('¿Comenzar la partida?')) return;
      try {
        await app.services.partida.comenzarPartida(partidaId, sessionId, nuevoActionId());
        await _renderContenido(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

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

  const btnDescartar = container.querySelector('#btn-descartar');
  if (btnDescartar) {
    btnDescartar.addEventListener('click', async () => {
      if (!window.confirm('¿Descartar esta partida? Esta acción no se puede deshacer.')) return;
      try {
        await app.services.partida.descartarPartida(partidaId, sessionId, nuevoActionId());
        window.location.hash = '#/partidas';
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }
}
