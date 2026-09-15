import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db, { save } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const publicDir = join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API
app.get('/api/games', (req, res) => {
  const rows = db.prepare('SELECT * FROM games ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/games', (req, res) => {
  const { name, description, file } = req.body;
  const stmt = db.prepare('INSERT INTO games (name, description, file) VALUES (?, ?, ?)');
  const info = stmt.run(name, description || null, file || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get('/api/state', (req, res) => {
  const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
  if (state.current_game_id) {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(state.current_game_id);
    state.current_game = game;
  }
  res.json(state);
});

app.post('/api/state', (req, res) => {
  const { current_game_id, status } = req.body;
  db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run(current_game_id || null, status || 'idle');
  res.json({ ok: true });
});

// ==================== SESSIONS API ====================

// Generate unique session code
function generateSessionCode() {
  const num = Math.floor(100 + Math.random() * 900);
  return `CMP-${num}`;
}

// List sessions (with optional status filter)
app.get('/api/sessions', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM sessions';
    const params = [];
    
    if (status) {
      const statuses = status.split(',');
      query += ` WHERE status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 10';
    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (err) {
    console.error('Error listing sessions:', err);
    res.status(500).json({ error: 'Error listing sessions' });
  }
});

// Create a new session
app.post('/api/sessions', (req, res) => {
  try {
    const { name, type = 'individual', game_id, game_ids, config = {}, teams } = req.body;
    const code = generateSessionCode();

    // Create session
    const sessionStmt = db.prepare(
      'INSERT INTO sessions (code, name, type, config) VALUES (?, ?, ?, ?)'
    );
    const sessionResult = sessionStmt.run(code, name || type, type, JSON.stringify(config));
    const sessionId = sessionResult.lastInsertRowid;

    // Create default teams if not provided
    const teamA = teams?.[0] || { name: 'Equipo A', avatar: '⚡' };
    const teamB = teams?.[1] || { name: 'Equipo B', avatar: '🔥' };

    const teamAStmt = db.prepare(
      'INSERT INTO session_teams (session_id, team_letter, name, avatar) VALUES (?, ?, ?, ?)'
    );
    teamAStmt.run(sessionId, 'A', teamA.name, teamA.avatar);

    const teamBStmt = db.prepare(
      'INSERT INTO session_teams (session_id, team_letter, name, avatar) VALUES (?, ?, ?, ?)'
    );
    teamBStmt.run(sessionId, 'B', teamB.name, teamB.avatar);

    // Add games to session
    if (type === 'individual' && game_id) {
      // Individual game: increment counter for naming
      const counter = db.prepare('SELECT counter FROM game_counters WHERE game_id = ?').get(game_id);
      const newCounter = (counter?.counter || 0) + 1;
      db.prepare('INSERT OR REPLACE INTO game_counters (game_id, counter) VALUES (?, ?)').run(game_id, newCounter);

      const game = db.prepare('SELECT name FROM games WHERE id = ?').get(game_id);
      const gameStmt = db.prepare(
        'INSERT INTO session_games (session_id, game_id, game_order, config) VALUES (?, ?, ?, ?)'
      );
      gameStmt.run(sessionId, game_id, 1, '{}');

      // Update session name if not provided
      if (!name) {
        const sessionName = `${game?.name}#${newCounter}`;
        db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run(sessionName, sessionId);
      }
    } else if (type === 'circuito' && game_ids?.length) {
      // Circuit: add all games in order
      const gameStmt = db.prepare(
        'INSERT INTO session_games (session_id, game_id, game_order, config) VALUES (?, ?, ?, ?)'
      );
      game_ids.forEach((gid, index) => {
        gameStmt.run(sessionId, gid, index + 1, '{}');
      });
    }

    // Update global state
    db.prepare('UPDATE game_state SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .run('idle');

    res.status(201).json({
      id: sessionId,
      code,
      name: name || `${type}#${sessionId}`,
      type,
      status: 'activo'
    });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Error creating session', detail: err.message, stack: err.stack });
  }
});

// Get session by ID with all related data
app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get games in session
    const games = db.prepare(`
      SELECT sg.*, g.name as game_name, g.file as game_file
      FROM session_games sg
      JOIN games g ON sg.game_id = g.id
      WHERE sg.session_id = ?
      ORDER BY sg.game_order
    `).all(req.params.id);

    // Get teams
    const teams = db.prepare('SELECT * FROM session_teams WHERE session_id = ?').all(req.params.id);

    // Get participants for each team
    teams.forEach(team => {
      team.participants = db.prepare('SELECT * FROM session_participants WHERE team_id = ?').all(team.id);
    });

    // Parse JSON fields
    session.config = JSON.parse(session.config || '{}');
    session.progress = JSON.parse(session.progress || '{}');

    res.json({
      ...session,
      games,
      teams
    });
  } catch (err) {
    console.error('Error getting session:', err);
    res.status(500).json({ error: 'Error getting session', detail: err.message });
  }
});

// Update session (status, progress, config)
app.patch('/api/sessions/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { status, progress, config, current_game_index, cumulative_score_a, cumulative_score_b } = req.body;

    if (status !== undefined) {
      db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, req.params.id);
    }
    if (progress !== undefined) {
      db.prepare('UPDATE sessions SET progress = ? WHERE id = ?').run(JSON.stringify(progress), req.params.id);
    }
    if (config !== undefined) {
      db.prepare('UPDATE sessions SET config = ? WHERE id = ?').run(JSON.stringify(config), req.params.id);
    }
    if (current_game_index !== undefined) {
      db.prepare('UPDATE sessions SET current_game_index = ? WHERE id = ?').run(current_game_index, req.params.id);
    }
    if (cumulative_score_a !== undefined) {
      db.prepare('UPDATE sessions SET cumulative_score_a = ? WHERE id = ?').run(cumulative_score_a, req.params.id);
    }
    if (cumulative_score_b !== undefined) {
      db.prepare('UPDATE sessions SET cumulative_score_b = ? WHERE id = ?').run(cumulative_score_b, req.params.id);
    }

    if (status === 'finalizado') {
      db.prepare('UPDATE sessions SET finished_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    }

    save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Error updating session' });
  }
});

// Start session (set first game as active)
app.post('/api/sessions/:id/start', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set first game as active
    db.prepare('UPDATE sessions SET status = ?, current_game_index = 0 WHERE id = ?')
      .run('activo', req.params.id);

    db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = 1')
      .run('activo', req.params.id);

    // Update global state
    const firstGame = db.prepare('SELECT game_id FROM session_games WHERE session_id = ? AND game_order = 1')
      .get(req.params.id);
    if (firstGame) {
      db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(firstGame.game_id, 'active');
    }

    save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: 'Error starting session' });
  }
});

// Finish session
app.post('/api/sessions/:id/finish', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.prepare('UPDATE sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('finalizado', req.params.id);

    // Update global state
    db.prepare('UPDATE game_state SET current_game_id = NULL, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .run('idle');

    save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error finishing session:', err);
    res.status(500).json({ error: 'Error finishing session' });
  }
});

// Update game result in session
app.patch('/api/sessions/:sessionId/games/:gameId', (req, res) => {
  try {
    const { local_score_a, local_score_b, winner, status } = req.body;

    if (local_score_a !== undefined) {
      db.prepare('UPDATE session_games SET local_score_a = ? WHERE session_id = ? AND id = ?')
        .run(local_score_a, req.params.sessionId, req.params.gameId);
    }
    if (local_score_b !== undefined) {
      db.prepare('UPDATE session_games SET local_score_b = ? WHERE session_id = ? AND id = ?')
        .run(local_score_b, req.params.sessionId, req.params.gameId);
    }
    if (winner !== undefined) {
      db.prepare('UPDATE session_games SET winner = ? WHERE session_id = ? AND id = ?')
        .run(winner, req.params.sessionId, req.params.gameId);
    }
    if (status !== undefined) {
      db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND id = ?')
        .run(status, req.params.sessionId, req.params.gameId);
    }

    // Update cumulative scores in session
    const game = db.prepare('SELECT * FROM session_games WHERE session_id = ? AND id = ?')
      .get(req.params.sessionId, req.params.gameId);

    if (game) {
      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId);
      const newScoreA = (session.cumulative_score_a || 0) + (local_score_a || 0);
      const newScoreB = (session.cumulative_score_b || 0) + (local_score_b || 0);

      db.prepare('UPDATE sessions SET cumulative_score_a = ?, cumulative_score_b = ? WHERE id = ?')
        .run(newScoreA, newScoreB, req.params.sessionId);
    }

    save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating game result:', err);
    res.status(500).json({ error: 'Error updating game result' });
  }
});

// Next game in session
app.post('/api/sessions/:id/next-game', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const nextIndex = session.current_game_index + 1;
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM session_games WHERE session_id = ?')
      .get(req.params.id).count;

    if (nextIndex >= totalGames) {
      // No more games - finish session
      db.prepare('UPDATE sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('finalizado', req.params.id);
      db.prepare('UPDATE game_state SET current_game_id = NULL, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run('idle');
      save();
      return res.json({ ok: true, finished: true });
    }

    // Mark current game as finished
    db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = ?')
      .run('finalizado', req.params.id, session.current_game_index + 1);

    // Mark next game as active
    db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = ?')
      .run('activo', req.params.id, nextIndex + 1);

    // Update session
    db.prepare('UPDATE sessions SET current_game_index = ? WHERE id = ?')
      .run(nextIndex, req.params.id);

    // Update global state
    const nextGame = db.prepare('SELECT game_id FROM session_games WHERE session_id = ? AND game_order = ?')
      .get(req.params.id, nextIndex + 1);
    if (nextGame) {
      db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
        .run(nextGame.game_id, 'active');
    }

    save();
    res.json({ ok: true, finished: false, next_game_index: nextIndex });
  } catch (err) {
    console.error('Error advancing to next game:', err);
    res.status(500).json({ error: 'Error advancing to next game' });
  }
});

// ==================== MOBILE / AUDIENCE API ====================

// Register mobile participant
app.post('/api/participants', (req, res) => {
  try {
    const { name, deviceId } = req.body;
    if (!name || !deviceId) {
      return res.status(400).json({ error: 'name and deviceId required' });
    }

    // Check if device already registered
    const existing = db.prepare('SELECT id, name, created_at FROM participants WHERE device_id = ?').get(deviceId);
    if (existing) {
      return res.json({ id: existing.id, createdAt: existing.created_at });
    }

    const stmt = db.prepare('INSERT INTO participants (name, device_id) VALUES (?, ?)');
    const info = stmt.run(name, deviceId);
    res.status(201).json({ id: info.lastInsertRowid, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('Error registering participant:', err);
    res.status(500).json({ error: 'Error registering participant' });
  }
});

// Send banner message (from mobile to marquee)
app.post('/api/banner-messages', (req, res) => {
  try {
    const { participantId, text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text required' });
    }

    const stmt = db.prepare('INSERT INTO banner_messages (participant_id, text) VALUES (?, ?)');
    const info = stmt.run(participantId || null, String(text).trim().slice(0, 120));
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('Error sending banner message:', err);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// Get new banner messages (for public screen polling)
app.get('/api/banner-messages', (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const rows = db.prepare(
      'SELECT bm.id, bm.text, bm.created_at, p.name as participant_name FROM banner_messages bm LEFT JOIN participants p ON bm.participant_id = p.id WHERE bm.id > ? ORDER BY bm.id ASC LIMIT 50'
    ).all(since);
    res.json(rows);
  } catch (err) {
    console.error('Error getting banner messages:', err);
    res.status(500).json({ error: 'Error getting messages' });
  }
});

// Create survey (from conductor console)
app.post('/api/surveys', (req, res) => {
  try {
    const { question, options } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question required' });
    }
    const opts = Array.isArray(options) ? options : [];

    // Close any existing open surveys first
    db.prepare("UPDATE surveys SET status = 'closed' WHERE status = 'open'").run();

    const stmt = db.prepare('INSERT INTO surveys (question, options, status) VALUES (?, ?, ?)');
    const info = stmt.run(question, JSON.stringify(opts), 'open');
    res.status(201).json({ id: info.lastInsertRowid, question, options: opts, status: 'open' });
  } catch (err) {
    console.error('Error creating survey:', err);
    res.status(500).json({ error: 'Error creating survey' });
  }
});

// Get active survey (for mobile polling)
app.get('/api/surveys/active', (req, res) => {
  try {
    const survey = db.prepare("SELECT * FROM surveys WHERE status = 'open' ORDER BY created_at DESC LIMIT 1").get();
    if (!survey) return res.json(null);

    survey.options = JSON.parse(survey.options || '[]');
    res.json(survey);
  } catch (err) {
    console.error('Error getting active survey:', err);
    res.status(500).json({ error: 'Error getting survey' });
  }
});

// Submit survey answer (from mobile)
app.post('/api/surveys/:id/answers', (req, res) => {
  try {
    const { participantId, optionId } = req.body;
    const surveyId = req.params.id;

    if (!optionId && optionId !== 0) {
      return res.status(400).json({ error: 'optionId required' });
    }

    // Check if survey exists and is open
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    if (survey.status !== 'open') return res.status(400).json({ error: 'Survey is closed' });

    // Check if already answered
    if (participantId) {
      const existing = db.prepare('SELECT id FROM survey_answers WHERE participant_id = ? AND survey_id = ?').get(participantId, surveyId);
      if (existing) {
        // Update answer instead of duplicate
        db.prepare('UPDATE survey_answers SET option_id = ? WHERE participant_id = ? AND survey_id = ?')
          .run(String(optionId), participantId, surveyId);
        save();
        return res.json({ ok: true, updated: true });
      }
    }

    const stmt = db.prepare('INSERT INTO survey_answers (participant_id, survey_id, option_id) VALUES (?, ?, ?)');
    stmt.run(participantId || null, surveyId, String(optionId));
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ error: 'Error submitting answer' });
  }
});

// Get survey results (for conductor console)
app.get('/api/surveys/:id/results', (req, res) => {
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    survey.options = JSON.parse(survey.options || '[]');
    const answers = db.prepare(
      'SELECT option_id, COUNT(*) as count FROM survey_answers WHERE survey_id = ? GROUP BY option_id'
    ).all(req.params.id);

    const total = answers.reduce((sum, a) => sum + a.count, 0);
    const results = survey.options.map(opt => {
      const answer = answers.find(a => a.option_id === String(opt.id));
      return { ...opt, votes: answer?.count || 0 };
    });

    res.json({ survey, results, total });
  } catch (err) {
    console.error('Error getting results:', err);
    res.status(500).json({ error: 'Error getting results' });
  }
});

// Close survey
app.patch('/api/surveys/:id/close', (req, res) => {
  try {
    db.prepare("UPDATE surveys SET status = 'closed' WHERE id = ?").run(req.params.id);
    save();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error closing survey:', err);
    res.status(500).json({ error: 'Error closing survey' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
