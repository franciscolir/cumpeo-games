/**
 * GameSDK - Biblioteca compartida para comunicación entre consola y juegos
 * 
 * Uso en cada juego HTML:
 *   const sdk = new GameSDK();
 *   sdk.init((sessionData) => { ... });
 *   sdk.updateScore({ A: 100, B: 80 });
 *   sdk.gameOver({ winner: 'A', localScores: { A: 150, B: 120 } });
 */
class GameSDK {
  constructor() {
    this.sessionData = null;
    this.localScores = { A: 0, B: 0 };
    this.callbacks = {
      init: null,
      pause: null,
      resume: null,
      nextRound: null
    };
    this._setupListener();
  }

  _setupListener() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case 'init':
          this.sessionData = data.session;
          // Initialize local scores with cumulative scores
          this.localScores = { A: 0, B: 0 };
          if (this.callbacks.init) {
            this.callbacks.init(this.sessionData);
          }
          break;

        case 'pause':
          if (this.callbacks.pause) {
            this.callbacks.pause();
          }
          break;

        case 'resume':
          if (this.callbacks.resume) {
            this.callbacks.resume();
          }
          break;

        case 'next-round':
          if (this.callbacks.nextRound) {
            this.callbacks.nextRound();
          }
          break;
      }
    });
  }

  /**
   * Initialize the game with session data
   * @param {Function} callback - Called with session data when game starts
   */
  init(callback) {
    this.callbacks.init = callback;
  }

  /**
   * Register pause callback
   * @param {Function} callback - Called when game should pause
   */
  onPause(callback) {
    this.callbacks.pause = callback;
  }

  /**
   * Register resume callback
   * @param {Function} callback - Called when game should resume
   */
  onResume(callback) {
    this.callbacks.resume = callback;
  }

  /**
   * Register next round callback
   * @param {Function} callback - Called when next round is requested
   */
  onNextRound(callback) {
    this.callbacks.nextRound = callback;
  }

  /**
   * Update local scores and send to console
   * @param {Object} localScores - { A: number, B: number }
   */
  updateScore(localScores) {
    this.localScores = localScores;
    this._send({
      type: 'score-update',
      localScores
    });
  }

  /**
   * Add points to a team
   * @param {string} team - 'A' or 'B'
   * @param {number} points - Points to add
   */
  addPoints(team, points) {
    this.localScores[team] = (this.localScores[team] || 0) + points;
    this.updateScore(this.localScores);
  }

  /**
   * Send game over signal with results
   * @param {Object} result - { winner: 'A'|'B'|null, localScores: {A, B}, stats: {} }
   */
  gameOver(result) {
    this._send({
      type: 'game-over',
      winner: result.winner || null,
      localScores: result.localScores || this.localScores,
      stats: result.stats || {}
    });
  }

  /**
   * Send timer update to console
   * @param {number} seconds - Remaining seconds
   */
  updateTimer(seconds) {
    this._send({
      type: 'timer-update',
      seconds
    });
  }

  /**
   * Send round update to console
   * @param {number} current - Current round
   * @param {number} total - Total rounds
   */
  updateRound(current, total) {
    this._send({
      type: 'round-update',
      current,
      total
    });
  }

  /**
   * Request pause from console
   */
  requestPause() {
    this._send({ type: 'request-pause' });
  }

  /**
   * Send custom event to console
   * @param {string} eventName - Name of the event
   * @param {Object} data - Event data
   */
  sendEvent(eventName, data = {}) {
    this._send({
      type: 'custom-event',
      event: eventName,
      data
    });
  }

  _send(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameSDK;
}
