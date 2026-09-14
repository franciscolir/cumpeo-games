/**
 * ¿QUÉ PIENSA EL PÚBLICO? - Game Logic
 * Encuesta binaria: el público vota, los equipos predicen
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'que-dice',
    defaultRounds: 1,
    defaultTime: 60,
    warningThreshold: 5,
    onTimeUp: () => {},
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextQuestion(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentQuestionIndex = 0;
  let questionsPerRound = 5;
  let predictions = { A: null, B: null };
  let isRevealed = false;

  const defaultQuestions = [
    { text: "¿Cuál es la mejor hora para almorzar?", optionA: "12:00", optionB: "14:00", correctOption: "A" },
    { text: "¿Pizza o hamburguesa?", optionA: "Pizza", optionB: "Hamburguesa", correctOption: "A" },
    { text: "¿Playa o montaña?", optionA: "Playa", optionB: "Montaña", correctOption: "B" },
    { text: "¿Gatos o perros?", optionA: "Gatos", optionB: "Perros", correctOption: "B" },
    { text: "¿Madrugador o noctámbulo?", optionA: "Madrugador", optionB: "Noctámbulo", correctOption: "A" }
  ];

  let questions = [...defaultQuestions];

  // ==================== DOM ====================
  const surveyContainer = $('survey-container');
  const surveyQuestionText = $('survey-question-text');
  const questionIndex = $('question-index');
  const officialSolution = $('official-solution');
  const resultContainer = $('result-container');
  const resultBox = $('result-box');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');
  const btnNext = $('btn-next');
  const predictionsPanel = $('predictions-panel');
  const predictionADisplay = $('prediction-a-display');
  const predictionBDisplay = $('prediction-b-display');
  const surveyOptions = $('survey-options');

  // ==================== GAME LOGIC ====================
  function startGame() {
    const savedQuestions = sdk.getQuestions('que-dice');
    if (savedQuestions.length > 0) questions = savedQuestions;

    state.totalRounds = parseInt(roundsSelect.value);
    questionsPerRound = parseInt(timeSelect.value);
    state.currentRound = 1;
    currentQuestionIndex = 0;
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;

    sdk.updateRound(state.currentRound, state.totalRounds);

    $('waiting-state').classList.add('hidden');
    surveyContainer.classList.remove('hidden');

    core.setButtonsDisabled(false);
    core.updateScoreDisplay();
    loadQuestion();
  }

  function loadQuestion() {
    if (currentQuestionIndex >= questionsPerRound) {
      currentQuestionIndex = 0;
    }
    if (currentQuestionIndex >= questions.length) {
      currentQuestionIndex = 0;
    }

    const q = questions[currentQuestionIndex];
    surveyQuestionText.textContent = q.text;
    questionIndex.textContent = `${currentQuestionIndex + 1}/${questionsPerRound}`;
    officialSolution.textContent = `${q.correctOption} — ${q['option' + q.correctOption]}`;

    $('survey-option-a').textContent = q.optionA;
    $('survey-option-b').textContent = q.optionB;

    predictions = { A: null, B: null };
    isRevealed = false;
    predictionADisplay.textContent = '—';
    predictionBDisplay.textContent = '—';
    predictionADisplay.className = 'prediction-display';
    predictionBDisplay.className = 'prediction-display';

    document.querySelectorAll('.prediction-btn').forEach(btn => {
      btn.classList.remove('selected', 'correct-prediction', 'wrong-prediction');
      btn.disabled = false;
    });
    document.querySelectorAll('.survey-option-btn').forEach(btn => {
      btn.classList.remove('correct-option', 'wrong-option');
    });
    resultContainer.classList.add('hidden');
  }

  function setPrediction(team, prediction) {
    predictions[team] = prediction;
    const display = team === 'A' ? predictionADisplay : predictionBDisplay;
    display.textContent = prediction;
    display.className = 'prediction-display selected';

    document.querySelectorAll(`.prediction-btn[data-team="${team}"]`).forEach(btn => {
      btn.classList.remove('selected');
      if (btn.dataset.prediction === prediction) btn.classList.add('selected');
    });
  }

  function revealResult() {
    if (predictions.A === null || predictions.B === null) {
      alert('Ambos equipos deben registrar su predicción');
      return;
    }

    isRevealed = true;
    const q = questions[currentQuestionIndex];
    const correct = q.correctOption;

    document.querySelectorAll('.prediction-btn').forEach(btn => btn.disabled = true);

    document.querySelectorAll('.survey-option-btn').forEach(btn => {
      if (btn.dataset.option === correct) btn.classList.add('correct-option');
      else btn.classList.add('wrong-option');
    });

    if (predictions.A === correct) {
      core.addCorrectPoints('A');
      predictionADisplay.className = 'prediction-display correct-prediction';
    } else {
      predictionADisplay.className = 'prediction-display wrong-prediction';
      core.addPenaltyPoints('A');
    }

    if (predictions.B === correct) {
      core.addCorrectPoints('B');
      predictionBDisplay.className = 'prediction-display correct-prediction';
    } else {
      predictionBDisplay.className = 'prediction-display wrong-prediction';
      core.addPenaltyPoints('B');
    }

    const resultA = predictions.A === correct;
    const resultB = predictions.B === correct;
    let msg = '';
    if (resultA && resultB) msg = '¡Ambos acertaron!';
    else if (resultA) msg = '¡Equipo A acierta!';
    else if (resultB) msg = '¡Equipo B acierta!';
    else msg = 'Nadie acierta';

    resultContainer.classList.remove('hidden');
    resultBox.textContent = msg;
    resultBox.className = 'result-box ' + (resultA || resultB ? 'success' : 'error');
  }

  function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questionsPerRound) {
      state.currentRound++;
      if (state.currentRound > state.totalRounds) { core.endGame(); return; }
      sdk.updateRound(state.currentRound, state.totalRounds);
      currentQuestionIndex = 0;
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
        <span class="question-item-text">${index + 1}. "${q.text.substring(0, 40)}..." [${q.correctOption}]</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
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
      $('edit-option-a').value = q.optionA;
      $('edit-option-b').value = q.optionB;
      $('edit-correct-option').value = q.correctOption;
    } else {
      $('edit-question-text').value = '';
      $('edit-option-a').value = '';
      $('edit-option-b').value = '';
      $('edit-correct-option').value = 'A';
    }
    modal.classList.remove('hidden');
  }

  function saveQuestion() {
    const index = parseInt($('edit-question-index').value);
    const text = $('edit-question-text').value.trim();
    const optionA = $('edit-option-a').value.trim();
    const optionB = $('edit-option-b').value.trim();
    const correctOption = $('edit-correct-option').value;
    if (!text || !optionA || !optionB) { alert('Todos los campos son obligatorios'); return; }
    const question = { text, optionA, optionB, correctOption };
    if (index >= 0) questions[index] = question;
    else questions.push(question);
    sdk.saveQuestions('que-dice', questions);
    renderQuestions();
    $('edit-question-modal').classList.add('hidden');
  }

  function deleteQuestion(index) {
    if (confirm('¿Eliminar esta pregunta?')) {
      questions.splice(index, 1);
      sdk.saveQuestions('que-dice', questions);
      renderQuestions();
    }
  }

  // ==================== EVENT LISTENERS ====================
  btnNext.addEventListener('click', nextQuestion);
  $('btn-reveal').addEventListener('click', revealResult);

  document.querySelectorAll('.prediction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPrediction(btn.dataset.team, btn.dataset.prediction);
    });
  });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTeam = btn.dataset.team;
    });
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

  // Init
  renderQuestions();

})();
