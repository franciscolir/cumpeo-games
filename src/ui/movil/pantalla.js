/* =============================================================
   Pantalla Móvil — interfaz del público desde el celular.

   Muestra: header, juego actual, marcador, placeholder para
   acciones futuras (mensajes, fotos).

   Ruta: #/movil/:codigo

   Usa Realtime (Supabase) o setInterval (LocalAdapter) según
   el adapter activo.
   ============================================================= */

let cleanupSuscripciones = null;
let intervalId = null;

/**
 * Renderiza la pantalla móvil.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { codigo: 'ABC123' }
 */
export async function renderPantallaMovil(container, app, params) {
  _limpiarSuscripciones();
  if (intervalId) { clearInterval(intervalId); intervalId = null; }

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
    if (!window.location.hash.match(/^#\/movil\/[^/?]+$/)) {
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

  container.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background">
      ${_renderHeader(partida)}
      <div class="flex-1 flex flex-col">
        ${_renderJuegoActual(partida, juegoActivo)}
        ${_renderMarcador(equipos)}
        ${_renderPlaceholder()}
      </div>
    </div>
  `;
}

/* =============================================================
   Header
   ============================================================= */

function _renderHeader(partida) {
  return `
    <header class="w-full border-b-2.5 border-on-surface bg-surface-container-lowest px-4 py-3 flex items-center justify-between gap-4 shrink-0">
      <div class="flex items-center gap-3">
        <span class="font-display-hero text-2xl text-primary uppercase -rotate-1">CUMPEO</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-comicYellow border-2.5 border-on-surface rounded-lg px-3 py-1 shadow-comic-sm">
          <span class="font-label-sm uppercase text-on-surface-variant">PIN</span>
          <span class="font-display-hero text-lg text-primary ml-2">${partida.public_codigo}</span>
        </div>
      </div>
    </header>
  `;
}

/* =============================================================
   Juego actual
   ============================================================= */

function _renderJuegoActual(partida, juegoActivo) {
  let contenido;

  switch (partida.estado) {
    case 'CONFIGURANDO':
      contenido = `
        <p class="font-body-md text-on-surface-variant italic">La partida comenzará en breve</p>
      `;
      break;
    case 'EN_CURSO':
      if (juegoActivo) {
        const nombre = juegoActivo.juego_nombre || juegoActivo.juego_codigo || 'Juego';
        contenido = `
          <p class="font-headline-md uppercase text-on-surface">${nombre}</p>
          <p class="font-label-md uppercase text-on-surface-variant mt-1">${juegoActivo.estado}</p>
        `;
      } else {
        contenido = `
          <p class="font-body-md text-on-surface-variant italic">Esperando el inicio del juego…</p>
        `;
      }
      break;
    case 'PAUSADO':
      contenido = `
        <p class="font-headline-md uppercase text-on-surface-variant">Partida en pausa</p>
      `;
      break;
    case 'FINALIZADA':
      contenido = `
        <p class="font-headline-md uppercase text-on-surface-variant">Partida finalizada</p>
      `;
      break;
    case 'DESCARTADA':
      contenido = `
        <p class="font-headline-md uppercase text-on-surface-variant">Partida cancelada</p>
      `;
      break;
    default:
      contenido = `
        <p class="font-body-md text-on-surface-variant italic">Esperando el inicio del juego…</p>
      `;
  }

  return `
    <section class="flex items-center justify-center p-6 border-b-2.5 border-on-surface bg-surface">
      <div class="w-full max-w-md bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-6 shadow-comic-lg text-center flex flex-col items-center justify-center min-h-[15vh]">
        ${contenido}
      </div>
    </section>
  `;
}

/* =============================================================
   Marcador
   ============================================================= */

function _renderMarcador(equipos) {
  const equipo1 = equipos[0] || { nombre: '—', puntaje: 0 };
  const equipo2 = equipos[1] || { nombre: '—', puntaje: 0 };

  return `
    <section class="bg-surface-container-lowest px-6 py-4 shrink-0 border-b-2.5 border-on-surface" aria-live="polite">
      <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">Marcador</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="border-3 border-[#00D2FF] bg-[#00D2FF]/15 rounded-xl p-4 text-center">
          <p class="font-label-md uppercase text-on-surface-variant">${equipo1.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${equipo1.puntaje || 0}</p>
        </div>
        <div class="border-3 border-[#FF3344] bg-[#FF3344]/15 rounded-xl p-4 text-center">
          <p class="font-label-md uppercase text-on-surface-variant">${equipo2.nombre}</p>
          <p class="font-comic-score text-5xl text-on-surface mt-1">${equipo2.puntaje || 0}</p>
        </div>
      </div>
    </section>
  `;
}

/* =============================================================
   Placeholder para acciones futuras
   ============================================================= */

function _renderPlaceholder() {
  return `
    <section class="flex-1 flex items-center justify-center p-6 bg-surface">
      <div class="w-full max-w-md text-center">
        <p class="font-body-md text-on-surface-variant italic">Acciones disponibles pronto</p>
      </div>
    </section>
  `;
}
