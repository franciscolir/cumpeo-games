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
 * Muestra modal de pausa
 */
function showPauseModal() {
  const existing = document.getElementById('pause-overlay');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.className = 'pause-overlay';
  overlay.innerHTML = `
    <div class="pause-message">
      <h2>¡PAUSA!</h2>
      <p style="color: #5d3f3e; font-size: 1.1rem; margin-bottom: 1.5rem;">Juego en pausa</p>
      <button id="btn-resume-game" class="btn-primary" style="min-width: 200px;">
        <span class="material-symbols-outlined" style="margin-right: 0.5rem;">play_arrow</span> REANUDAR
      </button>
    </div>
  `;

  const gameArea = document.getElementById('game-area');
  if (gameArea) {
    gameArea.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }

  document.getElementById('btn-resume-game').addEventListener('click', () => {
    hidePauseModal();
    // Dispatch custom event so game.js can handle resume
    window.dispatchEvent(new CustomEvent('game-resume'));
  });
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
 * Muestra pantalla de resultados en 2 columnas (Equipo A / Equipo B)
 * @param {Object} result - { winner: 'A'|'B'|'empate', scores: { A: number, B: number } }
 * @param {Function} onClose - Callback al cerrar
 */
function showResultsScreen(result, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'results-screen';

  const winnerTeam = result.winner;
  const isTie = winnerTeam === 'empate';
  
  let titleText;
  if (isTie) {
    titleText = '¡EMPATE!';
  } else if (winnerTeam === 'A') {
    titleText = '¡EQUIPO A GANA!';
  } else {
    titleText = '¡EQUIPO B GANA!';
  }

  const imageA = winnerTeam === 'A' ? '/images/pupi-ganador.png' : (winnerTeam === 'B' ? '/images/pupi-perdedor.png' : '/images/pupi-pulgar-arriba.png');
  const imageB = winnerTeam === 'B' ? '/images/pupi-ganador.png' : (winnerTeam === 'A' ? '/images/pupi-perdedor.png' : '/images/pupi-pulgar-arriba.png');

  overlay.innerHTML = `
    <div class="results-card">
      <h1 class="results-title">${titleText}</h1>
      
      <div class="results-grid">
        <div class="team-column ${winnerTeam === 'A' || isTie ? 'winner' : ''}">
          <img src="${imageA}" alt="Equipo A">
          <div class="team-label">EQUIPO A</div>
          <div class="team-score">${result.scores.A} PTS</div>
          ${winnerTeam === 'A' ? '<span class="winner-badge">GANADOR</span>' : ''}
          ${isTie ? '<span class="winner-badge" style="background:#ffc72c;color:#1c1b1b">EMPATE</span>' : ''}
        </div>
        <div class="team-column ${winnerTeam === 'B' ? 'winner' : ''}">
          <img src="${imageB}" alt="Equipo B">
          <div class="team-label">EQUIPO B</div>
          <div class="team-score">${result.scores.B} PTS</div>
          ${winnerTeam === 'B' ? '<span class="winner-badge">GANADOR</span>' : ''}
        </div>
      </div>

      <button id="btn-close-results" class="btn-primary" style="width: 100%;">
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
