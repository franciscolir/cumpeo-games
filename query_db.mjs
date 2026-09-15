import initSqlJs from 'sql.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbFile = join(__dirname, 'db', 'cumpeo.sqlite');

const SQL = await initSqlJs({ locateFile: file => join(__dirname, 'node_modules', 'sql.js', 'dist', file) });
const filebuffer = fs.readFileSync(dbFile);
const db = new SQL.Database(filebuffer);

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

console.log('=== GAMES ===');
const games = query('SELECT id, name, description, file, active FROM games ORDER BY id');
console.table(games);

console.log('\n=== SESSIONS ===');
const sessions = query('SELECT id, code, name, type, status FROM sessions ORDER BY id');
console.table(sessions);

console.log('\n=== SESSION_GAMES ===');
const sessionGames = query('SELECT id, session_id, game_id, game_order, status FROM session_games ORDER BY session_id, game_order');
console.table(sessionGames);

console.log('\n=== GAMES IN USE ===');
const used = query(`
  SELECT DISTINCT g.id, g.name, s.id as session_id, s.code as session_code, sg.game_order, sg.status as sg_status
  FROM session_games sg
  JOIN games g ON g.id = sg.game_id
  JOIN sessions s ON s.id = sg.session_id
  ORDER BY s.id, sg.game_order
`);
console.table(used);
