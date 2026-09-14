/**
 * PICTIONARY - Game Logic
 * ¡Dibuja y adivina!
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 5;
  let timePerRound = 90;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;
  let currentWordIndex = 0;

  // Drawing state
  let canvas, ctx;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentColor = '#1c1b1b';
  let currentSize = 5;
  let drawingHistory = [];

  // Default words
  const defaultWords = [
    { text: 'GATO', category: 'Animales' },
    { text: 'CASA', category: 'Cosas' },
    { text: 'SOL', category: 'Naturaleza' },
    { text: 'ARBOL', category: 'Naturaleza' },
    { text: 'PERRO', category: 'Animales' },
    { text: 'COCHE', category: 'Transportes' },
    { text: 'MONTAÑA', category: 'Naturaleza' },
    { text: 'LAPICERO', category: 'Escolar' },
    { text: 'HAMBURGUESA', category: 'Comida' },
    { text: 'FUTBOL', category: 'Deportes' }
  ];

  let words = [...defaultWords];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const drawingContainer = $('drawing-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const currentWordEl = $('current-word');
  const officialWord = $('official-word');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');
  const questionsPanel = $('questions-panel');

  // ==================== CANVAS SETUP ====================
  function initCanvas() {
    canvas = $('drawing-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = canvas.offsetHeight;
      redrawCanvas();
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
  }

  function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (e.type === 'touchstart') {
      startDrawing({ offsetX: x, offsetY: y });
    } else if (e.type === 'touchmove') {
      draw({ offsetX: x, offsetY: y });
    }
  }

  function startDrawing(e) {
    if (isPaused || !isStarted) return;
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    drawingHistory.push({ type: 'start', x: lastX, y: lastY, color: currentColor, size: currentSize });
  }

  function draw(e) {
    if (!isDrawing || isPaused) return;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    drawingHistory.push({ type: 'draw', x: e.offsetX, y: e.offsetY, color: currentColor, size: currentSize });
    
    [lastX, lastY] = [e.offsetX, e.offsetY];
  }

  function stopDrawing() {
    isDrawing = false;
    drawingHistory.push({ type: 'stop' });
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function clearCanvas() {
    drawingHistory = [];
    redrawCanvas();
  }

  function undoLast() {
    // Simple undo: remove last segment and redraw
    if (drawingHistory.length > 0) {
      drawingHistory.pop();
      redrawCanvas();
      // Redraw remaining history (simplified)
      drawingHistory.forEach(action => {
        if (action.type === 'draw') {
          ctx.beginPath();
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      });
    }
  }

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
        endRound();
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
          endRound();
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
    // Load words from localStorage or use defaults
    const savedWords = sdk.getQuestions('pictionary');
    if (savedWords.length > 0) {
      words = savedWords;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerRound = parseInt(timeSelect.value);
    
    currentRound = 1;
    currentWordIndex = 0;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerRound);
    
    // Show game
    waitingState.classList.add('hidden');
    drawingContainer.classList.remove('hidden');
    
    initCanvas();
    showNextWord();
    updateTurnDisplay();
    startTimer();
  }

  function showNextWord() {
    if (currentWordIndex >= words.length) {
      currentWordIndex = 0;
    }
    
    const word = words[currentWordIndex];
    currentWordEl.textContent = '???';
    officialWord.textContent = word.text;
    
    clearCanvas();
  }

  function revealWord() {
    const word = words[currentWordIndex];
    currentWordEl.textContent = word.text;
  }

  function correctGuess() {
    localScores[selectedTeam] += 100;
    sdk.updateScore(localScores);
    
    // Show word briefly
    revealWord();
    
    // Next word after delay
    setTimeout(() => {
      currentWordIndex++;
      showNextWord();
    }, 1500);
  }

  function passWord() {
    currentWordIndex++;
    showNextWord();
  }

  function endRound() {
    pauseTimer();
    
    currentRound++;
    if (currentRound > totalRounds) {
      endGame();
      return;
    }
    
    sdk.updateRound(currentRound, totalRounds);
    
    // Switch drawing team
    selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${selectedTeam}`, 1500);
    
    setTimeout(() => {
      showNextWord();
      startTimer();
    }, 1000);
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
      drawingContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${selectedTeam}`;
    turnIndicator.style.background = selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== WORDS MANAGEMENT ====================
  function renderWords() {
    questionsList.innerHTML = '';
    words.forEach((word, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${word.text} <span style="color: #5d3f3e; font-size: 0.75rem;">(${word.category || 'Sin categoría'})</span></span>
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

  function openEditWord(index = -1) {
    const modal = $('edit-word-modal');
    $('edit-word-index').value = index;
    
    if (index >= 0) {
      const word = words[index];
      $('edit-word-text').value = word.text;
      $('edit-word-category').value = word.category || '';
    } else {
      $('edit-word-text').value = '';
      $('edit-word-category').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveWord() {
    const index = parseInt($('edit-word-index').value);
    const text = $('edit-word-text').value.trim().toUpperCase();
    const category = $('edit-word-category').value.trim();
    
    if (!text) {
      alert('La palabra es obligatoria');
      return;
    }

    const word = { text, category };
    
    if (index >= 0) {
      words[index] = word;
    } else {
      words.push(word);
    }
    
    sdk.saveQuestions('pictionary', words);
    renderWords();
    $('edit-word-modal').classList.add('hidden');
  }

  function deleteWord(index) {
    if (confirm('¿Eliminar esta palabra?')) {
      words.splice(index, 1);
      sdk.saveQuestions('pictionary', words);
      renderWords();
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

  // Next word button
  $('btn-next-word').addEventListener('click', () => {
    passWord();
  });

  // Correct button
  $('btn-correct').addEventListener('click', () => {
    correctGuess();
  });

  // Pass button
  $('btn-pass').addEventListener('click', () => {
    passWord();
  });

  // Drawing tools
  $('btn-undo').addEventListener('click', undoLast);
  $('btn-clear').addEventListener('click', clearCanvas);

  // Color picker
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  // Size picker
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size);
    });
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

  // Words panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderWords();
    }
  });

  // Add word button
  $('btn-add-word').addEventListener('click', () => {
    openEditWord(-1);
  });

  // Words list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditWord(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteWord(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit word modal
  $('btn-save-word').addEventListener('click', saveWord);
  $('btn-cancel-word').addEventListener('click', () => {
    $('edit-word-modal').classList.add('hidden');
  });

})();
