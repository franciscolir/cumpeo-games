/**
 * ENLACES - Drag and Drop Columna Fija / Móvil
 * Sets de grupos, arrastre de palabras
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'enlaces',
    defaultRounds: 2,
    defaultTime: 90,
    warningThreshold: 10,
    onTimeUp: () => core.endGame(),
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextSet(),
    onStart: startGame
  });

  const { sdk, state, $ } = core;

  // ==================== STATE ====================
  let sets = [];
  let currentSetIndex = -1;
  let currentSet = null;
  let itemsPool = [];
  let placedItems = new Map();
  let draggedElement = null;
  let correctCount = 0;

  const defaultSets = [
    {
      name: 'Animales y Países',
      groups: [
        { name: 'Animales', words: ['gato', 'perro', 'pájaro', 'pez'] },
        { name: 'Países', words: ['brasil', 'argentina', 'chile', 'perú'] },
        { name: 'Colores', words: ['rojo', 'azul', 'verde', 'amarillo'] },
        { name: 'Deportes', words: ['fútbol', 'básquet', 'tenis', 'natación'] }
      ]
    }
  ];

  // ==================== DOM ====================
  const setSelectContainer = $('set-select-container');
  const setCards = $('set-cards');
  const boardContainer = $('board-container');
  const fixedColumn = $('fixed-column');
  const mobileItems = $('mobile-items');
  const solutionContent = $('solution-content');
  const officialSolution = $('official-solution');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const btnNextSet = $('btn-next-set');
  const btnCheck = $('btn-check');
  const questionsListPanel = $('questions-list-panel');
  const questionsPanel = $('questions-panel');

  // ==================== LOAD/SAVE ====================
  function loadSets() {
    const saved = sdk.getQuestions('enlaces');
    if (saved.length > 0) sets = saved;
    else sets = JSON.parse(JSON.stringify(defaultSets));
  }

  function saveSets() {
    sdk.saveQuestions('enlaces', sets);
  }

  // ==================== START ====================
  function startGame() {
    loadSets();
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;
    state.currentRound = 1;
    state.totalRounds = parseInt($('config-rounds-select').value);
    state.timePerUnit = parseInt($('config-time-select').value);

    $('waiting-state').classList.add('hidden');
    setSelectContainer.classList.remove('hidden');
    boardContainer.classList.add('hidden');
    renderSetCards();
    updateTurnDisplay();
    core.setButtonsDisabled(false);
  }

  // ==================== SET SELECTION ====================
  function renderSetCards() {
    setCards.innerHTML = '';
    sets.forEach((set, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.innerHTML = `
        <div class="story-card-placeholder">🔗</div>
        <div class="story-card-body">
          <h3 class="story-card-title">${set.name}</h3>
          <p class="story-card-desc">${set.groups.length} grupos • ${set.groups.reduce((a,g)=>a+g.words.length,0)} palabras</p>
        </div>
      `;
      card.addEventListener('click', () => startSet(idx));
      setCards.appendChild(card);
    });
  }

  function startSet(idx) {
    currentSetIndex = idx;
    currentSet = JSON.parse(JSON.stringify(sets[idx]));
    itemsPool = [];
    placedItems.clear();
    correctCount = 0;

    setSelectContainer.classList.add('hidden');
    boardContainer.classList.remove('hidden');

    officialSolution.textContent = currentSet.groups.map(g => `${g.name}: ${g.words.join(', ')}`).join(' | ');
    renderBoard();
    core.updateScoreDisplay();
  }

  // ==================== BOARD RENDER ====================
  function renderBoard() {
    fixedColumn.innerHTML = '';
    mobileItems.innerHTML = '';

    itemsPool = [];
    currentSet.groups.forEach((group, gi) => {
      group.words.forEach(word => itemsPool.push({ word, groupIndex: gi, groupName: group.name }));
    });

    // Shuffle items
    for (let i = itemsPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemsPool[i], itemsPool[j]] = [itemsPool[j], itemsPool[i]];
    }

    // Fixed columns
    currentSet.groups.forEach((group, gi) => {
      const col = document.createElement('div');
      col.className = 'group-column';
      col.dataset.groupIndex = gi;
      col.innerHTML = `
        <div class="group-column-header">${group.name}</div>
        <div class="group-column-items" data-group-index="${gi}"></div>
      `;
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', e => handleDrop(e, gi));
      fixedColumn.appendChild(col);
    });

    // Mobile items
    itemsPool.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'mobile-item';
      el.draggable = true;
      el.textContent = item.word;
      el.dataset.index = i;
      el.addEventListener('dragstart', e => { draggedElement = el; e.dataTransfer.effectAllowed = 'move'; });
      el.addEventListener('dragend', () => { draggedElement = null; });
      mobileItems.appendChild(el);
    });

    btnNextSet.disabled = true;
  }

  function handleDrop(e, groupIndex) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.remove('drag-over');
    if (!draggedElement) return;

    const itemEl = draggedElement;
    const itemIndex = parseInt(itemEl.dataset.index);
    const item = itemsPool[itemIndex];
    if (!item) return;

    // Move to column if correct
    if (item.groupIndex === groupIndex) {
      const target = col.querySelector('.group-column-items');
      itemEl.classList.add('correct');
      itemEl.draggable = false;
      target.appendChild(itemEl);
      placedItems.set(itemIndex, groupIndex);
      correctCount++;
      if (correctCount === itemsPool.length) checkCompletion();
    } else {
      // Wrong drop: brief shake
      itemEl.classList.add('wrong');
      setTimeout(() => itemEl.classList.remove('wrong'), 300);
      // Return to pool
      mobileItems.appendChild(itemEl);
    }
  }

  function checkCompletion() {
    if (correctCount < itemsPool.length) {
      // Not all items placed correctly yet
      return;
    }
    btnNextSet.disabled = false;
    const team = state.selectedTeam;
    core.addCorrectPoints(team);
    core.showTurnModal('¡Set completado!', 1200);
  }

  function nextSet() {
    currentSetIndex = -1;
    currentSet = null;
    boardContainer.classList.add('hidden');
    setSelectContainer.classList.remove('hidden');
    renderSetCards();
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${state.selectedTeam}`;
    turnIndicator.style.background = state.selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    const dot = turnIndicator.querySelector('.turn-dot');
    if (dot) dot.style.background = state.selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== SET MANAGEMENT ====================
  function renderSets(listEl) {
    listEl.innerHTML = '';
    sets.forEach((set, idx) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${set.name} (${set.groups.length} grupos)</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${idx}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${idx}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      listEl.appendChild(div);
    });
  }

  let editingGroups = [];

  function openEditSet(idx = -1) {
    $('edit-set-index').value = idx;
    if (idx >= 0) {
      const s = sets[idx];
      $('edit-set-name').value = s.name || '';
      editingGroups = JSON.parse(JSON.stringify(s.groups));
    } else {
      $('edit-set-name').value = '';
      editingGroups = [];
    }
    renderGroupsEditor();
    $('edit-set-modal').classList.remove('hidden');
  }

  function renderGroupsEditor() {
    const container = $('groups-editor');
    container.innerHTML = '';
    editingGroups.forEach((g, i) => {
      const div = document.createElement('div');
      div.className = 'color-space-editor-item';
      div.innerHTML = `
        <input type="text" class="select-input group-name" data-index="${i}" value="${g.name}" placeholder="Nombre grupo" style="width: 30%;">
        <input type="text" class="select-input group-words" data-index="${i}" value="${g.words.join(', ')}" placeholder="4 palabras separadas por coma" style="flex:1;">
        <button class="question-item-btn delete" data-index="${i}" style="flex-shrink:0;"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll('.group-name').forEach(inp => {
      inp.addEventListener('input', () => { editingGroups[parseInt(inp.dataset.index)].name = inp.value; });
    });
    container.querySelectorAll('.group-words').forEach(inp => {
      inp.addEventListener('blur', () => {
        const idx = parseInt(inp.dataset.index);
        editingGroups[idx].words = inp.value.split(',').map(w => w.trim()).filter(w => w);
      });
    });
    container.querySelectorAll('.question-item-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        editingGroups.splice(parseInt(btn.dataset.index), 1);
        renderGroupsEditor();
      });
    });
  }

  function saveSet() {
    const idx = parseInt($('edit-set-index').value);
    const name = $('edit-set-name').value.trim();
    if (!name || editingGroups.length === 0) { alert('Nombre y al menos un grupo requeridos'); return; }
    editingGroups.forEach(g => { if (!g.name || g.words.length !== 4) { alert('Cada grupo debe tener nombre y 4 palabras'); throw new Error('validation'); } });
    const set = { name, groups: JSON.parse(JSON.stringify(editingGroups)) };
    if (idx >= 0) sets[idx] = set;
    else sets.push(set);
    saveSets();
    renderSets($('config-sets-list'));
    renderSets(questionsListPanel);
    $('edit-set-modal').classList.add('hidden');
  }

  function deleteSet(idx) {
    if (confirm('¿Eliminar este set?')) { sets.splice(idx,1); saveSets(); renderSets($('config-sets-list')); renderSets(questionsListPanel); }
  }

  // ==================== EVENT LISTENERS ====================
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedTeam = btn.dataset.team;
      updateTurnDisplay();
    });
  });

  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) renderSets(questionsListPanel);
  });

  $('btn-add-set-panel').addEventListener('click', () => openEditSet(-1));
  $('btn-add-set-config').addEventListener('click', () => openEditSet(-1));
  $('btn-add-group-set').addEventListener('click', () => { editingGroups.push({ name: '', words: [] }); renderGroupsEditor(); });

  $('config-sets-list').addEventListener('click', handleSetListClick);
  questionsListPanel.addEventListener('click', handleSetListClick);
  function handleSetListClick(e) {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditSet(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteSet(parseInt(deleteBtn.dataset.index));
  }

  $('btn-save-set').addEventListener('click', () => { try { saveSet(); } catch(e){} });
  $('btn-cancel-set').addEventListener('click', () => $('edit-set-modal').classList.add('hidden'));

  btnNextSet.addEventListener('click', nextSet);
  btnCheck.addEventListener('click', checkCompletion);

  // Init
  loadSets();
  renderSets($('config-sets-list'));

})();
