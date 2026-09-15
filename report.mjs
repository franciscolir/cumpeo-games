import initSqlJs from 'sql.js';
import fs from 'fs';
import { join } from 'path';

const dbFile='C:\\Users\\SSGG\\Desktop\\Cumpeo_games\\db\\cumpeo.sqlite';
const SQL=await initSqlJs({locateFile:f=>join('C:\\Users\\SSGG\\Desktop\\Cumpeo_games','node_modules','sql.js','dist',f)});
const db=new SQL.Database(fs.readFileSync(dbFile));
function q(s){const st=db.prepare(s); const r=[]; while(st.step()) r.push(st.getAsObject()); st.free(); return r;}

console.log('=== GAMES ===');
const games=q('SELECT id,name,description,file,active FROM games ORDER BY id');
console.log('| id | name | description | file | active |');
console.log('|----|------|-------------|------|--------|');
games.forEach(g=>{
  const desc = g.description ? g.description.replace(/\|/g,' ') : '';
  const name = g.name.replace(/\|/g,' ');
  const file = g.file ? g.file : '';
  console.log(`| ${g.id} | ${name} | ${desc} | ${file} | ${g.active} |`);
});

console.log('\n=== SESSIONS ===');
const sessions=q('SELECT id,code,name,type,status FROM sessions ORDER BY id');
console.log('| id | code | name | type | status |');
console.log('|----|------|------|------|--------|');
sessions.forEach(s=>{
  console.log(`| ${s.id} | ${s.code} | ${s.name} | ${s.type} | ${s.status} |`);
});

console.log('\n=== SESSION_GAMES (con juegos existentes) ===');
const sg=q(`SELECT sg.id, sg.session_id, s.code as session_code, sg.game_id, g.name as game_name, sg.game_order, sg.status FROM session_games sg JOIN sessions s ON s.id=sg.session_id LEFT JOIN games g ON g.id=sg.game_id ORDER BY sg.session_id, sg.game_order`);
console.log('| sg_id | session_id | session_code | game_id | game_name | order | status |');
console.log('|-------|------------|--------------|---------|-----------|-------|--------|');
sg.forEach(r=>{
  console.log(`| ${r.id} | ${r.session_id} | ${r.session_code} | ${r.game_id} | ${r.game_name||'ORFANO'} | ${r.game_order} | ${r.status} |`);
});
