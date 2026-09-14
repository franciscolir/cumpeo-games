/**
 * ¿QUÉ DICE? - Game Logic
 * Adivina quién dijo la frase
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 5;
  let timePerQuestion = 20;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;
  let currentQuoteIndex = 0;

  // Default quotes
  const defaultQuotes = [
    {
      text: "Ser o no ser, esa es la cuestión.",
      author: "William Shakespeare",
      options: ["William Shakespeare", "Miguel de Cervantes", "Pablo Neruda", "Gabriel García Márquez"]
    },
    {
      text: "La vida es lo que pasa mientras estás ocupado haciendo otros planes.",
      author: "John Lennon",
      options: ["John Lennon", "Paul McCartney", "Bob Dylan", "Eric Clapton"]
    },
    {
      text: "El único modo de hacer un gran trabajo es amar lo que haces.",
      author: "Steve Jobs",
      options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"]
    },
    {
      text: "No pienso, luego no existo.",
      author: "René Descartes",
      options: ["René Descartes", "Sócrates", "Platón", "Aristóteles"]
    },
    {
      text: "La imaginación es más importante que el conocimiento.",
      author: "Albert Einstein",
      options: ["Albert Einstein", "Isaac Newton", "Nikola Tesla", "Galileo Galilei"]
    }
  ];

  let quotes = [...defaultQuotes];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const quoteContainer = $('quote-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const quoteText = $('quote-text');
  const quoteIndex = $('quote-index');
  const officialAuthor = $('official-author');
  const resultContainer = $('result-container');
  const resultBox = $('result-box');
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
    nextQuote();
  });

  // ==================== TIMER ====================
  function startTimer() {
    timeRemaining = timePerQuestion;
    updateClockDisplay();
    clockEl.classList.remove('hidden');
    
    timerInterval = setInterval(() => {
      if (isPaused) return;
      
      timeRemaining--;
      updateClockDisplay();
      sdk.updateTimer(timeRemaining);
      
      if (timeRemaining <= 0) {
        revealAnswer();
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
          revealAnswer();
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

  // ==================== GAME LOGIC ====================
  function startGame() {
    // Load quotes from localStorage or use defaults
    const savedQuotes = sdk.getQuestions('que-dice');
    if (savedQuotes.length > 0) {
      quotes = savedQuotes;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerQuestion = parseInt(timeSelect.value);
    
    currentRound = 1;
    currentQuoteIndex = 0;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerQuestion);
    
    // Show game
    waitingState.classList.add('hidden');
    quoteContainer.classList.remove('hidden');
    
    loadQuote();
    updateTurnDisplay();
    startTimer();
  }

  function loadQuote() {
    if (currentQuoteIndex >= quotes.length) {
      currentQuoteIndex = 0;
    }

    const quote = quotes[currentQuoteIndex];
    quoteText.textContent = quote.text;
    quoteIndex.textContent = `${currentQuoteIndex + 1}/${quotes.length}`;
    officialAuthor.textContent = quote.author;
    
    // Shuffle options
    const shuffledOptions = [...quote.options].sort(() => Math.random() - 0.5);
    
    document.getElementById('option-0').textContent = shuffledOptions[0];
    document.getElementById('option-1').textContent = shuffledOptions[1];
    document.getElementById('option-2').textContent = shuffledOptions[2];
    document.getElementById('option-3').textContent = shuffledOptions[3];
    
    // Store correct answer
    document.getElementById('options-container').dataset.correct = quote.author;

    // Reset buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong', 'selected-correct');
      btn.disabled = false;
    });

    // Hide result
    resultContainer.classList.add('hidden');
    
    // Reset timer
    pauseTimer();
    timeRemaining = timePerQuestion;
    updateClockDisplay();
    startTimer();
  }

  function selectOption(displayIndex) {
    if (isPaused || !isStarted) return;

    const quote = quotes[currentQuoteIndex];
    const selectedAuthor = document.getElementById(`option-${displayIndex}`).textContent;
    const isCorrect = selectedAuthor === quote.author;
    
    const buttons = document.querySelectorAll('.option-btn');

    // Disable all buttons
    buttons.forEach(btn => btn.disabled = true);

    // Show which was correct
    buttons.forEach((btn, i) => {
      const btnAuthor = document.getElementById(`option-${i}`).textContent;
      if (btnAuthor === quote.author) {
        btn.classList.add('selected-correct');
      }
    });

    // Show result
    resultContainer.classList.remove('hidden');

    if (isCorrect) {
      localScores[selectedTeam] += 100;
      updateScoreDisplay();
      sdk.updateScore(localScores);
      resultBox.textContent = '¡Correcto! +100 pts';
      resultBox.className = 'result-box success';
    } else {
      buttons[displayIndex].classList.add('wrong');
      resultBox.textContent = `¡Incorrecto! Era ${quote.author}`;
      resultBox.className = 'result-box error';
    }

    // Next quote after delay
    setTimeout(() => {
      currentQuoteIndex++;
      loadQuote();
    }, 2000);
  }

  function revealAnswer() {
    pauseTimer();
    
    const quote = quotes[currentQuoteIndex];
    const buttons = document.querySelectorAll('.option-btn');
    
    // Show correct answer
    buttons.forEach((btn, i) => {
      const btnAuthor = document.getElementById(`option-${i}`).textContent;
      if (btnAuthor === quote.author) {
        btn.classList.add('selected-correct');
      }
      btn.disabled = true;
    });

    // Show result
    resultContainer.classList.remove('hidden');
    resultBox.textContent = `¡Tiempo! Era ${quote.author}`;
    resultBox.className = 'result-box error';

    // Next quote after delay
    setTimeout(() => {
      currentQuoteIndex++;
      loadQuote();
    }, 2000);
  }

  function nextQuote() {
    currentQuoteIndex++;
    if (currentQuoteIndex >= quotes.length) {
      currentRound++;
      if (currentRound > totalRounds) {
        endGame();
        return;
      }
      sdk.updateRound(currentRound, totalRounds);
      currentQuoteIndex = 0;
    }
    loadQuote();
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
      quoteContainer.classList.add('hidden');
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

  // ==================== QUOTES MANAGEMENT ====================
  function renderQuotes() {
    questionsList.innerHTML = '';
    quotes.forEach((quote, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. "${quote.text.substring(0, 40)}..." - ${quote.author}</span>
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

  function openEditQuote(index = -1) {
    const modal = $('edit-quote-modal');
    $('edit-quote-index').value = index;
    
    if (index >= 0) {
      const quote = quotes[index];
      $('edit-quote-text').value = quote.text;
      $('edit-quote-author').value = quote.author;
      
      const wrongOptions = quote.options.filter(o => o !== quote.author);
      $('edit-quote-wrong1').value = wrongOptions[0] || '';
      $('edit-quote-wrong2').value = wrongOptions[1] || '';
      $('edit-quote-wrong3').value = wrongOptions[2] || '';
    } else {
      $('edit-quote-text').value = '';
      $('edit-quote-author').value = '';
      $('edit-quote-wrong1').value = '';
      $('edit-quote-wrong2').value = '';
      $('edit-quote-wrong3').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveQuote() {
    const index = parseInt($('edit-quote-index').value);
    const text = $('edit-quote-text').value.trim();
    const author = $('edit-quote-author').value.trim();
    const wrong1 = $('edit-quote-wrong1').value.trim();
    const wrong2 = $('edit-quote-wrong2').value.trim();
    const wrong3 = $('edit-quote-wrong3').value.trim();
    
    if (!text || !author) {
      alert('La frase y el autor son obligatorios');
      return;
    }

    const options = [author, wrong1, wrong2, wrong3].filter(o => o);
    const quote = { text, author, options };
    
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.push(quote);
    }
    
    sdk.saveQuestions('que-dice', quotes);
    renderQuotes();
    $('edit-quote-modal').classList.add('hidden');
  }

  function deleteQuote(index) {
    if (confirm('¿Eliminar esta frase?')) {
      quotes.splice(index, 1);
      sdk.saveQuestions('que-dice', quotes);
      renderQuotes();
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

  // Next button
  $('btn-next').addEventListener('click', () => {
    nextQuote();
  });

  // Option buttons
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      selectOption(index);
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
    timePerQuestion = parseInt(timeSelect.value);
    sdk.setTimePerRound(timePerQuestion);
  });

  // Quotes panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderQuotes();
    }
  });

  // Add quote button
  $('btn-add-quote').addEventListener('click', () => {
    openEditQuote(-1);
  });

  // Quotes list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditQuote(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteQuote(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit quote modal
  $('btn-save-quote').addEventListener('click', saveQuote);
  $('btn-cancel-quote').addEventListener('click', () => {
    $('edit-quote-modal').classList.add('hidden');
  });

})();
