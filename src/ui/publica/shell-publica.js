/* =============================================================
   ShellPublica — estructura visual de la pantalla pública.

   Muestra: header, escenario, galería, anuncio, marcador, QR.
   Layout 2 columnas en lg+ (7/12 izq, 5/12 der).
   Usa Realtime (Supabase) o setInterval (LocalAdapter) según
   el adapter activo.

   Ruta: #/publica-nueva/:codigo
   ============================================================= */

let cleanupSuscripciones = null;
let intervalId = null;
let intervalGaleriaId = null;

/**
 * Renderiza el shell público completo.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { codigo: 'ABC123' }
 */
export async function renderShellPublica(container, app, params) {
  _limpiarSuscripciones();
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (intervalGaleriaId) { clearInterval(intervalGaleriaId); intervalGaleriaId = null; }

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
      ${_renderHeader(partida, juegoActivo)}
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12">
        <div class="lg:col-span-7 flex flex-col border-r-0 lg:border-r-2.5 border-on-surface">
          ${_renderEscenario(juegoActivo)}
          ${_renderGaleria()}
          ${_renderAnuncio(partida, juegoActivo)}
        </div>
        <div class="lg:col-span-5 flex flex-col">
          ${_renderMarcador(equipos)}
          ${_renderQR(partida)}
        </div>
      </div>
    </div>
  `;

  _iniciarRotacionGaleria(container, partida.id, app);
  _generarQR(partida);
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
