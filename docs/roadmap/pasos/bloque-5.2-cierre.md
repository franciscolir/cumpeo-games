# Bloque 5 — Cierre del juego Rosco (pasos 5.2a–d)

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commits:**
- 5.2a: 79c4493
- 5.2b: 7ec5603
- 5.2c: a90e23b
- 5.2d: 94a89d1

---

## Objetivo

Implementar el juego Rosco end-to-end: GameDefinition + validación,
UI del conductor, UI pública y tests e2e.

---

## Pasos ejecutados

| Paso | Alcance | Commit | Evidencia |
|---|---|---|---|
| 5.2a | GameDefinition + validación de set + reducers puros | 79c4493 | 70 tests unitarios |
| 5.2b | UI del conductor | 7ec5603 | 29 tests unitarios |
| 5.2c | UI pública (definición en centro, revelado post-validación) | a90e23b | 30 tests unitarios |
| 5.2d | Tests e2e + bug fix de registro | 94a89d1 | 18 e2e en 4 specs |

---

## Verificación

- Unit Rosco: 129 tests (3 archivos).
- E2E Rosco: 18 tests (4 specs).
- Suite completa: 738 unit + 18 e2e, todos pasan.
- `git status --short` limpio.

---

## Integración end-to-end

- `src/games/registro.js` registra `RoscoGameDefinition`.
- `src/ui/games/registro.js` registra `RoscoGameUI`.
- `src/ui/partidas/shell-partida.js` maneja 10 acciones de Rosco.
- `src/ui/publica/shell-publica.js` renderiza el escenario público.

---

## Bug fix incluido en 5.2d

`RoscoGameDefinition` no estaba registrado en `src/games/registro.js`
al cierre de 5.2a/b/c. El bug se detectó al correr los e2e de 5.2d y se
corrigió en el mismo commit (94a89d1). Impacto: el juego no se sembraba
en bootstrap.

---

## Decisiones de diseño

- El conductor NO ve la respuesta: solo la definición, para leerla en
  voz alta. La respuesta se revela únicamente al público tras la
  validación (OK o X).
- La definición se muestra en el CENTRO del rosco público (requisito 5.1d).
- La sincronización conductor ↔ público reusa el mecanismo existente
  (Supabase Realtime / LocalAdapter polling 2s). No se inventó canal nuevo.
- La validación del set cierra la deuda #57: no se puede iniciar una
  partida con set inválido.

---

## Deudas registradas

- #59: stale closures en callbacks del shell (`shell-partida.js`).
- #60: acoplamiento entre registro de juegos y tests de bootstrap/seed.

---

## Veredicto

✅ APROBADO. Bloque Rosco cerrado (5.2a–d). Siguiente: 5.3 Canción
Incompleta end-to-end.
