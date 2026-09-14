/**
 * MEMORICE - Game Logic
 * Encuentra los pares de cartas iguales
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 3;
  let timePerTurn = 30;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;

  // Board state
  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let totalPairs = 8;
  let isChecking = false;

  // Default image sets
  const defaultImageSets = [
    { name: 'Animales', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'] },
    { name: 'Comida', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥞', '🧇'] },
    { name: 'Deportes', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸'] },
    { name: 'Transportes', emojis: ['🚗', '🚕', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '✈️', '🚀'] },
    { name: 'Colores', emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '💗'] }
  ];

  let imageSets = [...defaultImageSets];
  let currentSetIndex = 0;

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const boardContainer = $('board-container');
  const cardsGrid = $('cards-grid');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const scoreA = $('score-a');
  const scoreB = $('score-b');
  const turnInfo = $('turn-info');
  const turnInfoText = $('turn-info-text');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');
  const questionsPanel = $('questions-panel');

  // ==================== SDK INITIALIZATION ====================
  sdk.init((sessionData) => {
    console.log('Session data received:', sessionData);
    if (sessionData.teams) {
      const teamA = sessionData.teams.find(t => t.letter === 'A');
      const teamB = sessionData.teams.find(t => t.letter === 'B');
      if (teamA) localScores.A = teamA.cumulativeScore || 0;
      if (teamB) localScores.B = teamB.cumulativeScore || 0;
      updateScoreDisplay();
    }
  });

  sdk.onPause(() => {
    isPaused = true;
    pauseTimer();
    showPauseModal();
  });

  sdk.onResume(() => {
    isPaused = false;
    resumeTimer();
    hidePauseModal();
  });

  sdk.onNextRound(() => {
    nextRound();
  });

  // ==================== TIMER ====================
  function startTimer() {
    timeRemaining = timePerTurn;
    updateClockDisplay();
    clockEl.classList.remove('hidden');
    
    timerInterval = setInterval(() => {
      if (isPaused) return;
      
      timeRemaining--;
      updateClockDisplay();
      sdk.updateTimer(timeRemaining);
      
      if (timeRemaining <= 0) {
        endTurn();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resumeTimer() {
    if (timeRemaining > 0 && !timerInterval) {
      timerInterval = setInterval(() => {
        if (isPaused) return;
        
        timeRemaining--;
        updateClockDisplay();
        sdk.updateTimer(timeRemaining);
        
        if (timeRemaining <= 0) {
          endTurn();
        }
      }, 1000);
    }
  }

  function updateClockDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    clockValueEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeRemaining <= 5) {
      clockValueEl.classList.add('clock-warning');
    } else {
      clockValueEl.classList.remove('clock-warning');
    }
  }

  // ==================== BOARD LOGIC ====================
  function createBoard() {
    cardsGrid.innerHTML = '';
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    isChecking = false;

    // Get emojis from current set
    const currentSet = imageSets[currentSetIndex] || imageSets[0];
    const gameEmojis = currentSet.emojis.slice(0, totalPairs);

    // Create pairs
    const cardPairs = [...gameEmojis, ...gameEmojis];
    
    // Shuffle
    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    // Create card elements
    cardPairs.forEach((emoji, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.index = index;
      card.dataset.emoji = emoji;
      
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front"></div>
          <div class="card-face card-back">
            <span class="card-emoji">${emoji}</span>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => flipCard(card));
      cardsGrid.appendChild(card);
      cards.push(card);
    });
  }

  function flipCard(card) {
    if (isPaused || !isStarted || isChecking) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (flippedCards.length >= 2) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      isChecking = true;
      checkMatch();
    }
  }

  function checkMatch() {
    const [card1, card2] = flippedCards;
    const match = card1.dataset.emoji === card2.dataset.emoji;

    if (match) {
      // Match found
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      
      // Add points
      localScores[selectedTeam] += 50;
      updateScoreDisplay();
      sdk.updateScore(localScores);

      flippedCards = [];
      isChecking = false;

      // Check if board is complete
      if (matchedPairs === totalPairs) {
        endRound();
      }
    } else {
      // No match
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        flippedCards = [];
        isChecking = false;
        
        // Switch team
        selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
        updateTurnDisplay();
        showTurnModal(`Equipo ${selectedTeam}`, 1500);
      }, 1000);
    }
  }

  function endTurn() {
    pauseTimer();
    
    // Flip all unmatched cards back
    cards.forEach(card => {
      if (!card.classList.contains('matched')) {
        card.classList.remove('flipped');
      }
    });
    
    flippedCards = [];
    isChecking = false;
    
    // Switch team
    selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${selectedTeam}`, 1500);
    
    // Start new turn
    if (isStarted) {
      startTimer();
    }
  }

  function endRound() {
    pauseTimer();
    
    currentRound++;
    if (currentRound > totalRounds) {
      endGame();
      return;
    }
    
    sdk.updateRound(currentRound, totalRounds);
    showTurnInfo(`Ronda ${currentRound} de ${totalRounds}`);
    
    setTimeout(() => {
      createBoard();
      updateTurnDisplay();
      startTimer();
    }, 2000);
  }

  function nextRound() {
    endRound();
  }

  function endGame() {
    pauseTimer();
    isStarted = false;
    
    const winner = localScores.A > localScores.B ? 'A' :
                   localScores.B > localScores.A ? 'B' : 'empate';

    showResultsScreen({
      winner: winner,
      scores: localScores
    }, () => {
      sdk.gameOver({
        winner: winner,
        localScores: localScores,
        stats: {
          totalRounds: totalRounds,
          finalScoreA: localScores.A,
          finalScoreB: localScores.B
        }
      });
      
      // Reset to waiting state
      waitingState.classList.remove('hidden');
      boardContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function updateScoreDisplay() {
    scoreA.textContent = localScores.A;
    scoreB.textContent = localScores.B;
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${selectedTeam}`;
    turnIndicator.style.background = selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  function showTurnInfo(text) {
    turnInfoText.textContent = text;
    turnInfo.classList.remove('hidden');
    setTimeout(() => {
      turnInfo.classList.add('hidden');
    }, 2000);
  }

  // ==================== IMAGE SETS MANAGEMENT ====================
  function renderImageSets() {
    questionsList.innerHTML = '';
    imageSets.forEach((set, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${set.name} (${set.emojis.length} emojis)</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}">
            <span class="material-symbols-outlined" style="font-size: 1rem;">edit</span>
          </button>
          <button class="question-item-btn delete" data-index="${index}">
            <span class="material-symbols-outlined" style="font-size: 1rem;">delete</span>
          </button>
        </div>
      `;
      questionsList.appendChild(div);
    });
  }

  function openEditImageSet(index = -1) {
    const modal = $('edit-image-modal');
    $('edit-set-index').value = index;
    
    if (index >= 0) {
      const set = imageSets[index];
      $('edit-set-name').value = set.name;
      $('edit-set-emojis').value = set.emojis.join(', ');
    } else {
      $('edit-set-name').value = '';
      $('edit-set-emojis').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveImageSet() {
    const index = parseInt($('edit-set-index').value);
    const name = $('edit-set-name').value.trim();
    const emojisStr = $('edit-set-emojis').value.trim();
    
    const emojis = emojisStr.split(',').map(e => e.trim()).filter(e => e);
    
    if (!name || emojis.length < 8) {
      alert('Se necesita un nombre y al menos 8 emojis');
      return;
    }

    const setImage = { name, emojis };
    
    if (index >= 0) {
      imageSets[index] = setImage;
    } else {
      imageSets.push(setImage);
    }
    
    sdk.saveImageSets('memorice', imageSets);
    renderImageSets();
    $('edit-image-modal').classList.add('hidden');
  }

  function deleteImageSet(index) {
    if (confirm('¿Eliminar este set de imágenes?')) {
      imageSets.splice(index, 1);
      sdk.saveImageSets('memorice', imageSets);
      renderImageSets();
    }
  }

  // ==================== GAME CONTROL ====================
  function startGame() {
    // Load image sets from localStorage or use defaults
    const savedSets = sdk.getImageSets('memorice');
    if (savedSets.length > 0) {
      imageSets = savedSets;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerTurn = parseInt(timeSelect.value);
    
    currentRound = 1;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerTurn);
    
    // Show game
    waitingState.classList.add('hidden');
    boardContainer.classList.remove('hidden');
    
    createBoard();
    updateTurnDisplay();
    updateScoreDisplay();
    startTimer();
  }

  function resetBoard() {
    if (!isStarted) return;
    createBoard();
    updateTurnDisplay();
  }

  // ==================== EVENT LISTENERS ====================
  
  // Start button
  $('btn-start').addEventListener('click', () => {
    showStartModal(() => {
      startGame();
    });
  });

  // Pause button
  $('btn-pause').addEventListener('click', () => {
    if (isPaused) {
      isPaused = false;
      resumeTimer();
      hidePauseModal();
      $('btn-pause').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">pause</span> PAUSAR';
    } else {
      isPaused = true;
      pauseTimer();
      showPauseModal();
      $('btn-pause').innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">play</span> CONTINUAR';
    }
  });

  // End button
  $('btn-end').addEventListener('click', () => {
    showEndConfirmModal(() => {
      endGame();
    });
  });

  // Reset button
  $('btn-reset').addEventListener('click', () => {
    resetBoard();
  });

  // Team selection
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTeam = btn.dataset.team;
      updateTurnDisplay();
    });
  });

  // Team selection with spacebar
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isStarted) {
      e.preventDefault();
      selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
      document.querySelectorAll('.team-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.team === selectedTeam);
      });
      updateTurnDisplay();
      showTurnModal(`Equipo ${selectedTeam}`, 1500);
    }
  });

  // Rounds/Time selectors
  roundsSelect.addEventListener('change', () => {
    totalRounds = parseInt(roundsSelect.value);
    sdk.updateRound(currentRound, totalRounds);
  });

  timeSelect.addEventListener('change', () => {
    timePerTurn = parseInt(timeSelect.value);
    sdk.setTimePerRound(timePerTurn);
  });

  // Image sets panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderImageSets();
    }
  });

  // Add image set button
  $('btn-add-image').addEventListener('click', () => {
    openEditImageSet(-1);
  });

  // Image sets list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditImageSet(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteImageSet(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit image set modal
  $('btn-save-image').addEventListener('click', saveImageSet);
  $('btn-cancel-image').addEventListener('click', () => {
    $('edit-image-modal').classList.add('hidden');
  });

})();
