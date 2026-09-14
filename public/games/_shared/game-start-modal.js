/**
 * GameStartModal - Componente reutilizable de pantalla de inicio
 * 
 * Muestra: Pupi imagen + countdown 3,2,1 + "AHORA"
 * 
 * Uso:
 *   showStartModal(() => {
 *     // Iniciar juego aquí
 *   });
 */

// Ruta de imagen de Pupi (configurable)
const PUPI_IMAGE_PATH = '/images/pupi-inicio.png';

/**
 * Muestra la pantalla de inicio con countdown
 * @param {Function} callback - Función a ejecutar al terminar el countdown
 * @param {Object} options - Opciones configurables
 * @param {string} options.imagePath - Ruta de imagen personalizada
 * @param {number} options.countdownFrom - Número desde el cual cuenta (default: 3)
 */
function showStartModal(callback, options = {}) {
  const imagePath = options.imagePath || PUPI_IMAGE_PATH;
  const countdownFrom = options.countdownFrom || 3;

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'start-screen';
  overlay.innerHTML = `
    <img src="${imagePath}" alt="Pupi Árbitro">
    <div class="start-countdown" id="countdown-number">${countdownFrom}</div>
    <div class="start-go hidden" id="countdown-go">¡AHORA!</div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  let count = countdownFrom;
  const numberEl = document.getElementById('countdown-number');
  const goEl = document.getElementById('countdown-go');

  const interval = setInterval(() => {
    count--;
    
    if (count > 0) {
      numberEl.textContent = count;
      numberEl.classList.remove('animate-countdownPulse');
      void numberEl.offsetWidth; // Trigger reflow
      numberEl.classList.add('animate-countdownPulse');
    } else if (count === 0) {
      numberEl.classList.add('hidden');
      goEl.classList.remove('hidden');
      goEl.classList.add('animate-countdownPulse');
    } else {
      clearInterval(interval);
      overlay.remove();
      if (callback) callback();
    }
  }, 1000);
}

/**
 * Muestra modal de pausa con Pupi
 */
function showPauseModal() {
  const existing = document.getElementById('pause-overlay');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.className = 'pause-overlay';
  overlay.innerHTML = `
    <div class="pause-message">
      <img src="/images/pupi-pausa.png" alt="Pupi Pausa" style="width: 150px; height: 150px; object-fit: contain;">
      <h2>¡ALTO AHÍ!</h2>
      <p style="color: #5d3f3e; font-size: 1.1rem;">Juego en pausa</p>
    </div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }
}

/**
 * Cierra el modal de pausa
 */
function hidePauseModal() {
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.remove();
}

/**
 * Muestra modal de turno
 * @param {string} teamName - Nombre del equipo (ej: "Equipo A")
 * @param {number} duration - Duración en ms (default: 2000)
 */
function showTurnModal(teamName, duration = 2000) {
  // Remover modal anterior si existe
  const existing = document.getElementById('turn-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'turn-overlay';
  overlay.className = 'turn-overlay';
  overlay.innerHTML = `
    <div class="turn-card">
      <p style="font-size: 1.2rem; color: #5d3f3e; margin-bottom: 0.5rem;">TURNO DE</p>
      <h2 class="team-name">${teamName}</h2>
    </div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  setTimeout(() => {
    overlay.remove();
  }, duration);
}

/**
 * Muestra modal de confirmación para terminar
 * @param {Function} onConfirm - Callback si confirma
 * @param {Function} onCancel - Callback si cancela
 */
function showEndConfirmModal(onConfirm, onCancel) {
  const existing = document.getElementById('end-confirm-modal');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'end-confirm-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <img src="/images/pupi-pausa.png" alt="Pupi" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 1rem;">
      <h2 style="font-family: 'Bangers', cursive; font-size: 2rem; margin-bottom: 1rem;">¿FINALIZAR JUEGO?</h2>
      <p style="color: #5d3f3e; margin-bottom: 1.5rem;">¿Estás seguro que deseas terminar el juego actual?</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="btn-confirm-end" class="btn-primary">SÍ, FINALIZAR</button>
        <button id="btn-cancel-end" class="btn-secondary">CANCELAR</button>
      </div>
    </div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  document.getElementById('btn-confirm-end').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  document.getElementById('btn-cancel-end').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
}

/**
 * Muestra pantalla de resultados
 * @param {Object} result - { winner: 'A'|'B'|'empate', scores: { A: number, B: number } }
 * @param {Function} onClose - Callback al cerrar
 */
function showResultsScreen(result, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'results-screen';

  const winnerTeam = result.winner;
  const isTie = winnerTeam === 'empate';
  
  let winnerImage, loserImage, winnerText;
  
  if (isTie) {
    winnerImage = '/images/pupi-pulgar-arriba.png';
    loserImage = '/images/pupi-pulgar-arriba.png';
    winnerText = '¡EMPATE!';
  } else if (winnerTeam === 'A') {
    winnerImage = '/images/pupi-ganador.png';
    loserImage = '/images/pupi-perdedor.png';
    winnerText = '¡EQUIPO A GANA!';
  } else {
    winnerImage = '/images/pupi-ganador.png';
    loserImage = '/images/pupi-perdedor.png';
    winnerText = '¡EQUIPO B GANA!';
  }

  overlay.innerHTML = `
    <div class="results-card">
      <h1 style="font-family: 'Bangers', cursive; font-size: 3rem; margin-bottom: 2rem; color: #1c1b1b;">${winnerText}</h1>
      
      <div class="winner-section">
        <img src="${winnerImage}" alt="Ganador">
        <p style="font-family: 'Bangers', cursive; font-size: 1.5rem; margin-top: 1rem;">
          ${isTie ? 'AMBOS EQUIPOS' : `EQUIPO ${winnerTeam}`}
        </p>
        <p style="font-size: 2rem; font-weight: bold; color: #bb0024;">
          ${isTie ? result.scores.A : (winnerTeam === 'A' ? result.scores.A : result.scores.B)} PTS
        </p>
      </div>

      ${!isTie ? `
      <div class="loser-section" style="margin-top: 1.5rem;">
        <img src="${loserImage}" alt="Perdedor">
        <p style="font-size: 1.2rem; color: #5d3f3e; margin-top: 0.5rem;">
          Equipo ${winnerTeam === 'A' ? 'B' : 'A'}: ${winnerTeam === 'A' ? result.scores.B : result.scores.A} PTS
        </p>
      </div>
      ` : ''}

      <button id="btn-close-results" class="btn-primary" style="margin-top: 2rem; width: 100%;">
        CERRAR
      </button>
    </div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  document.getElementById('btn-close-results').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
}
