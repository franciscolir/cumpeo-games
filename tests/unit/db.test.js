import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use a test database instead of the real one
const testDbPath = join(__dirname, '..', '..', 'db', 'test-cumpeo.sqlite');

// Mock the db module path before importing
process.env.TEST_DB = '1';

describe('Database Layer (db.js)', () => {
  let db;

  beforeAll(async () => {
    // Clean up any existing test db
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    // Dynamically import to use test DB path
    const mod = await import('../../server/db.js');
    db = mod.default;
  });

  afterAll(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  describe('Schema initialization', () => {
    it('should have games table', () => {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='games'").get();
      expect(result).toBeDefined();
      expect(result.name).toBe('games');
    });

    it('should have game_state table', () => {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='game_state'").get();
      expect(result).toBeDefined();
      expect(result.name).toBe('game_state');
    });

    it('should have game_state row with id=1', () => {
      const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
      expect(state).toBeDefined();
      expect(state.id).toBe(1);
      expect(typeof state.status).toBe('string');
    });
  });

  describe('Games CRUD', () => {
    let insertedId;

    it('should insert a game', () => {
      const result = db.prepare('INSERT INTO games (name, description) VALUES (?, ?)').run('Test Game', 'A test game');
      expect(result.lastInsertRowid).toBeDefined();
      insertedId = result.lastInsertRowid;
    });

    it('should fetch all games', () => {
      const games = db.prepare('SELECT * FROM games ORDER BY id DESC').all();
      expect(games).toBeInstanceOf(Array);
      expect(games.length).toBeGreaterThanOrEqual(1);
      expect(games[0].name).toBe('Test Game');
    });

    it('should fetch a single game by id', () => {
      const game = db.prepare('SELECT * FROM games WHERE id = ?').get(insertedId);
      expect(game).toBeDefined();
      expect(game.name).toBe('Test Game');
      expect(game.description).toBe('A test game');
    });

    it('should insert a game with null description', () => {
      const result = db.prepare('INSERT INTO games (name, description) VALUES (?, ?)').run('No Desc Game', null);
      expect(result.lastInsertRowid).toBeDefined();
      const game = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid);
      expect(game.description).toBeNull();
    });

    it('should clean up test games', () => {
      db.prepare('DELETE FROM games WHERE name IN (?, ?)').run('Test Game', 'No Desc Game');
      const games = db.prepare('SELECT * FROM games WHERE name IN (?, ?)').all('Test Game', 'No Desc Game');
      expect(games.length).toBe(0);
    });
  });

  describe('Game State', () => {
    it('should update game state', () => {
      db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(null, 'active');
      const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
      expect(state.status).toBe('active');
    });

    it('should reset game state to idle', () => {
      db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(null, 'idle');
      const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
      expect(state.status).toBe('idle');
      expect(state.current_game_id).toBeNull();
    });

    it('should set current game id', () => {
      // First insert a game
      const result = db.prepare('INSERT INTO games (name, description) VALUES (?, ?)').run('State Test Game', 'test');
      const gameId = result.lastInsertRowid;

      db.prepare('UPDATE game_state SET current_game_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(gameId, 'active');
      const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
      expect(state.current_game_id).toBe(gameId);

      // Cleanup
      db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
      db.prepare('UPDATE game_state SET current_game_id = NULL, status = ? WHERE id = 1').run('idle');
    });
  });

  describe('SQL Wrapper API', () => {
    it('prepare().all() should return array', () => {
      const result = db.prepare('SELECT * FROM games').all();
      expect(Array.isArray(result)).toBe(true);
    });

    it('prepare().get() should return object or undefined', () => {
      const result = db.prepare('SELECT * FROM game_state WHERE id = 999').get();
      expect(result).toBeUndefined();
    });

    it('prepare().run() should return lastInsertRowid and changes', () => {
      const result = db.prepare('INSERT INTO games (name, description) VALUES (?, ?)').run('Wrapper Test', 'test');
      expect(result).toHaveProperty('lastInsertRowid');
      expect(result).toHaveProperty('changes');
      // Cleanup
      db.prepare('DELETE FROM games WHERE name = ?').run('Wrapper Test');
    });
  });
});
