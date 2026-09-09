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
        save();
        return { lastInsertRowid: db.getLastInsertRowid(), changes };
      }
    };
  },
  exec(sql) { db.run(sql); save(); }
};

await load();
export default wrapper;
