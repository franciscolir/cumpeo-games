# Bloque 2 — Paso 2.3b

**Estado:** ✅ APROBADO
**Commit:** `927ceac`
**Fecha:** 2026-09-18

---

## Objetivo

Extender `PartidaRepository.obtenerContextoEspera` para enriquecer cada
`juego_ejecutado` con `juego_codigo` (ej. 'TRIVIA'), cruzando con la tabla
`juegos`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/repositories/PartidaRepository.js` | Ambos modos enriquecen con `juego_codigo` |
| `tests/unit/repositories/PartidaRepository.test.js` | +2 tests, helper actualizado |

---

## Cambio

En ambos modos (Supabase e IndexedDB):

1. Obtener todos los juegos del catálogo.
2. Crear Map `juegoId → codigo`.
3. Enriquece cada `juego_ejecutado` con `juego_codigo`.

Si el juego no existe en el catálogo, `juego_codigo = null`.

---

## Resultado

- 536 unit tests passing (antes 534, +2 nuevos).
- El shell del conductor puede resolver el `GameUI` por `codigo`.
- `node --check` OK.

---

## Evidencia

- `git diff --stat`: 2 archivos, 104 insertions, 6 deletions.
- `npm test`: 33 files, 536 tests passing.