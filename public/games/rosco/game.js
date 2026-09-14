/**
 * ROSCO ALFABÉTICO - Game Logic
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let currentRound = 1;
  let totalRounds = 3;
  let timePerRound = 90;
  let isPaused = false;
  let isStarted = false;
  let selectedTeam = 'A';
  let timerInterval = null;
  let timeRemaining = 0;
  let currentLetterIndex = 0;

  // 25 letras del rosco (A-Z sin W ni Y)
  const ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','X','Z'];
  
  let letters = ALPHABET.map(ch => ({
    ch: ch,
    state: 'pending', // pending, active, green, red
    definition: '',
    answer: '',
    synonyms: []
  }));

  // Default questions
  const defaultLetters = [
    { ch: 'A', definition: 'Letra del abecedario', answer: 'A', synonyms: [] },
    { ch: 'B', definition: 'Segunda letra del abecedario', answer: 'B', synonyms: [] },
    { ch: 'C', definition: 'Tercera letra del abecedario', answer: 'C', synonyms: [] },
    { ch: 'D', definition: 'Cuarta letra del abecedario', answer: 'D', synonyms: [] },
    { ch: 'E', definition: 'Quinta letra del abecedario', answer: 'E', synonyms: [] },
    { ch: 'F', definition: 'Sexta letra del abecedario', answer: 'F', synonyms: [] },
    { ch: 'G', definition: 'Séptima letra del abecedario', answer: 'G', synonyms: [] },
    { ch: 'H', definition: 'Octava letra del abecedario', answer: 'H', synonyms: [] },
    { ch: 'I', definition: 'Novena letra del abecedario', answer: 'I', synonyms: [] },
    { ch: 'J', definition: 'Décima letra del abecedario', answer: 'J', synonyms: [] },
    { ch: 'K', definition: 'Letra del abecedario', answer: 'K', synonyms: [] },
    { ch: 'L', definition: 'Letra del abecedario', answer: 'L', synonyms: [] },
    { ch: 'M', definition: 'Letra del abecedario', answer: 'M', synonyms: [] },
    { ch: 'N', definition: 'Letra del abecedario', answer: 'N', synonyms: [] },
    { ch: 'Ñ', definition: 'Letra del abecedario español', answer: 'Ñ', synonyms: [] },
    { ch: 'O', definition: 'Letra del abecedario', answer: 'O', synonyms: [] },
    { ch: 'P', definition: 'Letra del abecedario', answer: 'P', synonyms: [] },
    { ch: 'Q', definition: 'Letra del abecedario', answer: 'Q', synonyms: [] },
    { ch: 'R', definition: 'Letra del abecedario', answer: 'R', synonyms: [] },
    { ch: 'S', definition: 'Fenómeno meteorológico violento con vientos giratorios', answer: 'TORNADO', synonyms: ['Tornado', 'Ciclón', 'Huracán'] },
    { ch: 'T', definition: 'Letra del abecedario', answer: 'T', synonyms: [] },
    { ch: 'U', definition: 'Letra del abecedario', answer: 'U', synonyms: [] },
    { ch: 'V', definition: 'Letra del abecedario', answer: 'V', synonyms: [] },
    { ch: 'X', definition: 'Letra del abecedario', answer: 'X', synonyms: [] },
    { ch: 'Z', definition: 'Letra del abecedario', answer: 'Z', synonyms: [] }
  ];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const roscoContainer = $('rosco-container');
  const lettersContainer = $('letters-container');
  const activeLetterBadge = $('active-letter-badge');
  const roscoDefinition = $('rosco-definition');
  const officialSolution = $('official-solution');
  const roundIndicator = $('round-indicator');
  const teamIndicator = $('team-indicator');
  const countGreen = $('count-green');
  const countRed = $('count-red');
  const countPending = $('count-pending');
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

  // ==================== RENDER ROSCO ====================
  const RADIUS = 41; // % del contenedor

  function renderLetters() {
    lettersContainer.innerHTML = '';
    const N = letters.length;
    
    letters.forEach((item, i) => {
      const angleDeg = (360 / N) * i;
      const angleRad = (angleDeg - 90) * Math.PI / 180;
      const left = 50 + RADIUS * Math.cos(angleRad);
      const top = 50 + RADIUS * Math.sin(angleRad);

      const wrapper = document.createElement('div');
      wrapper.className = 'letter-node';
      wrapper.style.top = top + '%';
      wrapper.style.left = left + '%';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `letter-btn ${item.state}`;
      btn.textContent = item.ch;
      btn.addEventListener('click', () => focusLetter(i));
      
      wrapper.appendChild(btn);
      lettersContainer.appendChild(wrapper);
    });
  }

  function focusLetter(idx) {
    if (!isStarted) return;
    
    letters.forEach((l, i) => {
      if (l.state === 'active' && i !== idx) l.state = 'pending';
    });
    
    letters[idx].state = 'active';
    currentLetterIndex = idx;
    
    activeLetterBadge.textContent = letters[idx].ch;
    roscoDefinition.textContent = letters[idx].definition || 'Sin definición';
    officialSolution.textContent = letters[idx].answer || '—';
    
    renderLetters();
    updateCounts();
  }

  function setLetterState(ch, newState) {
    const item = letters.find(l => l.ch === ch);
    if (!item) return;
    item.state = newState;
    renderLetters();
    updateCounts();
  }

  function updateCounts() {
    const g = letters.filter(l => l.state === 'green').length;
    const r = letters.filter(l => l.state === 'red').length;
    const a = letters.filter(l => l.state === 'active').length;
    const p = letters.filter(l => l.state === 'pending').length;
    
    countGreen.textContent = g + ' Verdes';
    countRed.textContent = r + ' Rojas';
    countPending.textContent = (p + a) + ' Restantes';
  }

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
        pauseTimer();
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
          pauseTimer();
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
    // Load questions from localStorage or use defaults
    const savedQuestions = sdk.getQuestions('rosco');
    if (savedQuestions.length > 0) {
      letters = ALPHABET.map((ch, i) => {
        const saved = savedQuestions.find(q => q.letter === ch);
        return {
          ch: ch,
          state: 'pending',
          definition: saved ? saved.definition : '',
          answer: saved ? saved.answer : '',
          synonyms: saved ? saved.synonyms : []
        };
      });
    } else {
      letters = defaultLetters.map(q => ({
        ...q,
        state: 'pending'
      }));
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerRound = parseInt(timeSelect.value);
    
    currentRound = 1;
    localScores = { A: 0, B: 0 };
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerRound);
    
    // Show game
    waitingState.classList.add('hidden');
    roscoContainer.classList.remove('hidden');
    
    // Focus first letter
    focusLetter(0);
    startTimer();
  }

  function nextRound() {
    currentRound++;
    if (currentRound > totalRounds) {
      endGame();
      return;
    }
    
    sdk.updateRound(currentRound, totalRounds);
    roundIndicator.textContent = `RONDA ${currentRound}`;
    
    // Reset letters
    letters.forEach(l => l.state = 'pending');
    focusLetter(0);
  }

  function correctAnswer() {
    const active = letters.find(l => l.state === 'active');
    if (active) {
      setLetterState(active.ch, 'green');
      localScores[selectedTeam] += 100;
      sdk.updateScore(localScores);
    }
    
    // Find next pending letter
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) {
      focusLetter(nextPending);
    } else {
      // All letters answered
      endGame();
    }
  }

  function errorAnswer() {
    const active = letters.find(l => l.state === 'active');
    if (active) {
      setLetterState(active.ch, 'red');
    }
    
    // Find next pending letter
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) {
      focusLetter(nextPending);
    } else {
      endGame();
    }
  }

  function passTurn() {
    const active = letters.find(l => l.state === 'active');
    if (active) {
      // Keep as pending
      setLetterState(active.ch, 'pending');
    }
    
    // Switch team
    selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
    updateTeamUI();
    showTurnModal(`Equipo ${selectedTeam}`, 2000);
    
    // Find next pending letter
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) {
      focusLetter(nextPending);
    }
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
      roscoContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function updateTeamUI() {
    document.querySelectorAll('.team-btn').forEach(btn => {
      const team = btn.dataset.team;
      if (team === selectedTeam) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    teamIndicator.textContent = `EQUIPO ${selectedTeam}`;
  }

  // ==================== QUESTIONS MANAGEMENT ====================
  function renderQuestions() {
    questionsList.innerHTML = '';
    letters.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${q.ch}. ${q.definition || 'Sin definición'}</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}">
            <span class="material-symbols-outlined" style="font-size: 1rem;">edit</span>
          </button>
        </div>
      `;
      questionsList.appendChild(div);
    });
  }

  function openEditQuestion(index) {
    const modal = $('edit-question-modal');
    $('edit-question-index').value = index;
    
    const q = letters[index];
    $('edit-letter').value = q.ch;
    $('edit-definition').value = q.definition || '';
    $('edit-answer').value = q.answer || '';
    $('edit-synonyms').value = (q.synonyms || []).join(', ');
    
    modal.classList.remove('hidden');
  }

  function saveQuestion() {
    const index = parseInt($('edit-question-index').value);
    const definition = $('edit-definition').value.trim();
    const answer = $('edit-answer').value.trim();
    const synonyms = $('edit-synonyms').value.split(',').map(s => s.trim()).filter(s => s);
    
    letters[index].definition = definition;
    letters[index].answer = answer;
    letters[index].synonyms = synonyms;
    
    // Save to localStorage
    const questionsToSave = letters.map(l => ({
      letter: l.ch,
      definition: l.definition,
      answer: l.answer,
      synonyms: l.synonyms
    }));
    sdk.saveQuestions('rosco', questionsToSave);
    
    // Update display if this letter is active
    if (letters[index].state === 'active') {
      roscoDefinition.textContent = definition || 'Sin definición';
      officialSolution.textContent = answer || '—';
    }
    
    renderQuestions();
    $('edit-question-modal').classList.add('hidden');
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

  // Verdict buttons
  $('btn-correct').addEventListener('click', correctAnswer);
  $('btn-error').addEventListener('click', errorAnswer);
  $('btn-pass').addEventListener('click', passTurn);

  // Team selector
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTeam = btn.dataset.team;
      updateTeamUI();
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

  // Questions panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderQuestions();
    }
  });

  // Add question button
  $('btn-add-question').addEventListener('click', () => {
    // Find first letter without definition
    const idx = letters.findIndex(l => !l.definition);
    if (idx >= 0) {
      openEditQuestion(idx);
    } else {
      alert('Todas las letras ya tienen definiciones');
    }
  });

  // Questions list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    if (editBtn) {
      openEditQuestion(parseInt(editBtn.dataset.index));
    }
  });

  // Edit question modal
  $('btn-save-question').addEventListener('click', saveQuestion);
  $('btn-cancel-question').addEventListener('click', () => {
    $('edit-question-modal').classList.add('hidden');
  });

  // Init
  renderLetters();
  updateCounts();

})();
