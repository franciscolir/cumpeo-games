/* =============================================================
   ShellPartida — estructura visual del conductor de una partida.

   Muestra: top bar, hero scoreboard, game container, panel conductor.
   Integra GameUIRegistry para renderizar el área y panel del juego.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Card } from '../components/card.js';
import { montarModal, desmontarModal } from '../components/modal.js';
import { nuevoActionId, fmtPuntos } from './utils.js';
import { cargarItemsDeJuego } from '../games/_shared/index.js';

let cleanupSuscripciones = null;
let intervalId = null;
let intervaloPausa = null;
let _modoEsperaActivo = false;
let cleanupsGameUI = [];

/**
 * Post-procesa un estado resultante de Pictionary:
 * - MOSTRANDO_PALABRA sin palabra_actual → carga la siguiente desde set_actual.
 * - INICIO_RONDA → avanza a SELECCIONANDO_SUBMODO (flujo de submodos).
 * @param {object} Def - PictionaryGameDefinition
 * @param {object} estado
 * @returns {object} Estado listo para guardar
 */
function _postProcesarPictionary(Def, estado) {
  let e = estado;
  if (e.fase === 'MOSTRANDO_PALABRA' && !e.palabra_actual) {
    e = Def.mostrarPalabra(e);
  }
  if (e.fase === 'INICIO_RONDA') {
    e = { ...e, fase: 'SELECCIONANDO_SUBMODO' };
  }
  return e;
}

/**
 * Renderiza el shell completo del conductor de una partida.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { id: partidaId }
 */
export async function renderShellPartida(container, app, params) {
  _limpiarSuscripciones();
  _limpiarGameUIs();
  _limpiarPausaModal();
  _modoEsperaActivo = false;
  app.services.partida.detenerTodosLosHeartbeats();

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

async function _resolverUrlsImagenesMemoria(app, estadoJuego) {
  const mapa = {};
  const elementos = estadoJuego?.elementos || [];
  const refs = [...new Set(
    elementos
      .map((el) => el?.imagen_url)
      .filter((ref) => typeof ref === 'string' && ref !== '' && !ref.startsWith('emoji:'))
  )];
  for (const ref of refs) {
    try {
      const url = await app.storage.obtenerUrlPublica(ref);
      if (url) mapa[ref] = url;
    } catch (_) {}
  }
  return mapa;
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
    app.services.partida.detenerHeartbeat(partidaId);
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
    app.services.partida.detenerHeartbeat(partidaId);
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

  const itemsDelJuego = (codigoJuego === 'QUE_PIENSA_EL_PUBLICO' || codigoJuego === 'TRIVIA' || codigoJuego === 'HISTORIA_ENREDADA' || codigoJuego === 'MEMORIA' || codigoJuego === 'ANTI_TRIVIA' || codigoJuego === 'ENLACES')
    ? await cargarItemsDeJuego(app, juegoActivo)
    : null;

  const setsDisponibles = (codigoJuego === 'TRIVIA' || codigoJuego === 'MEMORIA' || codigoJuego === 'ANTI_TRIVIA' || codigoJuego === 'ENLACES' || codigoJuego === 'ROSCO' || codigoJuego === 'PICTIONARY')
    ? (await app.services.set.listarSetsActivosPorJuego(juegoActivo.juego_id))
      .filter((s) => codigoJuego !== 'PICTIONARY' || !s.submodo || s.submodo === (estadoJuego.submodo_actual || 'PALABRAS'))
    : null;

  const urlsImagenes = codigoJuego === 'MEMORIA'
    ? await _resolverUrlsImagenesMemoria(app, estadoJuego)
    : {};

  const contextoGameUI = {
    partida,
    juegoEjecutado: juegoActivo,
    equipos,
    puedeControlar,
    acVisible: false,
    stateVersion: juegoActivo ? juegoActivo.state_version : null,
    itemsDelJuego,
    setsDisponibles,
    urlsImagenes
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
        } else if (tipo === 'iniciar-juego-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || TriviaGameDefinition.defaultConfig;
          TriviaGameDefinition.validarConfiguracion(config);
          const estadoInicial = TriviaGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, estadoInicial,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-ronda-trivia') {
          const nuevoEstado = { ...estadoJuego, fase: 'SELECCIONANDO_SET' };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-set-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const itemsRaw = await app.services.set.listarItemsDeSet(payload.set.id);
          const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
          const setConItems = { ...payload.set, items };
          const nuevoEstado = TriviaGameDefinition.seleccionarSet(estadoJuego, setConItems);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-tiempo-trivia') {
          const nuevoEstado = { ...estadoJuego, fase: 'SELECCIONANDO_RESPUESTA' };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-opcion-trivia') {
          const ejecutarTrivia = async (juegoRef, estadoRef) => {
            const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
            const nuevoEstado = TriviaGameDefinition.seleccionarOpcion(estadoRef, payload.opcionIndex);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'validar-respuesta-trivia') {
          const ejecutarTrivia = async (juegoRef, estadoRef) => {
            const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || TriviaGameDefinition.defaultConfig;
            const nuevoEstado = TriviaGameDefinition.validarRespuesta(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'pasar-pregunta-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || TriviaGameDefinition.defaultConfig;
          const nuevoEstado = TriviaGameDefinition.pasarPregunta(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'siguiente-pregunta-trivia') {
          const ejecutarTrivia = async (juegoRef, estadoRef) => {
            const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || TriviaGameDefinition.defaultConfig;
            const nuevoEstado = TriviaGameDefinition.siguientePregunta(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'iniciar-turno-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const nuevoEstado = TriviaGameDefinition.cambiarTurno(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-siguiente-ronda-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || TriviaGameDefinition.defaultConfig;
          const nuevoEstado = TriviaGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'time-up-trivia') {
          const { TriviaGameDefinition } = await import('../../games/trivia/TriviaGameDefinition.js');
          const nuevoEstado = TriviaGameDefinition.aplicarTimeUp(estadoJuego);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          MemoriaGameDefinition.validarConfiguracion(config);
          const estadoInicial = MemoriaGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, estadoInicial,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-ronda-memoria') {
          const nuevoEstado = { ...estadoJuego, fase: 'SELECCIONANDO_SET' };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-set-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const itemsRaw = await app.services.set.listarItemsDeSet(payload.set.id);
          const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
          const setConItems = { ...payload.set, items };
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          const nuevoEstado = MemoriaGameDefinition.seleccionarSet(estadoJuego, setConItems, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'confirmar-grilla-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          const nuevoEstado = MemoriaGameDefinition.confirmarGrilla(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'voltear-elemento-memoria') {
          const ejecutarMemoria = async (juegoRef, estadoRef) => {
            const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
            const nuevoEstado = MemoriaGameDefinition.voltearElemento(estadoRef, payload.indice, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarMemoria(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarMemoria(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'iniciar-turno-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          const nuevoEstado = MemoriaGameDefinition.iniciarTurno(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'cambiar-turno-manual-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          // Acepta { equipo } (legacy) o { valor } (descriptor selector — 8.5c.1).
          const equipoRaw = payload.equipo ?? payload.valor;
          const equipo = Number(equipoRaw);
          if (equipo !== 1 && equipo !== 2) return;
          const nuevoEstado = MemoriaGameDefinition.cambiarTurno(estadoJuego, config, equipo);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-siguiente-ronda-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          const nuevoEstado = MemoriaGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'time-up-memoria') {
          const { MemoriaGameDefinition } = await import('../../games/memoria/MemoriaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || MemoriaGameDefinition.defaultConfig;
          const nuevoEstado = MemoriaGameDefinition.aplicarTimeUp(estadoJuego, config);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || EnlacesGameDefinition.defaultConfig;
          EnlacesGameDefinition.validarConfiguracion(config);
          const estadoInicial = EnlacesGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, estadoInicial,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-ronda-enlaces') {
          const nuevoEstado = { ...estadoJuego, fase: 'SELECCIONANDO_SET' };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-set-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const itemsRaw = await app.services.set.listarItemsDeSet(payload.set.id);
          const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
          const setConItems = { ...payload.set, items };
          const config = juegoActivo.configuracion_congelada || EnlacesGameDefinition.defaultConfig;
          const seleccionado = EnlacesGameDefinition.seleccionarSet(estadoJuego, setConItems, config);
          const nuevoEstado = EnlacesGameDefinition.prepararTablero(seleccionado, undefined, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'mover-elemento-enlaces') {
          const ejecutarEnlaces = async (juegoRef, estadoRef) => {
            const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
            const nuevoEstado = EnlacesGameDefinition.moverElemento(estadoRef, payload.desdeIdx, payload.hastaIdx);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarEnlaces(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarEnlaces(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'deshacer-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const nuevoEstado = EnlacesGameDefinition.deshacerMovimiento(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'validar-enlaces') {
          const ejecutarEnlaces = async (juegoRef, estadoRef) => {
            const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
            const config = juegoRef.configuracion_congelada || EnlacesGameDefinition.defaultConfig;
            const nuevoEstado = EnlacesGameDefinition.validar(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarEnlaces(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarEnlaces(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'time-up-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const nuevoEstado = EnlacesGameDefinition.aplicarTimeUp(estadoJuego);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'siguiente-turno-enlaces') {
          const ejecutarEnlaces = async (juegoRef, estadoRef) => {
            const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
            const nuevoEstado = EnlacesGameDefinition.siguienteTurno(estadoRef);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarEnlaces(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarEnlaces(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'iniciar-turno-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || EnlacesGameDefinition.defaultConfig;
          const nuevoEstado = EnlacesGameDefinition.iniciarSiguienteTurno(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-siguiente-ronda-enlaces') {
          const { EnlacesGameDefinition } = await import('../../games/enlaces/EnlacesGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || EnlacesGameDefinition.defaultConfig;
          const nuevoEstado = EnlacesGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
          AntiTriviaGameDefinition.validarConfiguracion(config);
          const estadoInicial = AntiTriviaGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, estadoInicial,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-ronda-antitrivia') {
          const nuevoEstado = { ...estadoJuego, fase: 'SELECCIONANDO_SET' };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-set-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const itemsRaw = await app.services.set.listarItemsDeSet(payload.set.id);
          const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
          const setConItems = { ...payload.set, items };
          const config = juegoActivo.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
          const nuevoEstado = AntiTriviaGameDefinition.seleccionarSet(estadoJuego, setConItems, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-respuesta-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
          const nuevoEstado = AntiTriviaGameDefinition.iniciarRespuesta(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'marcar-acierto-antitrivia') {
          const ejecutarAntiTrivia = async (juegoRef, estadoRef) => {
            const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
            const nuevoEstado = AntiTriviaGameDefinition.marcarAcierto(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarAntiTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarAntiTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'marcar-error-antitrivia') {
          const ejecutarAntiTrivia = async (juegoRef, estadoRef) => {
            const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
            const nuevoEstado = AntiTriviaGameDefinition.marcarError(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarAntiTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarAntiTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'time-up-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const nuevoEstado = AntiTriviaGameDefinition.aplicarTimeUp(estadoJuego);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'jugador-respondio-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const nuevoEstado = AntiTriviaGameDefinition.confirmarRespuestaMencionada(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'no-respondio-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const nuevoEstado = AntiTriviaGameDefinition.confirmarSinRespuesta(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'siguiente-pregunta-antitrivia') {
          const ejecutarAntiTrivia = async (juegoRef, estadoRef) => {
            const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
            const config = juegoRef.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
            const nuevoEstado = AntiTriviaGameDefinition.siguientePregunta(estadoRef, config);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarAntiTrivia(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarAntiTrivia(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'iniciar-turno-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const nuevoEstado = AntiTriviaGameDefinition.cambiarTurno(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-siguiente-ronda-antitrivia') {
          const { AntiTriviaGameDefinition } = await import('../../games/anti-trivia/AntiTriviaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || AntiTriviaGameDefinition.defaultConfig;
          const nuevoEstado = AntiTriviaGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-rosco-con-sets') {
          const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
          const setsPayload = payload.sets;
          if (!Array.isArray(setsPayload) || setsPayload.length === 0) {
            window.alert('Set inválido:\nElegí al menos un set para iniciar');
            return;
          }
          const sets = [];
          for (const s of setsPayload) {
            const setId = typeof s === 'string' ? s : s?.id;
            if (!setId) {
              window.alert('Set inválido:\nFalta el id de un set');
              return;
            }
            const itemsRaw = await app.services.set.listarItemsDeSet(setId);
            const items = itemsRaw
              .sort((a, b) => a.orden - b.orden)
              .map((it) => ({ id: it.id, ...(it.contenido || {}) }));
            sets.push({ id: setId, items });
          }
          const configBase = juegoActivo.configuracion_congelada || RoscoGameDefinition.defaultConfig;
          const config = { ...configBase, rondas: sets.length };
          const validacion = RoscoGameDefinition.validarSetsElegidos(sets, config);
          if (!validacion.ok) {
            window.alert(`Set inválido:\n${validacion.errores.join('\n')}`);
            return;
          }
          const estadoInicial = RoscoGameDefinition.estadoInicial(config, sets);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            estadoInicial,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-turno-rosco') {
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            { ...estadoJuego, fase: 'TURNO_ACTIVO', turno_activo: true },
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'marcar-acierto-rosco') {
          const ejecutarRosco = async (juegoRef, estadoRef) => {
            const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
            const config = juegoRef.configuracion_congelada || RoscoGameDefinition.defaultConfig;
            const letraActual = estadoRef.rosco?.[estadoRef.indice_actual]?.letra;
            if (!letraActual) return;
            let nuevoEstado = RoscoGameDefinition.aplicarAcierto(estadoRef, letraActual, config);
            nuevoEstado = RoscoGameDefinition.avanzarLetra(nuevoEstado);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarRosco(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarRosco(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'marcar-error-rosco') {
          const ejecutarRosco = async (juegoRef, estadoRef) => {
            const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
            const config = juegoRef.configuracion_congelada || RoscoGameDefinition.defaultConfig;
            const letraActual = estadoRef.rosco?.[estadoRef.indice_actual]?.letra;
            if (!letraActual) return;
            let nuevoEstado = RoscoGameDefinition.aplicarError(estadoRef, letraActual, config);
            nuevoEstado = RoscoGameDefinition.cambiarTurno(nuevoEstado);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarRosco(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarRosco(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'pasapalabra-rosco') {
          const ejecutarRosco = async (juegoRef, estadoRef) => {
            const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
            const letraActual = estadoRef.rosco?.[estadoRef.indice_actual]?.letra;
            if (!letraActual) return;
            let nuevoEstado = RoscoGameDefinition.aplicarPasapalabra(estadoRef, letraActual);
            nuevoEstado = RoscoGameDefinition.avanzarLetra(nuevoEstado);
            nuevoEstado = RoscoGameDefinition.cambiarTurno(nuevoEstado);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarRosco(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarRosco(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'saltar-letra-rosco') {
          const ejecutarRosco = async (juegoRef, estadoRef) => {
            const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
            const nuevoEstado = RoscoGameDefinition.avanzarLetra(estadoRef);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarRosco(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarRosco(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'siguiente-equipo-rosco') {
          const ejecutarRosco = async (juegoRef, estadoRef) => {
            const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
            const nuevoEstado = RoscoGameDefinition.cambiarTurno(estadoRef);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoRef.id, nuevoEstado,
              juegoRef.state_version, sessionId, nuevoActionId()
            );
          };
          try {
            await ejecutarRosco(juegoActivo, estadoJuego);
          } catch (err) {
            if (err?.name === 'ConflictoVersionError') {
              const ctx = await app.services.partida.obtenerContextoEspera(partidaId);
              const juegoFresh = ctx.juegos.find((j) => j.id === juegoActivo.id);
              if (!juegoFresh) throw err;
              await ejecutarRosco(juegoFresh, juegoFresh.estado_juego || {});
            } else {
              throw err;
            }
          }
        } else if (tipo === 'siguiente-ronda-rosco') {
          const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
          const siguienteRonda = (estadoJuego.ronda_actual || 1) + 1;
          if (siguienteRonda > (estadoJuego.total_rondas || 1)) {
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoActivo.id,
              { ...estadoJuego, fase: 'FIN_DE_JUEGO' },
              juegoActivo.state_version, sessionId, nuevoActionId()
            );
          } else {
            const contenidoSet = estadoJuego.sets_por_ronda?.[siguienteRonda - 1]
              || { id: null, items: [] };
            const nuevoEstado = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estadoJuego, contenidoSet);
            await app.services.partida.actualizarEstadoJuego(
              partidaId, juegoActivo.id, nuevoEstado,
              juegoActivo.state_version, sessionId, nuevoActionId()
            );
          }
        } else if (tipo === 'time-up-rosco') {
          const { RoscoGameDefinition } = await import('../../games/rosco/RoscoGameDefinition.js');
          const nuevoEstado = RoscoGameDefinition.aplicarTimeUp(estadoJuego);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || CancionIncompletaGameDefinition.defaultConfig;
          CancionIncompletaGameDefinition.validarConfiguracion(config);
          const estadoInicial = CancionIncompletaGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            estadoInicial,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-turno-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const nuevoEstado = CancionIncompletaGameDefinition.iniciarTurno(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'marcar-acierto-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || CancionIncompletaGameDefinition.defaultConfig;
          const nuevoEstado = CancionIncompletaGameDefinition.aplicarAcierto(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'marcar-error-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || CancionIncompletaGameDefinition.defaultConfig;
          const nuevoEstado = CancionIncompletaGameDefinition.aplicarError(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'continuar-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const nuevoEstado = CancionIncompletaGameDefinition.avanzarCancion(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'time-up-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || CancionIncompletaGameDefinition.defaultConfig;
          const nuevoEstado = CancionIncompletaGameDefinition.aplicarTimeUp(estadoJuego, config);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-tiempo-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const nuevoEstado = CancionIncompletaGameDefinition.iniciarTiempo(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'detener-tiempo-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          // segundosRestantes viene en el payload? Por simplicidad, usar tiempo_restante_seg actual
          const segundosRestantes = estadoJuego.tiempo_restante_seg || 0;
          const nuevoEstado = CancionIncompletaGameDefinition.detenerTiempo(estadoJuego, segundosRestantes);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'siguiente-ronda-cancion-incompleta') {
          const { CancionIncompletaGameDefinition } = await import('../../games/cancion-incompleta/CancionIncompletaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || CancionIncompletaGameDefinition.defaultConfig;
          const nuevoEstado = CancionIncompletaGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          PictionaryGameDefinition.validarConfiguracion(config);
          let estadoInicial = PictionaryGameDefinition.estadoInicial(config);
          estadoInicial = _postProcesarPictionary(PictionaryGameDefinition, estadoInicial);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            estadoInicial,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'elegir-submodo-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const nuevoEstado = PictionaryGameDefinition.seleccionarSubmodo(estadoJuego, payload.submodo);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'elegir-set-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          const setMeta = (setsDisponibles || []).find((s) => s.id === payload.set_id);
          if (!setMeta) {
            window.alert('Set no encontrado');
            return;
          }
          const itemsRaw = await app.services.set.listarItemsDeSet(payload.set_id);
          const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
          const setCompleto = { ...setMeta, items, submodo: setMeta.submodo || estadoJuego.submodo_actual };
          const validacion = PictionaryGameDefinition.validarContenidoSet(setCompleto, config, estadoJuego.submodo_actual);
          if (!validacion.ok) {
            window.alert(`Set inválido:\n${validacion.errores.join('\n')}`);
            return;
          }
          let nuevoEstado = PictionaryGameDefinition.seleccionarSet(estadoJuego, setCompleto);
          nuevoEstado = PictionaryGameDefinition.mostrarPalabra(nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-tiempo-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const nuevoEstado = PictionaryGameDefinition.iniciarTiempo(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'marcar-acierto-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          let estadoDetenido = PictionaryGameDefinition.detenerTiempo(estadoJuego, estadoJuego.tiempo_restante_seg || 0);
          let nuevoEstado = PictionaryGameDefinition.aplicarAcierto(estadoDetenido, config);
          nuevoEstado = _postProcesarPictionary(PictionaryGameDefinition, nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'marcar-error-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          let estadoDetenido = PictionaryGameDefinition.detenerTiempo(estadoJuego, estadoJuego.tiempo_restante_seg || 0);
          let nuevoEstado = PictionaryGameDefinition.aplicarError(estadoDetenido, config);
          nuevoEstado = _postProcesarPictionary(PictionaryGameDefinition, nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'pasar-palabra-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          let estadoDetenido = PictionaryGameDefinition.detenerTiempo(estadoJuego, estadoJuego.tiempo_restante_seg || 0);
          let nuevoEstado = PictionaryGameDefinition.aplicarPasar(estadoDetenido, config);
          nuevoEstado = _postProcesarPictionary(PictionaryGameDefinition, nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'siguiente-turno-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          let nuevoEstado = PictionaryGameDefinition.avanzarTurno(estadoJuego, config);
          nuevoEstado = _postProcesarPictionary(PictionaryGameDefinition, nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'siguiente-ronda-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          let nuevoEstado = PictionaryGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          nuevoEstado = _postProcesarPictionary(PictionaryGameDefinition, nuevoEstado);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'aplicar-bonus-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          const equipo = payload.equipo;
          const puntos = payload.puntos || 0;
          if (equipo !== 1 && equipo !== 2) return;
          if (puntos <= 0) return;
          const configConBonus = { ...config, bonus_puntos: puntos };
          const nuevoEstado = PictionaryGameDefinition.aplicarBonus(estadoJuego, configConBonus, equipo);
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'time-up-pictionary') {
          const { PictionaryGameDefinition } = await import('../../games/pictionary/PictionaryGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || PictionaryGameDefinition.defaultConfig;
          const nuevoEstado = PictionaryGameDefinition.aplicarTimeUp(estadoJuego, config);
          if (!nuevoEstado) return;
          await app.services.partida.actualizarEstadoJuego(
            partidaId,
            juegoActivo.id,
            nuevoEstado,
            juegoActivo.state_version,
            sessionId,
            nuevoActionId()
          );
        } else if (tipo === 'iniciar-juego-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || HistoriaEnredadaGameDefinition.defaultConfig;
          HistoriaEnredadaGameDefinition.validarConfiguracion(config);
          const contenidoSet = { items: itemsDelJuego || [] };
          const validacion = HistoriaEnredadaGameDefinition.validarContenidoSet(contenidoSet, config);
          if (!validacion.ok) {
            window.alert('Set inválido:\n' + validacion.errores.join('\n'));
            return;
          }
          const estadoInicial = HistoriaEnredadaGameDefinition.estadoInicial(config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, estadoInicial,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-ronda-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const nuevoEstado = HistoriaEnredadaGameDefinition.iniciarRonda(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'seleccionar-historia-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const set = { items: itemsDelJuego || [] };
          const nuevoEstado = HistoriaEnredadaGameDefinition.seleccionarHistoria(estadoJuego, payload.historiaId, set);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'empezar-actuacion-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const nuevoEstado = HistoriaEnredadaGameDefinition.empezarActuacion(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'empezar-votacion-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const nuevoEstado = HistoriaEnredadaGameDefinition.empezarVotacion(estadoJuego);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'asignar-puntos-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || HistoriaEnredadaGameDefinition.defaultConfig;
          const nuevoEstado = HistoriaEnredadaGameDefinition.asignarPuntos(estadoJuego, config, payload.puntos || 0);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'iniciar-siguiente-ronda-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || HistoriaEnredadaGameDefinition.defaultConfig;
          const nuevoEstado = HistoriaEnredadaGameDefinition.iniciarSiguienteRonda(estadoJuego, config);
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
          );
        } else if (tipo === 'finalizar-historia') {
          const { HistoriaEnredadaGameDefinition } = await import('../../games/historia-enredada/HistoriaEnredadaGameDefinition.js');
          const config = juegoActivo.configuracion_congelada || HistoriaEnredadaGameDefinition.defaultConfig;
          const resultado = HistoriaEnredadaGameDefinition.calcularResultado(estadoJuego, config);
          const nuevoEstado = { ...estadoJuego, fase: 'FIN_DE_JUEGO', resultado };
          await app.services.partida.actualizarEstadoJuego(
            partidaId, juegoActivo.id, nuevoEstado,
            juegoActivo.state_version, sessionId, nuevoActionId()
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
    <div class="min-h-screen flex flex-col relative">
      ${_renderTopBar(partida, juegoActivo, tieneControl, app, partidaId)}
      ${_modoEsperaActivo ? _renderOverlayModoEspera() : ''}
      ${_renderShellTimer(estadoJuego)}
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
    app.services.partida.iniciarHeartbeat(partidaId, sessionId);
    _bindModeracion(container, app, partidaId);
    await _cargarModeracion(container, app, partidaId);
  } else {
    app.services.partida.detenerHeartbeat(partidaId);
  }

  if (gameUI) {
    const gameContainer = container.querySelector('#shell-game-container');
    if (gameUI.renderizarAreaJuego) {
      const cleanupArea = gameUI.renderizarAreaJuego(estadoJuego, gameContainer, contextoGameUI, callbacks);
      if (typeof cleanupArea === 'function') cleanupsGameUI.push(cleanupArea);
    }

    const panelContainer = container.querySelector('#shell-panel-conductor');
    _renderPanelConductor(gameUI, estadoJuego, contextoGameUI, callbacks, panelContainer);
  }

  _bindAcciones(container, app, partidaId, juegoActivo);
}

/* =============================================================
   Panel conductor — contrato `accionesConductor` (8.5a)

   Si el GameUI expone `accionesConductor(estadoJuego, contexto)`,
   el shell renderiza el panel desde los descriptores y bindea
   cada acción a `callbacks.onAccion(accion, payload)`.
   Si no (o devuelve array vacío), fallback al método legacy
   `renderizarPanelConductor` (convivencia — D1/D8).
   ============================================================= */

const VARIANTE_BOTON_CONDUCTOR = {
  primario: 'primary',
  secundario: 'secondary',
  peligro: 'danger',
  fantasma: 'ghost'
};

/**
 * Escapa un valor para interpolar dentro de un atributo HTML
 * entre comillas dobles. El navegador lo decodifica al leer
 * `dataset`, por lo que JSON.parse recupera el texto original.
 * @param {*} valor
 * @returns {string}
 */
function _escapeAttrConductor(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parsea el payload transportado en `data-accion-payload`.
 * @param {string|undefined} texto
 * @returns {object} payload o `{}` si no hay / es inválido.
 */
function _parsearPayloadConductor(texto) {
  if (!texto) return {};
  try {
    const payload = JSON.parse(texto);
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

/**
 * Renderiza un descriptor de tipo botón usando `Boton()`,
 * inyectando `data-accion-conductor` (+ payload si existe).
 * @param {object} d descriptor
 * @returns {string} HTML del botón.
 */
function _renderBotonConductor(d) {
  const html = Boton({
    texto: d.texto,
    variante: VARIANTE_BOTON_CONDUCTOR[d.tipo] || 'primary',
    disabled: !!d.disabled
  });
  const payloadAttr = d.payload !== undefined
    ? ` data-accion-payload="${_escapeAttrConductor(JSON.stringify(d.payload))}"`
    : '';
  return html.replace(
    '<button',
    `<button data-accion-conductor="${_escapeAttrConductor(d.accion)}"${payloadAttr}`
  );
}

/**
 * Renderiza el panel conductor a partir de descriptores de acción.
 * Soporta: botón (`primario`/`secundario`/`peligro`/`fantasma`),
 * `selector`, `input`, `html` (8.5c.1 — inyectado sin escapar,
 * HTML confiable del GameUI) y `mensaje`. Los botones consecutivos se
 * agrupan en una fila flex-wrap.
 *
 * Exportada para tests unitarios (8.5a).
 *
 * @param {Array<object>} acciones descriptores
 * @returns {string} HTML del panel.
 */
export function _renderAccionesConductor(acciones) {
  const partes = [];
  let filaBotones = [];

  const cerrarFila = () => {
    if (filaBotones.length > 0) {
      partes.push(`<div class="flex flex-wrap gap-2">${filaBotones.join('')}</div>`);
      filaBotones = [];
    }
  };

  for (const d of acciones) {
    if (d.tipo === 'mensaje') {
      cerrarFila();
      const clase = d.variante === 'error' ? 'text-error' : 'text-on-surface-variant';
      partes.push(`<p class="font-body-sm ${clase}">${d.texto}</p>`);
    } else if (d.tipo === 'selector') {
      cerrarFila();
      const opciones = (d.opciones || []).map((o) => {
        const seleccionada = String(o.valor) === String(d.valorActual) ? ' selected' : '';
        return `<option value="${_escapeAttrConductor(o.valor)}"${seleccionada}>${o.texto}</option>`;
      }).join('');
      const payloadAttr = d.payload !== undefined
        ? ` data-accion-payload="${_escapeAttrConductor(JSON.stringify(d.payload))}"`
        : '';
      partes.push(`
        <label class="font-label-md uppercase text-on-surface-variant flex items-center gap-2">
          ${d.label || ''}
          <select data-accion-conductor="${_escapeAttrConductor(d.accion)}"${payloadAttr}
            class="border-2 border-on-surface rounded-lg px-2 py-1 bg-surface-container-lowest font-body-md normal-case">${opciones}</select>
        </label>
      `);
    } else if (d.tipo === 'input') {
      cerrarFila();
      const minAttr = d.min !== undefined ? ` min="${_escapeAttrConductor(d.min)}"` : '';
      const maxAttr = d.max !== undefined ? ` max="${_escapeAttrConductor(d.max)}"` : '';
      const payloadAttr = d.payload !== undefined
        ? ` data-accion-payload="${_escapeAttrConductor(JSON.stringify(d.payload))}"`
        : '';
      partes.push(`
        <label class="font-label-md uppercase text-on-surface-variant flex items-center gap-2">
          ${d.label || ''}
          <input type="${d.tipoInput || 'text'}" value="${_escapeAttrConductor(d.valorActual ?? '')}"${minAttr}${maxAttr}${payloadAttr}
            data-accion-conductor="${_escapeAttrConductor(d.accion)}"
            class="border-2 border-on-surface rounded-lg px-2 py-1 bg-surface-container-lowest font-body-md normal-case w-24" />
        </label>
      `);
    } else if (d.tipo === 'html') {
      cerrarFila();
      partes.push(`<div>${d.html}</div>`);
    } else {
      filaBotones.push(_renderBotonConductor(d));
    }
  }
  cerrarFila();

  return `<div class="flex flex-col gap-3">${partes.join('')}</div>`;
}

/**
 * Bindea los `[data-accion-conductor]` generados por
 * `_renderAccionesConductor` a `callbacks.onAccion`.
 * @param {HTMLElement} container panel conductor.
 * @param {object} callbacks callbacks del shell.
 * @returns {void}
 */
function _bindAccionesConductor(container, callbacks) {
  container.querySelectorAll('[data-accion-conductor]').forEach((el) => {
    const accion = el.dataset.accionConductor;

    if (el.tagName === 'BUTTON' || el.tagName === 'DIV') {
      el.addEventListener('click', async () => {
        const payload = _parsearPayloadConductor(el.dataset.accionPayload);
        await callbacks.onAccion(accion, payload);
      });
    } else if (el.tagName === 'SELECT') {
      el.addEventListener('change', async (e) => {
        const payloadBase = _parsearPayloadConductor(el.dataset.accionPayload);
        await callbacks.onAccion(accion, { ...payloadBase, valor: e.target.value });
      });
    } else if (el.tagName === 'INPUT') {
      el.addEventListener('change', async (e) => {
        const payloadBase = _parsearPayloadConductor(el.dataset.accionPayload);
        await callbacks.onAccion(accion, { ...payloadBase, valor: e.target.value });
      });
    }
  });
}

/**
 * Renderiza el panel conductor de un GameUI.
 * Usa `accionesConductor` si existe y devuelve un array no vacío;
 * si no, delega en `renderizarPanelConductor` (legacy).
 * @param {object} gameUI
 * @param {object} estadoJuego
 * @param {object} contexto
 * @param {object} callbacks
 * @param {HTMLElement} panelContainer contenedor `#shell-panel-conductor`.
 * @returns {void}
 */
function _renderPanelConductor(gameUI, estadoJuego, contexto, callbacks, panelContainer) {
  if (typeof gameUI.accionesConductor === 'function') {
    const acciones = gameUI.accionesConductor(estadoJuego, contexto);
    if (Array.isArray(acciones) && acciones.length > 0) {
      panelContainer.innerHTML = _renderAccionesConductor(acciones);
      _bindAccionesConductor(panelContainer, callbacks);
      return;
    }
  }

  if (typeof gameUI.renderizarPanelConductor === 'function') {
    const cleanup = gameUI.renderizarPanelConductor(estadoJuego, panelContainer, contexto, callbacks);
    if (typeof cleanup === 'function') cleanupsGameUI.push(cleanup);
  }
}

/* =============================================================
   Top Bar
   ============================================================= */

function _renderTopBar(partida, juegoActivo, tieneControl, app, partidaId) {
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

  const btnReanudar = tieneControl && juegoActivo?.estado === 'PAUSADO'
    ? Boton({ texto: 'Reanudar', variante: 'ghost', id: 'btn-reanudar' })
    : '';

  const btnModoEspera = tieneControl && juegoActivo?.estado === 'PAUSADO'
    ? Boton({ texto: 'Modo espera', variante: 'secondary', id: 'btn-modo-espera' })
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
    <div id="shell-topbar" class="relative z-[60] h-16 border-b-2.5 border-on-surface bg-surface-container-lowest flex items-center justify-between px-4 gap-4 flex-wrap shrink-0">
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
        ${btnModoEspera}
        ${btnDescartar}
        ${btnFin}
        ${btnPublica}
      </div>
    </div>
  `;
}

/* =============================================================
   Shell Timer
   ============================================================= */

/**
 * Formatea segundos como "SS" (<60) o "MM:SS" (>=60).
 * @param {number} seg
 * @returns {string}
 */
function _formatearTiempo(seg) {
  const segundos = Math.max(0, Math.floor(seg));
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return minutos > 0
    ? `${minutos}:${String(resto).padStart(2, '0')}`
    : String(resto);
}

/**
 * Renderiza el timer unificado de la barra superior (#shell-timer).
 * Solo se muestra si el estado del juego expone `tiempo_restante_seg`
 * (los juegos sin timer, p. ej. Historia Enredada, no lo renderizan).
 * No usa setInterval: el valor se refresca con los re-renders del shell.
 * @param {object} estadoJuego
 * @returns {string} HTML del timer o '' si el juego no tiene tiempo
 */
function _renderShellTimer(estadoJuego) {
  const seg = estadoJuego?.tiempo_restante_seg;
  if (typeof seg !== 'number' || !Number.isFinite(seg) || seg < 0) return '';

  const texto = _formatearTiempo(seg);

  return `<div id="shell-timer" class="border-b-2.5 border-on-surface bg-surface-container-lowest h-10 px-4 flex items-center shrink-0"><span class="font-display-hero text-xl text-primary">${texto}</span></div>`;
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
   Modal de pausa (step 8.3)
   ============================================================= */

/**
 * Limpia el intervalo del contador de pausa, desmonta #modal-pausa
 * y remueve el listener de hashchange. Idempotente.
 * @returns {void}
 */
function _limpiarPausaModal() {
  if (intervaloPausa !== null) {
    clearInterval(intervaloPausa);
    intervaloPausa = null;
  }
  desmontarModal(document.body, 'modal-pausa');
  window.removeEventListener('hashchange', _onHashChangePausa);
}

/**
 * Al navegar (hashchange) con el modal abierto, limpia intervalo + modal
 * (evita huérfanos por navegación).
 * @returns {void}
 */
function _onHashChangePausa() {
  _limpiarPausaModal();
}

/**
 * Abre el modal "JUEGO EN PAUSA" (solo informativo: título + contador,
 * sin botones — D3 de 8.4; toda acción se maneja desde la barra superior).
 * El modal se monta en document.body (sobrevive a los re-renders del
 * polling). Si el contador alcanza `tiempo_max_pausa_seg`, cierra el
 * modal y entra al overlay MODO ESPERA automáticamente (D5, deuda #123).
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} partidaId
 * @returns {Promise<void>}
 */
async function _abrirModalPausa(container, app, partidaId) {
  try {
    const contexto = await app.services.partida.obtenerContextoEspera(partidaId);
    const juegoEnPausa = (contexto.juegos || []).find((j) => {
      if (j.estado !== 'PAUSADO' || !j.pausado_at) return false;
      const t = new Date(j.pausado_at).getTime();
      return Number.isFinite(t);
    });
    if (!juegoEnPausa) return;

    const inicioPausa = new Date(juegoEnPausa.pausado_at).getTime();
    const maxSeg = await app.services.ajustes.obtenerTiempoMaxPausaSeg();

    _limpiarPausaModal();

    montarModal(document.body, {
      id: 'modal-pausa',
      titulo: 'JUEGO EN PAUSA',
      contenido: `
        <p id="pausa-contador" class="font-display-hero text-3xl text-primary"></p>
      `,
      acciones: [],
      cerrable: false
    });

    const pintarContador = () => {
      const transcurrido = Math.max(0, Math.floor((Date.now() - inicioPausa) / 1000));
      if (Number.isFinite(maxSeg) && transcurrido >= maxSeg && !_modoEsperaActivo) {
        _limpiarPausaModal();
        _entrarModoEspera(container, app, partidaId)
          .catch((err) => window.alert(`Error: ${err.message}`));
        return;
      }
      const el = document.body.querySelector('#pausa-contador');
      if (el) el.textContent = _formatearTiempo(transcurrido);
    };
    pintarContador();
    intervaloPausa = setInterval(pintarContador, 1000);

    window.addEventListener('hashchange', _onHashChangePausa);
  } catch (err) {
    window.alert(`Error: ${err.message}`);
  }
}

/* =============================================================
   Modo espera (step 8.4)
   ============================================================= */

/**
 * Overlay MODO ESPERA (estado UI local, no persistido — D1/D2).
 * Cubre todo excepto la barra superior (D4). Sin botón propio (D4).
 * Se renderiza dentro del template del shell (persiste ante re-renders
 * del polling mientras `_modoEsperaActivo` sea true).
 * @returns {string} HTML del overlay
 */
function _renderOverlayModoEspera() {
  return `
    <div id="modo-espera-overlay" class="absolute left-0 right-0 top-16 bottom-0 z-40 bg-black/50 flex items-center justify-center">
      <p class="font-display-hero text-4xl text-white uppercase -rotate-2">MODO ESPERA</p>
    </div>
  `;
}

/**
 * Entra al overlay MODO ESPERA: setea la flag local, limpia el modal
 * de pausa (por si está abierto) y re-renderiza el shell.
 * NO llama a reanudarJuego (D2: el dominio sigue PAUSADO).
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} partidaId
 * @returns {Promise<void>}
 */
async function _entrarModoEspera(container, app, partidaId) {
  _modoEsperaActivo = true;
  _limpiarPausaModal();
  await _renderContenido(container, app, partidaId);
}

/**
 * Sale del overlay MODO ESPERA (flag local). NO llama a reanudarJuego
 * (eso lo hace el handler de #btn-reanudar).
 * @returns {void}
 */
function _salirModoEspera() {
  _modoEsperaActivo = false;
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
        await _abrirModalPausa(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

  const btnReanudar = container.querySelector('#btn-reanudar');
  if (btnReanudar) {
    btnReanudar.addEventListener('click', async () => {
      try {
        _salirModoEspera();
        _limpiarPausaModal();
        await app.services.partida.reanudarJuego(partidaId, juegoActivo.id, sessionId, nuevoActionId());
        await _renderContenido(container, app, partidaId);
      } catch (err) { window.alert(`Error: ${err.message}`); }
    });
  }

  const btnModoEspera = container.querySelector('#btn-modo-espera');
  if (btnModoEspera) {
    btnModoEspera.addEventListener('click', async () => {
      try {
        _limpiarPausaModal();
        await _entrarModoEspera(container, app, partidaId);
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
