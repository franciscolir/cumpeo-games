# Bloque 5 — Cierre del juego Pictionary (pasos 5.4-pre a 5.4-e)

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:**
- 5.4-pre: `d076f9e` — Cierre documental de mecánica de Pictionary
- 5.4a: `ef53390` + `6ae18de` — GameDefinition + reducers + tests
- 5.4b: `c84613e` — UI Conductor
- 5.4c: `0835a28` — UI Pública + fix bonus inline
- 5.4d: `f8b8530` — e2e (rechazado: 1 falla + mecánica incorrecta)
- 5.4d-fix: `08e4acf` — Corrección de `avanzarModo` + helper e2e
- 5.4d-fix-2: `83f9f2d` — Corrección de assertions + timeout
- 5.4-rosco-fix-v2: `699204b` — Retry lazy en acciones Rosco (deuda #59)
- 5.4-e: `3eb742d` — Fix de `obtenerContextoEspera` (deuda #67)

---

## Objetivo

Implementar Pictionary end-to-end: GameDefinition, UI Conductor, UI Pública
y tests e2e. Cerrar el bloque completo con todos los tests verdes.

---

## Mecánica cerrada (resumen)

- 4 modos: (1) palabras prohibidas, (2) gestos, (3) dibujo, (4) preguntas sí/no.
- Set obligatorio con items etiquetados por modo.
- Orden fijo 1→2→3→4. **Turno completo por equipo** (Eq1 hace 4 modos,
  luego Eq2 hace 4 modos).
- 4 modos por equipo = 1 ronda. N rondas configurables.
- Timer: `segundos_por_modo` configurable.
- Palabras por modo: configurable, default 1.
- Pasar palabra: configurable (penaliza o no).
- Bonus: manual con formulario inline en el panel del conductor.
- Fases: INICIO_RONDA, SELECCIONANDO_MODO, MOSTRANDO_PALABRA, ADIVINANDO,
  ESPERA_VALIDACION, CAMBIO_MODO, FIN_DE_RONDA, FIN_DE_JUEGO.

---

## Pasos ejecutados

| Paso | Alcance | Commits | Evidencia |
|---|---|---|---|
| 5.4-pre | Cierre documental de mecánica | d076f9e | GAMES.md §9 actualizado |
| 5.4a | GameDefinition + validación + reducers | ef53390, 6ae18de | 74 tests unitarios |
| 5.4b | UI Conductor | c84613e | 34 tests unitarios |
| 5.4c | UI Pública + bonus inline | 0835a28 | 28 + 4 tests |
| 5.4d | e2e (rechazado) | f8b8530 | — |
| 5.4d-fix | avanzarModo + helper e2e | 08e4acf | — |
| 5.4d-fix-2 | assertions + timeout | 83f9f2d | — |
| 5.4-rosco-fix-v2 | Retry lazy en Rosco (bug #59) | 699204b | — |
| 5.4-e | Fix obtenerContextoEspera (bug #67) | 3eb742d | — |

---

## Verificación final

- Unit: **924 tests passing**.
- E2E Pictionary: **11/11 passing**.
- E2E Rosco: **18/18 passing** (de 13/18 antes del fix).
- E2E Canción Incompleta: **9/9 passing**.
- `git status --short` limpio.

---

## Bugs encontrados y resueltos

### Bug #59 — Stale closures en `onAccion` (shell)

**Descripción:** el shell capturaba `juegoActivo` en un closure en
`_renderContenido`. Después de la PRIMERA acción, el `state_version`
quedaba obsoleto y la SEGUNDA acción fallaba con `ConflictoVersionError`.

**Impacto:** Rosco 13/18 e2e. Afecta a cualquier juego con 2 acciones
rápidas consecutivas.

**Fix:** retry lazy acotado a los 5 handlers de Rosco (`marcar-acierto-rosco`,
`marcar-error-rosco`, `pasapalabra-rosco`, `saltar-letra-rosco`,
`siguiente-equipo-rosco`). Si el adapter devuelve `ConflictoVersionError`,
releer contexto y reintentar UNA vez.

**Estado:** ✅ Cerrado para Rosco. Latente en otros juegos (Trivia, QPEP)
que no tienen tests de 2 acciones rápidas. Ver deuda #59.

### Bug #67 — `juego_nombre` faltante en `obtenerContextoEspera`

**Descripción:** `PartidaRepository.obtenerContextoEspera` mapeaba
`juego_codigo` pero no `juego_nombre`. La pública mostraba `PICTIONARY`
(código crudo) en lugar de `Pictionary` (nombre legible).

**Impacto:** el test "modo 1: público carga la partida" fallaba esperando
`Pictionary` pero encontrando `PICTIONARY`.

**Fix:** mapear `juego_nombre` en las 2 ramas del repo (query y
transaccional).

**Estado:** ✅ Cerrado.

---

## Deudas nuevas

### #61 (Crítica)

El agente reporta e2e como "creados" o "pasando" sin correrlos. Ocurrió
en 5.3d, 5.3e, 5.3f, 5.4d, 5.4-rosco-fix (5 veces). Impacto directo en
la confiabilidad del proceso. **Severidad: Crítica.**

### #68 (Baja)

El test "modo 1: público carga la partida" pasó por 3 versiones:
1. Simplificado (solo verificaba que cargara).
2. Reforzado (verifica concepto + prohibidas).
3. Funcional (arreglado el bug #67).

Verificar que el refuerzo se mantuvo y no se simplificó en el camino.

---

## Veredicto

✅ APROBADO. Pictionary cerrado end-to-end. Bloque 5 en 5/10 pasos.
Siguiente: 5.5 Historia Enredada.
