/* =============================================================
   ShellPublica — estructura visual de la pantalla pública.

   Muestra: header, escenario, galería, anuncio, marcador, QR.
   Layout 2 columnas en lg+ (7/12 izq, 5/12 der).
   Usa Realtime (Supabase) o setInterval (LocalAdapter) según
   el adapter activo.

   Ruta: #/publica-nueva/:codigo
   ============================================================= */

import { cargarItemsDeJuego } from '../games/_shared/index.js';
import { crearTimer } from '../games/_shared/index.js';
import { ESTADO_LETRA, RoscoGameDefinition } from '../../games/rosco/RoscoGameDefinition.js';
import { renderRosco } from '../games/rosco/renderRosco.js';
import { PictionaryGameDefinition } from '../../games/pictionary/PictionaryGameDefinition.js';
import { AntiTriviaGameDefinition } from '../../games/anti-trivia/AntiTriviaGameDefinition.js';
import { EnlacesGameDefinition } from '../../games/enlaces/EnlacesGameDefinition.js';

let cleanupSuscripciones = null;
let intervalId = null;
let intervalGaleriaId = null;
let mensajesActuales = '';

let _roscoTimerEq1 = null;
let _roscoTimerEq2 = null;
let _roscoTimerRestanteEq1 = 0;
let _roscoTimerRestanteEq2 = 0;

let _ciTimer = null;
let _ciTimerKey = null;

let _picTimer = null;
let _picTimerKey = null;

let _triviaTimer = null;
let _triviaTimerKey = null;

let _antiTriviaTimer = null;

let _enlacesTimer = null;

/**
 * Renderiza el shell público completo.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { codigo: 'ABC123' }
 */
export async function renderShellPublica(container, app, params) {
  _limpiarSuscripciones();
  _limpiarTimerEnlacesPublico();
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (intervalGaleriaId) { clearInterval(intervalGaleriaId); intervalGaleriaId = null; }
  mensajesActuales = '';

  await _renderContenido(container, app, params.codigo);

  if (_adapterSoportaRealtime(app)) {
    _iniciarRealtime(container, app, params.codigo);
  } else {
    _iniciarPolling(container, app, params.codigo);
  }
}

function _adapterSoportaRealtime(app) {
  return app.adapter && app.adapter.modo === 'supabase';
}

async function _iniciarRealtime(container, app, codigo) {
  const partida = await app.services.partida.obtenerPartidaPorCodigo(codigo);
  if (!partida) return;

  const partidaId = partida.id;
  const tablas = ['partidas', 'juego_ejecutados', 'equipo_partidas'];
  const unsubs = await Promise.all(tablas.map((tabla) => {
    const filter = tabla === 'partidas'
      ? `id=eq.${partidaId}`
      : `partida_id=eq.${partidaId}`;
    return app.adapter.suscribir(tabla, { filter }, () => {
      _renderContenido(container, app, codigo);
    });
  }));
  cleanupSuscripciones = () => {
    for (const unsub of unsubs) {
      try { unsub(); } catch (_) {}
    }
  };
}

function _iniciarPolling(container, app, codigo) {
  intervalId = setInterval(async () => {
    if (!window.location.hash.match(/^#\/publica-nueva\/[^/?]+$/)) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    await _renderContenido(container, app, codigo);
  }, 2000);
}

function _limpiarSuscripciones() {
  if (cleanupSuscripciones) {
    cleanupSuscripciones();
    cleanupSuscripciones = null;
  }
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

async function _renderContenido(container, app, codigo) {
  const partida = await app.services.partida.obtenerPartidaPorCodigo(codigo);

  if (!partida) {
    container.innerHTML = `
      <main class="min-h-screen p-6 flex items-center justify-center">
        <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
          <h1 class="font-display-hero text-3xl text-error uppercase">Partida no encontrada</h1>
          <p class="font-body-md text-on-surface-variant mt-4">
            El código <code class="font-label-md">${codigo}</code> no existe o la partida ya terminó.
          </p>
        </div>
      </main>
    `;
    _limpiarSuscripciones();
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    return;
  }

  const contexto = await app.services.partida.obtenerContextoEspera(partida.id);
  const { equipos, juegos } = contexto;

  const juegoActivo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');

  const esQPEP = juegoActivo?.juego_codigo === 'QUE_PIENSA_EL_PUBLICO';
  const esRosco = juegoActivo?.juego_codigo === 'ROSCO';
  const esCancionIncompleta = juegoActivo?.juego_codigo === 'CANCION_INCOMPLETA';
  const esHistoriaEnredada = juegoActivo?.juego_codigo === 'HISTORIA_ENREDADA';
  const esPictionary = juegoActivo?.juego_codigo === 'PICTIONARY';
  const esTrivia = juegoActivo?.juego_codigo === 'TRIVIA';
  const esMemoria = juegoActivo?.juego_codigo === 'MEMORIA';
  const esAntiTrivia = juegoActivo?.juego_codigo === 'ANTI_TRIVIA';
  const esEnlaces = juegoActivo?.juego_codigo === 'ENLACES';
  const itemsQPEP = esQPEP ? await cargarItemsDeJuego(app, juegoActivo) : null;
  const itemsHistoria = esHistoriaEnredada ? await cargarItemsDeJuego(app, juegoActivo) : null;
  const fase = juegoActivo?.estado_juego?.fase || '';
  const mostrarGaleria = !juegoActivo;

  let escenarioHTML;
  if (esRosco) {
    escenarioHTML = _renderEscenarioRosco(juegoActivo, fase, contexto);
  } else if (esQPEP) {
    escenarioHTML = _renderEscenarioQPEP(juegoActivo, itemsQPEP, fase, contexto);
  } else if (esCancionIncompleta) {
    escenarioHTML = _renderEscenarioCancionIncompleta(juegoActivo, fase, contexto);
  } else if (esPictionary) {
    escenarioHTML = _renderEscenarioPictionary(juegoActivo, fase, contexto);
  } else if (esHistoriaEnredada) {
    escenarioHTML = _renderEscenarioHistoriaEnredada(juegoActivo, fase, { ...contexto, itemsDelJuego: itemsHistoria });
  } else if (esTrivia) {
    escenarioHTML = _renderEscenarioTrivia(juegoActivo, fase, contexto);
  } else if (esMemoria) {
    contexto.urlsImagenes = await _resolverUrlsImagenesMemoria(app, juegoActivo?.estado_juego);
    escenarioHTML = _renderEscenarioMemoria(juegoActivo, fase, contexto);
  } else if (esAntiTrivia) {
    escenarioHTML = _renderEscenarioAntiTrivia(juegoActivo, fase, contexto);
  } else if (esEnlaces) {
    escenarioHTML = _renderEscenarioEnlaces(juegoActivo, fase, contexto);
  } else {
    escenarioHTML = _renderEscenario(juegoActivo);
  }

  container.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background">
      ${_renderHeader(partida, juegoActivo)}
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12">
        <div class="lg:col-span-7 flex flex-col border-r-0 lg:border-r-2.5 border-on-surface">
          ${escenarioHTML}
          ${mostrarGaleria ? _renderGaleria() : ''}
          ${_renderAnuncio(partida, juegoActivo)}
        </div>
        <div class="lg:col-span-5 flex flex-col">
          ${_renderMarcador(equipos)}
          ${_renderProximoDesafio(juegos)}
          ${_renderQR(partida)}
        </div>
      </div>
      ${_renderMuroMensajes()}
    </div>
  `;

  _iniciarRotacionGaleria(container, partida.id, app);
  _generarQR(partida);
  await _cargarMuroMensajes(container, app, partida.id);

  if (esRosco && juegoActivo?.estado_juego) {
    _iniciarTimerRoscoPublico(juegoActivo.estado_juego, container);
  }
  if (esCancionIncompleta && juegoActivo?.estado_juego) {
    _iniciarTimerCancionIncompletaPublico(juegoActivo.estado_juego, container);
  }
  if (esPictionary && juegoActivo?.estado_juego) {
    _iniciarTimerPictionaryPublico(juegoActivo.estado_juego, container);
  }
  if (esTrivia && juegoActivo?.estado_juego) {
    _iniciarTimerTriviaPublico(juegoActivo.estado_juego, container);
  }
  if (esAntiTrivia && juegoActivo?.estado_juego) {
    _iniciarTimerAntiTriviaPublico(juegoActivo, container);
  }
  if (esEnlaces && juegoActivo?.estado_juego) {
    _iniciarTimerEnlacesPublico(juegoActivo, container);
  }
}

/* =============================================================
   Header
   ============================================================= */

function _renderHeader(partida, juegoActivo) {
  const estadoMap = {
    CONFIGURANDO: { label: 'CONFIGURANDO', dotColor: 'bg-on-surface-variant' },
    EN_CURSO: { label: 'EN JUEGO', dotColor: 'bg-tertiary' },
    PAUSADO: { label: 'EN PAUSA', dotColor: 'bg-on-error' },
    FINALIZADA: { label: 'FINALIZADO', dotColor: 'bg-on-surface-variant' },
    DESCARTADA: { label: 'CANCELADO', dotColor: 'bg-error' }
  };
  const estado = estadoMap[partida.estado] || estadoMap.CONFIGURANDO;

  return `
    <header class="w-full border-b-2.5 border-on-surface bg-surface-container-lowest px-4 py-3 flex items-center justify-between gap-4 shrink-0">
      <div class="flex items-center gap-3">
        <span class="font-display-hero text-2xl text-primary uppercase -rotate-1">CUMPEO</span>
        <span class="bg-comicYellow border-2.5 border-on-surface rounded-lg px-2.5 py-1 font-label-md uppercase flex items-center gap-1.5 shadow-comic-sm">
          <span class="w-2.5 h-2.5 rounded-full ${estado.dotColor} pulse-dot" aria-hidden="true"></span>
          <span>${estado.label}</span>
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-lg px-3 py-1 shadow-comic-sm">
          <span class="font-label-sm uppercase text-on-surface-variant">PIN</span>
          <span class="font-display-hero text-xl text-primary ml-2">${partida.public_codigo}</span>
        </div>
        <div class="flex items-center gap-1.5 bg-tertiary/15 border-2 border-tertiary rounded-lg px-2.5 py-1">
          <span class="w-2.5 h-2.5 rounded-full bg-tertiary" aria-hidden="true"></span>
          <span class="font-label-md uppercase text-tertiary">ONLINE</span>
        </div>
      </div>
    </header>
  `;
}

/* =============================================================
   Escenario principal
   ============================================================= */

function _renderEscenario(juegoActivo) {
  let contenido;

  if (juegoActivo && juegoActivo.estado === 'EN_CURSO') {
    const nombre = juegoActivo.juego_nombre || juegoActivo.juego_codigo || 'Juego';
    contenido = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">${nombre}</p>
    `;
  } else if (juegoActivo) {
    const nombre = juegoActivo.juego_nombre || juegoActivo.juego_codigo || 'Juego';
    contenido = `
      <p class="font-headline-md uppercase text-on-surface-variant">${nombre}</p>
      <p class="font-label-md uppercase text-on-surface-variant mt-1">${juegoActivo.estado}</p>
    `;
  } else {
    contenido = `
      <p class="font-body-md text-on-surface-variant italic">Esperando el inicio del juego…</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-2xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[25vh]">
        ${contenido}
      </div>
    </section>
  `;
}

/* =============================================================
   Escenario QPEP (por fase)
   ============================================================= */

function _renderEscenarioQPEP(juegoActivo, items, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const idx = estadoJuego.pregunta_actual_index || 0;
  const pregunta = items?.[idx] || null;
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const pron1 = estadoJuego.pronostico_equipo_1 || '';
  const pron2 = estadoJuego.pronostico_equipo_2 || '';
  const resultado = estadoJuego.resultado_publico || '';
  const totalRespuestas = estadoJuego.total_respuestas || 0;
  const respuestas = estadoJuego.respuestas_publico || { a: 0, b: 0 };
  const totalVotos = (respuestas.a || 0) + (respuestas.b || 0) || 1;
  const pctA = Math.round(((respuestas.a || 0) / totalVotos) * 100);
  const pctB = 100 - pctA;

  const acierto1 = pron1 && resultado && pron1 === resultado;
  const acierto2 = pron2 && resultado && pron2 === resultado;

  let inner = '';

  switch (fase) {
    case 'SELECCIONANDO_PREGUNTA':
      inner = `
        <p class="font-headline-md uppercase text-on-surface-variant">Esperando inicio de encuesta</p>
      `;
      break;

    case 'ENCUESTA_ACTIVA': {
      if (!pregunta) {
        inner = `<p class="font-headline-md uppercase text-on-surface-variant">Esperando pregunta…</p>`;
        break;
      }
      inner = `
        <p class="font-label-md uppercase text-on-surface-variant mb-2">📢 Encuesta activa</p>
        <p class="font-display-hero text-4xl text-on-surface mb-6">${pregunta.pregunta}</p>
        <div class="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div class="border-3 border-on-surface rounded-xl p-4 bg-surface-container-lowest text-center">
            <span class="font-display-hero text-2xl text-primary">A</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_a}</p>
          </div>
          <div class="border-3 border-on-surface rounded-xl p-4 bg-surface-container-lowest text-center">
            <span class="font-display-hero text-2xl text-primary">B</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_b}</p>
          </div>
        </div>
      `;
      break;
    }

    case 'ENCUESTA_CERRADA': {
      if (!pregunta) {
        inner = `<p class="font-headline-md uppercase text-on-surface-variant">Esperando pregunta…</p>`;
        break;
      }
      inner = `
        <p class="font-label-md uppercase text-on-surface-variant mb-2">Encuesta cerrada</p>
        <p class="font-display-hero text-4xl text-on-surface mb-6">${pregunta.pregunta}</p>
        <div class="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          <div class="border-3 border-on-surface rounded-xl p-4 bg-surface-container-lowest text-center">
            <span class="font-display-hero text-2xl text-primary">A</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_a}</p>
          </div>
          <div class="border-3 border-on-surface rounded-xl p-4 bg-surface-container-lowest text-center">
            <span class="font-display-hero text-2xl text-primary">B</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_b}</p>
          </div>
        </div>
        <div class="border-2.5 border-on-surface rounded-lg p-4 bg-surface-container-lowest">
          <p class="font-label-md uppercase text-on-surface-variant mb-2">Pronósticos</p>
          <div class="flex justify-around">
            <span class="font-headline-md">${equipo1.nombre}: <strong>${pron1 || '—'}</strong></span>
            <span class="font-headline-md">${equipo2.nombre}: <strong>${pron2 || '—'}</strong></span>
          </div>
        </div>
      `;
      break;
    }

    case 'REVELANDO': {
      if (!pregunta) {
        inner = `<p class="font-headline-md uppercase text-on-surface-variant">Esperando pregunta…</p>`;
        break;
      }
      inner = `
        <p class="font-label-md uppercase text-on-surface-variant mb-2">Resultado</p>
        <p class="font-display-hero text-4xl text-on-surface mb-4">${pregunta.pregunta}</p>
        <div class="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          <div class="border-3 ${resultado === 'A' ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 text-center">
            <span class="font-display-hero text-2xl ${resultado === 'A' ? 'text-tertiary' : 'text-primary'}">A</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_a}</p>
            <p class="font-label-md text-on-surface-variant mt-1">${pctA}% (${respuestas.a || 0})</p>
          </div>
          <div class="border-3 ${resultado === 'B' ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 text-center">
            <span class="font-display-hero text-2xl ${resultado === 'B' ? 'text-tertiary' : 'text-primary'}">B</span>
            <p class="font-headline-md mt-2">${pregunta.opcion_b}</p>
            <p class="font-label-md text-on-surface-variant mt-1">${pctB}% (${respuestas.b || 0})</p>
          </div>
        </div>
        <div class="border-3 border-tertiary rounded-xl p-6 bg-tertiary/15 text-center mb-4">
          <p class="font-label-md uppercase text-on-surface-variant">Resultado del público</p>
          <p class="font-display-hero text-4xl text-primary">${resultado}</p>
          <p class="font-body-md text-on-surface-variant">${totalRespuestas} respuestas</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="border-2.5 ${acierto1 ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-lg p-4 text-center">
            <p class="font-headline-sm">${equipo1.nombre}</p>
            <p class="font-body-md">Pronóstico: ${pron1 || '—'}</p>
            <p class="${acierto1 ? 'text-tertiary font-bold' : 'text-on-surface-variant'}">
              ${acierto1 ? '✓ Acertó' : '✗ No acertó'}
            </p>
          </div>
          <div class="border-2.5 ${acierto2 ? 'border-tertiary bg-tertiary/15' : 'border-on-surface bg-surface-container-lowest'} rounded-lg p-4 text-center">
            <p class="font-headline-sm">${equipo2.nombre}</p>
            <p class="font-body-md">Pronóstico: ${pron2 || '—'}</p>
            <p class="${acierto2 ? 'text-tertiary font-bold' : 'text-on-surface-variant'}">
              ${acierto2 ? '✓ Acertó' : '✗ No acertó'}
            </p>
          </div>
        </div>
      `;
      break;
    }

    case 'FIN_DE_JUEGO': {
      const pts1 = estadoJuego.puntos_equipo_1 || 0;
      const pts2 = estadoJuego.puntos_equipo_2 || 0;
      inner = `
        <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
            <p class="font-headline-md">${equipo1.nombre}</p>
            <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
          </div>
          <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
            <p class="font-headline-md">${equipo2.nombre}</p>
            <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
          </div>
        </div>
      `;
      break;
    }

    default:
      inner = `
        <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
        <p class="font-headline-md uppercase text-on-surface">${juegoActivo?.juego_nombre || 'Juego'}</p>
      `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-2xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[25vh]">
        ${inner}
      </div>
    </section>
  `;
}

/* =============================================================
   Escenario Rosco (público)
   ============================================================= */

/**
 * Obtiene el item (definición/respuesta) de la letra actual
 * desde set_ronda_actual.items.
 * @param {object} estadoJuego
 * @returns {object|null}
 */
export function _obtenerItemRosco(estadoJuego) {
  const letraActual = estadoJuego?.rosco?.[estadoJuego.indice_actual]?.letra;
  if (!letraActual) return null;
  const items = estadoJuego?.set_ronda_actual?.items || [];
  return items.find((it) => it.letra === letraActual) || null;
}

export function _renderRoscoPublico(estadoJuego) {
  const itemActual = _obtenerItemRosco(estadoJuego);
  const respuesta = itemActual?.respuesta || '';
  const letraEstado = estadoJuego?.rosco?.[estadoJuego.indice_actual]?.estado;
  const esResuelta = letraEstado === ESTADO_LETRA.CORRECTA
    || letraEstado === ESTADO_LETRA.INCORRECTA;

  return renderRosco(estadoJuego, {
    mostrarRespuesta: esResuelta && !!respuesta,
    respuesta,
    mostrarLeyenda: true,
    mostrarAnillo: true,
    tamañoLetra: 'lg'
  });
}

function _renderEscenarioRosco(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;

  const rosco = estadoJuego.rosco || [];
  const resueltas = rosco.filter((l) => l.estado === ESTADO_LETRA.CORRECTA || l.estado === ESTADO_LETRA.INCORRECTA).length;
  const total = rosco.length || 27;

  let tiempo1 = estadoJuego.tiempo_equipo_1 ?? 60;
  let tiempo2 = estadoJuego.tiempo_equipo_2 ?? 60;

  if (fase === 'TURNO_ACTIVO') {
    tiempo1 = equipoActual === 1 ? (_roscoTimerRestanteEq1 || tiempo1) : tiempo1;
    tiempo2 = equipoActual === 2 ? (_roscoTimerRestanteEq2 || tiempo2) : tiempo2;
  }

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Rosco</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio del turno…</p>' : ''}
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
        </div>
      </div>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const resultado = RoscoGameDefinition?.calcularResultado(estadoJuego) || {};
    const ganador = resultado.ganador;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
          <p class="font-label-md text-on-surface-variant">${estadoJuego.letras_completadas_equipo_1 || 0} letras</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
          <p class="font-label-md text-on-surface-variant">${estadoJuego.letras_completadas_equipo_2 || 0} letras</p>
        </div>
      </div>
    `;
  } else {
    const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
    const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

    inner = `
      <div class="bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-6 shadow-comic-lg">
        ${_renderRoscoPublico(estadoJuego)}
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4 w-full max-w-lg">
        <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo1.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          <p class="font-display-hero text-lg ${equipoActual === 1 ? 'text-tertiary' : 'text-on-surface-variant'}">${tiempo1}s</p>
        </div>
        <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo2.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          <p class="font-display-hero text-lg ${equipoActual === 2 ? 'text-tertiary' : 'text-on-surface-variant'}">${tiempo2}s</p>
        </div>
      </div>

      <div class="mt-3 font-label-md text-on-surface-variant">
        Ronda ${ronda} / ${totalRondas} · ${resueltas}/${total} resueltas
      </div>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-2xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[25vh]">
        ${inner}
      </div>
    </section>
  `;
}

function _iniciarTimerRoscoPublico(estadoJuego, container) {
  _limpiarTimerRoscoPublico();

  const fase = estadoJuego?.fase || '';
  const equipoActual = estadoJuego?.equipo_actual || 1;
  const segundosEq1 = estadoJuego?.tiempo_equipo_1 ?? 60;
  const segundosEq2 = estadoJuego?.tiempo_equipo_2 ?? 60;

  if (fase !== 'TURNO_ACTIVO') return;

  if (equipoActual === 1) {
    _roscoTimerRestanteEq1 = segundosEq1;
    _roscoTimerEq1 = crearTimer({
      duracionSeg: segundosEq1,
      onTick: (restante) => {
        _roscoTimerRestanteEq1 = restante;
        const el = container.querySelector('#rosco-pub-timer-eq1');
        if (el) el.textContent = `${restante}s`;
      },
      onCierre: () => { _roscoTimerRestanteEq1 = 0; }
    });
    _roscoTimerEq1.iniciar();
  } else {
    _roscoTimerRestanteEq2 = segundosEq2;
    _roscoTimerEq2 = crearTimer({
      duracionSeg: segundosEq2,
      onTick: (restante) => {
        _roscoTimerRestanteEq2 = restante;
        const el = container.querySelector('#rosco-pub-timer-eq2');
        if (el) el.textContent = `${restante}s`;
      },
      onCierre: () => { _roscoTimerRestanteEq2 = 0; }
    });
    _roscoTimerEq2.iniciar();
  }
}

function _limpiarTimerRoscoPublico() {
  _roscoTimerEq1?.cancelar();
  _roscoTimerEq2?.cancelar();
  _roscoTimerEq1 = null;
  _roscoTimerEq2 = null;
}

function _iniciarTimerCancionIncompletaPublico(estadoJuego, container) {
  _limpiarTimerCancionIncompletaPublico();

  const fase = estadoJuego?.fase || '';
  const timerCorriendo = !!estadoJuego?.timer_corriendo;
  const tiempoRestante = estadoJuego?.tiempo_restante_seg ?? 60;

  const el = container.querySelector('#ci-timer-publico');
  if (!el) return;

  if (fase !== 'TURNO_ACTIVO' || !timerCorriendo) {
    el.textContent = `${tiempoRestante}s`;
    return;
  }

  _ciTimer = crearTimer({
    duracionSeg: tiempoRestante,
    onTick: (restante) => {
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: () => {
      if (el) el.textContent = '0s';
    }
  });
  _ciTimer.iniciar();
}

function _limpiarTimerCancionIncompletaPublico() {
  _ciTimer?.cancelar();
  _ciTimer = null;
}

/* =============================================================
   Escenario Pictionary (público)
   ============================================================= */

const _NOMBRE_MODOS_PIC = {
  1: 'Palabras prohibidas',
  2: 'Gestos',
  3: 'Dibujo',
  4: 'Preguntas sí/no'
};

function _renderEscenarioPictionary(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const modo = estadoJuego.modo_actual || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;

  const concepto = estadoJuego.palabra_actual?.concepto || '';
  const prohibidas = estadoJuego.prohibidas_actuales || [];
  const timerCorriendo = !!estadoJuego.timer_corriendo;
  const tiempoRestante = estadoJuego.tiempo_restante_seg ?? 60;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

  let indicadorModo = '';
  if (modo === 2) {
    indicadorModo = '<p class="font-body-md text-on-surface-variant italic mt-2">El representante usa gestos.</p>';
  } else if (modo === 3) {
    indicadorModo = '<p class="font-body-md text-on-surface-variant italic mt-2">Dibujando en pizarra física.</p>';
  } else if (modo === 4) {
    indicadorModo = '<p class="font-body-md text-on-surface-variant italic mt-2">Adivinador de espaldas. Solo sí/no.</p>';
  }

  let prohibidasHTML = '';
  if (modo === 1 && prohibidas.length > 0) {
    prohibidasHTML = `
      <div class="mt-3">
        <p class="font-label-md uppercase text-on-surface-variant mb-1">Palabras prohibidas</p>
        <div class="flex flex-wrap gap-1 justify-center">
          ${prohibidas.map((p) => `<span class="bg-error/20 text-error font-label-sm px-2 py-0.5 rounded">${p}</span>`).join('')}
        </div>
      </div>
    `;
  }

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Pictionary</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio del modo…</p>' : ''}
    `;
  } else if (fase === 'MOSTRANDO_PALABRA' || fase === 'ADIVINANDO' || fase === 'ESPERA_VALIDACION') {
    const mostrarTimer = fase === 'ADIVINANDO' && timerCorriendo;
    const timerClase = mostrarTimer ? 'text-tertiary' : 'text-on-surface-variant';

    inner = `
      <div class="text-center">
        <p class="font-label-md uppercase text-on-surface-variant mb-1">Modo ${modo} — ${_NOMBRE_MODOS_PIC[modo] || '?'}</p>
        <p class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas} · ${equipoActivoNombre}</p>
      </div>
      <div class="bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center mt-4">
        ${concepto
          ? `<p class="font-display-hero text-4xl text-on-surface uppercase mb-2">${concepto}</p>`
          : '<p class="font-body-md text-on-surface-variant italic">Esperando palabra…</p>'
        }
        ${prohibidasHTML}
        ${indicadorModo}
        <div class="mt-4">
          <p id="pic-pub-timer" class="font-display-hero text-3xl ${timerClase}">${mostrarTimer ? '' : tiempoRestante + 's'}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 mt-4 w-full max-w-lg">
        <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo1.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts1}</p>
        </div>
        <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-3 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo2.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts2}</p>
        </div>
      </div>
    `;
  } else if (fase === 'CAMBIO_MODO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-4">Cambio de modo</p>
      <p class="font-headline-md uppercase text-on-surface">Siguiente: ${_NOMBRE_MODOS_PIC[modo] || modo}</p>
      <p class="font-body-md text-on-surface-variant mt-2">Equipo: ${equipoActivoNombre}</p>
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
        </div>
      </div>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const resultado = PictionaryGameDefinition?.calcularResultado(estadoJuego) || {};
    const ganador = resultado.ganador;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
        </div>
      </div>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Pictionary</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-2xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[25vh]">
        ${inner}
      </div>
    </section>
  `;
}

function _iniciarTimerPictionaryPublico(estadoJuego, container) {
  _limpiarTimerPictionaryPublico();

  const fase = estadoJuego?.fase || '';
  const timerCorriendo = !!estadoJuego?.timer_corriendo;
  const tiempoRestante = estadoJuego?.tiempo_restante_seg ?? 60;

  const el = container.querySelector('#pic-pub-timer');
  if (!el) return;

  if (fase !== 'ADIVINANDO' || !timerCorriendo) {
    el.textContent = `${tiempoRestante}s`;
    return;
  }

  const juegoId = estadoJuego?.juego_id || '';
  const ronda = estadoJuego?.ronda_actual || 1;
  const modo = estadoJuego?.modo_actual || 1;
  const equipo = estadoJuego?.equipo_actual || 1;
  const key = `${juegoId}:r${ronda}:m${modo}:eq${equipo}`;

  _picTimer = crearTimer({
    duracionSeg: tiempoRestante,
    onTick: (restante) => {
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: () => {
      if (el) el.textContent = '0s';
    }
  });
  _picTimer.iniciarSiCambio(key);
}

function _limpiarTimerPictionaryPublico() {
  _picTimer?.cancelar();
  _picTimer = null;
}

/* =============================================================
   Galería de fotos
   ============================================================= */

function _renderGaleria() {
  return `
    <section class="border-b-2.5 border-on-surface bg-surface px-6 py-4" data-role="galeria">
      <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">Galería</h3>
      <div class="relative bg-surface-container-lowest border-2.5 border-on-surface rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center" data-role="galeria-container">
        <div class="text-center p-6" data-role="galeria-placeholder">
          <span class="material-symbols-outlined text-5xl text-on-surface-variant block mb-2">photo_camera</span>
          <p class="font-body-md text-on-surface-variant">ESPERANDO FOTOS...</p>
        </div>
        <img class="hidden w-full h-auto max-h-[50vh] object-contain" data-role="galeria-img" alt="Foto de la partida" />
        <div class="hidden absolute bottom-2 right-2 bg-on-surface/70 text-background rounded-lg px-2 py-1 font-label-sm" data-role="galeria-contador"></div>
        <div class="hidden absolute bottom-2 left-2 bg-on-surface/70 text-background rounded-lg px-2 py-1 font-label-sm" data-role="galeria-autor"></div>
      </div>
    </section>
  `;
}

async function _iniciarRotacionGaleria(container, partidaId, app) {
  if (intervalGaleriaId) { clearInterval(intervalGaleriaId); intervalGaleriaId = null; }

  if (!app.services.foto) return;

  const fotos = await app.services.foto.listarAprobadasDePartida(partidaId);
  if (!fotos || fotos.length === 0) return;

  const urls = [];
  for (const foto of fotos) {
    const url = await app.services.foto.obtenerUrlPublica(foto.id);
    if (url) urls.push({ url, foto });
  }

  if (urls.length === 0) return;

  const galeriaContainer = container.querySelector('[data-role="galeria-container"]');
  const img = container.querySelector('[data-role="galeria-img"]');
  const placeholder = container.querySelector('[data-role="galeria-placeholder"]');
  const contador = container.querySelector('[data-role="galeria-contador"]');
  const autor = container.querySelector('[data-role="galeria-autor"]');

  if (!galeriaContainer || !img) return;

  let idx = 0;

  function mostrarFoto(i) {
    const { url, foto } = urls[i];
    img.src = url;
    img.alt = `Foto de la partida ${i + 1}/${urls.length}`;
    img.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (contador) {
      contador.textContent = `${i + 1} / ${urls.length}`;
      contador.classList.remove('hidden');
    }
    if (autor && foto.participante_nombre) {
      autor.textContent = foto.participante_nombre;
      autor.classList.remove('hidden');
    } else if (autor) {
      autor.classList.add('hidden');
    }
  }

  mostrarFoto(0);

  if (urls.length > 1) {
    intervalGaleriaId = setInterval(() => {
      idx = (idx + 1) % urls.length;
      mostrarFoto(idx);
    }, 5000);
  }
}

/* =============================================================
   Anuncio
   ============================================================= */

function _renderAnuncio(partida, juegoActivo) {
  let titulo;
  let subtitulo;

  switch (partida.estado) {
    case 'CONFIGURANDO':
      titulo = '¡La partida comenzará en breve!';
      subtitulo = 'Preparate para la diversión.';
      break;
    case 'EN_CURSO':
      titulo = `🎮 ${juegoActivo ? (juegoActivo.juego_nombre || juegoActivo.juego_codigo || 'Juego') : 'Juego'}`;
      subtitulo = '¡Dale todo!';
      break;
    case 'PAUSADO':
      titulo = '⏸️ ¡Partida en pausa!';
      subtitulo = 'Esperando reanudación.';
      break;
    case 'FINALIZADA':
      titulo = '🏆 ¡Partida finalizada!';
      subtitulo = '¡Gracias por participar!';
      break;
    case 'DESCARTADA':
      titulo = 'Partida cancelada';
      subtitulo = '';
      break;
    default:
      titulo = '¡La partida comenzará en breve!';
      subtitulo = '';
  }

  return `
    <section class="bg-comicYellow border-b-2.5 border-on-surface px-6 py-4 shrink-0" role="status" aria-live="polite">
      <h2 class="font-display-hero text-3xl uppercase text-on-surface leading-none">${titulo}</h2>
      ${subtitulo ? `<p class="font-body-md text-on-surface/70 mt-1">${subtitulo}</p>` : ''}
    </section>
  `;
}

/* =============================================================
   Marcador
   ============================================================= */

function _renderMarcador(equipos) {
  const equipo1 = equipos[0] || { nombre: '—', puntaje: 0 };
  const equipo2 = equipos[1] || { nombre: '—', puntaje: 0 };

  const total = (equipo1.puntaje || 0) + (equipo2.puntaje || 0) || 1;
  const pct1 = ((equipo1.puntaje || 0) / total) * 100;
  const pct2 = 100 - pct1;

  return `
    <section class="bg-surface-container-lowest px-6 py-4 shrink-0 border-b-2.5 border-on-surface lg:border-b-0" aria-live="polite">
      <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">Marcador</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-label-md uppercase text-on-surface-variant">${equipo1.nombre}</p>
          <p class="font-comic-score text-7xl text-on-surface mt-1">${equipo1.puntaje || 0}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-label-md uppercase text-on-surface-variant">${equipo2.nombre}</p>
          <p class="font-comic-score text-7xl text-on-surface mt-1">${equipo2.puntaje || 0}</p>
        </div>
      </div>
      <div class="w-full bg-on-surface/10 h-3 rounded-full overflow-hidden flex mt-3">
        <div class="h-full bg-[#00D2FF] transition-all duration-500" style="width: ${pct1}%"></div>
        <div class="h-full bg-[#FF3344] transition-all duration-500" style="width: ${pct2}%"></div>
      </div>
    </section>
  `;
}

/* =============================================================
   Próximo desafío
   ============================================================= */

function _derivarProximoDesafio(juegos) {
  const activo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');
  const pendientes = juegos.filter((j) => j.estado === 'PENDIENTE');
  const total = juegos.length;

  if (!activo && pendientes.length === 0) {
    return {
      ronda: 'ESPERANDO',
      titulo: 'ESPERANDO INICIO DE JUEGO',
      descripcion: 'El anfitrión cargará el primer desafío en breve.'
    };
  }

  if (activo) {
    const idxActivo = juegos.indexOf(activo);
    const siguiente = pendientes[0];
    if (siguiente) {
      const idxSiguiente = juegos.indexOf(siguiente);
      return {
        ronda: `JUEGO ${idxSiguiente + 1} / ${total}`,
        titulo: siguiente.juego_nombre || siguiente.juego_codigo || 'PRÓXIMO DESAFÍO',
        descripcion: 'Prepárate para el siguiente desafío del circuito.'
      };
    }
    return {
      ronda: `ÚLTIMO · ${idxActivo + 1} / ${total}`,
      titulo: 'ÚLTIMO DESAFÍO',
      descripcion: 'Este es el último juego del circuito.'
    };
  }

  const siguiente = pendientes[0];
  if (siguiente) {
    const idx = juegos.indexOf(siguiente);
    return {
      ronda: `JUEGO ${idx + 1} / ${total}`,
      titulo: siguiente.juego_nombre || siguiente.juego_codigo || 'PRÓXIMO DESAFÍO',
      descripcion: 'Prepárate para el siguiente desafío del circuito.'
    };
  }

  return {
    ronda: 'ESPERANDO',
    titulo: 'ESPERANDO INICIO DE JUEGO',
    descripcion: 'El anfitrión cargará el primer desafío en breve.'
  };
}

function _renderProximoDesafio(juegos) {
  const { ronda, titulo, descripcion } = _derivarProximoDesafio(juegos);

  return `
    <section class="bg-comicYellow border-b-2.5 border-on-surface lg:border-b-0 px-6 py-4 shrink-0" data-role="next-challenge-card">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <span class="bg-black text-white font-display-hero text-sm px-2.5 py-0.5 uppercase tracking-wide">
          PRÓXIMO DESAFÍO
        </span>
        <span class="font-display-hero text-xs uppercase text-on-surface bg-white px-2 py-0.5 border-2 border-on-surface" data-role="next-round">
          ${ronda}
        </span>
      </div>
      <h4 class="font-display-hero text-xl text-on-surface uppercase leading-tight" data-role="next-challenge-title">
        ${titulo}
      </h4>
      <p class="font-body-md text-on-surface/80 mt-1 text-sm" data-role="next-challenge-desc">
        ${descripcion}
      </p>
    </section>
  `;
}

/* =============================================================
   QR
   ============================================================= */

function _renderQR(partida) {
  return `
    <section class="bg-surface px-6 py-4 flex flex-col items-center" data-role="qr-section">
      <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">Escaneá para jugar</h3>
      <div class="bg-white border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm" data-role="qr-code"></div>
      <p class="font-label-md text-on-surface-variant mt-2">PIN: <span class="font-display-hero text-lg text-primary">${partida.public_codigo}</span></p>
    </section>
  `;
}

function _generarQR(partida) {
  const qrContainer = document.querySelector('[data-role="qr-code"]');
  if (!qrContainer) return;

  if (typeof window.QRCode === 'undefined') {
    qrContainer.innerHTML = '<p class="font-label-sm text-on-surface-variant text-center">QR no disponible</p>';
    return;
  }

  const url = `${window.location.origin}/#/movil/${partida.public_codigo}`;
  qrContainer.innerHTML = '';
  try {
    new window.QRCode(qrContainer, { text: url, width: 160, height: 160 });
  } catch (_) {
    qrContainer.innerHTML = '<p class="font-label-sm text-on-surface-variant text-center">Error al generar QR</p>';
  }
}

/* =============================================================
   Muro de Mensajes
   ============================================================= */

function _renderMuroMensajes() {
  return `
    <footer id="muro-mensajes" class="w-full bg-black text-comicYellow border-t-4 border-black pt-3 pb-3 overflow-hidden z-20 shrink-0 select-none">
      <div class="marquee-track font-body-md text-lg tracking-wider items-center gap-6">
        <span class="flex items-center gap-3 shrink-0">
          <span class="text-comicRed" aria-hidden="true">★</span>
          ¡Mandá tu mensaje desde el móvil!
        </span>
      </div>
    </footer>
  `;
}

function _renderEscenarioCancionIncompleta(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const cancion = estadoJuego.cancion_actual || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;
  const timerCorriendo = !!estadoJuego.timer_corriendo;
  const tiempoRestante = estadoJuego.tiempo_restante_seg ?? 60;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Canción Incompleta</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio del turno…</p>' : ''}
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
        </div>
      </div>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const resultado = estadoJuego.resultado || {};
    const ganador = resultado.ganador;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
      <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts1}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-headline-md">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${pts2}</p>
        </div>
      </div>
    `;
  } else {
    inner = `
      <div class="text-center">
        <p class="font-display-hero text-5xl text-primary uppercase mb-2">Canción Incompleta</p>
        <p class="font-headline-md uppercase text-on-surface mb-1">Ronda ${ronda} — Canción ${cancion}/2</p>
        <p class="font-body-md text-on-surface-variant">Turno: <span class="font-label-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'}">${equipoActivoNombre}</span></p>
      </div>
      <div id="ci-timer-publico" class="font-display-hero text-4xl text-tertiary mt-4 text-center">${timerCorriendo ? '' : tiempoRestante + 's'}</div>
    `;
  }

  return `
    <div class="flex flex-col items-center gap-6 p-6 text-center">
      ${inner}
      <div class="grid grid-cols-2 gap-4 w-full max-w-lg">
        <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo1.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts1}</p>
        </div>
        <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
          <p class="font-body-md uppercase">${equipo2.nombre}</p>
          <p class="font-display-hero text-3xl text-primary">${pts2}</p>
        </div>
      </div>
    </div>
  `;
}

function _truncarTexto(texto, maxPalabras = 5) {
  const palabras = texto.trim().split(/\s+/);
  if (palabras.length <= maxPalabras) return texto;
  return palabras.slice(0, maxPalabras).join(' ') + '...';
}

async function _cargarMuroMensajes(container, app, partidaId) {
  const mensajes = await app.services.mensaje.listarAprobadosDePartida(partidaId);
  const ultimos = mensajes
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  const firma = ultimos.map(m => m.id).join('|');
  if (firma === mensajesActuales) return;
  mensajesActuales = firma;

  const track = container.querySelector('#muro-mensajes .marquee-track');
  if (!track) return;

  let textos = ultimos.map(m => _truncarTexto(m.texto));
  if (textos.length === 0) {
    textos = ['¡Mandá tu mensaje desde el móvil!'];
  }
  const duplicados = [...textos, ...textos];

  track.innerHTML = duplicados.map(t => `
    <span class="flex items-center gap-3 shrink-0">
      <span class="text-comicRed" aria-hidden="true">★</span>
      ${t}
    </span>
  `).join('');
}

/* =============================================================
   Escenario Historia Enredada (público)
   ============================================================= */

function _renderEscenarioHistoriaEnredada(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;
  const idHistoria = estadoJuego.historia_elegida_id;
  const items = contexto?.itemsDelJuego || [];
  const historia = idHistoria ? items.find((it) => it.id === idHistoria) : null;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

  const dibujoHTML = historia && historia.dibujo
    ? `<img src="${historia.dibujo}" alt="${historia.titulo}" class="max-h-40 mx-auto mb-2 rounded-lg border-2 border-on-surface" />`
    : '';

  const cardHistoria = historia
    ? `
      <div class="bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center max-w-2xl mx-auto">
        <p class="font-label-md uppercase text-on-surface-variant mb-1">Historia elegida</p>
        <p class="font-display-hero text-3xl text-on-surface uppercase mb-2">${historia.titulo}</p>
        <p class="font-body-md text-on-surface-variant">${historia.descripcion}</p>
        ${dibujoHTML}
      </div>
    `
    : '';

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Historia Enredada</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio de ronda…</p>' : ''}
    `;
  } else if (fase === 'SELECCIONANDO_HISTORIA') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Eligiendo historia</p>
      <p class="font-headline-md uppercase text-on-surface">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">Seleccioná una historia de las cartas…</p>
    `;
  } else if (fase === 'PREPARANDO') {
    inner = `
      <p class="font-headline-md uppercase text-on-surface mb-2">Preparando</p>
      ${cardHistoria}
      <p class="font-body-md text-on-surface-variant mt-4">El conductor entrega los papeles al público.</p>
    `;
  } else if (fase === 'ACTUANDO') {
    inner = `
      <p class="font-headline-md uppercase text-on-surface mb-2">¡Actuando!</p>
      ${cardHistoria}
      <p class="font-body-md text-on-surface-variant mt-4">El equipo lee los papeles en voz alta.</p>
    `;
  } else if (fase === 'VOTANDO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">¡Aplaudí!</p>
      ${cardHistoria}
      <p class="font-body-md text-on-surface-variant mt-4">El conductor asigna los puntos según los aplausos.</p>
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const ganador = pts1 > pts2 ? 1 : pts2 > pts1 ? 2 : null;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Historia Enredada</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-3xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[30vh]">
        ${inner}
        <div class="grid grid-cols-2 gap-4 w-full max-w-lg mt-6">
          <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* =============================================================
   Escenario Trivia (público)
   ============================================================= */

const LETRAS_TRIVIA = ['A', 'B', 'C', 'D', 'E', 'F'];

const NOMBRE_FASES_TRIVIA = {
  INICIO_RONDA: 'Inicio de ronda',
  SELECCIONANDO_SET: 'Seleccionando set',
  MOSTRANDO_PREGUNTA: 'Mostrando pregunta',
  SELECCIONANDO_RESPUESTA: 'Seleccionando respuesta',
  MOSTRANDO_RESULTADO: 'Mostrando resultado',
  CAMBIO_TURNO: 'Cambio de turno',
  FIN_DE_RONDA: 'Fin de ronda',
  FIN_DE_JUEGO: 'Fin de juego'
};

function _renderEscenarioTrivia(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Trivia</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio de ronda…</p>' : ''}
    `;
  } else if (fase === 'SELECCIONANDO_SET') {
    inner = `
      <p class="font-headline-md uppercase text-on-surface mb-2">Seleccionando set</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">El conductor elige un set para el equipo…</p>
    `;
  } else if (fase === 'MOSTRANDO_PREGUNTA' || fase === 'SELECCIONANDO_RESPUESTA' || fase === 'MOSTRANDO_RESULTADO') {
    const preguntas = equipoActual === 1 ? (estadoJuego.preguntas_equipo_1 || []) : (estadoJuego.preguntas_equipo_2 || []);
    const idx = estadoJuego.pregunta_actual_index || 0;
    const pregunta = preguntas[idx];
    const opciones = pregunta?.opciones || [];
    const seleccionada = estadoJuego.opcion_seleccionada;
    const esRespuesta = fase === 'SELECCIONANDO_RESPUESTA';
    const esResultado = fase === 'MOSTRANDO_RESULTADO';

    const gridCols = opciones.length <= 4 ? 'grid-cols-2' : 'grid-cols-1';

    const opcionesHTML = opciones.map((texto, i) => {
      let claseFondo = 'bg-surface-container-lowest border-on-surface';
      if (esResultado && pregunta && i === pregunta.respuesta_correcta_index) {
        claseFondo = 'bg-tertiary/20 border-tertiary';
      } else if (esResultado && i === seleccionada && seleccionada !== pregunta?.respuesta_correcta_index) {
        claseFondo = 'bg-error/20 border-error';
      }

      return `
        <div class="border-2.5 ${claseFondo} rounded-xl p-4 text-center shadow-comic-sm transition">
          <span class="font-display-hero text-lg text-primary">${LETRAS_TRIVIA[i] || i + 1}</span>
          <p class="font-body-md text-on-surface mt-1">${texto}</p>
        </div>
      `;
    }).join('');

    let timerHTML = '';
    if (esRespuesta) {
      const config = juegoActivo?.configuracion_congelada || {};
      const segundos = config?.tiempo_por_pregunta_seg || 30;
      timerHTML = `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm text-center">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="trivia-pub-timer" class="font-display-hero text-4xl text-primary">${segundos}s</p>
        </div>
      `;
    }

    inner = `
      <div class="w-full max-w-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${preguntas.length}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo: <span class="${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'}">${equipoActivoNombre}</span></span>
        </div>
        <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-6">
          ${pregunta?.pregunta || 'Sin pregunta'}
        </p>
        <div class="grid ${gridCols} gap-3">
          ${opcionesHTML}
        </div>
        ${timerHTML}
      </div>
    `;
  } else if (fase === 'CAMBIO_TURNO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Cambio de turno</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">Prepará el siguiente set…</p>
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const ganador = pts1 > pts2 ? 1 : pts2 > pts1 ? 2 : null;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Trivia</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-3xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[30vh]">
        ${inner}
        <div class="grid grid-cols-2 gap-4 w-full max-w-lg mt-6">
          <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function _renderEscenarioMemoria(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const urlsImagenes = contexto?.urlsImagenes || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;
  const elementos = estadoJuego.elementos || [];
  const volteados = new Set(estadoJuego.elementos_volteados || []);
  const descubiertos = new Set(estadoJuego.elementos_descubiertos || []);
  const parejasEncontradas = estadoJuego.parejas_encontradas || 0;
  const totalParejas = elementos.length / 2;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1
    ? 'border-[#00D2FF] bg-[#00D2FF]/15'
    : 'border-[#FF3344] bg-[#FF3344]/15';

  const cols = elementos.length > 0 ? Math.ceil(Math.sqrt(elementos.length)) : 1;

  const grillaHTML = elementos.map((el, i) => {
    const estaVolteado = volteados.has(i);
    const estaDescubierto = descubiertos.has(i);
    const visible = estaVolteado || estaDescubierto;

    if (visible) {
      const url = el.imagen_url ? (urlsImagenes[el.imagen_url] || el.imagen_url) : null;
      const esEmoji = typeof url === 'string' && url.startsWith('emoji:');
      const contenidoHTML = url
        ? (esEmoji
          ? `<span class="font-display-hero text-4xl text-on-surface">${url.slice(6)}</span>`
          : `<img src="${url}" alt="${el.contenido || ''}" class="max-h-full max-w-full object-contain" />`)
        : `<p class="font-body-md text-on-surface text-center px-1">${el.contenido || '?'}</p>`;
      const claseFondo = estaDescubierto
        ? 'bg-tertiary/20 border-tertiary'
        : 'bg-comicYellow/30 border-comicYellow';
      return `
        <div class="border-2.5 ${claseFondo} rounded-lg p-2 aspect-square flex items-center justify-center overflow-hidden">
          ${contenidoHTML}
        </div>
      `;
    }

    return `
      <div class="border-2.5 border-on-surface bg-on-surface rounded-lg p-2 aspect-square flex items-center justify-center">
        <p class="font-display-hero text-2xl text-background">${i + 1}</p>
      </div>
    `;
  }).join('');

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Memoricé</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio de ronda…</p>' : ''}
    `;
  } else if (fase === 'SELECCIONANDO_SET') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Eligiendo grilla</p>
      <p class="font-body-md text-on-surface-variant mt-2">El conductor elige un set…</p>
    `;
  } else if (fase === 'PREPARANDO_GRILLA') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Preparando grilla</p>
      <p class="font-body-md text-on-surface-variant mt-2">Barajando elementos…</p>
    `;
  } else if (fase === 'JUGANDO' || fase === 'CAMBIO_TURNO') {
    const mostrarTimer = fase === 'JUGANDO' && estadoJuego.timer_activo;
    const timerSeg = estadoJuego.tiempo_restante_seg ?? 20;
    const modal = fase === 'CAMBIO_TURNO'
      ? `<div class="fixed inset-0 bg-on-surface/80 flex items-center justify-center z-50">
           <div class="bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
             <p class="font-display-hero text-4xl text-primary uppercase">Turno de</p>
             <p class="font-display-hero text-5xl text-on-surface uppercase mt-2">${equipoActivoNombre}</p>
           </div>
         </div>`
      : '';

    inner = `
      <div class="text-center mb-4">
        <p class="font-label-md uppercase text-on-surface-variant">
          Ronda ${ronda} / ${totalRondas} · Parejas ${parejasEncontradas} / ${totalParejas}
        </p>
        <p class="font-label-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'}">
          ${equipoActivoNombre}
        </p>
      </div>
      <div class="grid gap-2 mx-auto" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr)); max-width: 700px;">
        ${grillaHTML}
      </div>
      ${mostrarTimer ? `<p id="memoria-timer-publico" class="font-display-hero text-4xl text-tertiary mt-4 text-center">${timerSeg}s</p>` : ''}
      ${modal}
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const ganador = pts1 > pts2 ? 1 : pts2 > pts1 ? 2 : null;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Memoricé</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-4xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[30vh]">
        ${inner}
        <div class="grid grid-cols-2 gap-4 w-full max-w-lg mt-6">
          <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function _iniciarTimerTriviaPublico(estadoJuego, container) {
  _limpiarTimerTriviaPublico();

  const fase = estadoJuego?.fase || '';
  const config = window._triviaConfig || {};
  const tiempoTotal = config?.tiempo_por_pregunta_seg || 30;

  const el = container.querySelector('#trivia-pub-timer');
  if (!el) return;

  if (fase !== 'SELECCIONANDO_RESPUESTA') {
    el.textContent = `${tiempoTotal}s`;
    return;
  }

  const juegoId = estadoJuego?.juego_id || '';
  const equipo = estadoJuego?.equipo_actual || 1;
  const preguntaIdx = estadoJuego?.pregunta_actual_index || 0;
  const key = `${juegoId}:eq${equipo}:p${preguntaIdx}`;

  _triviaTimer = crearTimer({
    duracionSeg: tiempoTotal,
    onTick: (restante) => {
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: () => {
      if (el) el.textContent = '0s';
    }
  });
  _triviaTimer.iniciarSiCambio(key);
}

function _limpiarTimerTriviaPublico() {
  _triviaTimer?.cancelar();
  _triviaTimer = null;
}

/* =============================================================
   Escenario Anti-Trivia (público)

   Ve: pregunta, lista de respuestas correctas a evitar, equipo
   activo, timer, marcador y si la respuesta fue acierto o error.
   NO ve: la respuesta específica que dio el jugador.
   ============================================================= */

function _ultimaRespuestaAntiTrivia(estadoJuego) {
  const idx = estadoJuego.pregunta_actual_index || 0;
  const equipo = estadoJuego.equipo_actual || 1;
  const respuestas = estadoJuego.respuestas || [];
  for (let i = respuestas.length - 1; i >= 0; i--) {
    const r = respuestas[i];
    if (r.pregunta_index === idx && r.equipo === equipo) return r;
  }
  return null;
}

function _renderEscenarioAntiTrivia(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;
  const tiempoAgotado = estadoJuego.tiempo_agotado === true;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1 ? 'border-[#00D2FF] bg-[#00D2FF]/15' : 'border-[#FF3344] bg-[#FF3344]/15';

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Anti-Trivia</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio de ronda…</p>' : ''}
    `;
  } else if (fase === 'SELECCIONANDO_SET') {
    inner = `
      <p class="font-headline-md uppercase text-on-surface mb-2">Seleccionando set</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">El conductor elige un set para el equipo…</p>
    `;
  } else if (fase === 'MOSTRANDO_PREGUNTA' || fase === 'RESPONDIENDO' || fase === 'ESPERA_VALIDACION' || fase === 'MOSTRANDO_RESULTADO') {
    const preguntas = equipoActual === 1 ? (estadoJuego.preguntas_equipo_1 || []) : (estadoJuego.preguntas_equipo_2 || []);
    const idx = estadoJuego.pregunta_actual_index || 0;
    const pregunta = preguntas[idx];
    const respuestasCorrectas = pregunta?.respuestas_correctas || [];

    const listaHTML = respuestasCorrectas.length > 0
      ? `
        <p class="font-label-md uppercase text-on-surface-variant mt-4 mb-2">Respuestas correctas a evitar</p>
        <ul class="flex flex-col gap-1">
          ${respuestasCorrectas.map((r) => `<li class="font-body-md text-on-surface bg-surface-container-high border border-on-surface-variant/40 rounded-md px-3 py-1.5">${r}</li>`).join('')}
        </ul>
      `
      : '';

    let indicadorHTML = '';
    if (fase === 'RESPONDIENDO' && tiempoAgotado) {
      indicadorHTML = `
        <div class="bg-error/20 border-2 border-error rounded-xl p-3 text-center mt-4" data-anti-trivia-tiempo-agotado>
          <p class="font-headline-sm uppercase text-error">Tiempo agotado</p>
        </div>
      `;
    } else if (fase === 'ESPERA_VALIDACION') {
      indicadorHTML = `
        <div class="bg-comicYellow border-2 border-on-surface rounded-xl p-3 text-center mt-4">
          <p class="font-headline-sm uppercase text-on-surface">El conductor está validando…</p>
        </div>
      `;
    } else if (fase === 'MOSTRANDO_RESULTADO') {
      const ultima = _ultimaRespuestaAntiTrivia(estadoJuego);
      if (ultima?.resultado === 'acierto') {
        indicadorHTML = `
          <div class="bg-tertiary/30 border-2 border-tertiary rounded-xl p-3 text-center mt-4" data-anti-trivia-resultado="acierto">
            <p class="font-headline-sm uppercase text-on-surface">¡Acierto!</p>
          </div>
        `;
      } else if (ultima?.resultado === 'error') {
        indicadorHTML = `
          <div class="bg-error/30 border-2 border-error rounded-xl p-3 text-center mt-4" data-anti-trivia-resultado="error">
            <p class="font-headline-sm uppercase text-on-surface">Error</p>
          </div>
        `;
      } else {
        indicadorHTML = `
          <div class="bg-surface-container-high border-2 border-on-surface-variant rounded-xl p-3 text-center mt-4" data-anti-trivia-resultado="sin_respuesta">
            <p class="font-headline-sm uppercase text-on-surface-variant">Sin respuesta</p>
          </div>
        `;
      }
    }

    const timerHTML = fase === 'RESPONDIENDO'
      ? `
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm text-center mt-4">
          <p class="font-label-md uppercase">Tiempo restante</p>
          <p id="anti-trivia-pub-timer" class="font-display-hero text-4xl text-primary">${estadoJuego.tiempo_restante_seg ?? 30}s</p>
        </div>
      `
      : '';

    inner = `
      <div class="w-full max-w-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="font-label-md uppercase text-on-surface-variant">Pregunta ${idx + 1} / ${preguntas.length}</span>
          <span class="font-label-md uppercase text-on-surface-variant">Equipo: <span class="${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'}">${equipoActivoNombre}</span></span>
        </div>
        <p class="font-display-hero text-3xl text-on-surface uppercase leading-tight mb-2">
          ${pregunta?.pregunta || 'Sin pregunta'}
        </p>
        ${listaHTML}
        ${indicadorHTML}
        ${timerHTML}
      </div>
    `;
  } else if (fase === 'CAMBIO_TURNO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Cambio de turno</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">Prepará el siguiente set…</p>
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const resultado = AntiTriviaGameDefinition?.calcularResultado(estadoJuego) || {};
    const ganador = resultado.ganador;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Anti-Trivia</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-3xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[30vh]">
        ${inner}
        <div class="grid grid-cols-2 gap-4 w-full max-w-lg mt-6">
          <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function _iniciarTimerAntiTriviaPublico(juegoActivo, container) {
  _limpiarTimerAntiTriviaPublico();

  const estadoJuego = juegoActivo?.estado_juego || {};
  const fase = estadoJuego.fase || '';
  const config = juegoActivo?.configuracion_congelada || {};
  const tiempoTotal = config?.tiempo_respuesta_seg || 30;

  const el = container.querySelector('#anti-trivia-pub-timer');
  if (!el) return;

  if (fase !== 'RESPONDIENDO' || !estadoJuego.timer_activo || estadoJuego.tiempo_agotado) {
    const restante = estadoJuego.tiempo_agotado
      ? 0
      : (estadoJuego.tiempo_restante_seg ?? tiempoTotal);
    el.textContent = `${restante}s`;
    return;
  }

  const juegoId = estadoJuego.juego_id || juegoActivo?.id || '';
  const equipo = estadoJuego.equipo_actual || 1;
  const preguntaIdx = estadoJuego.pregunta_actual_index || 0;
  const key = `${juegoId}:eq${equipo}:p${preguntaIdx}`;

  _antiTriviaTimer = crearTimer({
    duracionSeg: tiempoTotal,
    onTick: (restante) => {
      if (el) el.textContent = `${restante}s`;
    },
    onCierre: () => {
      if (el) el.textContent = '0s';
    }
  });
  _antiTriviaTimer.iniciarSiCambio(key);
}

function _limpiarTimerAntiTriviaPublico() {
  _antiTriviaTimer?.cancelar();
  _antiTriviaTimer = null;
}

/* =============================================================
   Escenario Enlaces (público)

   Ve: columnas A/B, timer en ORDENANDO, equipo activo,
   indicadores ✓/✗ por fila solo en MOSTRANDO_RESULTADO,
   resultado del turno y marcador.

   NO ve: movimientos. pares_correctos solo se lee internamente
   para calcular los indicadores en MOSTRANDO_RESULTADO y nunca
   se vuelca el mapa al HTML.
   ============================================================= */

function _renderEscenarioEnlaces(juegoActivo, fase, contexto) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const equipo1 = contexto?.equipos?.[0] || { nombre: 'Eq1' };
  const equipo2 = contexto?.equipos?.[1] || { nombre: 'Eq2' };
  const equipoActual = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const totalRondas = estadoJuego.total_rondas || 1;
  const pts1 = estadoJuego.puntos_equipo_1 || 0;
  const pts2 = estadoJuego.puntos_equipo_2 || 0;
  const config = juegoActivo?.configuracion_congelada || {};
  const segundos = config.tiempo_turno_seg || 60;

  const equipoActivoNombre = equipoActual === 1 ? equipo1.nombre : equipo2.nombre;
  const equipoActivoColor = equipoActual === 1
    ? 'border-[#00D2FF] bg-[#00D2FF]/15'
    : 'border-[#FF3344] bg-[#FF3344]/15';

  const columnaA = estadoJuego.columna_a || [];
  const columnaB = estadoJuego.columna_b || [];
  const mostrarIndicadores = fase === 'MOSTRANDO_RESULTADO';
  const pares = mostrarIndicadores ? (estadoJuego.pares_correctos || {}) : {};

  const itemsA = columnaA.map((a, i) => {
    let indicador = '';
    if (mostrarIndicadores) {
      const esAcierto = pares[a] === columnaB[i];
      indicador = esAcierto
        ? '<span class="ml-2 text-tertiary font-bold" data-enlaces-pub-indicador="acierto">✓</span>'
        : '<span class="ml-2 text-error font-bold" data-enlaces-pub-indicador="error">✗</span>';
    }
    return `
      <li class="font-body-md text-on-surface bg-surface-container-high border border-on-surface-variant/40 rounded-md px-3 py-1.5 flex items-center justify-between" data-enlaces-pub-fila-a="${i}">
        <span>${a}</span>${indicador}
      </li>
    `;
  }).join('');

  const itemsB = columnaB.map((b, i) => `
    <li class="font-body-md text-on-surface bg-comicYellow/40 border-2 border-on-surface rounded-md px-3 py-1.5" data-enlaces-pub-fila-b="${i}">
      ${b}
    </li>
  `).join('');

  const tableroHTML = `
    <div class="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto text-left mt-3">
      <div>
        <p class="font-label-md uppercase text-on-surface-variant mb-2">Columna A</p>
        <ul class="flex flex-col gap-1" data-enlaces-pub-columna-a>${itemsA}</ul>
      </div>
      <div>
        <p class="font-label-md uppercase text-on-surface-variant mb-2">Columna B</p>
        <ul class="flex flex-col gap-1" data-enlaces-pub-columna-b>${itemsB}</ul>
      </div>
    </div>
  `;

  let inner = '';

  if (!fase || fase === 'INICIO_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Enlaces</p>
      ${fase === 'INICIO_RONDA' ? '<p class="font-body-md text-on-surface-variant mt-2">Esperando inicio del turno…</p>' : ''}
    `;
  } else if (fase === 'SELECCIONANDO_SET') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Seleccionando set</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">El conductor elige un set para ${equipoActivoNombre}…</p>
    `;
  } else if (fase === 'PREPARANDO_TABLERO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Preparando tablero</p>
      <p class="font-body-md text-on-surface-variant mt-2">Preparando tablero…</p>
    `;
  } else if (fase === 'ORDENANDO') {
    const restante = estadoJuego.tiempo_restante_seg ?? segundos;
    inner = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span class="font-label-md uppercase text-on-surface-variant">Ronda ${ronda} / ${totalRondas}</span>
        <span class="font-label-md uppercase text-on-surface-variant">Equipo: <span class="${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'}">${equipoActivoNombre}</span></span>
      </div>
      <div class="bg-comicYellow border-2.5 border-on-surface rounded-xl p-4 shadow-comic-sm text-center">
        <p class="font-label-md uppercase">Tiempo restante</p>
        <p id="enlaces-pub-timer" class="font-display-hero text-4xl text-primary">${restante}s</p>
      </div>
      ${tableroHTML}
    `;
  } else if (fase === 'ESPERA_VALIDACION') {
    inner = `
      <p class="font-label-md uppercase text-on-surface-variant mb-1">Ronda ${ronda} / ${totalRondas} · ${equipoActivoNombre}</p>
      ${tableroHTML}
      <div class="bg-comicYellow border-2 border-on-surface rounded-xl p-3 text-center mt-4">
        <p class="font-headline-sm uppercase text-on-surface">Esperando validación…</p>
      </div>
    `;
  } else if (fase === 'MOSTRANDO_RESULTADO') {
    const resultado = estadoJuego.resultado_turno;
    inner = `
      <p class="font-label-md uppercase text-on-surface-variant mb-1">Ronda ${ronda} / ${totalRondas} · ${equipoActivoNombre}</p>
      <p class="font-headline-md uppercase text-on-surface mt-2">Resultado del turno</p>
      ${tableroHTML}
      ${resultado
        ? `<p class="font-headline-sm uppercase text-on-surface-variant mt-3" data-enlaces-pub-resultado>Aciertos: ${resultado.aciertos} / ${resultado.total}</p>`
        : ''}
    `;
  } else if (fase === 'CAMBIO_TURNO') {
    inner = `
      <p class="font-display-hero text-4xl text-primary uppercase mb-2">Cambio de turno</p>
      <p class="font-headline-md uppercase ${equipoActual === 1 ? 'text-[#00D2FF]' : 'text-[#FF3344]'} mb-2">Turno de ${equipoActivoNombre}</p>
      <p class="font-body-md text-on-surface-variant mt-2">Prepará el siguiente turno…</p>
    `;
  } else if (fase === 'FIN_DE_RONDA') {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">Fin de ronda</p>
      <p class="font-headline-md uppercase text-on-surface mb-2">Ronda ${ronda} / ${totalRondas}</p>
    `;
  } else if (fase === 'FIN_DE_JUEGO') {
    const resultado = EnlacesGameDefinition?.calcularResultado(estadoJuego) || {};
    const ganador = resultado.ganador;
    let ganadorNombre = 'Empate técnico';
    let ganadorColor = 'text-on-surface-variant';
    if (ganador === 1) { ganadorNombre = equipo1.nombre; ganadorColor = 'text-[#00D2FF]'; }
    else if (ganador === 2) { ganadorNombre = equipo2.nombre; ganadorColor = 'text-[#FF3344]'; }

    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-4">¡Juego terminado!</p>
      <p class="font-headline-md uppercase ${ganadorColor} mb-4">${ganadorNombre}</p>
    `;
  } else {
    inner = `
      <p class="font-display-hero text-5xl text-primary uppercase mb-2">¡A JUGAR!</p>
      <p class="font-headline-md uppercase text-on-surface">Enlaces</p>
    `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-3xl bg-surface-container-lowest border-3 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[30vh]">
        ${inner}
        <div class="grid grid-cols-2 gap-4 w-full max-w-lg mt-6">
          <div class="border-2.5 ${equipoActual === 1 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo1.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts1}</p>
          </div>
          <div class="border-2.5 ${equipoActual === 2 ? equipoActivoColor : 'border-on-surface bg-surface-container-lowest'} rounded-xl p-4 shadow-comic-sm text-center">
            <p class="font-body-md uppercase">${equipo2.nombre}</p>
            <p class="font-display-hero text-3xl text-primary">${pts2}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function _iniciarTimerEnlacesPublico(juegoActivo, container) {
  const estadoJuego = juegoActivo?.estado_juego || {};
  const fase = estadoJuego.fase || '';
  const config = juegoActivo?.configuracion_congelada || {};
  const segundos = config.tiempo_turno_seg || 60;

  const el = container.querySelector('#enlaces-pub-timer');
  if (!el) {
    _limpiarTimerEnlacesPublico();
    return;
  }

  if (fase !== 'ORDENANDO' || estadoJuego.tiempo_agotado) {
    _limpiarTimerEnlacesPublico();
    const restante = estadoJuego.tiempo_agotado
      ? 0
      : (estadoJuego.tiempo_restante_seg ?? segundos);
    el.textContent = `${restante}s`;
    return;
  }

  const juegoId = juegoActivo?.id || estadoJuego.juego_id || '';
  const equipo = estadoJuego.equipo_actual || 1;
  const ronda = estadoJuego.ronda_actual || 1;
  const key = `${juegoId}:eq${equipo}:r${ronda}`;

  if (!_enlacesTimer) {
    _enlacesTimer = crearTimer({
      duracionSeg: segundos,
      onTick: (restante) => {
        const t = container.querySelector('#enlaces-pub-timer');
        if (t) t.textContent = `${restante}s`;
      },
      onCierre: () => {
        const t = container.querySelector('#enlaces-pub-timer');
        if (t) t.textContent = '0s';
      }
    });
  }
  _enlacesTimer.iniciarSiCambio(key);
}

function _limpiarTimerEnlacesPublico() {
  _enlacesTimer?.cancelar();
  _enlacesTimer = null;
}