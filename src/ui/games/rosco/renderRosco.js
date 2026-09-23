/* =============================================================
   renderRosco — render compartido del rosco circular.
   Usado por el conductor (RoscoGameUI) y por la pantalla pública
   (shell-publica). Círculo de 27 letras (A–Z + Ñ), anillo SVG de
   progreso, tarjeta central con letra/definición/respuesta y
   leyenda de conteo.
   ============================================================= */

import { ESTADO_LETRA } from '../../../games/rosco/RoscoGameDefinition.js';

const RADIUS_PCT = 41;
const CIRCUNFERENCIA = 2 * Math.PI * 180;

function _calcularPosicion(i, total) {
  const angleDeg = (360 / total) * i;
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    left: 50 + RADIUS_PCT * Math.cos(angleRad),
    top: 50 + RADIUS_PCT * Math.sin(angleRad)
  };
}

function _claseLetra(estado, esActual) {
  if (estado === ESTADO_LETRA.CORRECTA) return 'green';
  if (estado === ESTADO_LETRA.INCORRECTA) return 'red';
  if (estado === ESTADO_LETRA.PASADA) return 'pasada';
  if (esActual) return 'active';
  return 'pending';
}

function _iconoLetra(estado) {
  if (estado === ESTADO_LETRA.CORRECTA) return '✓';
  if (estado === ESTADO_LETRA.INCORRECTA) return '✗';
  if (estado === ESTADO_LETRA.PASADA) return '→';
  return '';
}

function _renderAnilloSVG(progreso) {
  const offset = CIRCUNFERENCIA * (1 - progreso);
  return `
    <svg id="rosco-progress" class="rosco-svg" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="180" fill="none" stroke="#e5e2e1" stroke-width="2" stroke-dasharray="6 6" />
      <circle cx="200" cy="200" r="180" fill="none" stroke="#008562" stroke-width="4"
        stroke-dasharray="${CIRCUNFERENCIA.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        stroke-linecap="round" transform="rotate(-90 200 200)" />
    </svg>
  `;
}

function _renderLeyenda(verdes, rojas, restantes) {
  return `
    <div class="rosco-legend">
      <div class="legend-items">
        <span class="legend-item"><span class="legend-dot green"></span> Verdes</span>
        <span class="legend-item"><span class="legend-dot red"></span> Rojas</span>
        <span class="legend-item"><span class="legend-dot yellow"></span> Pasadas</span>
        <span class="legend-item"><span class="legend-dot white"></span> Pendientes</span>
      </div>
      <div class="legend-counts">${verdes} Verdes • ${rojas} Rojas • ${restantes} Restantes</div>
    </div>
  `;
}

function _renderTarjetaCentral(letra, definicion, respuesta, mostrarRespuesta) {
  return `
    <div class="rosco-central">
      <span class="rosco-letter-badge">${letra || '?'}</span>
      <p class="rosco-definition">${definicion || 'Sin definición'}</p>
      ${mostrarRespuesta && respuesta ? `<p class="rosco-respuesta">${respuesta}</p>` : ''}
    </div>
  `;
}

/**
 * Renderiza el rosco circular completo.
 * @param {object} estadoJuego - estado con rosco[], indice_actual, set_ronda_actual
 * @param {object} [opciones]
 * @param {boolean} [opciones.mostrarRespuesta=false]
 * @param {string} [opciones.respuesta='']
 * @param {boolean} [opciones.mostrarLeyenda=true]
 * @param {boolean} [opciones.mostrarAnillo=true]
 * @param {'md'|'lg'} [opciones.tamañoLetra='md']
 * @returns {string} HTML
 */
export function renderRosco(estadoJuego, opciones = {}) {
  const {
    mostrarRespuesta = false,
    respuesta = '',
    mostrarLeyenda = true,
    mostrarAnillo = true,
    tamañoLetra = 'md'
  } = opciones;

  const rosco = estadoJuego?.rosco || [];
  const indiceActual = estadoJuego?.indice_actual ?? 0;
  const total = rosco.length || 27;

  const items = estadoJuego?.set_ronda_actual?.items || [];
  const letraActual = rosco[indiceActual]?.letra || '';
  const itemActual = letraActual ? items.find((it) => it.letra === letraActual) : null;
  const definicion = itemActual?.definicion || '';

  let verdes = 0;
  let rojas = 0;
  for (const item of rosco) {
    if (item.estado === ESTADO_LETRA.CORRECTA) verdes++;
    else if (item.estado === ESTADO_LETRA.INCORRECTA) rojas++;
  }
  const restantes = total - verdes - rojas;
  const progreso = total > 0 ? (verdes + rojas) / total : 0;

  const letrasHTML = rosco.map((item, i) => {
    const esActual = i === indiceActual;
    const clase = _claseLetra(item.estado, esActual);
    const icono = _iconoLetra(item.estado);
    const pos = _calcularPosicion(i, total);
    return `
      <div class="letter-node" data-letra="${item.letra}" data-index="${i}"
        style="left: ${pos.left.toFixed(2)}%; top: ${pos.top.toFixed(2)}%;">
        <button type="button" class="letter-btn rounded-full ${clase}">${item.letra}</button>
        ${icono ? `<span class="letter-icon">${icono}</span>` : ''}
      </div>
    `;
  }).join('');

  const claseTamaño = tamañoLetra === 'lg' ? 'rosco-size-lg' : 'rosco-size-md';

  return `
    <div class="rosco-circular ${claseTamaño}">
      ${mostrarAnillo ? _renderAnilloSVG(progreso) : ''}
      <div class="letters-container">${letrasHTML}</div>
      ${_renderTarjetaCentral(letraActual, definicion, respuesta, mostrarRespuesta)}
    </div>
    ${mostrarLeyenda ? _renderLeyenda(verdes, rojas, restantes) : ''}
  `;
}
