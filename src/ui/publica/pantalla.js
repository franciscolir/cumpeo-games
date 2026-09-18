/* =============================================================
   Pantalla Pública — vista de solo lectura para el público.
   Acceso vía código público: #/publica/ABC123

   Usa Realtime (Supabase) o setInterval (LocalAdapter) según
   el adapter activo.
   ============================================================= */

let cleanupSuscripciones = null;
let intervalId = null;

/**
 * Renderiza la pantalla pública.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { codigo: 'ABC123' }
 */
export async function renderPantallaPublica(container, app, params) {
  _limpiarSuscripciones();
  if (intervalId) { clearInterval(intervalId); intervalId = null; }

  await _renderContenido(container, app, params.codigo);

  if (_adapterSoportaRealtime(app)) {
    _iniciarRealtime(container, app, params.codigo);
  } else {
    _iniciarPolling(container, app, params.codigo);
  }
}

/**
 * Detecta si el adapter soporta Realtime.
 * @param {object} app
 * @returns {boolean}
 */
function _adapterSoportaRealtime(app) {
  return app.adapter && app.adapter.modo === 'supabase';
}

/**
 * Inicia suscripciones Realtime a las tablas de la pantalla pública.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} codigo
 */
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

/**
 * Inicia polling cada 2s como fallback para LocalAdapter.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} codigo
 */
function _iniciarPolling(container, app, codigo) {
  intervalId = setInterval(async () => {
    if (!window.location.hash.match(/^#\/publica\/[^/?]+$/)) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    await _renderContenido(container, app, codigo);
  }, 2000);
}

/**
 * Limpia las suscripciones Realtime activas.
 */
function _limpiarSuscripciones() {
  if (cleanupSuscripciones) {
    cleanupSuscripciones();
    cleanupSuscripciones = null;
  }
}

/**
 * Renderiza el contenido de la pantalla pública.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} codigo
 */
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
    <main class="min-h-screen p-6">
      <header class="mb-8 text-center">
        <h1 class="font-display-hero text-6xl text-primary uppercase -rotate-1 inline-block">
          CUMPEO
        </h1>
        <p class="font-body-lg text-on-surface-variant mt-2">${partida.circuito_nombre || 'Sin nombre'}</p>
        <p class="font-label-md uppercase text-on-surface-variant mt-1">Código: ${partida.public_codigo}</p>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
        ${equipos.map((e) => `
          <div class="border-2.5 border-on-surface rounded-2xl p-6 bg-surface-container-lowest shadow-comic-lg text-center" style="border-color: ${e.color}">
            <p class="font-headline-lg uppercase text-on-surface-variant mb-4">${e.nombre}</p>
            <p class="font-comic-score text-7xl text-primary">${e.puntaje || 0}</p>
          </div>
        `).join('')}
      </section>

      ${juegoActivo ? `
        <section class="max-w-2xl mx-auto">
          <div class="border-2.5 border-on-surface rounded-2xl p-6 bg-surface-container-lowest shadow-comic-lg text-center">
            <p class="font-label-md uppercase text-on-surface-variant mb-2">Juego en curso</p>
            <p class="font-headline-md uppercase text-tertiary">${juegoActivo.estado}</p>
          </div>
        </section>
      ` : `
        <section class="max-w-2xl mx-auto">
          <div class="border-2.5 border-on-surface rounded-2xl p-6 bg-surface-container-lowest shadow-comic-lg text-center">
            <p class="font-body-md text-on-surface-variant italic">Esperando el inicio del juego…</p>
          </div>
        </section>
      `}
    </main>
  `;
}
