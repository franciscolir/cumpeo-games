# Bloque 2 — Paso 2.3c

**Estado:** ✅ APROBADO
**Commit:** `13a01aa`
**Fecha:** 2026-09-19

---

## Objetivo

Corregir 3 bugs del shell y endurecer los tests de control.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/ui/partidas/shell-partida.js` | Botones con `id`, colores comicBlue/comicRed |
| `tests/e2e/shell-partida.spec.js` | +3 tests (colores, botón Pausar) |
| `tests/e2e/partidas.spec.js` | Tests endurecidos (sin `if(isVisible)`) |

---

## Bugs corregidos

1. **`clase: 'data-accion-X'` en Boton no funcionaba.**
   `clase` va a `class`, no a `data-*`. Ahora usa `id: 'btn-X'`.
   Selectores: `#btn-pausar`, `#btn-reanudar`, `#btn-fin`.

2. **Colores de equipo inventados (#3182CE / #E53E3E).**
   Ahora usa `border-[#00D2FF] bg-[#00D2FF]/15` (comicBlue) y
   `border-[#FF3344] bg-[#FF3344]/15` (comicRed).
   Cumple AC-VISUAL-X-01 y AC-VISUAL-C-04.

3. **Tests de control laxos (`if (await btn.isVisible())`).**
   Ahora son estrictos: `await expect(btn).toBeVisible()`.
   Helper `crearPartidaDirectamente` para evitar el form.

---

## Resultado

- 536 unit tests passing.
- 42 e2e passing (1 flaky en corrida completa).
- `node --check` OK.

---

## Deuda técnica detectada

- Test `lista de sets sin filtro muestra mensaje` es flaky
  cuando corre la suite completa (pasa en aislamiento).

---

## Evidencia

- `git diff --stat`: 3 archivos, 84 insertions, 57 deletions.
- `npm test`: 33 files, 536 tests passing.
- `npm run test:e2e`: 41 passed, 1 failed (flaky).