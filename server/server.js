import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
