/**
 * MEMORICE - Game Logic
 * Encuentra los pares de cartas iguales
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'memorice',
    defaultRounds: 3,
    defaultTime: 30,
    warningThreshold: 5,
    onTimeUp: () => endTurn(),
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => endRound(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let totalPairs = 8;
  let isChecking = false;

  const defaultImageSets = [
    { name: 'Animales', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'] },
    { name: 'Comida', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥞', '🧇'] },
    { name: 'Deportes', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸'] },
    { name: 'Transportes', emojis: ['🚗', '🚕', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '✈️', '🚀'] },
    { name: 'Colores', emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '💗'] }
  ];

  let imageSets = [...defaultImageSets];
  let currentSetIndex = 0;

  // ==================== DOM ====================
  const boardContainer = $('board-container');
  const cardsGrid = $('cards-grid');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const turnInfo = $('turn-info');
  const turnInfoText = $('turn-info-text');
  const roundsSelect = $('rounds-select');
  const timeSelect = $('time-select');
  const questionsList = $('questions-list');

  // ==================== GAME LOGIC ====================
  function endTurn() {
    core.pauseTimer();
    cards.forEach(card => {
      if (!card.classList.contains('matched')) card.classList.remove('flipped');
    });
    flippedCards = [];
    isChecking = false;
    state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${state.selectedTeam}`, 1500);
    if (state.isStarted) core.startTimer();
  }

  function endRound() {
    core.pauseTimer();
    state.currentRound++;
    if (state.currentRound > state.totalRounds) {
      core.endGame();
      return;
    }
    sdk.updateRound(state.currentRound, state.totalRounds);
    showTurnInfo(`Ronda ${state.currentRound} de ${state.totalRounds}`);
    setTimeout(() => {
      createBoard();
      updateTurnDisplay();
      core.startTimer();
    }, 2000);
  }

  function startGame() {
    const savedSets = sdk.getImageSets('memorice');
    if (savedSets.length > 0) imageSets = savedSets;

    state.totalRounds = parseInt(roundsSelect.value);
    state.timePerUnit = parseInt(timeSelect.value);
    state.currentRound = 1;
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;
    core.setButtonsDisabled(false);

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);

    $('waiting-state').classList.add('hidden');
    boardContainer.classList.remove('hidden');

    createBoard();
    updateTurnDisplay();
    core.updateScoreDisplay();
    core.startTimer();
  }

  function createBoard() {
    cardsGrid.innerHTML = '';
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    isChecking = false;

    const currentSet = imageSets[currentSetIndex] || imageSets[0];
    const gameEmojis = currentSet.emojis.slice(0, totalPairs);
    const cardPairs = [...gameEmojis, ...gameEmojis];

    for (let i = cardPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
    }

    cardPairs.forEach((emoji, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.index = index;
      card.dataset.emoji = emoji;
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front"></div>
          <div class="card-face card-back">
            <span class="card-emoji">${emoji}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => flipCard(card));
      cardsGrid.appendChild(card);
      cards.push(card);
    });
  }

  function flipCard(card) {
    if (state.isPaused || !state.isStarted || isChecking) return;
    if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
    if (flippedCards.length >= 2) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      isChecking = true;
      checkMatch();
    }
  }

  function checkMatch() {
    const [card1, card2] = flippedCards;
    const match = card1.dataset.emoji === card2.dataset.emoji;

    if (match) {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      core.addCorrectPoints(state.selectedTeam);
      flippedCards = [];
      isChecking = false;
      if (matchedPairs === totalPairs) endRound();
    } else {
      setTimeout(() => {
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        flippedCards = [];
        isChecking = false;
        state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
        updateTurnDisplay();
        showTurnModal(`Equipo ${state.selectedTeam}`, 1500);
      }, 1000);
    }
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${state.selectedTeam}`;
    turnIndicator.style.background = state.selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = state.selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  function showTurnInfo(text) {
    turnInfoText.textContent = text;
    turnInfo.classList.remove('hidden');
    setTimeout(() => turnInfo.classList.add('hidden'), 2000);
  }

  // ==================== IMAGE SETS MANAGEMENT ====================
  function renderImageSets() {
    questionsList.innerHTML = '';
    imageSets.forEach((set, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${set.name} (${set.emojis.length} emojis)</span>
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

  function openEditImageSet(index = -1) {
    const modal = $('edit-image-modal');
    $('edit-set-index').value = index;
    if (index >= 0) {
      $('edit-set-name').value = imageSets[index].name;
      $('edit-set-emojis').value = imageSets[index].emojis.join(', ');
    } else {
      $('edit-set-name').value = '';
      $('edit-set-emojis').value = '';
    }
    modal.classList.remove('hidden');
  }

  function saveImageSet() {
    const index = parseInt($('edit-set-index').value);
    const name = $('edit-set-name').value.trim();
    const emojis = $('edit-set-emojis').value.split(',').map(e => e.trim()).filter(e => e);
    if (!name || emojis.length < 8) { alert('Se necesita un nombre y al menos 8 emojis'); return; }
    if (index >= 0) imageSets[index] = { name, emojis };
    else imageSets.push({ name, emojis });
    sdk.saveImageSets('memorice', imageSets);
    renderImageSets();
    $('edit-image-modal').classList.add('hidden');
  }

  function deleteImageSet(index) {
    if (confirm('¿Eliminar este set de imágenes?')) {
      imageSets.splice(index, 1);
      sdk.saveImageSets('memorice', imageSets);
      renderImageSets();
    }
  }

  // ==================== EVENT LISTENERS ====================
  $('btn-reset').addEventListener('click', () => { if (state.isStarted) { createBoard(); updateTurnDisplay(); } });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTeam = btn.dataset.team;
      updateTurnDisplay();
    });
  });

  $('btn-save-image').addEventListener('click', saveImageSet);
  $('btn-cancel-image').addEventListener('click', () => $('edit-image-modal').classList.add('hidden'));

  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditImageSet(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteImageSet(parseInt(deleteBtn.dataset.index));
  });

})();
