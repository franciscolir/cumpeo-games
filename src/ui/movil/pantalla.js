/* =============================================================
   Pantalla Móvil — interfaz del público desde el celular.

   Muestra: header, juego actual, marcador, placeholder para
   acciones futuras (mensajes, fotos).

   Incluye flujo de identificación con session_token
   persistido en localStorage.

   Ruta: #/movil/:codigo

   Usa Realtime (Supabase) o setInterval (LocalAdapter) según
   el adapter activo.
   ============================================================= */

let cleanupSuscripciones = null;
let intervalId = null;

const ESTADOS_TERMINADOS = ['FINALIZADA', 'DESCARTADA', 'EXPIRADA'];

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
   localStorage helpers
   ============================================================= */

function _claveToken(codigo) {
  return `cumpeo:session_token:${codigo}`;
}

function _leerToken(codigo) {
  try {
    return localStorage.getItem(_claveToken(codigo));
  } catch (_) {
    return null;
  }
}

function _guardarToken(codigo, token) {
  try {
    localStorage.setItem(_claveToken(codigo), token);
  } catch (_) {}
}

function _limpiarToken(codigo) {
  try {
    localStorage.removeItem(_claveToken(codigo));
  } catch (_) {}
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

  if (ESTADOS_TERMINADOS.includes(partida.estado)) {
    container.innerHTML = `
      <div class="min-h-screen flex flex-col bg-background">
        ${_renderHeader(partida)}
        <div class="flex-1 flex flex-col items-center justify-center p-6">
          <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
            <h1 class="font-display-hero text-3xl text-on-surface-variant uppercase">Partida finalizada</h1>
            <p class="font-body-md text-on-surface-variant mt-4 mb-6">Esta partida ya terminó.</p>
            <button id="movil-reidentificar" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition">
              Volver a identificarme
            </button>
          </div>
        </div>
      </div>
    `;
    const btnReidentificar = container.querySelector('#movil-reidentificar');
    if (btnReidentificar) {
      btnReidentificar.addEventListener('click', () => {
        _limpiarToken(codigo);
        _renderContenido(container, app, codigo);
      });
    }
    _limpiarSuscripciones();
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    return;
  }

  if (container.querySelector('#movil-nombre')) return;

  await _identificarParticipante(container, app, partida);
}

/* =============================================================
   Flujo de identificación
   ============================================================= */

async function _identificarParticipante(container, app, partida) {
  const codigo = partida.public_codigo;
  const token = _leerToken(codigo);

  if (token) {
    try {
      const participante = await app.services.participante.obtenerPorSessionToken(token);
      if (participante) {
        const contexto = await app.services.partida.obtenerContextoEspera(partida.id);
        const { equipos, juegos } = contexto;
        const juegoActivo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');
        _renderPantallaPrincipal(container, app, partida, juegoActivo, equipos, participante);
        return;
      }
    } catch (_) {}
    _limpiarToken(codigo);
  }

  const contexto = await app.services.partida.obtenerContextoEspera(partida.id);
  _renderFormulario(container, app, partida, contexto);
}

/* =============================================================
   Formulario de identificación
   ============================================================= */

function _renderFormulario(container, app, partida, contexto) {
  container.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background">
      ${_renderHeader(partida)}
      <div class="flex-1 flex flex-col items-center justify-center p-6">
        <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
          <h2 class="font-headline-md uppercase text-on-surface mb-6">¿Cómo te llamás?</h2>
          <input
            id="movil-nombre"
            type="text"
            placeholder="Tu nombre"
            maxlength="50"
            class="w-full border-2.5 border-on-surface rounded-lg px-4 py-3 font-body-md text-on-surface bg-surface mb-4"
          />
          <p id="movil-error" class="font-label-md text-error mb-2 hidden">Ingresá un nombre</p>
          <button id="movil-continuar" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-6 py-3 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition w-full">
            Continuar
          </button>
        </div>
      </div>
    </div>
  `;

  const input = container.querySelector('#movil-nombre');
  const btnContinuar = container.querySelector('#movil-continuar');
  const errorEl = container.querySelector('#movil-error');

  const submit = () => _enviarFormulario(container, app, partida, contexto);

  btnContinuar.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

async function _enviarFormulario(container, app, partida, contexto) {
  const input = container.querySelector('#movil-nombre');
  const errorEl = container.querySelector('#movil-error');
  const btnContinuar = container.querySelector('#movil-continuar');

  const nombre = (input?.value || '').trim();
  if (!nombre) {
    errorEl?.classList.remove('hidden');
    input?.focus();
    return;
  }
  errorEl?.classList.add('hidden');

  btnContinuar.disabled = true;
  btnContinuar.textContent = 'Uniéndote...';

  try {
    const sessionToken = crypto.randomUUID();
    const equipoAzar = contexto.equipos[Math.floor(Math.random() * contexto.equipos.length)];

    await app.services.participante.crearParticipanteConToken({
      partidaId: partida.id,
      equipoPartidaId: equipoAzar.id,
      nombre,
      sessionToken
    });

    _guardarToken(partida.public_codigo, sessionToken);

    const participante = await app.services.participante.obtenerPorSessionToken(sessionToken);
    const { equipos, juegos } = contexto;
    const juegoActivo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');
    _renderPantallaPrincipal(container, app, partida, juegoActivo, equipos, participante);
  } catch (err) {
    btnContinuar.disabled = false;
    btnContinuar.textContent = 'Continuar';
    errorEl.textContent = err.message || 'Error al unirse';
    errorEl.classList.remove('hidden');
  }
}

/* =============================================================
   Pantalla principal (post-identificación)
   ============================================================= */

function _renderPantallaPrincipal(container, app, partida, juegoActivo, equipos, participante) {
  container.innerHTML = `
    <div class="min-h-screen flex flex-col bg-background">
      ${_renderHeader(partida)}
      <div class="flex-1 flex flex-col">
        ${_renderSaludo(participante)}
        ${_renderJuegoActual(partida, juegoActivo)}
        ${_renderMarcador(equipos)}
        ${_renderFormularioMensaje()}
        ${_renderFormularioFoto()}
      </div>
    </div>
  `;
  _bindFormularioMensaje(container, app, partida, participante);
  _bindFormularioFoto(container, app, partida, participante);
}

function _renderSaludo(participante) {
  const nombre = participante?.nombre || 'Participante';
  return `
    <section class="bg-surface px-6 py-3 border-b-2.5 border-on-surface">
      <p class="font-headline-md text-on-surface">Hola, ${nombre}</p>
    </section>
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
   Formulario de mensajes
   ============================================================= */

function _renderFormularioMensaje() {
  return `
    <section class="px-6 py-4 bg-surface border-b-2.5 border-on-surface">
      <div class="max-w-md mx-auto">
        <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">💬 Enviá un mensaje</h3>
        <textarea
          id="movil-mensaje"
          placeholder="Escribí tu mensaje..."
          maxlength="200"
          rows="3"
          class="w-full border-2.5 border-on-surface rounded-lg px-4 py-3 font-body-md text-on-surface bg-surface-container-lowest resize-none mb-3"
        ></textarea>
        <p id="movil-mensaje-error" class="font-label-md text-error mb-2 hidden">Escribí un mensaje</p>
        <p id="movil-mensaje-confirmacion" class="font-label-md text-tertiary mb-2 hidden">Mensaje enviado. Esperando aprobación.</p>
        <button id="movil-enviar-mensaje" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-6 py-3 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition w-full">
          Enviar
        </button>
      </div>
    </section>
  `;
}

function _bindFormularioMensaje(container, app, partida, participante) {
  const textarea = container.querySelector('#movil-mensaje');
  const btnEnviar = container.querySelector('#movil-enviar-mensaje');
  const errorEl = container.querySelector('#movil-mensaje-error');
  const confirmEl = container.querySelector('#movil-mensaje-confirmacion');
  if (!textarea || !btnEnviar) return;

  const enviar = async () => {
    const texto = (textarea.value || '').trim();
    if (!texto) {
      errorEl?.classList.remove('hidden');
      textarea?.focus();
      return;
    }
    errorEl?.classList.add('hidden');
    confirmEl?.classList.add('hidden');

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
      await app.services.mensaje.crearMensaje({
        partidaId: partida.id,
        participanteId: participante.id,
        texto
      });

      textarea.value = '';
      confirmEl?.classList.remove('hidden');
      btnEnviar.textContent = 'Enviar';

      setTimeout(() => {
        confirmEl?.classList.add('hidden');
        btnEnviar.disabled = false;
      }, 2000);
    } catch (err) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
      errorEl.textContent = err.message || 'Error al enviar';
      errorEl.classList.remove('hidden');
    }
  };

  btnEnviar.addEventListener('click', enviar);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  });
}

/* =============================================================
   Formulario de fotos
   ============================================================= */

function _renderFormularioFoto() {
  return `
    <section class="px-6 py-4 bg-surface border-b-2.5 border-on-surface">
      <div class="max-w-md mx-auto">
        <h3 class="font-headline-md uppercase text-on-surface-variant mb-3">📷 Enviá una foto</h3>
        <input
          type="file"
          id="movil-foto-input"
          accept="image/*"
          class="hidden"
        />
        <button id="movil-foto-elegir" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-6 py-3 bg-surface-container-lowest text-on-surface shadow-comic-sm hover:shadow-comic-md transition w-full mb-3">
          Elegir foto
        </button>
        <div id="movil-foto-preview-container" class="hidden mb-3">
          <img id="movil-foto-preview" class="w-full max-h-48 object-contain rounded-lg border-2.5 border-on-surface" alt="Preview" />
        </div>
        <p id="movil-foto-error" class="font-label-md text-error mb-2 hidden"></p>
        <p id="movil-foto-confirmacion" class="font-label-md text-tertiary mb-2 hidden">Foto enviada. Esperando aprobación.</p>
        <button id="movil-foto-enviar" disabled class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-6 py-3 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition w-full disabled:opacity-50 disabled:cursor-not-allowed">
          Enviar
        </button>
      </div>
    </section>
  `;
}

function _bindFormularioFoto(container, app, partida, participante) {
  const fileInput = container.querySelector('#movil-foto-input');
  const btnElegir = container.querySelector('#movil-foto-elegir');
  const previewContainer = container.querySelector('#movil-foto-preview-container');
  const previewImg = container.querySelector('#movil-foto-preview');
  const btnEnviar = container.querySelector('#movil-foto-enviar');
  const errorEl = container.querySelector('#movil-foto-error');
  const confirmEl = container.querySelector('#movil-foto-confirmacion');
  if (!fileInput || !btnElegir || !btnEnviar) return;

  const MAX_SIZE = 5 * 1024 * 1024;
  let archivoSeleccionado = null;

  btnElegir.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    errorEl?.classList.add('hidden');
    confirmEl?.classList.add('hidden');

    const file = fileInput.files?.[0];
    if (!file) {
      archivoSeleccionado = null;
      previewContainer?.classList.add('hidden');
      btnEnviar.disabled = true;
      return;
    }

    if (!file.type.startsWith('image/')) {
      errorEl.textContent = 'Solo se permiten imágenes';
      errorEl.classList.remove('hidden');
      fileInput.value = '';
      archivoSeleccionado = null;
      previewContainer?.classList.add('hidden');
      btnEnviar.disabled = true;
      return;
    }

    if (file.size > MAX_SIZE) {
      errorEl.textContent = 'La foto es muy grande (máx 5 MB)';
      errorEl.classList.remove('hidden');
      fileInput.value = '';
      archivoSeleccionado = null;
      previewContainer?.classList.add('hidden');
      btnEnviar.disabled = true;
      return;
    }

    archivoSeleccionado = file;
    const url = URL.createObjectURL(file);
    if (previewImg) previewImg.src = url;
    previewContainer?.classList.remove('hidden');
    btnEnviar.disabled = false;
  });

  btnEnviar.addEventListener('click', async () => {
    if (!archivoSeleccionado) return;

    errorEl?.classList.add('hidden');
    confirmEl?.classList.add('hidden');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
      await app.services.foto.crearFoto({
        partidaId: partida.id,
        participanteId: participante.id,
        blob: archivoSeleccionado,
        mimeType: archivoSeleccionado.type
      });

      fileInput.value = '';
      archivoSeleccionado = null;
      previewContainer?.classList.add('hidden');
      if (previewImg) previewImg.src = '';
      confirmEl?.classList.remove('hidden');
      btnEnviar.textContent = 'Enviar';

      setTimeout(() => {
        confirmEl?.classList.add('hidden');
        btnEnviar.disabled = true;
      }, 2000);
    } catch (err) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
      errorEl.textContent = err.message || 'Error al enviar la foto';
      errorEl.classList.remove('hidden');
    }
  });
}
