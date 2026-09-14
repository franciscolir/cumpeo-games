import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Sessions API Routes', () => {
  let app;
  let server;
  let db;
  let testGameId;
  let testSessionId;

  beforeAll(async () => {
    // Create a fresh Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Import the real db module
    const dbModule = await import('../../server/db.js');
    db = dbModule.default;

    // Mount the same routes as server.js (sessions routes)
    function generateSessionCode() {
      const num = Math.floor(100 + Math.random() * 900);
      return `CMP-${num}`;
    }

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
        res.status(500).json({ error: 'Error listing sessions' });
      }
    });

    app.post('/api/sessions', (req, res) => {
      try {
        const { name, type = 'individual', game_id, config = {}, teams } = req.body;
        const code = generateSessionCode();

        const sessionStmt = db.prepare(
          'INSERT INTO sessions (code, name, type, config) VALUES (?, ?, ?, ?)'
        );
        const sessionResult = sessionStmt.run(code, name || type, type, JSON.stringify(config));
        const sessionId = sessionResult.lastInsertRowid;

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

        if (type === 'individual' && game_id) {
          const counter = db.prepare('SELECT counter FROM game_counters WHERE game_id = ?').get(game_id);
          const newCounter = (counter?.counter || 0) + 1;
          db.prepare('INSERT OR REPLACE INTO game_counters (game_id, counter) VALUES (?, ?)').run(game_id, newCounter);

          const game = db.prepare('SELECT name FROM games WHERE id = ?').get(game_id);
          const gameStmt = db.prepare(
            'INSERT INTO session_games (session_id, game_id, game_order, config) VALUES (?, ?, ?, ?)'
          );
          gameStmt.run(sessionId, game_id, 1, '{}');

          if (!name) {
            const sessionName = `${game?.name}#${newCounter}`;
            db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run(sessionName, sessionId);
          }
        }

        res.status(201).json({
          id: sessionId,
          code,
          name: name || `${type}#${sessionId}`,
          type,
          status: 'activo'
        });
      } catch (err) {
        res.status(500).json({ error: 'Error creating session', detail: err.message });
      }
    });

    app.get('/api/sessions/:id', (req, res) => {
      try {
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        const games = db.prepare(`
          SELECT sg.*, g.name as game_name, g.file as game_file
          FROM session_games sg
          JOIN games g ON sg.game_id = g.id
          WHERE sg.session_id = ?
          ORDER BY sg.game_order
        `).all(req.params.id);

        const teams = db.prepare('SELECT * FROM session_teams WHERE session_id = ?').all(req.params.id);

        teams.forEach(team => {
          team.participants = db.prepare('SELECT * FROM session_participants WHERE team_id = ?').all(team.id);
        });

        session.config = JSON.parse(session.config || '{}');
        session.progress = JSON.parse(session.progress || '{}');

        res.json({
          ...session,
          games,
          teams
        });
      } catch (err) {
        res.status(500).json({ error: 'Error getting session' });
      }
    });

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

        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: 'Error updating session' });
      }
    });

    app.post('/api/sessions/:id/start', (req, res) => {
      try {
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        db.prepare('UPDATE sessions SET status = ?, current_game_index = 0 WHERE id = ?')
          .run('activo', req.params.id);

        db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = 1')
          .run('activo', req.params.id);

        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: 'Error starting session' });
      }
    });

    app.post('/api/sessions/:id/finish', (req, res) => {
      try {
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        db.prepare('UPDATE sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('finalizado', req.params.id);

        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: 'Error finishing session' });
      }
    });

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
          db.prepare('UPDATE sessions SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run('finalizado', req.params.id);
          return res.json({ ok: true, finished: true });
        }

        db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = ?')
          .run('finalizado', req.params.id, session.current_game_index + 1);

        db.prepare('UPDATE session_games SET status = ? WHERE session_id = ? AND game_order = ?')
          .run('activo', req.params.id, nextIndex + 1);

        db.prepare('UPDATE sessions SET current_game_index = ? WHERE id = ?')
          .run(nextIndex, req.params.id);

        res.json({ ok: true, finished: false, next_game_index: nextIndex });
      } catch (err) {
        res.status(500).json({ error: 'Error advancing to next game' });
      }
    });

    return new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(() => {
    // Cleanup test data
    if (db && testSessionId) {
      try {
        db.prepare('DELETE FROM session_participants WHERE team_id IN (SELECT id FROM session_teams WHERE session_id = ?)').run(testSessionId);
        db.prepare('DELETE FROM session_teams WHERE session_id = ?').run(testSessionId);
        db.prepare('DELETE FROM session_games WHERE session_id = ?').run(testSessionId);
        db.prepare('DELETE FROM sessions WHERE id = ?').run(testSessionId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (db && testGameId) {
      try {
        db.prepare('DELETE FROM games WHERE id = ?').run(testGameId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (server) server.close();
  });

  describe('POST /api/sessions', () => {
    it('should create a session and return 201', async () => {
      // First create a game to link
      const gameRes = await request(app)
        .post('/api/games')
        .send({ name: 'Test Game for Session', description: 'Test' });
      testGameId = gameRes.body.id;

      const res = await request(app)
        .post('/api/sessions')
        .send({ 
          name: 'Test Session', 
          type: 'individual', 
          game_id: testGameId 
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toMatch(/^CMP-\d{3}$/);
      expect(res.body.type).toBe('individual');
      expect(res.body.status).toBe('activo');
      
      testSessionId = res.body.id;
    });

    it('should create a session with custom teams', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ 
          name: 'Custom Teams Session', 
          type: 'individual',
          teams: [
            { name: 'Los Tigres', avatar: '🐯' },
            { name: 'Los Leones', avatar: '🦁' }
          ]
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      
      // Cleanup
      const sessionId = res.body.id;
      db.prepare('DELETE FROM session_participants WHERE team_id IN (SELECT id FROM session_teams WHERE session_id = ?)').run(sessionId);
      db.prepare('DELETE FROM session_teams WHERE session_id = ?').run(sessionId);
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    });
  });

  describe('GET /api/sessions', () => {
    it('should return 200 and an array', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/sessions?status=activo');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with games and teams', async () => {
      const res = await request(app).get(`/api/sessions/${testSessionId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testSessionId);
      expect(res.body).toHaveProperty('games');
      expect(res.body).toHaveProperty('teams');
      expect(Array.isArray(res.body.games)).toBe(true);
      expect(Array.isArray(res.body.teams)).toBe(true);
      expect(res.body.teams.length).toBe(2);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).get('/api/sessions/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/sessions/:id', () => {
    it('should update session status', async () => {
      const res = await request(app)
        .patch(`/api/sessions/${testSessionId}`)
        .send({ status: 'pausado' });
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      
      // Verify update
      const getRes = await request(app).get(`/api/sessions/${testSessionId}`);
      expect(getRes.body.status).toBe('pausado');
      
      // Reset status
      await request(app)
        .patch(`/api/sessions/${testSessionId}`)
        .send({ status: 'activo' });
    });

    it('should update cumulative scores', async () => {
      const res = await request(app)
        .patch(`/api/sessions/${testSessionId}`)
        .send({ cumulative_score_a: 100, cumulative_score_b: 75 });
      
      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .patch('/api/sessions/999999')
        .send({ status: 'activo' });
      
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/sessions/:id/start', () => {
    it('should start session', async () => {
      const res = await request(app).post(`/api/sessions/${testSessionId}/start`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).post('/api/sessions/999999/start');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/sessions/:id/finish', () => {
    it('should finish session', async () => {
      const res = await request(app).post(`/api/sessions/${testSessionId}/finish`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).post('/api/sessions/999999/finish');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/sessions/:id/next-game', () => {
    it('should return 404 for non-existent session', async () => {
      const res = await request(app).post('/api/sessions/999999/next-game');
      expect(res.status).toBe(404);
    });
  });
});
