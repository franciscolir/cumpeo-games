# Bloque 5 — Cierre del juego Trivia (pasos 5.6-pre a 5.6d)

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:**
- 5.6-pre: `9269eb1` — Cierre documental de mecánica
- 5.6a: `2d9190d` — Reescribir GameDefinition (turnos alternados)
- 5.6b-1: `8bee291` — Reescribir UI Conductor
- 5.6b-2: `38eca68` — Reescribir shell actions
- 5.6c: `0acedd5` — UI Pública
- 5.6c-fix: `28e8b6f` — Tests estáticos de UI pública
- 5.6d: `afba7a0` — E2E + fix del wrapper en shell

---

## Objetivo

Implementar Trivia end-to-end con la mecánica nueva: turnos alternados,
set por equipo, validación automática por selección A/B/C/D.

---

## Mecánica cerrada (resumen)

- 2 equipos, 2 turnos por ronda (Eq1 → Eq2).
- Cada turno: 5 preguntas de un set.
- **Cada equipo tiene SU PROPIO SET.** Sets elegidos al inicio de cada turno.
- Conductor selecciona opción A/B/C/D y presiona "Validar".
- El sistema compara automáticamente con `respuesta_correcta_index`.
- Puntos configurables. Penalización configurable.
- Timer 30s por pregunta (configurable).
- Pasar: botón con penalización configurable.
- Sin robo. Empate técnico.

Fases: INICIO_RONDA, SELECCIONANDO_SET, MOSTRANDO_PREGUNTA,
SELECCIONANDO_RESPUESTA, MOSTRANDO_RESULTADO, CAMBIO_TURNO,
FIN_DE_RONDA, FIN_DE_JUEGO.

---

## Pasos ejecutados

| Paso | Alcance | Commit | Evidencia |
|---|---|---|---|
| 5.6-pre | Cierre de mecánica en GAMES.md §5 | 9269eb1 | Mecánica completa |
| 5.6a | GameDefinition + 77 tests | 2d9190d | 8 fases, 9 reducers |
| 5.6b-1 | UI Conductor + 31 tests | 8bee291 | 8 fases manejadas |
| 5.6b-2 | Shell actions (11 nuevas) | 38eca68 | Retry lazy en 3 acciones |
| 5.6c | UI Pública | 0acedd5 | 192 líneas |
| 5.6c-fix | Tests estáticos UI pública | 28e8b6f | 25 tests |
| 5.6d | E2E + fix wrapper | afba7a0 | 10 e2e + fix shell |

---

## Verificación final

- Unit: **1110 tests passing** (52 files).
- E2E Trivia: **10/10 passing**.
- E2E Rosco: 18/18 (verificado).
- E2E Pictionary: 11/11 (verificado).
- E2E Canción Incompleta: 9/9 (verificado).
- E2E Historia Enredada: 9/10 (1 skipped).
- `git status --short` limpio.

---

## Bugs encontrados y resueltos

### Bug #72 — `listarItemsDeSet` devuelve wrapper `{ id, contenido, orden }`

**Descripción:** el shell `seleccionar-set-trivia` pasaba los items raw
(`{ id, contenido: { pregunta, opciones, respuesta_correcta_index }, orden }`)
al reducer `seleccionarSet`, que esperaba objetos planos.

**Impacto:** el reducer no podía leer `pregunta`, `opciones` ni
`respuesta_correcta_index`.

**Detectado en:** 5.6d (durante e2e).

**Fix:** `itemsRaw.map((it) => ({ ...it.contenido, id: it.id }))`.

**Estado:** ✅ Cerrado.

**Nota:** este bug debería haberse detectado en 5.6b-2 (cuando se escribió
la acción del shell). Se documenta como aprendizaje.

### Bug #73 — Helper e2e buscaba opciones en panel incorrecto

**Descripción:** el helper y los specs buscaban `[data-opcion-index]` en
`#shell-panel-conductor`, pero las opciones están en `#shell-game-container`.

**Detectado en:** 5.6d (durante e2e).

**Fix:** cambiar los selectores a `#shell-game-container`.

**Estado:** ✅ Cerrado.

---

## Deudas nuevas

### #74 (Baja)

El timer público de Trivia (`_iniciarTimerTriviaPublico` en
`shell-publica.js:1531`) usa `window._triviaConfig`, que **no se setea en
ningún lado**. El timer siempre usa `30s` por default, ignorando
`tiempo_por_pregunta_seg` de la configuración real.

**Fix sugerido:** leer `juegoActivo.configuracion_congelada.tiempo_por_pregunta_seg`
en lugar de `window._triviaConfig`.

### #75 (Baja)

El test `turnos.spec.js:7` (Eq1 y Eq2 alternan) tarda 11s. El test
`validacion.spec.js:111` (múltiples rondas) tarda 29.7s. Son los más
lentos de la suite e2e de Trivia. Considerar reducir tiempos de espera.

### #76 (Baja)

El conteo del Bloque 5 tras 5.6d es **8/10**, no 9/10. El paso 5.6 se
cierra al completar el cierre documental (5.6-cierre), no al completar
el código.

---

## Veredicto

✅ APROBADO. Trivia cerrada end-to-end. Bloque 5 en 9/10 pasos.
Siguiente: 5.7 Memoricé.
