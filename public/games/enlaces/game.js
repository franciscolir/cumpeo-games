/**
 * ENLACES - Game Logic
 * Conecta las palabras relacionadas
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 2;
  let timePerRound = 90;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;

  // Board state
  let allWords = [];
  let selectedWords = [];
  let foundGroups = [];
  let mistakes = 0;
  const maxMistakes = 4;

  // Group colors
  const groupColors = ['#008562', '#0050a0', '#ba1a1a', '#775a00', '#8b5cf6'];

  // Default groups
  const defaultGroups = [
    { name: 'Animales', words: ['gato', 'perro', 'pájaro', 'pez'], color: '#008562' },
    { name: 'Países', words: ['brasil', 'argentina', 'chile', 'perú'], color: '#0050a0' },
    { name: 'Colores', words: ['rojo', 'azul', 'verde', 'amarillo'], color: '#ba1a1a' },
    { name: 'Deportes', words: ['fútbol', 'básquet', 'tenis', 'natación'], color: '#775a00' }
  ];

  let groups = [...defaultGroups];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const boardContainer = $('board-container');
  const wordsGrid = $('words-grid');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const selected1 = $('selected-1');
  const selected2 = $('selected-2');
  const btnConfirm = $('btn-confirm');
  const foundGroupsEl = $('found-groups');
  const groupsList = $('groups-list');
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
    timeRemaining = timePerRound;
    updateClockDisplay();
    clockEl.classList.remove('hidden');
    
    timerInterval = setInterval(() => {
      if (isPaused) return;
      
      timeRemaining--;
      updateClockDisplay();
      sdk.updateTimer(timeRemaining);
      
      if (timeRemaining <= 0) {
        endGame();
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
          endGame();
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

  // ==================== BOARD LOGIC ====================
  function createBoard() {
    wordsGrid.innerHTML = '';
    allWords = [];
    selectedWords = [];
    foundGroups = [];
    mistakes = 0;
    
    // Collect all words from groups
    groups.forEach(group => {
      group.words.forEach(word => {
        allWords.push({ word, group: group.name, color: group.color });
      });
    });
    
    // Shuffle words
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    
    // Create word cards
    allWords.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'word-card';
      card.textContent = item.word;
      card.dataset.index = index;
      card.dataset.group = item.group;
      
      card.addEventListener('click', () => selectWord(card, index));
      wordsGrid.appendChild(card);
    });
    
    // Render groups in conductor panel
    renderGroupsList();
    updateFoundGroups();
  }

  function selectWord(card, index) {
    if (isPaused || !isStarted) return;
    if (card.classList.contains('matched') || card.classList.contains('eliminated')) return;
    if (selectedWords.length >= 2) return;
    
    // Toggle selection
    if (card.classList.contains('selected')) {
      card.classList.remove('selected');
      selectedWords = selectedWords.filter(w => w.index !== index);
    } else {
      card.classList.add('selected');
      selectedWords.push({ index, word: allWords[index].word, group: allWords[index].group });
    }
    
    // Update selection display
    updateSelectionDisplay();
    
    // Enable/disable confirm button
    btnConfirm.disabled = selectedWords.length !== 2;
  }

  function updateSelectionDisplay() {
    if (selectedWords.length >= 1) {
      selected1.innerHTML = `<span>${selectedWords[0].word}</span>`;
      selected1.classList.add('active');
    } else {
      selected1.innerHTML = '<span class="material-symbols-outlined">touch_app</span><span>Selecciona primera palabra</span>';
      selected1.classList.remove('active');
    }
    
    if (selectedWords.length >= 2) {
      selected2.innerHTML = `<span>${selectedWords[1].word}</span>`;
      selected2.classList.add('active');
    } else {
      selected2.innerHTML = '<span class="material-symbols-outlined">touch_app</span><span>Selecciona segunda palabra</span>';
      selected2.classList.remove('active');
    }
  }

  function confirmSelection() {
    if (selectedWords.length !== 2) return;
    
    const [word1, word2] = selectedWords;
    const isMatch = word1.group === word2.group;
    
    if (isMatch) {
      // Correct match
      localScores[selectedTeam] += 100;
      updateScoreDisplay();
      sdk.updateScore(localScores);
      
      // Mark as matched
      document.querySelectorAll('.word-card.selected').forEach(card => {
        card.classList.remove('selected');
        card.classList.add('matched');
      });
      
      // Add to found groups
      const group = groups.find(g => g.name === word1.group);
      if (group && !foundGroups.find(f => f.name === group.name)) {
        foundGroups.push(group);
        updateFoundGroups();
      }
      
      // Check if all groups found
      if (foundGroups.length === groups.length) {
        endGame();
      }
    } else {
      // Wrong match
      mistakes++;
      
      // Mark as eliminated
      document.querySelectorAll('.word-card.selected').forEach(card => {
        card.classList.remove('selected');
        card.classList.add('eliminated');
      });
      
      // Check if too many mistakes
      if (mistakes >= maxMistakes) {
        endGame();
      }
    }
    
    // Reset selection
    selectedWords = [];
    updateSelectionDisplay();
    btnConfirm.disabled = true;
  }

  function updateFoundGroups() {
    foundGroupsEl.innerHTML = '';
    foundGroups.forEach(group => {
      const div = document.createElement('div');
      div.className = 'found-group';
      div.innerHTML = `
        <div class="found-group-color" style="background: ${group.color}"></div>
        <span class="found-group-name">${group.name}</span>
        <span class="found-group-words">${group.words.join(', ')}</span>
      `;
      foundGroupsEl.appendChild(div);
    });
  }

  function renderGroupsList() {
    groupsList.innerHTML = '';
    groups.forEach(group => {
      const div = document.createElement('div');
      div.className = 'group-item';
      div.innerHTML = `
        <div class="group-color" style="background: ${group.color}"></div>
        <span class="group-name">${group.name}</span>
        <span class="group-words">${group.words.join(', ')}</span>
      `;
      groupsList.appendChild(div);
    });
  }

  // ==================== GAME CONTROL ====================
  function startGame() {
    // Load groups from localStorage or use defaults
    const savedGroups = sdk.getQuestions('enlaces');
    if (savedGroups.length > 0) {
      groups = savedGroups;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerRound = parseInt(timeSelect.value);
    
    currentRound = 1;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerRound);
    
    // Show game
    waitingState.classList.add('hidden');
    boardContainer.classList.remove('hidden');
    
    createBoard();
    updateTurnDisplay();
    updateScoreDisplay();
    startTimer();
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
          groupsFound: foundGroups.length,
          mistakes: mistakes
        }
      });
      
      // Reset to waiting state
      waitingState.classList.remove('hidden');
      boardContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function nextRound() {
    currentRound++;
    if (currentRound > totalRounds) {
      endGame();
      return;
    }
    
    sdk.updateRound(currentRound, totalRounds);
    createBoard();
    updateTurnDisplay();
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

  // ==================== GROUPS MANAGEMENT ====================
  function renderGroups() {
    questionsList.innerHTML = '';
    groups.forEach((group, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${group.name}: ${group.words.join(', ')}</span>
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

  function openEditGroup(index = -1) {
    const modal = $('edit-group-modal');
    $('edit-group-index').value = index;
    
    if (index >= 0) {
      const group = groups[index];
      $('edit-group-name').value = group.name;
      $('edit-group-words').value = group.words.join(', ');
    } else {
      $('edit-group-name').value = '';
      $('edit-group-words').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveGroup() {
    const index = parseInt($('edit-group-index').value);
    const name = $('edit-group-name').value.trim();
    const wordsStr = $('edit-group-words').value.trim();
    
    const words = wordsStr.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    
    if (!name || words.length !== 4) {
      alert('Se necesita un nombre y exactamente 4 palabras');
      return;
    }

    const color = groupColors[groups.length % groupColors.length];
    const group = { name, words, color };
    
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    
    sdk.saveQuestions('enlaces', groups);
    renderGroups();
    $('edit-group-modal').classList.add('hidden');
  }

  function deleteGroup(index) {
    if (confirm('¿Eliminar este grupo?')) {
      groups.splice(index, 1);
      sdk.saveQuestions('enlaces', groups);
      renderGroups();
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

  // Reset button
  $('btn-reset').addEventListener('click', () => {
    if (isStarted) {
      createBoard();
      updateTurnDisplay();
    }
  });

  // Confirm button
  btnConfirm.addEventListener('click', () => {
    confirmSelection();
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

  // Groups panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderGroups();
    }
  });

  // Add group button
  $('btn-add-group').addEventListener('click', () => {
    openEditGroup(-1);
  });

  // Groups list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditGroup(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteGroup(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit group modal
  $('btn-save-group').addEventListener('click', saveGroup);
  $('btn-cancel-group').addEventListener('click', () => {
    $('edit-group-modal').classList.add('hidden');
  });

})();
