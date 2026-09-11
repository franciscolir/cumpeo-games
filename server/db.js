import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbFile = join(__dirname, '..', 'db', 'cumpeo.sqlite');

let db;
let SQL;

async function load() {
  SQL = await initSqlJs({ locateFile: file => join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'sql.js', 'dist', file) });
  if (fs.existsSync(dbFile)) {
    const filebuffer = fs.readFileSync(dbFile);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }
  initSchema();
  save();
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      file TEXT DEFAULT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_game_id INTEGER,
      status TEXT NOT NULL DEFAULT 'idle',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const res = db.exec('SELECT id FROM game_state WHERE id = 1');
  if (res.length === 0 || res[0].values.length === 0) {
    db.run(`INSERT INTO game_state (id, status) VALUES (1, 'idle')`);
  }

  // Sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'individual',
      status TEXT NOT NULL DEFAULT 'activo',
      config TEXT DEFAULT '{}',
      progress TEXT DEFAULT '{}',
      current_game_index INTEGER DEFAULT 0,
      cumulative_score_a INTEGER DEFAULT 0,
      cumulative_score_b INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT
    );
  `);

  // Session games (relationship N:N)
  db.run(`
    CREATE TABLE IF NOT EXISTS session_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      game_order INTEGER NOT NULL,
      config TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pendiente',
      local_score_a INTEGER DEFAULT 0,
      local_score_b INTEGER DEFAULT 0,
      winner TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
  `);

  // Session teams
  db.run(`
    CREATE TABLE IF NOT EXISTS session_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      team_letter TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  // Session participants (optional)
  db.run(`
    CREATE TABLE IF NOT EXISTS session_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES session_teams(id)
    );
  `);

  // Game play counters (for naming like "Trivia#1", "Trivia#2")
  db.run(`
    CREATE TABLE IF NOT EXISTS game_counters (
      game_id INTEGER PRIMARY KEY,
      counter INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
  `);

  // Add file column to games table if not exists (migration)
  try {
    db.run(`ALTER TABLE games ADD COLUMN file TEXT DEFAULT NULL`);
  } catch (e) {
    // Column already exists, ignore
  }
}

function save() {
  const data = db.export();
  fs.writeFileSync(dbFile, Buffer.from(data.buffer));
}

// Simple wrapper API compatible with better-sqlite3 usage
const wrapper = {
  prepare(sql) {
    return {
      all: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      get: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) return stmt.getAsObject();
        stmt.free();
        return undefined;
      },
      run: (...params) => {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        const changes = db.getRowsModified();
        stmt.free();
        const rid = db.exec("SELECT last_insert_rowid()");
        const lastInsertRowid = rid.length > 0 ? rid[0].values[0][0] : 0;
        save();
        return { lastInsertRowid, changes };
      }
    };
  },
  exec(sql) { db.run(sql); save(); }
};

await load();
export default wrapper;
