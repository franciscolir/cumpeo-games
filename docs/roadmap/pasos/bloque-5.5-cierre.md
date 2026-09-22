# Bloque 5 — Cierre del juego Historia Enredada (pasos 5.5-pre a 5.5d)

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:**
- 5.5-pre: `65e86e6` — Cierre documental de mecánica
- 5.5-pre-fix: `f1e7552` — Corrección: 1 ronda = 2 historias
- 5.5a: `b7f6f25` — GameDefinition + reducers + 40 tests
- 5.5a-fix: `6321c3c` — Fix conteo de juegos en bootstrap/seed
- 5.5b: `c982efd` — UI Conductor + 30 tests
- 5.5c: `068f151` — UI Pública + 18 tests
- 5.5d: `dc9d34e` — E2E + fix de `cargarItemsDeJuego` y `shell-publica.js`

---

## Objetivo

Implementar Historia Enredada end-to-end: GameDefinition, UI Conductor,
UI Pública y tests e2e.

---

## Mecánica cerrada (resumen)

- Juego narrativo y de interpretación por equipos.
- Set obligatorio con items { titulo, descripcion, guion, dibujo?, ruidos? }.
- Cada ronda: 2 historias (1 por equipo). Orden fijo: Eq1 → Eq2.
- Puntuación manual: el conductor asigna puntos por historia.
- Ganador: mayor puntaje total al final de N rondas.
- Sin timer.
- Historias no se repiten en la partida.

Fases: INICIO_RONDA, SELECCIONANDO_HISTORIA, PREPARANDO, ACTUANDO,
VOTANDO, FIN_DE_RONDA, FIN_DE_JUEGO.

---

## Pasos ejecutados

| Paso | Alcance | Commit | Evidencia |
|---|---|---|---|
| 5.5-pre | Cierre documental de mecánica | 65e86e6 | GAMES.md §10 |
| 5.5-pre-fix | 1 ronda = 2 historias | f1e7552 | Ajuste de mecánica |
| 5.5a | GameDefinition + reducers | b7f6f25 | 40 tests unitarios |
| 5.5a-fix | Conteo bootstrap/seed | 6321c3c | 5→6 juegos |
| 5.5b | UI Conductor | c982efd | 30 tests unitarios |
| 5.5c | UI Pública | 068f151 | 18 tests |
| 5.5d | E2E + fixes | dc9d34e | 10 e2e (9 passed, 1 skipped) |

---

## Verificación final

- Unit: **1012 tests passing**.
- E2E Historia Enredada: **9/10 passing** (1 skipped intencional).
- E2E Rosco: **18/18 passing**.
- E2E Pictionary: **11/11 passing**.
- E2E Canción Incompleta: **9/9 passing**.
- `git status --short` limpio.

---

## Fixes aplicados durante 5.5d

### Fix 1 — `cargarItemsDeJuego` ahora preserva el `id` del item

**Problema:** la función devolvía `it.contenido` (solo el contenido), perdiendo
el `id`. Los selectores `[data-historia-id="${h.id}"]` quedaban con
`data-historia-id="undefined"`, y el reducer `seleccionarHistoria` recibía
`historiaId: undefined`.

**Fix:** devolver `{ id: it.id, ...(it.contenido || {}) }`.

**Impacto:** positivo para selectores. Verificado que los tests de otros
juegos siguen pasando.

### Fix 2 — `shell-publica.js` no cargaba `itemsHistoria`

**Problema:** la pública solo cargaba `itemsQPEP` e `itemsRosco`. Para
Historia Enredada, `contexto.itemsDelJuego` era `undefined`, y
`_historiaDeHE` no encontraba la historia.

**Fix:** agregar `itemsHistoria` y pasarlo en el contexto del render.

---

## Deudas nuevas

### #69 (Baja)

El cambio de `cargarItemsDeJuego` (ahora devuelve `id` además del
contenido) puede afectar a otros juegos (Trivia) cuyos tests asumen items
sin `id`. **Verificar Trivia completa cuando se cierre 5.6.**

### #70 (Baja)

El test `set sin historias suficientes no permite arrancar la ronda`
está `test.skip` porque el helper siempre crea 3 historias. Para
des-skipearlo, el helper necesita aceptar `itemsCount: 0`.

### #71 (Media)

El test `cards excluyen historias usadas` era flaky con `waitForTimeout`.
Se estabilizó con `waitForFunction`. Patrón a aplicar en otros tests
futuros que dependan del re-render del shell.

---

## Veredicto

✅ APROBADO. Historia Enredada cerrada end-to-end. Bloque 5 en 7/10 pasos.
Siguiente: 5.6 Trivia completa.
