/**
 * HISTORIA ENREDADA - Game Logic
 * ¡Crea una historia entre todos!
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 5;
  let timePerRound = 45;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;
  let currentStoryIndex = 0;

  // Story state
  let storySentences = [];
  let currentSentenceIndex = 0;

  // Default story starts
  const defaultStarts = [
    { title: 'La aventura del bosque', text: 'Erase una vez un gato llamado Michi que vivía en un bosque encantado donde los árboles susurraban secretos al viento.' },
    { title: 'El misterio de la luna', text: 'Una noche, mientras toda la ciudad dormía, un rayo de luz plateada cayó sobre el tejado del viejo edificio.' },
    { title: 'El viaje submarino', text: 'El capitán del submarino dio la orden de sumergirse, sin saber que los esperaba un mundo desconocido bajo las olas.' },
    { title: 'La máquina del tiempo', text: 'Cuando el reloj dio la medianoche, la extraña máquina comenzó a brillar con todos los colores del arcoíris.' },
    { title: 'El secreto de la abuela', text: 'La abuela siempre decía que el viejo baúl del ático contenía tesoros, pero nunca permitía que nadie lo abriera.' }
  ];

  let storyStarts = [...defaultStarts];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const storyContainer = $('story-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const storyTitle = $('story-title');
  const storyText = $('story-text');
  const instructionText = $('instruction-text');
  const sentenceInput = $('sentence-input');
  const officialStart = $('official-start');
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
    nextTurn();
  });

  // ==================== TIMER ====================
  function startTimer() {
    timeRemaining = timePerRound;
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
    
    if (timeRemaining <= 10) {
      clockValueEl.classList.add('clock-warning');
    } else {
      clockValueEl.classList.remove('clock-warning');
    }
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    // Load story starts from localStorage or use defaults
    const savedStarts = sdk.getQuestions('historia-enredada');
    if (savedStarts.length > 0) {
      storyStarts = savedStarts;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerRound = parseInt(timeSelect.value);
    
    currentRound = 1;
    currentStoryIndex = 0;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerRound);
    
    // Show game
    waitingState.classList.add('hidden');
    storyContainer.classList.remove('hidden');
    
    startNewStory();
    updateTurnDisplay();
    startTimer();
  }

  function startNewStory() {
    if (currentStoryIndex >= storyStarts.length) {
      currentStoryIndex = 0;
    }

    const story = storyStarts[currentStoryIndex];
    storyTitle.textContent = story.title;
    officialStart.textContent = story.text;
    
    // Initialize story
    storySentences = [{ text: story.text, team: 'start' }];
    currentSentenceIndex = 0;
    
    renderStory();
    
    // Enable input
    sentenceInput.disabled = false;
    sentenceInput.value = '';
    sentenceInput.focus();
    instructionText.textContent = 'Escribe una oración para continuar la historia';
    
    // Reset timer
    pauseTimer();
    timeRemaining = timePerRound;
    updateClockDisplay();
    startTimer();
  }

  function renderStory() {
    storyText.innerHTML = '';
    storySentences.forEach((sentence, index) => {
      const div = document.createElement('div');
      div.className = `story-sentence ${sentence.team}`;
      if (index === storySentences.length - 1) {
        div.classList.add('current');
      }
      div.textContent = sentence.text;
      storyText.appendChild(div);
    });
    
    // Scroll to bottom
    storyText.scrollTop = storyText.scrollHeight;
  }

  function submitSentence() {
    const sentence = sentenceInput.value.trim();
    if (!sentence) return;
    
    // Add sentence to story
    storySentences.push({ text: sentence, team: selectedTeam });
    currentSentenceIndex++;
    
    // Add points
    localScores[selectedTeam] += 50;
    updateScoreDisplay();
    sdk.updateScore(localScores);
    
    // Clear input
    sentenceInput.value = '';
    
    // Render updated story
    renderStory();
    
    // Switch team
    selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${selectedTeam}`, 1500);
    
    // Reset timer
    pauseTimer();
    timeRemaining = timePerRound;
    updateClockDisplay();
    startTimer();
  }

  function awardBonus(points) {
    localScores[selectedTeam] += points;
    updateScoreDisplay();
    sdk.updateScore(localScores);
  }

  function endTurn() {
    // Switch team and continue
    selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${selectedTeam}`, 1500);
    
    if (isStarted) {
      // Reset timer for next turn
      pauseTimer();
      timeRemaining = timePerRound;
      updateClockDisplay();
      startTimer();
    }
  }

  function nextTurn() {
    endTurn();
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
          sentences: storySentences.length,
          finalScoreA: localScores.A,
          finalScoreB: localScores.B
        }
      });
      
      // Reset to waiting state
      waitingState.classList.remove('hidden');
      storyContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function updateScoreDisplay() {
    $('score-a').textContent = localScores.A;
    $('score-b').textContent = localScores.B;
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${selectedTeam}`;
    turnIndicator.style.background = selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== STORY STARTS MANAGEMENT ====================
  function renderStarts() {
    questionsList.innerHTML = '';
    storyStarts.forEach((start, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${start.title}</span>
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

  function openEditStart(index = -1) {
    const modal = $('edit-start-modal');
    $('edit-start-index').value = index;
    
    if (index >= 0) {
      const start = storyStarts[index];
      $('edit-start-title').value = start.title;
      $('edit-start-text').value = start.text;
    } else {
      $('edit-start-title').value = '';
      $('edit-start-text').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveStart() {
    const index = parseInt($('edit-start-index').value);
    const title = $('edit-start-title').value.trim();
    const text = $('edit-start-text').value.trim();
    
    if (!title || !text) {
      alert('El título y el comienzo son obligatorios');
      return;
    }

    const start = { title, text };
    
    if (index >= 0) {
      storyStarts[index] = start;
    } else {
      storyStarts.push(start);
    }
    
    sdk.saveQuestions('historia-enredada', storyStarts);
    renderStarts();
    $('edit-start-modal').classList.add('hidden');
  }

  function deleteStart(index) {
    if (confirm('¿Eliminar este comienzo?')) {
      storyStarts.splice(index, 1);
      sdk.saveQuestions('historia-enredada', storyStarts);
      renderStarts();
    }
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

  // New story button
  $('btn-new-story').addEventListener('click', () => {
    currentStoryIndex++;
    startNewStory();
  });

  // Submit sentence
  $('btn-submit').addEventListener('click', () => {
    submitSentence();
  });

  sentenceInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitSentence();
    }
  });

  // Bonus buttons
  $('btn-correct').addEventListener('click', () => {
    awardBonus(50);
  });

  $('btn-funny').addEventListener('click', () => {
    awardBonus(100);
  });

  // Skip button
  $('btn-skip').addEventListener('click', () => {
    endTurn();
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

  // Rounds/Time selectors
  roundsSelect.addEventListener('change', () => {
    totalRounds = parseInt(roundsSelect.value);
    sdk.updateRound(currentRound, totalRounds);
  });

  timeSelect.addEventListener('change', () => {
    timePerRound = parseInt(timeSelect.value);
    sdk.setTimePerRound(timePerRound);
  });

  // Story starts panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderStarts();
    }
  });

  // Add start button
  $('btn-add-start').addEventListener('click', () => {
    openEditStart(-1);
  });

  // Starts list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditStart(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteStart(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit start modal
  $('btn-save-start').addEventListener('click', saveStart);
  $('btn-cancel-start').addEventListener('click', () => {
    $('edit-start-modal').classList.add('hidden');
  });

})();
