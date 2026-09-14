/**
 * PICTIONARY - Game Logic
 * ¡Dibuja y adivina!
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'pictionary',
    defaultRounds: 5,
    defaultTime: 90,
    warningThreshold: 10,
    onTimeUp: () => endRound(),
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => endRound(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentWordIndex = 0;
  let canvas, ctx;
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let currentColor = '#1c1b1b';
  let currentSize = 5;
  let drawingHistory = [];

  const defaultWords = [
    { text: 'GATO', category: 'Animales' }, { text: 'CASA', category: 'Cosas' },
    { text: 'SOL', category: 'Naturaleza' }, { text: 'ARBOL', category: 'Naturaleza' },
    { text: 'PERRO', category: 'Animales' }, { text: 'COCHE', category: 'Transportes' },
    { text: 'MONTAÑA', category: 'Naturaleza' }, { text: 'LAPICERO', category: 'Escolar' },
    { text: 'HAMBURGUESA', category: 'Comida' }, { text: 'FUTBOL', category: 'Deportes' }
  ];

  let words = [...defaultWords];

  // ==================== DOM ====================
  const drawingContainer = $('drawing-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const currentWordEl = $('current-word');
  const officialWord = $('official-word');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');
  const questionsPanel = $('questions-panel');
  const btnNextWord = $('btn-next-word');

  // ==================== CANVAS ====================
  function initCanvas() {
    canvas = $('drawing-canvas');
    ctx = canvas.getContext('2d');
    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = canvas.offsetHeight;
      redrawCanvas();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
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
    if (e.type === 'touchstart') startDrawing({ offsetX: x, offsetY: y });
    else if (e.type === 'touchmove') draw({ offsetX: x, offsetY: y });
  }

  function startDrawing(e) {
    if (state.isPaused || !state.isStarted) return;
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    drawingHistory.push({ type: 'start', x: lastX, y: lastY, color: currentColor, size: currentSize });
  }

  function draw(e) {
    if (!isDrawing || state.isPaused) return;
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

  function stopDrawing() { isDrawing = false; drawingHistory.push({ type: 'stop' }); }
  function redrawCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  function clearCanvas() { drawingHistory = []; redrawCanvas(); }

  function undoLast() {
    if (drawingHistory.length > 0) {
      drawingHistory.pop();
      redrawCanvas();
      drawingHistory.forEach(action => {
        if (action.type === 'draw') {
          ctx.beginPath(); ctx.strokeStyle = action.color; ctx.lineWidth = action.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        }
      });
    }
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    const savedWords = sdk.getQuestions('pictionary');
    if (savedWords.length > 0) words = savedWords;

    state.totalRounds = parseInt(roundsSelect.value);
    state.timePerUnit = parseInt(timeSelect.value);
    state.currentRound = 1;
    currentWordIndex = 0;
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);
    core.updateScoreDisplay();

    $('waiting-state').classList.add('hidden');
    drawingContainer.classList.remove('hidden');

    core.setButtonsDisabled(false);
    initCanvas();
    showNextWord();
    updateTurnDisplay();
    core.startTimer();
  }

  function showNextWord() {
    if (currentWordIndex >= words.length) currentWordIndex = 0;
    currentWordEl.textContent = '???';
    officialWord.textContent = words[currentWordIndex].text;
    clearCanvas();
  }

  function revealWord() { currentWordEl.textContent = words[currentWordIndex].text; }

  function correctGuess() {
    core.addCorrectPoints(state.selectedTeam);
    revealWord();
    setTimeout(() => { currentWordIndex++; showNextWord(); }, 1500);
  }

  function passWord() {
    core.addPenaltyPoints(state.selectedTeam);
    currentWordIndex++;
    showNextWord();
  }

  function endRound() {
    core.pauseTimer();
    state.currentRound++;
    if (state.currentRound > state.totalRounds) { core.endGame(); return; }
    sdk.updateRound(state.currentRound, state.totalRounds);
    state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${state.selectedTeam}`, 1500);
    setTimeout(() => { showNextWord(); core.startTimer(); }, 1000);
  }

  function updateTurnDisplay() {
    const drawer = $('player-drawer').value.trim() || `Equipo ${state.selectedTeam}`;
    const guesser = $('player-guesser').value.trim() || '';
    turnText.textContent = guesser ? `${drawer} dibuja → ${guesser} adivina` : `${drawer} dibuja`;
    turnIndicator.style.background = state.selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = state.selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== WORDS MANAGEMENT ====================
  function renderWords(targetList) {
    targetList.innerHTML = '';
    words.forEach((word, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${word.text} <span style="color: #5d3f3e; font-size: 0.75rem;">(${word.category || 'Sin categoría'})</span></span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      targetList.appendChild(div);
    });
  }

  function openEditWord(index = -1) {
    const modal = $('edit-word-modal');
    $('edit-word-index').value = index;
    if (index >= 0) { $('edit-word-text').value = words[index].text; $('edit-word-category').value = words[index].category || ''; }
    else { $('edit-word-text').value = ''; $('edit-word-category').value = ''; }
    modal.classList.remove('hidden');
  }

  function saveWord() {
    const index = parseInt($('edit-word-index').value);
    const text = $('edit-word-text').value.trim().toUpperCase();
    const category = $('edit-word-category').value.trim();
    if (!text) { alert('La palabra es obligatoria'); return; }
    if (index >= 0) words[index] = { text, category };
    else words.push({ text, category });
    sdk.saveQuestions('pictionary', words);
    renderWords(questionsList);
    if ($('questions-list-config')) renderWords($('questions-list-config'));
    $('edit-word-modal').classList.add('hidden');
  }

  function deleteWord(index) {
    if (confirm('¿Eliminar esta palabra?')) {
      words.splice(index, 1);
      sdk.saveQuestions('pictionary', words);
      renderWords(questionsList);
      if ($('questions-list-config')) renderWords($('questions-list-config'));
    }
  }

  // ==================== EVENT LISTENERS ====================
  btnNextWord.addEventListener('click', passWord);
  $('btn-correct').addEventListener('click', correctGuess);
  $('btn-pass').addEventListener('click', passWord);
  $('btn-undo').addEventListener('click', undoLast);
  $('btn-clear').addEventListener('click', clearCanvas);

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentColor = btn.dataset.color; });
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentSize = parseInt(btn.dataset.size); });
  });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.selectedTeam = btn.dataset.team; updateTurnDisplay(); });
  });

  $('btn-toggle-questions').addEventListener('click', () => { questionsPanel.classList.toggle('hidden'); if (!questionsPanel.classList.contains('hidden')) renderWords(questionsList); });
  $('btn-add-word').addEventListener('click', () => openEditWord(-1));
  $('btn-add-word-config').addEventListener('click', () => openEditWord(-1));

  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditWord(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteWord(parseInt(deleteBtn.dataset.index));
  });

  const questionsListConfig = $('questions-list-config');
  if (questionsListConfig) {
    questionsListConfig.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.question-item-btn.edit');
      const deleteBtn = e.target.closest('.question-item-btn.delete');
      if (editBtn) openEditWord(parseInt(editBtn.dataset.index));
      if (deleteBtn) deleteWord(parseInt(deleteBtn.dataset.index));
    });
  }

  $('btn-save-word').addEventListener('click', saveWord);
  $('btn-cancel-word').addEventListener('click', () => $('edit-word-modal').classList.add('hidden'));

})();
