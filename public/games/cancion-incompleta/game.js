/**
 * CANCIÓN INCOMPLETA - Game Logic
 * ¡Completa la letra de la canción!
 */
(function() {
  'use strict';

  const core = GameCore.create({
    gameName: 'cancion-incompleta',
    defaultRounds: 5,
    defaultTime: 45,
    warningThreshold: 10,
    onTimeUp: () => revealAnswer(),
    onGetHiddenContainer: () => $('waiting-state'),
    onNext: () => nextSong(),
    onStart: startGame,
    extraStats: () => ({ totalRounds: core.state.totalRounds })
  });

  const { sdk, state, $ } = core;

  // ==================== GAME-SPECIFIC STATE ====================
  let currentSongIndex = 0;
  let hintCount = 0;

  const defaultSongs = [
    { title: 'Bohemian Rhapsody', artist: 'Queen', lyrics: 'Is this the real life?\nIs this just _?\nCaught in a _\nNo escape from _', blanks: ['fantasy', 'landslide', 'reality'], answer: ['fantasy'] },
    { title: 'Hotel California', artist: 'Eagles', lyrics: 'On a dark _ highway\nCool wind in my _\nWarm smell of _\nRising up through the _', blanks: ['desert', 'hair', 'colitas', 'air'], answer: ['colitas'] },
    { title: 'Stairway to Heaven', artist: 'Led Zeppelin', lyrics: 'There\'s a _ who is sure\nAll that glitters is _\nAnd the _ to the stairway\nIs in the _', blanks: ['lady', 'gold', 'shadow', 'trees'], answer: ['gold'] },
    { title: 'Imagine', artist: 'John Lennon', lyrics: 'Imagine there\'s no _\nIt\'s easy if you _\nNo _ below us\nAbove us only _', blanks: ['heaven', 'try', 'hell', 'sky'], answer: ['heaven'] },
    { title: 'Smells Like Teen Spirit', artist: 'Nirvana', lyrics: 'Load up on _\nBring your _\nIt\'s fun to _\nTo pretend she\'s _', blanks: ['guns', 'friends', 'lose', 'dead'], answer: ['guns'] }
  ];

  let songs = [...defaultSongs];

  // ==================== DOM ====================
  const songContainer = $('song-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const songTitle = $('song-title');
  const songArtist = $('song-artist');
  const lyricsDisplay = $('lyrics-display');
  const answerInput = $('answer-input');
  const officialSolution = $('official-solution');
  const questionsList = $('questions-list');
  const questionsPanel = $('questions-panel');
  const btnNext = $('btn-next');

  // ==================== GAME LOGIC ====================
  function startGame() {
    const savedSongs = sdk.getQuestions('cancion-incompleta');
    if (savedSongs.length > 0) songs = savedSongs;

    state.totalRounds = parseInt($('config-rounds-select').value);
    state.timePerUnit = parseInt($('config-time-select').value);
    state.currentRound = 1;
    currentSongIndex = 0;
    state.localScores = { A: 0, B: 0 };
    state.selectedTeam = 'A';
    state.isStarted = true;

    sdk.updateRound(state.currentRound, state.totalRounds);
    sdk.setTimePerRound(state.timePerUnit);
    core.updateScoreDisplay();

    $('waiting-state').classList.add('hidden');
    songContainer.classList.remove('hidden');

    core.setButtonsDisabled(false);
    loadSong();
    updateTurnDisplay();
    core.startTimer();
  }

  function loadSong() {
    if (currentSongIndex >= songs.length) currentSongIndex = 0;
    const song = songs[currentSongIndex];
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    officialSolution.textContent = song.answer[0];
    renderLyrics(song);
    answerInput.value = '';
    answerInput.disabled = false;
    answerInput.focus();
    hintCount = 0;
    core.pauseTimer();
    state.timeRemaining = state.timePerUnit;
    state.totalTime = state.timePerUnit;
    core.updateClockDisplay();
    core.updateTimerBar();
    core.startTimer();
  }

  function renderLyrics(song) {
    lyricsDisplay.innerHTML = '';
    song.lyrics.split('\n').forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lyrics-line';
      const parts = line.split('_');
      parts.forEach((part, index) => {
        lineDiv.appendChild(document.createTextNode(part));
        if (index < parts.length - 1) {
          const blank = document.createElement('span');
          blank.className = 'lyrics-blank';
          blank.textContent = '______';
          blank.dataset.index = index;
          lineDiv.appendChild(blank);
        }
      });
      lyricsDisplay.appendChild(lineDiv);
    });
  }

  function checkAnswer() {
    const userAnswer = answerInput.value.trim().toLowerCase();
    if (!userAnswer) return;
    const song = songs[currentSongIndex];
    const isCorrect = song.answer.some(a => a.toLowerCase() === userAnswer);
    if (isCorrect) {
      core.addCorrectPoints(state.selectedTeam);
      document.querySelectorAll('.lyrics-blank').forEach((blank, index) => { blank.textContent = song.blanks[index] || '???'; blank.classList.add('revealed'); });
      answerInput.disabled = true;
      setTimeout(() => { currentSongIndex++; loadSong(); }, 2000);
    } else {
      answerInput.value = '';
      answerInput.style.borderColor = '#ba1a1a';
      setTimeout(() => { answerInput.style.borderColor = '#1c1b1b'; }, 1000);
    }
  }

  function showHint() {
    const song = songs[currentSongIndex];
    const blanks = document.querySelectorAll('.lyrics-blank');
    if (hintCount < blanks.length) {
      blanks[hintCount].textContent = song.blanks[hintCount][0] + '...';
      hintCount++;
      core.addPenaltyPoints(state.selectedTeam);
    }
  }

  function revealAnswer() {
    const song = songs[currentSongIndex];
    document.querySelectorAll('.lyrics-blank').forEach((blank, index) => { blank.textContent = song.blanks[index] || '???'; blank.classList.add('revealed'); });
    answerInput.disabled = true;
    setTimeout(() => { currentSongIndex++; loadSong(); }, 2000);
  }

  function nextSong() {
    currentSongIndex++;
    if (currentSongIndex >= songs.length) {
      state.currentRound++;
      if (state.currentRound > state.totalRounds) { core.endGame(); return; }
      sdk.updateRound(state.currentRound, state.totalRounds);
      currentSongIndex = 0;
    }
    loadSong();
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${state.selectedTeam}`;
    turnIndicator.style.background = state.selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = state.selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== SONGS MANAGEMENT ====================
  function renderSongs(targetList) {
    const list = targetList || questionsList;
    list.innerHTML = '';
    songs.forEach((song, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${song.title} - ${song.artist}</span>
        <div class="question-item-actions">
          <button class="question-item-btn edit" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">edit</span></button>
          <button class="question-item-btn delete" data-index="${index}"><span class="material-symbols-outlined" style="font-size: 1rem;">delete</span></button>
        </div>
      `;
      list.appendChild(div);
    });
  }

  function openEditSong(index = -1) {
    const modal = $('edit-song-modal');
    $('edit-song-index').value = index;
    if (index >= 0) {
      $('edit-song-title').value = songs[index].title;
      $('edit-song-artist').value = songs[index].artist;
      $('edit-song-lyrics').value = songs[index].lyrics;
      $('edit-song-answer').value = songs[index].answer.join(', ');
    } else {
      $('edit-song-title').value = ''; $('edit-song-artist').value = ''; $('edit-song-lyrics').value = ''; $('edit-song-answer').value = '';
    }
    modal.classList.remove('hidden');
  }

  function saveSong() {
    const index = parseInt($('edit-song-index').value);
    const title = $('edit-song-title').value.trim();
    const artist = $('edit-song-artist').value.trim();
    const lyrics = $('edit-song-lyrics').value.trim();
    const answerStr = $('edit-song-answer').value.trim();
    if (!title || !artist || !lyrics || !answerStr) { alert('Todos los campos son obligatorios'); return; }
    const blanks = [];
    const processedLyrics = lyrics.replace(/_/g, () => { blanks.push(''); return '_'; });
    const answer = answerStr.split(',').map(a => a.trim());
    const song = { title, artist, lyrics: processedLyrics, blanks: blanks.map((_, i) => answer[i] || ''), answer };
    if (index >= 0) songs[index] = song;
    else songs.push(song);
    sdk.saveQuestions('cancion-incompleta', songs);
    renderSongs();
    renderSongs($('config-questions-list'));
    $('edit-song-modal').classList.add('hidden');
  }

  function deleteSong(index) {
    if (confirm('¿Eliminar esta canción?')) {
      songs.splice(index, 1);
      sdk.saveQuestions('cancion-incompleta', songs);
      renderSongs();
      renderSongs($('config-questions-list'));
    }
  }

  // ==================== EVENT LISTENERS ====================
  btnNext.addEventListener('click', nextSong);
  $('btn-submit').addEventListener('click', checkAnswer);
  answerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkAnswer(); });
  $('btn-hint').addEventListener('click', showHint);
  $('btn-skip').addEventListener('click', revealAnswer);
  $('btn-correct').addEventListener('click', () => { core.addCorrectPoints(state.selectedTeam); currentSongIndex++; loadSong(); });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.selectedTeam = btn.dataset.team; updateTurnDisplay(); });
  });

  $('btn-toggle-questions').addEventListener('click', () => { questionsPanel.classList.toggle('hidden'); if (!questionsPanel.classList.contains('hidden')) renderSongs(); });
  $('btn-add-song').addEventListener('click', () => openEditSong(-1));
  $('config-btn-add-song').addEventListener('click', () => openEditSong(-1));

  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditSong(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteSong(parseInt(deleteBtn.dataset.index));
  });

  $('config-questions-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    if (editBtn) openEditSong(parseInt(editBtn.dataset.index));
    if (deleteBtn) deleteSong(parseInt(deleteBtn.dataset.index));
  });

  $('btn-save-song').addEventListener('click', saveSong);
  $('btn-cancel-song').addEventListener('click', () => $('edit-song-modal').classList.add('hidden'));

})();
