# Cumpeo Games

Aplicación de gestión de juegos con vista Conductor y Público.

## Inicio rápido

```bash
npm install
npm run dev
```
Abre http://localhost:3000

## Estructura
server/ - API Express + SQLite
public/ - Front vanilla JS
db/ - Base SQLite

## Migración a Supabase
El front usa `public/js/db.js` como capa de datos. Para migrar a Supabase, reemplaza implementación de `db` por cliente `@supabase/supabase-js` manteniendo mismas funciones: listGames, createGame, getState, setState.
