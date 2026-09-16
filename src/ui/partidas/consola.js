/* =============================================================
   Consola del Conductor — control de una partida en vivo.

   Auto-refresh cada 2s. Limpia el interval al desmontar.
   ============================================================= */

import { Header, bindHeaderListeners } from '../components/header.js';
import { Boton } from '../components/boton.js';
import { Card } from '../components/card.js';
import { nuevoActionId, fmtPuntos } from './utils.js';

let intervalId = null;

/**
 * Renderiza la consola de control de una partida.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {object} params - { id: partidaId }
 */
export async function renderConsolaPartida(container, app, params) {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  await _renderContenido(container, app, params.id);

  intervalId = setInterval(async () => {
    if (!window.location.hash.match(/^#\/partidas\/[^/?]+$/)) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    await _renderContenido(container, app, params.id);
  }, 2000);
}

/**
 * Renderiza el contenido de la consola.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} partidaId
 */
async function _renderContenido(container, app, partidaId) {
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
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    return;
  }

  const { partida, juegos, equipos } = contexto;
  const sessionId = app.session.sessionId;
  const tieneControl = await app.services.partida.verificarControl(partidaId, sessionId);
  const control = await app.services.control.obtenerControl(partidaId);

  const cardControl = _renderCardControl(partida, control, tieneControl, app, partidaId);
  const cardEquipos = _renderCardEquipos(equipos);
  const cardJuego = _renderCardJuego(partida, juegos, tieneControl, app, partidaId);
  const cardAcciones = _renderCardAcciones(partida, tieneControl, app, partidaId);

  container.innerHTML = `
    <main class="min-h-screen p-6 max-w-3xl mx-auto">
      ${Header({ subtitulo: `Partida: ${partida.circuito_nombre || 'Sin nombre'}`, volverA: '#/partidas' })}

      <div class="mb-4 p-3 border-2.5 border-on-surface rounded-lg bg-surface-container-lowest shadow-comic-sm text-center">
        <p class="font-label-md uppercase text-on-surface-variant">Código público</p>
        <p class="font-display-hero text-3xl text-primary">${partida.public_codigo || '—'}</p>
      </div>

      <div class="mb-4 text-center">
        <a href="#/publica/${partida.public_codigo}" target="_blank" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition inline-block">
          Ver pantalla pública ↗
        </a>
      </div>

      <section class="space-y-6">
        ${cardControl}
        ${cardEquipos}
        ${cardJuego}
        ${cardAcciones}
      </section>
    </main>
  `;

  bindHeaderListeners(container);
  _bindAcciones(container, app, partidaId);
}

/**
 * Card de control.
 */
function _renderCardControl(partida, control, tieneControl, app, partidaId) {
  const sessionId = app.session.sessionId;
  let contenido;

  if (tieneControl) {
    contenido = `<p class="font-body-md text-tertiary font-bold">✓ Tenés el control</p>`;
  } else if (control && control.session_id && control.session_id !== sessionId) {
    contenido = `<p class="font-body-md text-on-surface-variant">Controlado por otra sesión.</p>`;
  } else {
    contenido = `
      <button
        data-accion="tomar-control"
        class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition"
      >
        Tomar control
      </button>
    `;
  }

  return Card({
    titulo: 'Control',
    contenido: `
      <p class="font-body-md text-on-surface-variant mb-2">Estado: <span class="font-bold">${partida.estado}</span></p>
      ${contenido}
    `,
    color: tieneControl ? 'tertiary' : 'primary'
  });
}

/**
 * Card de equipos.
 */
function _renderCardEquipos(equipos) {
  const equiposHTML = equipos.map((e) => `
    <div class="flex items-center justify-between border-2 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest">
      <span class="font-body-md">${e.nombre}</span>
      <span class="font-headline-sm">${fmtPuntos(e.puntaje || 0)}</span>
    </div>
  `).join('');

  return Card({
    titulo: 'Equipos',
    contenido: `<div class="space-y-2">${equiposHTML}</div>`,
    color: 'secondary-container'
  });
}

/**
 * Card del juego activo.
 */
function _renderCardJuego(partida, juegos, tieneControl, app, partidaId) {
  if (partida.estado === 'CONFIGURANDO') {
    return Card({
      titulo: 'Juego',
      contenido: `<p class="font-body-md text-on-surface-variant italic">La partida aún no comenzó.</p>`,
      color: 'surface-container-lowest'
    });
  }

  const activo = juegos.find((j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO');
  const pendiente = juegos.find((j) => j.estado === 'PENDIENTE');

  if (activo) {
    const puedeControlar = tieneControl && partida.estado === 'EN_CURSO';
    let botones = '';

    if (puedeControlar) {
      if (activo.estado === 'EN_CURSO') {
        botones = `
          <button data-accion="pausar" data-juego-id="${activo.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition">
            Pausar
          </button>
        `;
      } else if (activo.estado === 'PAUSADO') {
        botones = `
          <button data-accion="reanudar" data-juego-id="${activo.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-3 py-2 bg-surface-container-lowest shadow-comic-sm hover:shadow-comic-md transition">
            Reanudar
          </button>
        `;
      }
    }

    return Card({
      titulo: 'Juego activo',
      contenido: `
        <p class="font-body-md text-on-surface-variant mb-2">Estado: <span class="font-bold">${activo.estado}</span></p>
        ${botones}
      `,
      color: activo.estado === 'PAUSADO' ? 'tertiary' : 'primary'
    });
  }

  if (pendiente && tieneControl && partida.estado === 'EN_CURSO') {
    return Card({
      titulo: 'Siguiente juego',
      contenido: `
        <p class="font-body-md text-on-surface-variant mb-2">Hay un juego pendiente.</p>
        <button data-accion="iniciar-juego" data-juego-id="${pendiente.id}" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition">
          Iniciar juego
        </button>
      `,
      color: 'primary'
    });
  }

  return Card({
    titulo: 'Juego',
    contenido: `<p class="font-body-md text-on-surface-variant italic">No hay juego activo.</p>`,
    color: 'surface-container-lowest'
  });
}

/**
 * Card de acciones globales.
 */
function _renderCardAcciones(partida, tieneControl, app, partidaId) {
  const acciones = [];

  if (partida.estado === 'CONFIGURANDO' && tieneControl) {
    acciones.push(`
      <button data-accion="comenzar" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-tertiary text-on-tertiary shadow-comic-sm hover:shadow-comic-md transition">
        Comenzar partida
      </button>
    `);
  }

  if (partida.estado === 'EN_CURSO' && tieneControl) {
    acciones.push(`
      <button data-accion="finalizar-circuito" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-secondary-container shadow-comic-sm hover:shadow-comic-md transition">
        Finalizar circuito
      </button>
    `);
    acciones.push(`
      <button data-accion="descartar" class="font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-2 bg-error text-on-error shadow-comic-sm hover:shadow-comic-md transition">
        Descartar partida
      </button>
    `);
  }

  if (acciones.length === 0) return '';

  return Card({
    titulo: 'Acciones',
    contenido: `<div class="flex gap-3 flex-wrap">${acciones.join('')}</div>`,
    color: 'surface-container-lowest'
  });
}

/**
 * Bind de event listeners para acciones.
 */
function _bindAcciones(container, app, partidaId) {
  const sessionId = app.session.sessionId;

  container.querySelectorAll('[data-accion]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const accion = btn.dataset.accion;
      const juegoId = btn.dataset.juegoId;

      try {
        switch (accion) {
          case 'tomar-control':
            await app.services.partida.tomarControl(partidaId, sessionId);
            break;

          case 'comenzar':
            if (!window.confirm('¿Comenzar la partida?')) return;
            await app.services.partida.comenzarPartida(partidaId, sessionId, nuevoActionId());
            break;

          case 'iniciar-juego':
            await app.services.partida.iniciarJuego(partidaId, juegoId, sessionId, nuevoActionId());
            break;

          case 'pausar':
            await app.services.partida.pausarJuego(partidaId, juegoId, sessionId, nuevoActionId());
            break;

          case 'reanudar':
            await app.services.partida.reanudarJuego(partidaId, juegoId, sessionId, nuevoActionId());
            break;

          case 'finalizar-circuito':
            if (!window.confirm('¿Finalizar el circuito completo?')) return;
            await app.services.partida.finalizarCircuito(partidaId, sessionId, nuevoActionId());
            break;

          case 'descartar':
            if (!window.confirm('¿Descartar esta partida? Esta acción no se puede deshacer.')) return;
            await app.services.partida.descartarPartida(partidaId, sessionId, nuevoActionId());
            window.location.hash = '#/partidas';
            return;
        }

        await _renderContenido(container, app, partidaId);
      } catch (err) {
        window.alert(`Error: ${err.message}`);
      }
    });
  });
}
