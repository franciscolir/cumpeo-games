# Bloque 2 — Paso 2.5

**Estado:** ✅ APROBADO
**Commit:** `772316f`
**Fecha:** 2026-09-19

---

## Objetivo

Crear el primer GameUI concreto (TriviaGameUI) y registrarlo en el GameUIRegistry.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/ui/games/trivia/TriviaGameUI.js` | NUEVO — 136 líneas |
| `src/ui/games/registro.js` | +import +registro |
| `tests/e2e/shell-partida.spec.js` | +1 test |

---

## TriviaGameUI

Objeto plano con contrato GameUI:

- `codigo: 'TRIVIA'`
- `renderizarAreaJuego(estadoJuego, container, contexto)`:
  * Placeholder si no hay estado o snapshot.
  * Pregunta + opciones con letras (A, B, C, D).
  * Resalta la correcta si `fase === 'MOSTRANDO_RESULTADO'` y `acVisible`.
  * Puntajes de ambos equipos.
- `renderizarPanelConductor(estadoJuego, container, contexto, callbacks)`:
  * 6 botones: correcto/incorrecto × 2 equipos + siguiente + saltar.
  * Cada botón llama a `callbacks.onAccion(tipo, payload)`.

---

## Resultado

- 540 unit tests passing.
- 8 e2e tests del shell conductor passing.
- El shell del conductor puede obtener TriviaGameUI via `uiRegistry.obtener('TRIVIA')`.

---

## Deuda técnica

- El test e2e solo verifica el registro, no la renderización completa.
  La integración completa (iniciar juego + ver pregunta) se hará en paso posterior.
- Condición del `if` en `renderizarAreaJuego` es difícil de leer (precedencia de &&/||).
- `Boton` recibe `clase` y `id` redundantes.

---

## Evidencia

- `git diff --stat`: 3 archivos, 156 insertions, 1 deletion.
- `npm test`: 33 files, 540 tests passing.
- `npx playwright test shell-partida.spec.js`: 8/8 passing.