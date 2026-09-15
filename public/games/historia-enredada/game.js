/**
 * HISTORIA ENREDADA - Game Logic
 * Representación presencial con palabras del público
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'historia-enredada',
    defaultRounds: 5,
    defaultTime: 45,
    warningThreshold: 10,
    onTimeUp: () => endTurn(),
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => endTurn(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds, storiesUsed: storiesUsed.length })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentStoryIndex = -1;
  let storiesUsed = [];
  let currentColorSpaceIndex = 0;
  let revealedWords = [];

  const COLOR_OPTIONS = [
    { name: 'AZUL', hex: '#0050a0', emoji: '🔵' },
    { name: 'ROJO', hex: '#ba1a1a', emoji: '🔴' },
    { name: 'VERDE', hex: '#008562', emoji: '🟢' },
    { name: 'AMARILLO', hex: '#ffc72c', emoji: '🟡' },
    { name: 'NARANJA', hex: '#e65100', emoji: '🟠' },
    { name: 'MORADO', hex: '#7b1fa2', emoji: '🟣' },
    { name: 'ROSADO', hex: '#e91e63', emoji: '💗' },
    { name: 'NEGRO', hex: '#1c1b1b', emoji: '⚫' }
  ];

  const defaultStories = [
    {
      title: 'La aventura del bosque',
      description: 'Un gato mágico en un bosque encantado',
      image: '',
      conductorChar: 'El Narrador',
      playerChar: 'Michi el Gato',
      text: 'Erase una vez un gato llamado Michi que vivía en un bosque encantado donde los árboles susurraban secretos al viento.',
      colorSpaces: [
        { colorIndex: 0, description: 'Nombre de un familiar' },
        { colorIndex: 1, description: 'Un objeto cotidiano' },
        { colorIndex: 2, description: 'Una comida' }
      ]
    },
    {
      title: 'El misterio de la luna',
      description: 'Un rayo de luz sobre la ciudad',
      image: '',
      conductorChar: 'El Detective',
      playerChar: 'La Testigo',
      text: 'Una noche, mientras toda la ciudad dormía, un rayo de luz plateada cayó sobre el tejado del viejo edificio.',
      colorSpaces: [
        { colorIndex: 3, description: 'Un animal' },
        { colorIndex: 0, description: 'Un lugar' },
        { colorIndex: 4, description: 'Una emoción' }
      ]
    }
  ];

  let stories = JSON.parse(JSON.stringify(defaultStories));

  // ==================== DOM ====================
  const storySelectContainer = $('story-select-container');
  const storyCards = $('story-cards');
  const storyContainer = $('story-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const storyTitle = $('story-title');
  const storyText = $('story-text');
  const instructionText = $('instruction-text');
  const officialStart = $('official-start');
  const colorSpaceDisplay = $('color-space-display');
  const colorSpaceBadge = $('color-space-badge');
  const colorSpaceLabel = $('color-space-label');
  const colorSpaceDescription = $('color-space-description');
  const colorWordInput = $('color-word-input');
  const questionsList = $('questions-list');
  const questionsListPanel = $('questions-list-panel');
  const questionsPanel = $('questions-panel');

  // ==================== STORIES MANAGEMENT ====================
  function loadStories() {
    const saved = sdk.getQuestions('historia-enredada');
    if (saved.length > 0) stories = saved;
  }

  function saveStories() {
    sdk.saveQuestions('historia-enredada', stories);
  }

  function renderStoryCards() {
    storyCards.innerHTML = '';
    stories.forEach((story, index) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.innerHTML = `
        ${story.image ? `<img src="${story.image}" alt="${story.title}" class="story-card-image">` : '<div class="story-card-placeholder">📖</div>'}
        <div class="story-card-body">
          <h3 class="story-card-title">${story.title}</h3>
          <p class="story-card-desc">${story.description || ''}</p>
          <p class="story-card-chars">${story.conductorChar || 'Conductor'} + ${story.playerChar || 'Jugador'}</p>
        </div>
      `;
      card.addEventListener('click', () => selectStory(index));
      storyCards.appendChild(card);
    });
  }

  function selectStory(index) {
    currentStoryIndex = index;
    const story = stories[index];
    officialStart.textContent = story.text;
    storyTitle.textContent = story.title;
    revealedWords = [];
    currentColorSpaceIndex = 0;

    storySelectContainer.classList.add('hidden');
    storyContainer.classList.remove('hidden');

    instructionText.textContent = `${story.conductorChar || 'Conductor'}: "${story.text}"`;
    storyText.innerHTML = `<div class="story-sentence start">${story.text}</div>`;

    if (story.colorSpaces && story.colorSpaces.length > 0) {
      showColorSpace(0);
    } else {
      colorSpaceDisplay.style.display = 'none';
    }

    updateTurnDisplay();
  }

  function showColorSpace(index) {
    const story = stories[currentStoryIndex];
    if (!story || !story.colorSpaces || index >= story.colorSpaces.length) {
      colorSpaceDisplay.style.display = 'none';
      instructionText.textContent = 'Historia completada — El conductor determina el ganador por aplausos';
      return;
    }

    const space = story.colorSpaces[index];
    const color = COLOR_OPTIONS[space.colorIndex] || COLOR_OPTIONS[0];
    currentColorSpaceIndex = index;

    colorSpaceDisplay.style.display = '';
    colorSpaceBadge.style.background = color.hex;
    colorSpaceBadge.style.color = color.hex === '#ffc72c' ? '#1c1b1b' : 'white';
    colorSpaceLabel.textContent = `ESPACIO ${index + 1} → ${color.emoji} ${color.name}`;
    colorSpaceDescription.textContent = space.description || '';
    colorWordInput.value = '';
    colorWordInput.focus();
    instructionText.textContent = `El público saca un papel ${color.name} — Conductor revela la palabra`;
  }

  function revealColorWord() {
    const word = colorWordInput.value.trim();
    if (!word) return;
    revealedWords.push({ spaceIndex: currentColorSpaceIndex, word });

    const story = stories[currentStoryIndex];
    const space = story.colorSpaces[currentColorSpaceIndex];
    const color = COLOR_OPTIONS[space.colorIndex] || COLOR_OPTIONS[0];

    const sentenceDiv = document.createElement('div');
    sentenceDiv.className = 'story-sentence color-word';
    sentenceDiv.style.borderLeftColor = color.hex;
    sentenceDiv.innerHTML = `<span style="color:${color.hex};font-weight:bold;">[${color.name}]</span> "${word}"`;
    storyText.appendChild(sentenceDiv);
    storyText.scrollTop = storyText.scrollHeight;

    // Play reveal sound
    playSound('reveal');

    currentColorSpaceIndex++;
    showColorSpace(currentColorSpaceIndex);
  }

  function awardWinner(team) {
    core.addCorrectPoints(team);
    if (team !== state.selectedTeam) {
      core.addPenaltyPoints(state.selectedTeam);
    }
    // Play winner sound
    playSound('winner');
  }

  function endTurn() {
    state.selectedTeam = state.selectedTeam === 'A' ? 'B' : 'A';
    updateTurnDisplay();
    showTurnModal(`Equipo ${state.selectedTeam}`, 1500);
    if (state.isStarted) {
      core.pauseTimer();
      state.timeRemaining = state.timePerUnit;
      state.totalTime = state.timePerUnit;
      core.updateClockDisplay();
      core.updateTimerBar();
      core.startTimer();
    }
  }

  function startGame() {
    loadStories();
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;
    storiesUsed = [];
    currentStoryIndex = -1;

    sdk.updateRound(1, state.totalRounds);
    core.updateScoreDisplay();

    $('waiting-state').classList.add('hidden');
    storySelectContainer.classList.remove('hidden');
    storyContainer.classList.add('hidden');

    core.setButtonsDisabled(false);
    renderStoryCards();
  }

  function nextStory() {
    storiesUsed.push(currentStoryIndex);
    currentStoryIndex = -1;
    storyContainer.classList.add('hidden');
    storySelectContainer.classList.remove('hidden');
    renderStoryCards();
    instructionText.textContent = 'Selecciona la siguiente historia';
  }

  function updateTurnDisplay() {
    turnText.textContent = `EQUIPO ${state.selectedTeam}`;
    turnIndicator.style.background = state.selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = state.selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== STORY EDITOR ====================
  function renderStories() {
    questionsList.innerHTML = '';
    questionsListPanel.innerHTML = '';
    stories.forEach((story, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${story.title}</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      if (questionsList) questionsList.appendChild(div.cloneNode(true));
      if (questionsListPanel) questionsListPanel.appendChild(div);
    });
  }

  let editingColorSpaces = [];

  function renderColorSpacesEditor() {
    const container = $('color-spaces-editor');
    if (!container) return;
    container.innerHTML = '';
    editingColorSpaces.forEach((space, i) => {
      const color = COLOR_OPTIONS[space.colorIndex] || COLOR_OPTIONS[0];
      const div = document.createElement('div');
      div.className = 'color-space-editor-item';
      div.innerHTML = `
        <select class="select-input color-space-select" data-index="${i}" style="width: auto; min-width: 120px;">
          ${COLOR_OPTIONS.map((c, ci) => `<option value="${ci}" ${ci === space.colorIndex ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('')}
        </select>
        <input type="text" class="select-input color-space-desc" data-index="${i}" value="${space.description || ''}" placeholder="Indicación del papel..." style="flex: 1;">
        <button class="question-item-btn delete" data-index="${i}" style="flex-shrink:0;"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
      `;
      container.appendChild(div);
    });

    container.querySelectorAll('.color-space-select').forEach(sel => {
      sel.addEventListener('change', () => {
        editingColorSpaces[parseInt(sel.dataset.index)].colorIndex = parseInt(sel.value);
      });
    });
    container.querySelectorAll('.color-space-desc').forEach(inp => {
      inp.addEventListener('input', () => {
        editingColorSpaces[parseInt(inp.dataset.index)].description = inp.value;
      });
    });
    container.querySelectorAll('.question-item-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        editingColorSpaces.splice(parseInt(btn.dataset.index), 1);
        renderColorSpacesEditor();
      });
    });
  }

  function openEditStory(index = -1) {
    const modal = $('edit-start-modal');
    $('edit-start-index').value = index;
    if (index >= 0) {
      const s = stories[index];
      $('edit-start-title').value = s.title || '';
      $('edit-start-description').value = s.description || '';
      $('edit-start-image').value = s.image || '';
      $('edit-start-conductor-char').value = s.conductorChar || '';
      $('edit-start-player-char').value = s.playerChar || '';
      $('edit-start-text').value = s.text || '';
      editingColorSpaces = JSON.parse(JSON.stringify(s.colorSpaces || []));
    } else {
      $('edit-start-title').value = '';
      $('edit-start-description').value = '';
      $('edit-start-image').value = '';
      $('edit-start-conductor-char').value = '';
      $('edit-start-player-char').value = '';
      $('edit-start-text').value = '';
      editingColorSpaces = [];
    }
    renderColorSpacesEditor();
    modal.classList.remove('hidden');
  }

  function saveStory() {
    const index = parseInt($('edit-start-index').value);
    const title = $('edit-start-title').value.trim();
    const text = $('edit-start-text').value.trim();
    if (!title || !text) { alert('El título y el texto son obligatorios'); return; }
    const story = {
      title,
      description: $('edit-start-description').value.trim(),
      image: $('edit-start-image').value.trim(),
      conductorChar: $('edit-start-conductor-char').value.trim(),
      playerChar: $('edit-start-player-char').value.trim(),
      text,
      colorSpaces: JSON.parse(JSON.stringify(editingColorSpaces))
    };
    if (index >= 0) stories[index] = story;
    else stories.push(story);
    saveStories();
    renderStories();
    $('edit-start-modal').classList.add('hidden');
  }

  function deleteStory(index) {
    if (confirm('¿Eliminar esta historia?')) {
      stories.splice(index, 1);
      saveStories();
      renderStories();
    }
  }

  // ==================== EVENT LISTENERS ====================
  $('btn-reveal-word').addEventListener('click', revealColorWord);
  colorWordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') revealColorWord(); });

  $('btn-winner-a').addEventListener('click', () => { awardWinner('A'); nextStory(); });
  $('btn-winner-b').addEventListener('click', () => { awardWinner('B'); nextStory(); });

  $('btn-new-story').addEventListener('click', nextStory);

  // Print script button
  $('btn-print-script').addEventListener('click', printScript);

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
    if (!questionsPanel.classList.contains('hidden')) renderStories();
  });

  $('btn-add-start-panel').addEventListener('click', () => openEditStory(-1));
  $('btn-add-story').addEventListener('click', () => openEditStory(-1));

  [questionsList, questionsListPanel].forEach(list => {
    if (!list) return;
    list.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.question-item-btn.edit');
      const deleteBtn = e.target.closest('.question-item-btn.delete');
      if (editBtn) openEditStory(parseInt(editBtn.dataset.index));
      if (deleteBtn) deleteStory(parseInt(deleteBtn.dataset.index));
    });
  });

  $('btn-save-start').addEventListener('click', saveStory);
  $('btn-cancel-start').addEventListener('click', () => $('edit-start-modal').classList.add('hidden'));

  $('btn-add-color-space').addEventListener('click', () => {
    editingColorSpaces.push({ colorIndex: 0, description: '' });
    renderColorSpacesEditor();
  });

  // ==================== SOUND EFFECTS ====================
  function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    if (type === 'reveal') {
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'winner') {
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    }
  }

  // ==================== PRINT SCRIPT ====================
  function printScript() {
    if (currentStoryIndex < 0) return;
    const story = stories[currentStoryIndex];
    const conductor = $('player-conductor').value.trim() || 'Conductor';
    const actor = $('player-actor').value.trim() || 'Jugador';
    
    let scriptContent = `
      <html>
      <head>
        <title>Guion - ${story.title}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1c1b1b; border-bottom: 2px solid #1c1b1b; padding-bottom: 10px; }
          h2 { color: #5d3f3e; margin-top: 30px; }
          .character { font-weight: bold; color: #0050a0; }
          .stage-direction { font-style: italic; color: #5d3f3e; margin: 10px 0; padding: 10px; background: #f6f3f2; border-left: 3px solid #0050a0; }
          .color-word { margin: 5px 0; padding: 5px 10px; border-left: 3px solid; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>📖 ${story.title}</h1>
        <p><strong>Conductor:</strong> ${conductor}</p>
        <p><strong>Jugador:</strong> ${actor}</p>
        <p><strong>Espacios de color:</strong> ${story.colorSpaces ? story.colorSpaces.length : 0}</p>
        
        <h2>Inicio de la Historia</h2>
        <div class="stage-direction">${story.text}</div>
        
        <h2>Palabras del Público</h2>
    `;
    
    if (story.colorSpaces && story.colorSpaces.length > 0) {
      story.colorSpaces.forEach((space, i) => {
        const color = COLOR_OPTIONS[space.colorIndex] || COLOR_OPTIONS[0];
        scriptContent += `
          <div class="color-word" style="border-color: ${color.hex};">
            <strong>${color.emoji} ${color.name}:</strong> ${space.description || 'Sin descripción'}
          </div>
        `;
      });
    }
    
    scriptContent += `
        <h2>Fin de la Historia</h2>
        <div class="stage-direction">El conductor determina el ganador por aplausos del público.</div>
        
        <hr style="margin-top: 40px;">
        <p style="color: #5d3f3e; font-size: 0.9rem;">Guion generado por CUMPEO - Historia Enredada</p>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(scriptContent);
    printWindow.document.close();
    printWindow.print();
  }

  // Init
  loadStories();
  renderStories();

})();
