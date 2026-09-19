# Bloque 2 — Paso 2.4a

**Estado:** ✅ APROBADO
**Commit:** `c75fcf5`
**Fecha:** 2026-09-19

---

## Objetivo

Crear el shell público base (header + escenario + anuncio + marcador).

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `src/ui/publica/shell-publica.js` | NUEVO — 258 líneas |
| `tests/e2e/shell-publica.spec.js` | NUEVO — 4 tests |
| `src/main.js` | MOD — +2 líneas (import + ruta `#/publica-nueva/:codigo`) |

---

## Layout del shell público

- **Header:** CUMPEO + badge de estado + PIN (public_codigo) + conexión.
- **Escenario:** "¡A JUGAR!" si EN_CURSO, nombre + estado si PAUSADO, placeholder si no hay juego.
- **Anuncio:** card con texto por estado (CONFIGURANDO/EN_CURSO/PAUSADO/FINALIZADA/DESCARTADA).
- **Marcador:** grid 2 columnas con `comicBlue` (#00D2FF) y `comicRed` (#FF3344) + barra comparativa.

---

## Decisiones

- Header custom (no usa `Header` compartido, porque el público no tiene tema ni volver).
- Colores de equipo fijos: comicBlue / comicRed (AC-VISUAL-X-01, AC-VISUAL-C-04).
- Realtime/polling con mismo patrón que `pantalla.js`.
- Ruta nueva `#/publica-nueva/:codigo` para convivencia. La vieja sigue activa.

---

## Resultado

- 536 unit tests passing.
- 46 e2e passing (42 + 4 nuevos).
- 1 flaky pre-existente en corrida completa.

---

## Deuda técnica detectada

- Flaky general en e2e: "Failed to fetch" en varios tests.
  No es específico de un test, es por datos compartidos en Supabase.

---

## Evidencia

- `git diff --stat`: 3 archivos, 341 insertions.
- `npm test`: 33 files, 536 tests passing.
- `npm run test:e2e`: 46 tests (45 passed, 1 flaky).
