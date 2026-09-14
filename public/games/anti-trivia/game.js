/**
 * ANTI-TRIVIA - Game Logic
 * La trivia invertida: Encuentra la respuesta INCORRECTA
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let currentQuestion = 0;
  let currentRound = 1;
  let totalRounds = 5;
  let timePerQuestion = 20;
  let isPaused = false;
  let isStarted = false;
  let selectedTeam = 'A';
  let timerInterval = null;
  let timeRemaining = 0;

  // Default questions - la respuesta correcta es la que NO se debe elegir
  const defaultQuestions = [
    {
      text: "¿Cuál es la capital de Chile?",
      answers: ["Santiago", "Buenos Aires", "Lima", "Bogotá"],
      correct: 0, // Santiago es correcta, las otras son incorrectas
      correctText: "Santiago"
    },
    {
      text: "¿Quién pintó la Mona Lisa?",
      answers: ["Picasso", "Da Vinci", "Van Gogh", "Monet"],
      correct: 1, // Da Vinci es correcto, las otras son incorrectas
      correctText: "Da Vinci"
    },
    {
      text: "¿Cuántos días tiene un año bisiesto?",
      answers: ["364", "365", "366", "367"],
      correct: 2, // 366 es correcto, las otras son incorrectas
      correctText: "366"
    },
    {
      text: "¿Cuál es el planeta más grande del sistema solar?",
      answers: ["Saturno", "Júpiter", "Neptuno", "Urano"],
      correct: 1, // Júpiter es correcto, las otras son incorrectas
      correctText: "Júpiter"
    },
    {
      text: "¿En qué año llegó el hombre a la Luna?",
      answers: ["1967", "1968", "1969", "1970"],
      correct: 2, // 1969 es correcto, las otras son incorrectas
      correctText: "1969"
    }
  ];

  let questions = [...defaultQuestions];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const questionContainer = $('question-container');
  const questionText = $('question-text');
  const questionNumber = $('question-number');
  const answersContainer = $('answers-container');
  const resultContainer = $('result-container');
  const resultBox = $('result-box');
  const officialSolution = $('official-solution');
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
    nextQuestion();
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
    
    if (timeRemaining <= 5) {
      clockValueEl.classList.add('clock-warning');
    } else {
      clockValueEl.classList.remove('clock-warning');
    }
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    // Load questions from localStorage or use defaults
    const savedQuestions = sdk.getQuestions('anti-trivia');
    if (savedQuestions.length > 0) {
      questions = savedQuestions;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerQuestion = parseInt(timeSelect.value);
    
    currentQuestion = 0;
    currentRound = 1;
    localScores = { A: 0, B: 0 };
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerQuestion);
    
    // Show game
    waitingState.classList.add('hidden');
    questionContainer.classList.remove('hidden');
    
    loadQuestion();
    startTimer();
  }

  function loadQuestion() {
    if (currentQuestion >= questions.length) {
      // Cycle back to first question if more rounds
      currentQuestion = 0;
    }

    const q = questions[currentQuestion];
    questionText.textContent = q.text;
    questionNumber.textContent = `${currentQuestion + 1}/${questions.length}`;
    
    // Show correct answer in solution box
    officialSolution.textContent = q.correctText || q.answers[q.correct];
    
    // Shuffle answers for display (but keep track of which are wrong)
    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const answers = q.answers;
    
    document.getElementById('answer-0').textContent = answers[shuffledIndices[0]];
    document.getElementById('answer-1').textContent = answers[shuffledIndices[1]];
    document.getElementById('answer-2').textContent = answers[shuffledIndices[2]];
    document.getElementById('answer-3').textContent = answers[shuffledIndices[3]];
    
    // Store shuffled indices for reference
    answersContainer.dataset.shuffled = JSON.stringify(shuffledIndices);
    answersContainer.dataset.correctIndex = q.correct;

    // Reset buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
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

  function selectAnswer(displayIndex) {
    if (isPaused || !isStarted) return;

    const q = questions[currentQuestion];
    const shuffledIndices = JSON.parse(answersContainer.dataset.shuffled);
    const actualIndex = shuffledIndices[displayIndex];
    
    // In anti-trivia, selecting the CORRECT answer is WRONG
    // Selecting a WRONG answer is CORRECT
    const isCorrectAnswer = actualIndex === q.correct;
    
    const buttons = document.querySelectorAll('.answer-btn');

    // Disable all buttons
    buttons.forEach(btn => btn.disabled = true);

    // Show which was the correct answer (the one to NOT pick)
    buttons.forEach((btn, i) => {
      if (shuffledIndices[i] === q.correct) {
        btn.classList.add('selected-correct');
      }
    });

    // Show result
    resultContainer.classList.remove('hidden');

    if (!isCorrectAnswer) {
      // Player picked a WRONG answer = CORRECT in anti-trivia!
      localScores[selectedTeam] += 50;
      sdk.updateScore(localScores);
      resultBox.textContent = '¡Correcto! +50 pts';
      resultBox.className = 'result-box success';
    } else {
      // Player picked the CORRECT answer = WRONG in anti-trivia!
      buttons[displayIndex].classList.add('wrong');
      resultBox.textContent = `¡Incorrecto! Esa era la respuesta correcta`;
      resultBox.className = 'result-box error';
    }
  }

  function addBonusPoints(points) {
    localScores[selectedTeam] += points;
    sdk.updateScore(localScores);
  }

  function nextQuestion() {
    currentQuestion++;
    if (currentQuestion >= questions.length) {
      currentRound++;
      if (currentRound > totalRounds) {
        endGame();
        return;
      }
      sdk.updateRound(currentRound, totalRounds);
      currentQuestion = 0;
    }
    loadQuestion();
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
      questionContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  // ==================== QUESTIONS MANAGEMENT ====================
  function renderQuestions() {
    questionsList.innerHTML = '';
    questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${q.text}</span>
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

  function openEditQuestion(index = -1) {
    const modal = $('edit-question-modal');
    $('edit-question-index').value = index;
    
    if (index >= 0) {
      const q = questions[index];
      $('edit-question-text').value = q.text;
      $('edit-answer-correct').value = q.answers[q.correct];
      
      const wrongAnswers = q.answers.filter((_, i) => i !== q.correct);
      $('edit-answer-wrong1').value = wrongAnswers[0] || '';
      $('edit-answer-wrong2').value = wrongAnswers[1] || '';
      $('edit-answer-wrong3').value = wrongAnswers[2] || '';
    } else {
      $('edit-question-text').value = '';
      $('edit-answer-correct').value = '';
      $('edit-answer-wrong1').value = '';
      $('edit-answer-wrong2').value = '';
      $('edit-answer-wrong3').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveQuestion() {
    const index = parseInt($('edit-question-index').value);
    const text = $('edit-question-text').value.trim();
    const correct = $('edit-answer-correct').value.trim();
    const wrong1 = $('edit-answer-wrong1').value.trim();
    const wrong2 = $('edit-answer-wrong2').value.trim();
    const wrong3 = $('edit-answer-wrong3').value.trim();

    if (!text || !correct) {
      alert('La pregunta y respuesta correcta son obligatorias');
      return;
    }

    const answers = [correct, wrong1, wrong2, wrong3].filter(a => a);
    const question = {
      text: text,
      answers: answers,
      correct: 0,
      correctText: correct
    };

    if (index >= 0) {
      questions[index] = question;
    } else {
      questions.push(question);
    }

    sdk.saveQuestions('anti-trivia', questions);
    renderQuestions();
    $('edit-question-modal').classList.add('hidden');
  }

  function deleteQuestion(index) {
    if (confirm('¿Eliminar esta pregunta?')) {
      questions.splice(index, 1);
      sdk.saveQuestions('anti-trivia', questions);
      renderQuestions();
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
    nextQuestion();
  });

  // Verdict buttons
  $('btn-correct').addEventListener('click', () => addBonusPoints(100));
  $('btn-error').addEventListener('click', () => {
    // No points added
  });

  // Answer buttons
  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      selectAnswer(index);
    });
  });

  // Team selection with spacebar
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isStarted) {
      e.preventDefault();
      selectedTeam = selectedTeam === 'A' ? 'B' : 'A';
      showTurnModal(`Equipo ${selectedTeam}`, 1500);
    }
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

  // Questions panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderQuestions();
    }
  });

  // Add question button
  $('btn-add-question').addEventListener('click', () => {
    openEditQuestion(-1);
  });

  // Questions list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditQuestion(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteQuestion(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit question modal
  $('btn-save-question').addEventListener('click', saveQuestion);
  $('btn-cancel-question').addEventListener('click', () => {
    $('edit-question-modal').classList.add('hidden');
  });

})();
