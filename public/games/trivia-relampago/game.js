/**
 * TRIVIA RELÁMPAGO - Game Logic
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'trivia',
    defaultRounds: 5,
    defaultTime: 15,
    warningThreshold: 5,
    onTimeUp: onTimeUp,
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextQuestion(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentQuestion = 0;

  const defaultQuestions = [
    { text: "¿Cuál es la capital de Chile?", answers: ["Santiago", "Buenos Aires", "Lima", "Bogotá"], correct: 0 },
    { text: "¿Quién pintó la Mona Lisa?", answers: ["Picasso", "Da Vinci", "Van Gogh", "Monet"], correct: 1 },
    { text: "¿Cuántos días tiene un año bisiesto?", answers: ["364", "365", "366", "367"], correct: 2 },
    { text: "¿Cuál es el planeta más grande del sistema solar?", answers: ["Saturno", "Júpiter", "Neptuno", "Urano"], correct: 1 },
    { text: "¿En qué año llegó el hombre a la Luna?", answers: ["1967", "1968", "1969", "1970"], correct: 2 }
  ];

  let questions = [...defaultQuestions];

  // ==================== DOM ====================
  const questionContainer = $('question-container');
  const questionText = $('question-text');
  const answersContainer = $('answers-container');
  const resultContainer = $('result-container');
  const resultBox = $('result-box');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');
  const gameControls = $('game-controls');
  const extraPoints = $('extra-points');
  const btnNext = $('btn-next');

  // ==================== GAME LOGIC ====================
  function onTimeUp() {
    resultContainer.classList.remove('hidden');
    resultBox.textContent = '¡TIEMPO AGOTADO!';
    resultBox.className = 'result-box error';
    document.querySelectorAll('.answer-btn').forEach(btn => btn.disabled = true);
  }

  function startGame() {
    const savedQuestions = sdk.getQuestions('trivia');
    if (savedQuestions.length > 0) questions = savedQuestions;

    state.totalRounds = parseInt(roundsSelect.value);
    state.timePerUnit = parseInt(timeSelect.value);
    currentQuestion = 0;
    state.currentRound = 1;
    state.localScores = { A: 0, B: 0 };
    state.isStarted = true;

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);

    $('waiting-state').classList.add('hidden');
    questionContainer.classList.remove('hidden');

    core.setButtonsDisabled(false);
    core.updateScoreDisplay();
    loadQuestion();
    core.startTimer();
  }

  function loadQuestion() {
    if (currentQuestion >= questions.length) currentQuestion = 0;

    const q = questions[currentQuestion];
    questionText.textContent = q.text;

    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const answers = q.answers;

    document.getElementById('answer-0').textContent = answers[shuffledIndices[0]];
    document.getElementById('answer-1').textContent = answers[shuffledIndices[1]];
    document.getElementById('answer-2').textContent = answers[shuffledIndices[2]];
    document.getElementById('answer-3').textContent = answers[shuffledIndices[3]];

    answersContainer.dataset.correct = shuffledIndices.indexOf(q.correct);

    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = false;
    });

    resultContainer.classList.add('hidden');

    core.pauseTimer();
    state.timeRemaining = state.timePerUnit;
    core.updateClockDisplay();
    core.updateTimerBar();
    core.startTimer();
  }

  function selectAnswer(index) {
    if (state.isPaused || !state.isStarted) return;

    const correctIndex = parseInt(answersContainer.dataset.correct);
    const buttons = document.querySelectorAll('.answer-btn');
    const isCorrect = index === correctIndex;

    buttons.forEach(btn => btn.disabled = true);
    buttons[correctIndex].classList.add('correct');
    resultContainer.classList.remove('hidden');

    if (isCorrect) {
      core.addCorrectPoints(state.selectedTeam);
      resultBox.textContent = `¡Correcto! +${state.correctPoints} pts`;
      resultBox.className = 'result-box success';
    } else {
      buttons[index].classList.add('wrong');
      resultBox.textContent = 'Incorrecto!';
      resultBox.className = 'result-box error';
    }
  }

  function nextQuestion() {
    currentQuestion++;
    if (currentQuestion >= questions.length) {
      state.currentRound++;
      if (state.currentRound > state.totalRounds) {
        core.endGame();
        return;
      }
      sdk.updateRound(state.currentRound, state.totalRounds);
      currentQuestion = 0;
    }
    loadQuestion();
  }

  // ==================== QUESTIONS MANAGEMENT ====================
  function renderQuestions() {
    questionsList.innerHTML = '';
    questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span style="flex:1; font-size:0.9rem;">${index + 1}. ${q.text}</span>
        <div style="display:flex; gap:0.25rem;">
          <button class="question-item-btn edit" data-index="${index}" style="background:#f0edec; border:2px solid #1c1b1b; border-radius:0.3rem; padding:0.25rem 0.5rem; cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:0.9rem;">edit</span>
          </button>
          <button class="question-item-btn delete" data-index="${index}" style="background:#ffdad6; border:2px solid #1c1b1b; border-radius:0.3rem; padding:0.25rem 0.5rem; cursor:pointer;">
            <span class="material-symbols-outlined" style="font-size:0.9rem;">delete</span>
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
    const question = { text, answers, correct: 0 };

    if (index >= 0) {
      questions[index] = question;
    } else {
      questions.push(question);
    }

    sdk.saveQuestions('trivia', questions);
    renderQuestions();
    $('edit-question-modal').classList.add('hidden');
  }

  function deleteQuestion(index) {
    if (confirm('¿Eliminar esta pregunta?')) {
      questions.splice(index, 1);
      sdk.saveQuestions('trivia', questions);
      renderQuestions();
    }
  }

  // ==================== EVENT LISTENERS ====================
  document.querySelectorAll('.btn-points').forEach(btn => {
    btn.addEventListener('click', () => {
      core.addCorrectPoints(state.selectedTeam);
    });
  });

  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(parseInt(btn.dataset.index)));
  });

  btnNext.addEventListener('click', nextQuestion);

  roundsSelect.addEventListener('change', () => {
    state.totalRounds = parseInt(roundsSelect.value);
    sdk.updateRound(state.currentRound, state.totalRounds);
  });

  timeSelect.addEventListener('change', () => {
    state.timePerUnit = parseInt(timeSelect.value);
    sdk.setTimePerRound(state.timePerUnit);
  });

  $('btn-add-question').addEventListener('click', () => openEditQuestion(-1));

  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditQuestion(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteQuestion(parseInt(deleteBtn.dataset.index));
  });

  $('btn-save-question').addEventListener('click', saveQuestion);
  $('btn-cancel-question').addEventListener('click', () => $('edit-question-modal').classList.add('hidden'));

  const savedQuestions = sdk.getQuestions('trivia');
  if (savedQuestions.length > 0) questions = savedQuestions;

})();
