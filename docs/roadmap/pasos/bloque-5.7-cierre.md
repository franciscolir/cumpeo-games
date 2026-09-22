# Bloque 5 — Cierre del juego Memoricé (pasos 5.7-pre a 5.7d)

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:**
- 5.7-pre: `cc06fee` — Cierre documental de mecánica
- 5.7a: `f158afb` — GameDefinition + reducers
- 5.7a-fix: `62617c0` — Evaluación automática + CAMBIO_TURNO
- 5.7b: `a00b8d1` — UI Conductor + shell
- 5.7b-fix: `34a27fe` — PREPARANDO_GRILLA como fase real
- 5.7c: `79cc2b7` — UI Pública
- 5.7d: `d1ff93d` — E2E

---

## Objetivo

Implementar Memoricé end-to-end: juego de memoria con parejas,
grilla NxM, turnos alternados con evaluación automática.

---

## Mecánica cerrada (resumen)

- Juego de memoria con parejas.
- 2 equipos, 1 set = 1 ronda (N rondas configurables).
- Ambos equipos juegan el MISMO set.
- Grilla NxM boca abajo con números.
- El conductor voltea 2 elementos.
- Sistema evalúa AUTOMÁTICAMENTE:
  - Pareja → suma puntos, sigue el mismo equipo.
  - No pareja → CAMBIO_TURNO (modal 2s).
- Timer por turno (20s configurable).
- Selector manual de equipo disponible.
- Puntos por pareja configurables.

Fases: INICIO_RONDA, SELECCIONANDO_SET, PREPARANDO_GRILLA, JUGANDO,
CAMBIO_TURNO, FIN_DE_RONDA, FIN_DE_JUEGO.

---

## Pasos ejecutados

| Paso | Alcance | Commit | Evidencia |
|---|---|---|---|
| 5.7-pre | Cierre de mecánica | cc06fee | GAMES.md §6 |
| 5.7a | GameDefinition + 77 tests | f158afb | 8 fases (después 7) |
| 5.7a-fix | Auto-evaluación + CAMBIO_TURNO | 62617c0 | 92 tests |
| 5.7b | UI Conductor + shell | a00b8d1 | 32 tests UI |
| 5.7b-fix | PREPARANDO_GRILLA real | 34a27fe | 97 + 32 tests |
| 5.7c | UI Pública | 79cc2b7 | 24 tests |
| 5.7d | E2E | d1ff93d | 10 e2e |

---

## Verificación final

- Unit: **1263 tests passing** (55 files).
- E2E Memoria: **10/10 passing**.
- E2E Trivia: 10/10 (regresión OK).
- E2E Rosco: 18/18.
- E2E Pictionary: 11/11.
- E2E Canción Incompleta: 9/9.
- E2E Historia Enredada: 9/10 (1 skipped).
- `git status --short` limpio.

---

## Correcciones aplicadas durante el paso

### 5.7a-fix — Evaluación automática

**Antes:** `voltearElemento` cambiaba a `ESPERA_CONFIRMACION` cuando había 2 elementos.
**Ahora:** evalúa automáticamente:
- Pareja → suma puntos + sigue `JUGANDO`.
- No pareja → `CAMBIO_TURNO`.

Se eliminó `confirmarPareja` y `ESPERA_CONFIRMACION`.

### 5.7b-fix — PREPARANDO_GRILLA como fase real

**Antes:** `seleccionarSet` saltaba directo a `JUGANDO`.
**Ahora:** va a `PREPARANDO_GRILLA`, y `confirmarGrilla` pasa a `JUGANDO`.

---

## Deudas registradas

### #77 (Baja)

El agente reporta el conteo del Bloque 5 como "10/10" antes de tiempo
(ocurrió en 5.7c y 5.7d). El conteo real es 7/10.

### #78 (Baja)

El helper e2e de Memoria no exporta `encontrarParejaEnEstado` ni
`encontrarNoParejaEnEstado` (están inline). El reporte del agente dijo
que estaban exportadas.

### #79 (Baja)

El test `flujo-completo.spec.js:13` tarda 10s (el más lento de la suite
e2e de Memoria).

### #80 (Media)

El ROADMAP acumuló deuda estructural:
- Conteos inconsistentes (`/10`, `/16`, `/20`, `/21`).
- Historial con numeración duplicada (`5.7` x2).
- Sección 2 con `5/10` cuando la tabla tenía 7/10.

**Corregido en 5.7-cierre.**

---

## Veredicto

✅ APROBADO. Memoricé cerrada end-to-end. Bloque 5 en 8/10 pasos.
Siguiente: 5.8 Anti-Trivia.
