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
    this.currentRound = 1;
    this.totalRounds = 5;
    this.timePerRound = 60;
    this.callbacks = {
      init: null,
      pause: null,
      resume: null,
      nextRound: null,
      timeUp: null
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
   * Register time up callback
   * @param {Function} callback - Called when time runs out
   */
  onTimeUp(callback) {
    this.callbacks.timeUp = callback;
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
    this.currentRound = current;
    this.totalRounds = total;
    this._send({
      type: 'round-update',
      current,
      total
    });
  }

  /**
   * Set time per round
   * @param {number} seconds - Seconds per round
   */
  setTimePerRound(seconds) {
    this.timePerRound = seconds;
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

  /**
   * Get questions from localStorage
   * @param {string} gameType - Game type identifier
   * @returns {Array} Questions array
   */
  getQuestions(gameType) {
    const key = `cumpeo_${gameType}_questions`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save questions to localStorage
   * @param {string} gameType - Game type identifier
   * @param {Array} questions - Questions array
   */
  saveQuestions(gameType, questions) {
    const key = `cumpeo_${gameType}_questions`;
    localStorage.setItem(key, JSON.stringify(questions));
  }

  /**
   * Get image sets from localStorage
   * @param {string} gameType - Game type identifier
   * @returns {Array} Image sets array
   */
  getImageSets(gameType) {
    const key = `cumpeo_${gameType}_image_sets`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save image sets to localStorage
   * @param {string} gameType - Game type identifier
   * @param {Array} sets - Image sets array
   */
  saveImageSets(gameType, sets) {
    const key = `cumpeo_${gameType}_image_sets`;
    localStorage.setItem(key, JSON.stringify(sets));
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
