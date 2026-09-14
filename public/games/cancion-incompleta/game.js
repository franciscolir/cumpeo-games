/**
 * CANCIÓN INCOMPLETA - Game Logic
 * ¡Completa la letra de la canción!
 */

(function() {
  'use strict';

  // ==================== GAME STATE ====================
  const sdk = new GameSDK();
  let localScores = { A: 0, B: 0 };
  let selectedTeam = 'A';
  let currentRound = 1;
  let totalRounds = 5;
  let timePerSong = 45;
  let isPaused = false;
  let isStarted = false;
  let timerInterval = null;
  let timeRemaining = 0;
  let currentSongIndex = 0;
  let hintCount = 0;

  // Default songs
  const defaultSongs = [
    {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      lyrics: 'Is this the real life?\nIs this just _?\nCaught in a _\nNo escape from _',
      blanks: ['fantasy', 'landslide', 'reality'],
      answer: ['fantasy']
    },
    {
      title: 'Hotel California',
      artist: 'Eagles',
      lyrics: 'On a dark _ highway\nCool wind in my _\nWarm smell of _\nRising up through the _',
      blanks: ['desert', 'hair', 'colitas', 'air'],
      answer: ['colitas']
    },
    {
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      lyrics: 'There's a _ who is sure\nAll that glitters is _\nAnd the _ to the stairway\nIs in the _',
      blanks: ['lady', 'gold', 'shadow', 'trees'],
      answer: ['gold']
    },
    {
      title: 'Imagine',
      artist: 'John Lennon',
      lyrics: 'Imagine there's no _\nIt's easy if you _\nNo _ below us\nAbove us only _',
      blanks: ['heaven', 'try', 'hell', 'sky'],
      answer: ['heaven']
    },
    {
      title: 'Smells Like Teen Spirit',
      artist: 'Nirvana',
      lyrics: 'Load up on _\nBring your _\nIt's fun to _\nTo pretend she's _',
      blanks: ['guns', 'friends', 'lose', 'dead'],
      answer: ['guns']
    }
  ];

  let songs = [...defaultSongs];

  // ==================== DOM ELEMENTS ====================
  const $ = (id) => document.getElementById(id);
  
  const clockEl = $('clock');
  const clockValueEl = $('clock-value');
  const waitingState = $('waiting-state');
  const songContainer = $('song-container');
  const turnIndicator = $('turn-indicator');
  const turnText = $('turn-text');
  const songTitle = $('song-title');
  const songArtist = $('song-artist');
  const lyricsDisplay = $('lyrics-display');
  const answerInput = $('answer-input');
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
      updateScoreDisplay();
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
    nextSong();
  });

  // ==================== TIMER ====================
  function startTimer() {
    timeRemaining = timePerSong;
    updateClockDisplay();
    clockEl.classList.remove('hidden');
    
    timerInterval = setInterval(() => {
      if (isPaused) return;
      
      timeRemaining--;
      updateClockDisplay();
      sdk.updateTimer(timeRemaining);
      
      if (timeRemaining <= 0) {
        revealAnswer();
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
          revealAnswer();
        }
      }, 1000);
    }
  }

  function updateClockDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    clockValueEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timeRemaining <= 10) {
      clockValueEl.classList.add('clock-warning');
    } else {
      clockValueEl.classList.remove('clock-warning');
    }
  }

  // ==================== GAME LOGIC ====================
  function startGame() {
    // Load songs from localStorage or use defaults
    const savedSongs = sdk.getQuestions('cancion-incompleta');
    if (savedSongs.length > 0) {
      songs = savedSongs;
    }
    
    // Get settings from selectors
    totalRounds = parseInt(roundsSelect.value);
    timePerSong = parseInt(timeSelect.value);
    
    currentRound = 1;
    currentSongIndex = 0;
    localScores = { A: 0, B: 0 };
    selectedTeam = 'A';
    isStarted = true;
    
    sdk.updateRound(currentRound, totalRounds);
    sdk.setTimePerRound(timePerSong);
    
    // Show game
    waitingState.classList.add('hidden');
    songContainer.classList.remove('hidden');
    
    loadSong();
    updateTurnDisplay();
    startTimer();
  }

  function loadSong() {
    if (currentSongIndex >= songs.length) {
      currentSongIndex = 0;
    }

    const song = songs[currentSongIndex];
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    officialSolution.textContent = song.answer[0];
    
    // Render lyrics with blanks
    renderLyrics(song);
    
    // Reset input
    answerInput.value = '';
    answerInput.disabled = false;
    answerInput.focus();
    hintCount = 0;
    
    // Reset timer
    pauseTimer();
    timeRemaining = timePerSong;
    updateClockDisplay();
    startTimer();
  }

  function renderLyrics(song) {
    lyricsDisplay.innerHTML = '';
    const lines = song.lyrics.split('\n');
    
    lines.forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lyrics-line';
      
      // Replace underscores with blank elements
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
      // Correct answer
      localScores[selectedTeam] += 100;
      updateScoreDisplay();
      sdk.updateScore(localScores);
      
      // Reveal all blanks
      document.querySelectorAll('.lyrics-blank').forEach((blank, index) => {
        blank.textContent = song.blanks[index] || '???';
        blank.classList.add('revealed');
      });
      
      answerInput.disabled = true;
      
      // Next song after delay
      setTimeout(() => {
        currentSongIndex++;
        loadSong();
      }, 2000);
    } else {
      // Wrong answer
      answerInput.value = '';
      answerInput.style.borderColor = '#ba1a1a';
      setTimeout(() => {
        answerInput.style.borderColor = '#1c1b1b';
      }, 1000);
    }
  }

  function showHint() {
    const song = songs[currentSongIndex];
    const blanks = document.querySelectorAll('.lyrics-blank');
    
    if (hintCount < blanks.length) {
      const blank = blanks[hintCount];
      blank.textContent = song.blanks[hintCount][0] + '...';
      hintCount++;
      
      // Deduct points for hint
      localScores[selectedTeam] = Math.max(0, localScores[selectedTeam] - 25);
      updateScoreDisplay();
      sdk.updateScore(localScores);
    }
  }

  function revealAnswer() {
    const song = songs[currentSongIndex];
    document.querySelectorAll('.lyrics-blank').forEach((blank, index) => {
      blank.textContent = song.blanks[index] || '???';
      blank.classList.add('revealed');
    });
    
    answerInput.disabled = true;
    
    // Next song after delay
    setTimeout(() => {
      currentSongIndex++;
      loadSong();
    }, 2000);
  }

  function nextSong() {
    currentSongIndex++;
    if (currentSongIndex >= songs.length) {
      currentRound++;
      if (currentRound > totalRounds) {
        endGame();
        return;
      }
      sdk.updateRound(currentRound, totalRounds);
      currentSongIndex = 0;
    }
    loadSong();
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
      songContainer.classList.add('hidden');
      clockEl.classList.add('hidden');
    });
  }

  function updateScoreDisplay() {
    $('score-a').textContent = localScores.A;
    $('score-b').textContent = localScores.B;
  }

  function updateTurnDisplay() {
    turnText.textContent = `TURNO: EQUIPO ${selectedTeam}`;
    turnIndicator.style.background = selectedTeam === 'A' ? '#ffdad6' : '#fff9e6';
    
    const dot = turnIndicator.querySelector('.turn-dot');
    dot.style.background = selectedTeam === 'A' ? '#ba1a1a' : '#775a00';
  }

  // ==================== SONGS MANAGEMENT ====================
  function renderSongs() {
    questionsList.innerHTML = '';
    songs.forEach((song, index) => {
      const div = document.createElement('div');
      div.className = 'question-item';
      div.innerHTML = `
        <span class="question-item-text">${index + 1}. ${song.title} - ${song.artist}</span>
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

  function openEditSong(index = -1) {
    const modal = $('edit-song-modal');
    $('edit-song-index').value = index;
    
    if (index >= 0) {
      const song = songs[index];
      $('edit-song-title').value = song.title;
      $('edit-song-artist').value = song.artist;
      $('edit-song-lyrics').value = song.lyrics;
      $('edit-song-answer').value = song.answer.join(', ');
    } else {
      $('edit-song-title').value = '';
      $('edit-song-artist').value = '';
      $('edit-song-lyrics').value = '';
      $('edit-song-answer').value = '';
    }
    
    modal.classList.remove('hidden');
  }

  function saveSong() {
    const index = parseInt($('edit-song-index').value);
    const title = $('edit-song-title').value.trim();
    const artist = $('edit-song-artist').value.trim();
    const lyrics = $('edit-song-lyrics').value.trim();
    const answerStr = $('edit-song-answer').value.trim();
    
    if (!title || !artist || !lyrics || !answerStr) {
      alert('Todos los campos son obligatorios');
      return;
    }

    // Parse lyrics to extract blanks
    const lines = lyrics.split('\n');
    const blanks = [];
    const processedLines = lines.map(line => {
      return line.replace(/_/g, (match) => {
        blanks.push('');
        return '_';
      });
    });

    const answer = answerStr.split(',').map(a => a.trim());
    
    const song = {
      title,
      artist,
      lyrics: processedLines.join('\n'),
      blanks: blanks.map((_, i) => answer[i] || ''),
      answer
    };
    
    if (index >= 0) {
      songs[index] = song;
    } else {
      songs.push(song);
    }
    
    sdk.saveQuestions('cancion-incompleta', songs);
    renderSongs();
    $('edit-song-modal').classList.add('hidden');
  }

  function deleteSong(index) {
    if (confirm('¿Eliminar esta canción?')) {
      songs.splice(index, 1);
      sdk.saveQuestions('cancion-incompleta', songs);
      renderSongs();
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
    nextSong();
  });

  // Submit answer
  $('btn-submit').addEventListener('click', () => {
    checkAnswer();
  });

  answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });

  // Hint button
  $('btn-hint').addEventListener('click', () => {
    showHint();
  });

  // Skip button
  $('btn-skip').addEventListener('click', () => {
    revealAnswer();
  });

  // Correct button (manual)
  $('btn-correct').addEventListener('click', () => {
    localScores[selectedTeam] += 100;
    updateScoreDisplay();
    sdk.updateScore(localScores);
    currentSongIndex++;
    loadSong();
  });

  // Team selection
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTeam = btn.dataset.team;
      updateTurnDisplay();
    });
  });

  // Rounds/Time selectors
  roundsSelect.addEventListener('change', () => {
    totalRounds = parseInt(roundsSelect.value);
    sdk.updateRound(currentRound, totalRounds);
  });

  timeSelect.addEventListener('change', () => {
    timePerSong = parseInt(timeSelect.value);
    sdk.setTimePerRound(timePerSong);
  });

  // Songs panel toggle
  $('btn-toggle-questions').addEventListener('click', () => {
    questionsPanel.classList.toggle('hidden');
    if (!questionsPanel.classList.contains('hidden')) {
      renderSongs();
    }
  });

  // Add song button
  $('btn-add-song').addEventListener('click', () => {
    openEditSong(-1);
  });

  // Songs list delegation
  questionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.question-item-btn.edit');
    const deleteBtn = e.target.closest('.question-item-btn.delete');
    
    if (editBtn) {
      openEditSong(parseInt(editBtn.dataset.index));
    }
    if (deleteBtn) {
      deleteSong(parseInt(deleteBtn.dataset.index));
    }
  });

  // Edit song modal
  $('btn-save-song').addEventListener('click', saveSong);
  $('btn-cancel-song').addEventListener('click', () => {
    $('edit-song-modal').classList.add('hidden');
  });

})();
