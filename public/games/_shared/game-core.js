/**
 * GameCore - Shared boilerplate for all games
 * Eliminates duplication of SDK init, timer, config, score, events, endGame.
 *
 * Usage:
 *   const core = GameCore.create({
 *     gameName: 'trivia',
 *     warningThreshold: 5,
 *     onTimeUp: () => { ... },
 *     onGetHiddenContainer: () => $('question-container'),
 *     onNext: () => nextQuestion(),
 *     extraStats: () => ({ totalRounds })
 *   });
 */
const GameCore = (() => {
  function create(config) {
    const sdk = new GameSDK();

    // State
    const state = {
      localScores: { A: 0, B: 0 },
      selectedTeam: 'A',
      currentRound: 1,
      totalRounds: config.defaultRounds || 5,
      timePerUnit: config.defaultTime || 60,
      isPaused: false,
      isStarted: false,
      timerInterval: null,
      timeRemaining: 0,
      totalTime: config.defaultTime || 60,
      correctPoints: config.defaultCorrectPoints || 50,
      penaltyEnabled: false,
      penaltyPoints: 25
    };

    // DOM refs
    const $ = (id) => document.getElementById(id);
    const timerRow = $('timer-row');
    const clockValueEl = $('clock-value');
    const timerBarFill = $('timer-bar-fill');
    const scoreAEl = $('score-a');
    const scoreBEl = $('score-b');

    const warningThreshold = config.warningThreshold || 5;

    // ==================== SCORE CONFIG ====================
    function readScoreConfig() {
      const correctEl = $('config-correct-points');
      const penaltyToggle = $('config-penalty-toggle');
      const penaltyEl = $('config-penalty-points');

      if (correctEl) state.correctPoints = parseInt(correctEl.value) || 50;
      if (penaltyToggle) state.penaltyEnabled = penaltyToggle.checked;
      if (penaltyEl) state.penaltyPoints = parseInt(penaltyEl.value) || 25;
    }

    function addCorrectPoints(team) {
      state.localScores[team] += state.correctPoints;
      sdk.updateScore(state.localScores);
      updateScoreDisplay();
    }

    function addPenaltyPoints(team) {
      if (!state.penaltyEnabled) return;
      state.localScores[team] = Math.max(0, state.localScores[team] - state.penaltyPoints);
      sdk.updateScore(state.localScores);
      updateScoreDisplay();
    }

    // ==================== SCORE ====================
    function updateScoreDisplay() {
      scoreAEl.textContent = state.localScores.A;
      scoreBEl.textContent = state.localScores.B;
    }

    // ==================== TIMER ====================
    function startTimer() {
      pauseTimer();
      state.timeRemaining = state.timePerUnit;
      state.totalTime = state.timePerUnit;
      updateClockDisplay();
      updateTimerBar();
      timerRow.classList.remove('hidden');

      state.timerInterval = setInterval(() => {
        if (state.isPaused) return;

        state.timeRemaining--;
        updateClockDisplay();
        updateTimerBar();
        sdk.updateTimer(state.timeRemaining);

        if (state.timeRemaining <= 0) {
          clockValueEl.textContent = '00:00';
          clockValueEl.classList.add('clock-warning');
          pauseTimer();
          if (config.onTimeUp) config.onTimeUp();
        }
      }, 1000);
    }

    function pauseTimer() {
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
      }
    }

    function resumeTimer() {
      if (state.timeRemaining > 0 && !state.timerInterval) {
        state.timerInterval = setInterval(() => {
          if (state.isPaused) return;

          state.timeRemaining--;
          updateClockDisplay();
          updateTimerBar();
          sdk.updateTimer(state.timeRemaining);

          if (state.timeRemaining <= 0) {
            clockValueEl.textContent = '00:00';
            clockValueEl.classList.add('clock-warning');
            pauseTimer();
            if (config.onTimeUp) config.onTimeUp();
          }
        }, 1000);
      }
    }

    function updateClockDisplay() {
      const mins = Math.floor(state.timeRemaining / 60);
      const secs = state.timeRemaining % 60;
      clockValueEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      if (state.timeRemaining <= warningThreshold) {
        clockValueEl.classList.add('clock-warning');
      } else {
        clockValueEl.classList.remove('clock-warning');
      }
    }

    function updateTimerBar() {
      const pct = state.totalTime > 0 ? (state.timeRemaining / state.totalTime * 100) : 0;
      timerBarFill.style.width = pct + '%';

      if (state.timeRemaining <= warningThreshold) {
        timerBarFill.classList.add('warning');
      } else {
        timerBarFill.classList.remove('warning');
      }
    }

    // ==================== CONFIG VIEW ====================
    function openConfig() {
      readScoreConfig();
      $('config-view').classList.add('active');
      $('game-area').classList.add('hidden');
      $('conductor-area').classList.add('hidden');
      if (state.isStarted) {
        state.isPaused = true;
        pauseTimer();
      }
    }

    function closeConfig() {
      readScoreConfig();
      $('config-view').classList.remove('active');
      $('game-area').classList.remove('hidden');
      $('conductor-area').classList.remove('hidden');
      if (state.isStarted && state.isPaused) {
        showPauseModal();
      }
    }

    // ==================== BUTTON STATE ====================
    function setButtonsDisabled(disabled) {
      const cls = 'btn-disabled';
      document.querySelectorAll('.conductor-panel .btn-secondary, .conductor-panel .btn-danger, .conductor-panel .btn-primary').forEach(btn => {
        if (btn.id === 'btn-start' || btn.id === 'btn-config') return;
        btn.classList[disabled ? 'add' : 'remove'](cls);
      });
      document.querySelectorAll('.conductor-panel .team-selector, .conductor-panel .team-btn').forEach(el => {
        el.classList[disabled ? 'add' : 'remove'](cls);
      });
    }

    // ==================== END GAME ====================
    function endGame() {
      pauseTimer();
      state.isStarted = false;
      setButtonsDisabled(true);

      const winner = state.localScores.A > state.localScores.B ? 'A' :
                     state.localScores.B > state.localScores.A ? 'B' : 'empate';

      showResultsScreen({
        winner: winner,
        scores: state.localScores
      }, () => {
        sdk.gameOver({
          winner: winner,
          localScores: state.localScores,
          stats: Object.assign({
            totalRounds: state.totalRounds,
            finalScoreA: state.localScores.A,
            finalScoreB: state.localScores.B
          }, config.extraStats ? config.extraStats() : {})
        });

        if (config.onGetHiddenContainer) {
          config.onGetHiddenContainer().classList.remove('hidden');
        }
        timerRow.classList.add('hidden');
      });
    }

    // ==================== SDK INIT ====================
    sdk.init((sessionData) => {
      console.log('Session data received:', sessionData);
      if (sessionData.teams) {
        const teamA = sessionData.teams.find(t => t.letter === 'A');
        const teamB = sessionData.teams.find(t => t.letter === 'B');
        if (teamA) state.localScores.A = teamA.cumulativeScore || 0;
        if (teamB) state.localScores.B = teamB.cumulativeScore || 0;
      }
      updateScoreDisplay();
    });

    sdk.onPause(() => {
      state.isPaused = true;
      pauseTimer();
      showPauseModal();
    });

    sdk.onResume(() => {
      state.isPaused = false;
      resumeTimer();
      hidePauseModal();
    });

    sdk.onNextRound(() => {
      if (config.onNext) config.onNext();
    });

    window.addEventListener('game-resume', () => {
      state.isPaused = false;
      resumeTimer();
    });

    // ==================== EVENT LISTENERS ====================
    $('btn-config').addEventListener('click', openConfig);
    $('btn-close-config').addEventListener('click', closeConfig);

    $('btn-start').addEventListener('click', () => {
      readScoreConfig();
      showStartModal(() => {
        if (config.onStart) config.onStart(state);
      });
    });

    $('btn-pause').addEventListener('click', () => {
      if (state.isPaused) {
        state.isPaused = false;
        resumeTimer();
        hidePauseModal();
        $('btn-pause').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">pause</span> PAUSAR';
      } else {
        state.isPaused = true;
        pauseTimer();
        showPauseModal();
        $('btn-pause').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">play</span> CONTINUAR';
      }
    });

    $('btn-end').addEventListener('click', () => {
      showEndConfirmModal(() => {
        endGame();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && state.isStarted) {
        e.preventDefault();
        state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
        showTurnModal(`Equipo ${state.selectedTeam}`, 1500);
      }
    });

    // ==================== PUBLIC API ====================
    return {
      sdk,
      state,
      $,
      startTimer,
      pauseTimer,
      resumeTimer,
      updateScoreDisplay,
      updateClockDisplay,
      updateTimerBar,
      setButtonsDisabled,
      endGame,
      openConfig,
      closeConfig,
      readScoreConfig,
      addCorrectPoints,
      addPenaltyPoints
    };
  }

  return { create };
})();
