# Bloque 5 — Cierre del juego Canción Incompleta (pasos 5.3a–f)

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commits:**
- 5.3a: `1934d99` — GameDefinition + reducers + registro
- 5.3b: `ee9a42c` — UI conductor + acciones en shell
- 5.3c: `8323849` — UI pública
- 5.3d: `496cc5a` — e2e (rechazado por auditor)
- fix: `dfb4359` — UI test sin DOM
- 5.3e: `8f608ee` — FIN_DE_RONDA + timer toggle (parcial)
- 5.3f: `a9d76d5` — fix e2e helper + timer público + tests

---

## Objetivo

Implementar Canción Incompleta end-to-end: GameDefinition, UI conductor, UI pública y tests e2e.

---

## Mecánica cerrada (resumen)

- No existe set de canciones. El conductor elige con reproductor externo.
- Pausa: el conductor pausa la canción en el reproductor externo.
- Timer toggle: el conductor presiona "Iniciar tiempo" cuando pausa la canción; "Detener tiempo" al terminar.
- Time up: si el timer llega a 0 → error automático con penalización configurable.
- Turno termina solo por: Correcto, Incorrecto, o time up.
- 2 canciones por ronda (1 por equipo). N rondas configurables.
- Fases: INICIO_RONDA, TURNO_ACTIVO, ESPERA_VALIDACION, FIN_DE_RONDA, FIN_DE_JUEGO.

---

## Pasos ejecutados

| Paso | Alcance | Commit | Evidencia |
|---|---|---|---|
| 5.3a | GameDefinition + validación + reducers | 1934d99 | 13 tests unitarios |
| 5.3b | UI conductor + acciones shell | ee9a42c | 6 tests unitarios |
| 5.3c | UI pública | 8323849 | 1 test |
| 5.3d | e2e (❌ rechazado: no eran e2e reales) | 496cc5a | — |
| 5.3e | FIN_DE_RONDA + timer toggle | 8f608ee | ❌ parcial (timer público faltante, 6 tests UI) |
| 5.3f | Fix e2e helper + timer público + 23 tests UI | a9d76d5 | ✅ 9 e2e pasando |

---

## Verificación final

- Unit Canción Incompleta: 21 + 23 + 1 = 45 tests.
- E2E Canción Incompleta: 9 tests (4 specs).
- Suite completa: **783 unit + 9 e2e (CI) + 18 e2e (Rosco)**. Todos pasan.
- `git status --short` limpio.

---

## Integración end-to-end

- `src/games/registro.js` registra `CancionIncompletaGameDefinition`.
- `src/ui/games/registro.js` registra `CancionIncompletaGameUI`.
- `src/ui/partidas/shell-partida.js` maneja 7 acciones.
- `src/ui/publica/shell-publica.js` renderiza el escenario y el timer público.

---

## Decisiones de diseño

- Timer toggle (iniciar/detener), sin pausa/reanudación intermedia.
- Time up = error automático con penalización configurable.
- Conductor no ve letra ni respuesta; solo controla el reproductor externo.
- FIN_DE_RONDA entre rondas con botón "Siguiente ronda".

---

## Correcciones de proceso

- **5.3d** entregó `cancion-incompleta.e2e.test.js` con Vitest + `fake-indexeddb` (no era e2e). Rechazado.
- **5.3e** dejó el timer público como código muerto y solo 6 tests UI. Rechazado parcialmente.
- **5.3f** corrigió: helper e2e con patrón Playwright, timer público implementado, 23 tests UI, 9 e2e reales.
- Deuda #61: el agente reporta e2e como "creados" sin ejecutarlos. Los prompts de e2e deben exigir output completo de Playwright.

---

## Deudas registradas

- #61: agente reporta e2e sin ejecutarlos (5.3d, 5.3e).
- #62: cada juego nuevo tiende a reinventar el helper de e2e. Extraer helper común.

---

## Veredicto

✅ APROBADO. Canción Incompleta cerrada (5.3a–f). Siguiente: 5.4 Pictionary.
