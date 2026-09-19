# Bloque 2 — Paso 2.3 + 2.3a

**Estado:** ✅ APROBADO
**Commit:** `73f0cbf`
**Fecha:** 2026-09-18

---

## Objetivo

Crear el ShellPartida (conductor) y habilitar login programático en e2e.

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `src/ui/partidas/shell-partida.js` | NUEVO — shell del conductor |
| `src/app/auth.js` | MOD — +`loginConPassword` |
| `src/main.js` | MOD — ruta `#/partidas/:id` → shell |
| `tests/e2e/_helpers/auth.js` | NUEVO — helper de login |
| `tests/e2e/shell-partida.spec.js` | NUEVO — 4 tests |
| `tests/e2e/*.spec.js` | MOD — +beforeEach(loginTestUser) |

---

## Layout del shell

- Top bar: CUMPEO + partida + estado + código + acciones.
- Hero scoreboard: Game Info (5) + Equipo 1 (3) + VS (1) + Equipo 2 (3).
- Game container: delegado a `gameUI.renderizarAreaJuego`.
- Panel conductor: delegado a `gameUI.renderizarPanelConductor`.

---

## Resultado

- **39 e2e passing** (primera vez desde que se habilitó Supabase Auth).
- 534 unit tests passing.
- Login programático con password funciona.

---

## Deuda técnica registrada

1. **Tests laxos:** los tests de control (tomar/comenzar/descartar) en
   `partidas.spec.js` usan `if (await btn.isVisible())`, lo que los hace
   pasar incluso si el botón no existe. Endurecer en paso 2.3c.
2. **Tests de control apuntan a `#/partidas-viejo/`:** usan la consola
   vieja, no el shell nuevo. El shell nuevo no se testea funcionalmente.
3. **`indexeddb-smoke.spec.js` cambió de propósito:** verifica 0 stores
   en modo Supabase. Se pierde cobertura del modo IndexedDB (cubierto
   por unit tests).
4. **Shell tiene 3 bugs conocidos** (se corrigen en paso 2.3c):
   - `clase: 'data-accion-X'` en `Boton` no funciona (va a class, no a data-*).
   - Colores de equipo inventados en vez de `comicBlue`/`comicRed`.
   - `juego_codigo` no existe en `juego_ejecutado` (se resuelve en paso 2.3b).
5. **Credenciales hardcodeadas en e2e:** el helper `auth.js` tiene email
   y password del test user. Aceptable para proyecto personal.
6. **Config para CI:** `playwright.config.js` no tiene env vars para CI.
   Pendiente futuro.

---

## Evidencia

- `git diff --stat`: 12 archivos, 613 insertions, 68 deletions.
- `npm test`: 33 files, 534 tests passing.
- `npm run test:e2e`: 39 passing (2.2m).