import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Server API Routes', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Create a fresh Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Import the real db module
    const { default: db } = await import('../../server/db.js');

    // Mount the same routes as server.js
    app.get('/api/games', (req, res) => {
      const rows = db.prepare('SELECT * FROM games ORDER BY id DESC').all();
      res.json(rows);
    });

    app.post('/api/games', (req, res) => {
      const { name, description } = req.body;
      const stmt = db.prepare('INSERT INTO games (name, description) VALUES (?, ?)');
      const info = stmt.run(name, description || null);
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

    return new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(() => {
    if (server) server.close();
  });

  describe('GET /api/games', () => {
    it('should return 200 and an array', async () => {
      const res = await request(app).get('/api/games');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/games', () => {
    it('should create a game and return 201 with id', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({ name: 'API Test Game', description: 'Created via API test' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
    });

    it('should create a game without description', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({ name: 'No Desc API Game' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should now list the created games', async () => {
      const res = await request(app).get('/api/games');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    afterAll(async () => {
      // Cleanup: get a reference to db and delete test games
      const { default: db } = await import('../../server/db.js');
      db.prepare('DELETE FROM games WHERE name IN (?, ?)').run('API Test Game', 'No Desc API Game');
    });
  });

  describe('GET /api/state', () => {
    it('should return 200 and game state object', async () => {
      const res = await request(app).get('/api/state');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('updated_at');
    });

    it('should include current_game when current_game_id is set', async () => {
      // First create a game
      const gameRes = await request(app)
        .post('/api/games')
        .send({ name: 'State Test Game', description: 'for state test' });
      const gameId = gameRes.body.id;

      // Set it as current game
      await request(app)
        .post('/api/state')
        .send({ current_game_id: gameId, status: 'active' });

      // Get state
      const res = await request(app).get('/api/state');
      expect(res.body.status).toBe('active');
      expect(res.body.current_game).toBeDefined();
      expect(res.body.current_game.name).toBe('State Test Game');

      // Cleanup
      const { default: db } = await import('../../server/db.js');
      db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
      db.prepare('UPDATE game_state SET current_game_id = NULL, status = ? WHERE id = 1').run('idle');
    });
  });

  describe('POST /api/state', () => {
    it('should update state and return ok', async () => {
      const res = await request(app)
        .post('/api/state')
        .send({ current_game_id: null, status: 'idle' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should set status to paused', async () => {
      await request(app)
        .post('/api/state')
        .send({ status: 'paused' });
      const stateRes = await request(app).get('/api/state');
      expect(stateRes.body.status).toBe('paused');

      // Reset
      await request(app)
        .post('/api/state')
        .send({ status: 'idle' });
    });
  });

  describe('Static file serving', () => {
    it('should serve index.html via express.static', async () => {
      const testApp = express();
      testApp.use(express.static(join(__dirname, '..', '..', 'public')));
      const res = await request(testApp).get('/index.html');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
    });

    it('should serve public.html via express.static', async () => {
      const testApp = express();
      testApp.use(express.static(join(__dirname, '..', '..', 'public')));
      const res = await request(testApp).get('/public.html');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
    });
  });
});
