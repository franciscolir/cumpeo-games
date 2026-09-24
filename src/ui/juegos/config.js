/* =============================================================
   Configuración de Juego — pantalla parametrizada por código.

   Ruta: #/juegos/:codigo/config

   Hoy implementa el editor de bancos de condiciones de Pictionary
   (GESTOS y DIBUJO). Otros juegos muestran un placeholder.

   Estado en container.__configJuegoEstado (precedente deuda #102).
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';

function _mostrarError(container, mensaje) {
  const errorEl = container.querySelector('#config-error');
  if (!errorEl) return;
  errorEl.textContent = mensaje;
  errorEl.classList.remove('hidden');
}

function _ocultarError(container) {
  const errorEl = container.querySelector('#config-error');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
}

function _mostrarOk(container, mensaje) {
  const okEl = container.querySelector('#config-ok');
  if (!okEl) return;
  okEl.textContent = mensaje;
  okEl.classList.remove('hidden');
}

function _ocultarOk(container) {
  const okEl = container.querySelector('#config-ok');
  if (okEl) {
    okEl.classList.add('hidden');
    okEl.textContent = '';
  }
}

function _renderLista(container, banco) {
  const estado = container.__configJuegoEstado;
  const lista = container.querySelector(`#lista-${banco}`);
  if (!lista || !estado) return;

  const condiciones = estado[`condiciones_${banco}`];

  if (condiciones.length === 0) {
    lista.innerHTML = '<li class="font-body-sm text-on-surface-variant italic">Sin condiciones todavía</li>';
    return;
  }

  lista.innerHTML = condiciones.map((texto, i) => `
    <li class="border-2 border-on-surface rounded-lg px-3 py-2 flex justify-between items-center gap-2" data-cond-idx="${i}">
      <span class="font-body-md">${texto}</span>
      <button type="button" data-quitar-${banco}="${i}" title="Eliminar condición"
        class="btn-quitar-cond font-label-sm border-2 border-error rounded px-2 py-1 bg-error/15 text-error hover:bg-error/30 transition">✗</button>
    </li>
  `).join('');

  for (let i = 0; i < condiciones.length; i++) {
    const btn = container.querySelector(`[data-quitar-${banco}="${i}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        estado[`condiciones_${banco}`].splice(i, 1);
        _renderLista(container, banco);
        _ocultarError(container);
        _ocultarOk(container);
      });
    }
  }
}

function _agregarCondicion(container, banco) {
  const estado = container.__configJuegoEstado;
  const input = container.querySelector(`#input-nueva-${banco}`);
  const texto = (input?.value || '').trim();

  _ocultarError(container);
  _ocultarOk(container);

  if (!texto) {
    _mostrarError(container, 'La condición no puede estar vacía');
    return;
  }

  const arr = estado[`condiciones_${banco}`];
  if (arr.some((c) => c === texto)) {
    _mostrarError(container, `La condición "${texto}" ya existe en este banco`);
    return;
  }

  arr.push(texto);
  if (input) input.value = '';
  _renderLista(container, banco);
}

async function _guardar(container, app) {
  const estado = container.__configJuegoEstado;
  _ocultarError(container);
  _ocultarOk(container);

  try {
    await app.services.juego.actualizarConfiguracion(estado.juegoId, {
      condiciones_gestos: [...estado.condiciones_gestos],
      condiciones_dibujo: [...estado.condiciones_dibujo]
    });
    _mostrarOk(container, 'Configuración guardada');
  } catch (err) {
    _mostrarError(container, err.message);
  }
}

function _bindPictionary(container, app) {
  container.querySelector('#btn-agregar-gestos')?.addEventListener('click', () => {
    _agregarCondicion(container, 'gestos');
  });

  container.querySelector('#btn-agregar-dibujo')?.addEventListener('click', () => {
    _agregarCondicion(container, 'dibujo');
  });

  container.querySelector('#input-nueva-gestos')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _agregarCondicion(container, 'gestos');
  });

  container.querySelector('#input-nueva-dibujo')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _agregarCondicion(container, 'dibujo');
  });

  container.querySelector('#btn-guardar-config')?.addEventListener('click', () => _guardar(container, app));

  _renderLista(container, 'gestos');
  _renderLista(container, 'dibujo');
}

/**
 * Renderiza la pantalla de configuración de un juego.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { codigo }
 */
export async function renderConfigJuego(container, app, params = {}) {
  const codigo = params.codigo || '';

  const juego = codigo
    ? await app.services.juego.obtenerJuegoPorCodigo(codigo)
    : null;

  if (!juego) {
    container.innerHTML = `
      <main class="min-h-screen p-6 max-w-3xl mx-auto">
        ${Header({ subtitulo: 'Configuración', volverA: '#/' })}
        <p class="font-body-md text-error">Juego no encontrado.</p>
      </main>
    `;
    bindHeaderListeners(container);
    return;
  }

  const volverA = `#/sets?juego=${encodeURIComponent(juego.id)}`;

  if (codigo !== 'PICTIONARY') {
    container.innerHTML = `
      <main class="min-h-screen p-6 max-w-3xl mx-auto">
        ${Header({ subtitulo: `Configuración — ${juego.nombre}`, volverA })}
        <p class="font-body-md text-on-surface-variant italic">
          Configuración pendiente para este juego.
        </p>
      </main>
    `;
    bindHeaderListeners(container);
    return;
  }

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({ subtitulo: 'Configuración — Pictionary', volverA })}

      <section class="mb-8">
        <h2 class="font-headline-md uppercase mb-2">Bancos de condiciones</h2>
        <p class="font-body-sm text-on-surface-variant mb-4">
          Las condiciones se asignan aleatoriamente a los conceptos durante la
          partida. Podés editarlas libremente.
        </p>
      </section>

      <section class="mb-8" id="banco-gestos">
        <h3 class="font-headline-sm uppercase mb-2">Condiciones para GESTOS</h3>
        <ul id="lista-gestos" class="space-y-2 mb-3"></ul>
        <div class="flex gap-2 items-center">
          <input id="input-nueva-gestos" type="text" placeholder="Ej: Solo manos"
            class="flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none" />
          <button id="btn-agregar-gestos" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">
            + Agregar
          </button>
        </div>
      </section>

      <section class="mb-8" id="banco-dibujo">
        <h3 class="font-headline-sm uppercase mb-2">Condiciones para DIBUJO</h3>
        <ul id="lista-dibujo" class="space-y-2 mb-3"></ul>
        <div class="flex gap-2 items-center">
          <input id="input-nueva-dibujo" type="text" placeholder="Ej: Ojos cerrados"
            class="flex-1 font-body-md border-2.5 border-on-surface rounded-lg px-3 py-2 bg-background focus:outline-none" />
          <button id="btn-agregar-dibujo" type="button"
            class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">
            + Agregar
          </button>
        </div>
      </section>

      <div class="flex gap-3">
        <button id="btn-guardar-config" type="button"
          class="font-label-md uppercase border-2 border-tertiary rounded-lg px-4 py-2 bg-tertiary/15 text-tertiary hover:bg-tertiary/30 transition">
          Guardar configuración
        </button>
        <a href="${volverA}">
          ${Boton({ texto: 'Cancelar', variante: 'ghost' })}
        </a>
      </div>

      <p id="config-error" class="font-body-sm text-error mt-3 hidden"></p>
      <p id="config-ok" class="font-body-sm text-tertiary mt-3 hidden"></p>
    </main>
  `;

  bindHeaderListeners(container);

  const config = (await app.services.juego.obtenerConfiguracion(juego.id)) || {};

  container.__configJuegoEstado = {
    juegoId: juego.id,
    condiciones_gestos: Array.isArray(config.condiciones_gestos)
      ? [...config.condiciones_gestos]
      : [],
    condiciones_dibujo: Array.isArray(config.condiciones_dibujo)
      ? [...config.condiciones_dibujo]
      : []
  };

  _bindPictionary(container, app);
}
