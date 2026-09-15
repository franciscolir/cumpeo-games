/**
 * ANTI-TRIVIA - Game Logic
 * La trivia invertida: Encuentra la respuesta INCORRECTA
 * Cada ronda utiliza un set diferente de preguntas (sin repetir).
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'anti-trivia',
    defaultRounds: 5,
    defaultTime: 20,
    warningThreshold: 5,
    onTimeUp: () => {
      const buttons = document.querySelectorAll('.answer-btn');
      buttons.forEach(btn => btn.disabled = true);
      const q = currentQuestions[currentQuestion];
      const shuffledIndices = JSON.parse(answersContainer.dataset.shuffled);
      buttons.forEach((btn, i) => { if (shuffledIndices[i] === q.correct) btn.classList.add('selected-correct'); });
      resultContainer.classList.remove('hidden');
      resultBox.textContent = '¡TIEMPO AGOTADO!';
      resultBox.className = 'result-box error';
      setTimeout(() => nextQuestion(), 2000);
    },
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextQuestion(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds, usedSets: usedSetIndices.length })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentQuestion = 0;
  let currentQuestions = [];
  let usedSetIndices = [];

  const defaultSets = [
    {
      name: 'Cultura General',
      questions: [
        { text: "¿Cuál es la capital de Chile?", answers: ["Santiago", "Buenos Aires", "Lima", "Bogotá"], correct: 0, correctText: "Santiago" },
        { text: "¿Quién pintó la Mona Lisa?", answers: ["Picasso", "Da Vinci", "Van Gogh", "Monet"], correct: 1, correctText: "Da Vinci" },
        { text: "¿Cuántos días tiene un año bisiesto?", answers: ["364", "365", "366", "367"], correct: 2, correctText: "366" },
        { text: "¿Cuál es el planeta más grande del sistema solar?", answers: ["Saturno", "Júpiter", "Neptuno", "Urano"], correct: 1, correctText: "Júpiter" },
        { text: "¿En qué año llegó el hombre a la Luna?", answers: ["1967", "1968", "1969", "1970"], correct: 2, correctText: "1969" }
      ]
    }
  ];

  let sets = JSON.parse(JSON.stringify(defaultSets));

  // ==================== DOM ====================
  const questionContainer = $('question-container');
  const questionText = $('question-text');
  const questionNumber = $('question-number');
  const answersContainer = $('answers-container');
  const resultContainer = $('result-container');
  const resultBox = $('result-box');
  const officialSolution = $('official-solution');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const setsList = $('sets-list');
  const roundSetSelect = $('round-set-select');
  const currentSetDisplay = $('current-set-display');
  const currentSetName = $('current-set-name');
  const currentSetProgress = $('current-set-progress');
  const setSelector = $('set-selector');
  const btnNext = $('btn-next');

  // ==================== SETS MANAGEMENT ====================
  function loadSets() {
    const saved = sdk.getQuestions('anti-trivia-sets');
    if (saved.length > 0) sets = saved;
  }

  function saveSets() {
    sdk.saveQuestions('anti-trivia-sets', sets);
  }

  function renderSets() {
    setsList.innerHTML = '';
    sets.forEach((set, index) => {
      const isUsed = usedSetIndices.includes(index);
      const div = document.createElement('div');
      div.className = 'question-item' + (isUsed ? ' used' : '');
      div.innerHTML = `
        <span class="question-item-text">${isUsed ? '✓ ' : ''}${set.name} (${set.questions.length} preguntas)</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      setsList.appendChild(div);
    });
    updateRoundSetSelect();
  }

  function updateRoundSetSelect() {
    roundSetSelect.innerHTML = '<option value="">— Seleccionar set —</option>';
    sets.forEach((set, index) => {
      if (!usedSetIndices.includes(index)) {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = `${set.name} (${set.questions.length} preguntas)`;
        roundSetSelect.appendChild(opt);
      }
    });
  }

  function openEditSet(index = -1) {
    const modal = $('edit-set-modal');
    $('edit-set-index').value = index;
    if (index >= 0) {
      $('edit-set-name').value = sets[index].name;
      editingSetQuestions = JSON.parse(JSON.stringify(sets[index].questions));
    } else {
      $('edit-set-name').value = '';
      editingSetQuestions = [];
    }
    renderSetQuestions();
    modal.classList.remove('hidden');
  }

  let editingSetQuestions = [];

  function renderSetQuestions() {
    const list = $('set-questions-list');
    list.innerHTML = '';
    editingSetQuestions.forEach((q, i) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${i + 1}. ${q.text}</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${i}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${i}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      list.appendChild(div);
    });
  }

  function openEditSetQuestion(index = -1) {
    const modal = $('edit-set-question-modal');
    $('edit-set-question-index').value = index;
    if (index >= 0) {
      const q = editingSetQuestions[index];
      $('edit-sq-text').value = q.text;
      $('edit-sq-correct').value = q.answers[q.correct];
      const wrongAnswers = q.answers.filter((_, i) => i !== q.correct);
      $('edit-sq-wrong1').value = wrongAnswers[0] || '';
      $('edit-sq-wrong2').value = wrongAnswers[1] || '';
      $('edit-sq-wrong3').value = wrongAnswers[2] || '';
    } else {
      $('edit-sq-text').value = '';
      $('edit-sq-correct').value = '';
      $('edit-sq-wrong1').value = '';
      $('edit-sq-wrong2').value = '';
      $('edit-sq-wrong3').value = '';
    }
    modal.classList.remove('hidden');
  }

  function saveSetQuestion() {
    const index = parseInt($('edit-set-question-index').value);
    const text = $('edit-sq-text').value.trim();
    const correct = $('edit-sq-correct').value.trim();
    const wrong1 = $('edit-sq-wrong1').value.trim();
    const wrong2 = $('edit-sq-wrong2').value.trim();
    const wrong3 = $('edit-sq-wrong3').value.trim();
    if (!text || !correct) { alert('La pregunta y respuesta correcta son obligatorias'); return; }
    const answers = [correct, wrong1, wrong2, wrong3].filter(a => a);
    const question = { text, answers, correct: 0, correctText: correct };
    if (index >= 0) editingSetQuestions[index] = question;
    else editingSetQuestions.push(question);
    renderSetQuestions();
    $('edit-set-question-modal').classList.add('hidden');
  }

  function deleteSetQuestion(index) {
    if (confirm('¿Eliminar esta pregunta?')) {
      editingSetQuestions.splice(index, 1);
      renderSetQuestions();
    }
  }

  function saveSet() {
    const index = parseInt($('edit-set-index').value);
    const name = $('edit-set-name').value.trim();
    if (!name) { alert('El nombre del set es obligatorio'); return; }
    if (editingSetQuestions.length === 0) { alert('El set debe tener al menos una pregunta'); return; }
    const set = { name, questions: JSON.parse(JSON.stringify(editingSetQuestions)) };
    if (index >= 0) sets[index] = set;
    else sets.push(set);
    saveSets();
    renderSets();
    $('edit-set-modal').classList.add('hidden');
  }

  function deleteSet(index) {
    if (confirm('¿Eliminar este set?')) {
      sets.splice(index, 1);
      saveSets();
      renderSets();
    }
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    loadSets();

    const selectedSetIndex = roundSetSelect.value;
    if (selectedSetIndex === '') {
      alert('Selecciona un set para esta ronda');
      return;
    }

    const selectedSet = sets[parseInt(selectedSetIndex)];
    currentQuestions = JSON.parse(JSON.stringify(selectedSet.questions));
    currentQuestion = 0;

    state.totalRounds = parseInt(roundsSelect.value);
    state.timePerUnit = parseInt(timeSelect.value);
    state.currentRound = 1;
    state.localScores = { A: 0, B: 0 };
    state.isStarted = true;

    usedSetIndices = [parseInt(selectedSetIndex)];

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);
    core.updateScoreDisplay();
    $('waiting-state').classList.add('hidden');
    questionContainer.classList.remove('hidden');

    currentSetDisplay.style.display = '';
    currentSetName.textContent = selectedSet.name;
    currentSetProgress.textContent = `1/${currentQuestions.length}`;

    setSelector.style.display = 'none';

    core.setButtonsDisabled(false);
    loadQuestion();
    core.startTimer();
  }

  function startNextRound() {
    const selectedSetIndex = roundSetSelect.value;
    if (selectedSetIndex === '') {
      core.endGame();
      return;
    }

    const selectedSet = sets[parseInt(selectedSetIndex)];
    currentQuestions = JSON.parse(JSON.stringify(selectedSet.questions));
    currentQuestion = 0;

    usedSetIndices.push(parseInt(selectedSetIndex));

    sdk.updateRound(state.currentRound, state.totalRounds);
    currentSetName.textContent = selectedSet.name;
    currentSetProgress.textContent = `1/${currentQuestions.length}`;

    setSelector.style.display = 'none';
    currentSetDisplay.style.display = '';
    
    // Hide next round button
    const btnNextRound = $('btn-next-round');
    if (btnNextRound) btnNextRound.style.display = 'none';

    loadQuestion();
    core.startTimer();
  }

  function loadQuestion() {
    if (currentQuestion >= currentQuestions.length) {
      currentSetProgress.textContent = `${currentQuestions.length}/${currentQuestions.length}`;
      core.pauseTimer();
      return;
    }
    const q = currentQuestions[currentQuestion];
    questionText.textContent = q.text;
    questionNumber.textContent = `${currentQuestion + 1}/${currentQuestions.length}`;
    officialSolution.textContent = q.correctText || q.answers[q.correct];
    currentSetProgress.textContent = `${currentQuestion + 1}/${currentQuestions.length}`;

    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    document.getElementById('answer-0').textContent = q.answers[shuffledIndices[0]];
    document.getElementById('answer-1').textContent = q.answers[shuffledIndices[1]];
    document.getElementById('answer-2').textContent = q.answers[shuffledIndices[2]];
    document.getElementById('answer-3').textContent = q.answers[shuffledIndices[3]];

    answersContainer.dataset.shuffled = JSON.stringify(shuffledIndices);
    answersContainer.dataset.correctIndex = q.correct;

    document.querySelectorAll('.answer-btn').forEach(btn => { btn.classList.remove('correct', 'wrong', 'selected-correct'); btn.disabled = false; });
    resultContainer.classList.add('hidden');

    core.pauseTimer();
    state.timeRemaining = state.timePerUnit;
    core.updateClockDisplay();
    core.updateTimerBar();
    core.startTimer();
  }

  function selectAnswer(displayIndex) {
    if (state.isPaused || !state.isStarted) return;
    const q = currentQuestions[currentQuestion];
    const shuffledIndices = JSON.parse(answersContainer.dataset.shuffled);
    const actualIndex = shuffledIndices[displayIndex];
    const isCorrectAnswer = actualIndex === q.correct;
    const buttons = document.querySelectorAll('.answer-btn');

    buttons.forEach(btn => btn.disabled = true);
    buttons.forEach((btn, i) => { if (shuffledIndices[i] === q.correct) btn.classList.add('selected-correct'); });
    resultContainer.classList.remove('hidden');

    if (!isCorrectAnswer) {
      core.addCorrectPoints(state.selectedTeam);
      resultBox.textContent = `¡Correcto! +${state.correctPoints} pts`;
      resultBox.className = 'result-box success';
    } else {
      buttons[displayIndex].classList.add('wrong');
      resultBox.textContent = `¡Incorrecto! Esa era la respuesta correcta`;
      resultBox.className = 'result-box error';
    }
  }

  function addBonusPoints(points) {
    state.localScores[state.selectedTeam] += points;
    sdk.updateScore(state.localScores);
    core.updateScoreDisplay();
  }

  function nextQuestion() {
    currentQuestion++;
    if (currentQuestion >= currentQuestions.length) {
      state.currentRound++;
      if (state.currentRound > state.totalRounds) { core.endGame(); return; }
      sdk.updateRound(state.currentRound, state.totalRounds);
      updateRoundSetSelect();
      setSelector.style.display = '';
      currentSetDisplay.style.display = 'none';
      // Show next round button
      const btnNextRound = $('btn-next-round');
      if (btnNextRound) btnNextRound.style.display = '';
      return;
    }
    loadQuestion();
  }

  // ==================== EVENT LISTENERS ====================
  btnNext.addEventListener('click', nextQuestion);
  $('btn-correct').addEventListener('click', () => addBonusPoints(100));
  $('btn-error').addEventListener('click', () => {
    if (state.penaltyEnabled) {
      core.addPenaltyPoints(state.selectedTeam);
      resultBox.textContent = `¡Error! -${state.penaltyPoints} pts`;
      resultBox.className = 'result-box error';
      resultContainer.classList.remove('hidden');
    }
  });

  // Start next round button
  const btnNextRound = document.createElement('button');
  btnNextRound.id = 'btn-next-round';
  btnNextRound.className = 'btn-secondary';
  btnNextRound.style.cssText = 'width: 100%; margin-bottom: 1rem; display: none;';
  btnNextRound.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1rem;">skip_next</span> SIGUIENTE RONDA';
  $('btn-start').parentNode.insertBefore(btnNextRound, $('btn-start'));
  btnNextRound.addEventListener('click', startNextRound);

  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(parseInt(btn.dataset.index)));
  });

  // Sets management
  $('btn-add-set').addEventListener('click', () => openEditSet(-1));

  setsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditSet(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteSet(parseInt(deleteBtn.dataset.index));
  });

  $('btn-save-set').addEventListener('click', saveSet);
  $('btn-cancel-set').addEventListener('click', () => $('edit-set-modal').classList.add('hidden'));

  $('btn-add-set-question').addEventListener('click', () => openEditSetQuestion(-1));

  $('set-questions-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditSetQuestion(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteSetQuestion(parseInt(deleteBtn.dataset.index));
  });

  $('btn-save-set-question').addEventListener('click', saveSetQuestion);
  $('btn-cancel-set-question').addEventListener('click', () => $('edit-set-question-modal').classList.add('hidden'));

  // Init
  loadSets();
  renderSets();

})();
