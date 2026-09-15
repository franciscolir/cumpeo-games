/**
 * ROSCO ALFABÉTICO - Game Logic
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'rosco',
    defaultRounds: 3,
    defaultTime: 90,
    warningThreshold: 10,
    onTimeUp: () => {
      const active = letters.find(l => l.state === 'active');
      if (active) setLetterState(active.ch, 'red');
      state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
      updateTeamUI();
      showTurnModal(`Tiempo agotado — Equipo ${state.selectedTeam}`, 2000);
      const nextPending = letters.findIndex(l => l.state === 'pending');
      if (nextPending >= 0) focusLetter(nextPending);
      else core.endGame();
    },
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextRound(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  const ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','X','Z'];

  let letters = ALPHABET.map(ch => ({
    ch, state: 'pending', definition: '', answer: '', synonyms: []
  }));

  let currentLetterIndex = 0;

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

  // ==================== DOM ====================
  const RADIUS = 41;
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
  const btnStart = $('btn-start');

  // ==================== RENDER ROSCO ====================
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
    if (!state.isStarted) return;
    letters.forEach((l, i) => { if (l.state === 'active' && i !== idx) l.state = 'pending'; });
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
    const p = letters.filter(l => l.state === 'pending' || l.state === 'active').length;
    countGreen.textContent = g + ' Verdes';
    countRed.textContent = r + ' Rojas';
    countPending.textContent = p + ' Restantes';
  }

  function updateTeamUI() {
    document.querySelectorAll('.team-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.team === state.selectedTeam);
    });
    teamIndicator.textContent = `EQUIPO ${state.selectedTeam}`;
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    const savedQuestions = sdk.getQuestions('rosco');
    if (savedQuestions.length > 0) {
      letters = ALPHABET.map((ch, i) => {
        const saved = savedQuestions.find(q => q.letter === ch);
        return { ch, state: 'pending', definition: saved ? saved.definition : '', answer: saved ? saved.answer : '', synonyms: saved ? saved.synonyms : [] };
      });
    } else {
      letters = defaultLetters.map(q => ({ ...q, state: 'pending' }));
    }

    state.totalRounds = parseInt(roundsSelect.value);
    state.timePerUnit = parseInt(timeSelect.value);
    state.currentRound = 1;
    state.localScores = { A: 0, B: 0 };
    state.isStarted = true;

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);
    core.updateScoreDisplay();

    $('waiting-state').classList.add('hidden');
    roscoContainer.classList.remove('hidden');

    core.setButtonsDisabled(false);
    focusLetter(0);
    core.startTimer();
  }

  function nextRound() {
    state.currentRound++;
    if (state.currentRound > state.totalRounds) { core.endGame(); return; }
    sdk.updateRound(state.currentRound, state.totalRounds);
    roundIndicator.textContent = `RONDA ${state.currentRound}`;
    letters.forEach(l => l.state = 'pending');
    focusLetter(0);
  }

  function correctAnswer() {
    const active = letters.find(l => l.state === 'active');
    if (active) { setLetterState(active.ch, 'green'); core.addCorrectPoints(state.selectedTeam); }
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) focusLetter(nextPending);
    else core.endGame();
  }

  function errorAnswer() {
    const active = letters.find(l => l.state === 'active');
    if (active) setLetterState(active.ch, 'red');
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) focusLetter(nextPending);
    else core.endGame();
  }

  function passTurn() {
    const active = letters.find(l => l.state === 'active');
    if (active) setLetterState(active.ch, 'pending');
    state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
    updateTeamUI();
    showTurnModal(`Equipo ${state.selectedTeam}`, 2000);
    const nextPending = letters.findIndex(l => l.state === 'pending');
    if (nextPending >= 0) focusLetter(nextPending);
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
    letters[index].definition = $('edit-definition').value.trim();
    letters[index].answer = $('edit-answer').value.trim();
    letters[index].synonyms = $('edit-synonyms').value.split(',').map(s => s.trim()).filter(s => s);
    sdk.saveQuestions('rosco', letters.map(l => ({ letter: l.ch, definition: l.definition, answer: l.answer, synonyms: l.synonyms })));
    if (letters[index].state === 'active') {
      roscoDefinition.textContent = letters[index].definition || 'Sin definición';
      officialSolution.textContent = letters[index].answer || '—';
    }
    renderQuestions();
    $('edit-question-modal').classList.add('hidden');
  }

  // ==================== EVENT LISTENERS ====================
  $('btn-correct').addEventListener('click', correctAnswer);
  $('btn-error').addEventListener('click', errorAnswer);
  $('btn-pass').addEventListener('click', passTurn);

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => { state.selectedTeam = btn.dataset.team; updateTeamUI(); });
  });

  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) renderQuestions();
  });

  $('btn-add-question').addEventListener('click', () => {
    const idx = letters.findIndex(l => !l.definition);
    if (idx >= 0) openEditQuestion(idx);
    else alert('Todas las letras ya tienen definiciones');
  });

  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    if (editBtn) openEditQuestion(parseInt(editBtn.dataset.index));
  });

  $('btn-save-question').addEventListener('click', saveQuestion);
  $('btn-cancel-question').addEventListener('click', () => $('edit-question-modal').classList.add('hidden'));

  renderLetters();
  updateCounts();

})();
