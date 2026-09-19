# Bloque 2 — Paso 2.4c

**Estado:** ✅ APROBADO
**Commit:** `92f54b6`
**Fecha:** 2026-09-19

---

## Objetivo

Agregar card "Próximo desafío" y marquee footer al shell público.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/ui/publica/shell-publica.js` | +103 líneas (próximo desafío + marquee) |
| `src/styles/comic.css` | +21 líneas (animación marquee) |
| `tests/e2e/shell-publica.spec.js` | +2 tests |

---

## Componentes

### Card "Próximo desafío"

- `_derivarProximoDesafio(juegos)` cubre 4 casos:
  1. Sin juego activo ni pendientes → "ESPERANDO INICIO DE JUEGO".
  2. Juego activo + siguiente en cola → "JUEGO N+1 / M".
  3. Último juego activo → "ÚLTIMO DESAFÍO".
  4. Solo pendientes → "JUEGO N / M".
- Ubicado en columna derecha, entre marcador y QR.

### Marquee footer

- 4 mensajes rotativos con scroll infinito.
- Animación CSS 30s linear infinite.
- Mensajes duplicados para loop continuo.
- Respeta `prefers-reduced-motion` (flex-wrap fallback).

---

## Resultado

- 540 unit tests passing.
- 9/9 e2e tests del shell público passing.
- `node --check` OK.

---

## Evidencia

- `git diff --stat`: 3 archivos, 151 insertions.
- `npm test`: 33 files, 540 tests passing.
- `npx playwright test shell-publica.spec.js`: 9/9 passing.