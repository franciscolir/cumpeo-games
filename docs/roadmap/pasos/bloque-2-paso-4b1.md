# Bloque 2 — Paso 2.4b.1

**Estado:** ✅ APROBADO
**Commit:** `547f005`
**Fecha:** 2026-09-19

---

## Objetivo

Conectar StorageAdapter y los repositorios públicos (foto, mensaje) al bootstrap.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/adapters/storage/index.js` | FIX: bug de re-export en `crearStorageAdapter` |
| `src/app/bootstrap.js` | Instancia storage + foto + mensaje |
| `tests/unit/app/bootstrap.test.js` | +4 tests |

---

## Bug pre-existente corregido

**Problema:** `crearStorageAdapter` referenciaba `LocalStorageAdapter` y
`SupabaseStorageAdapter` sin que estuvieran en scope, porque el archivo usaba
`export { X } from './X.js'` (que re-exporta sin crear binding local).

**Consecuencia:** `ReferenceError` si se llamaba la función. Nunca se
detectó porque `crearStorageAdapter` no se invocaba en ningún lugar.

**Solución:** cambiar a `import` + `export { ... }` (crea bindings locales).

---

## Bootstrap ahora expone

- `app.storage` (StorageAdapter).
- `app.services.foto` (FotoPublicaRepository).
- `app.services.mensaje` (MensajePublicoRepository).

---

## Resultado

- 540 unit tests passing (antes 536, +4 nuevos).
- `node --check` OK.
- Deuda técnica #5 resuelta.

---

## Evidencia

- `git diff --stat`: 3 archivos, 43 insertions, 7 deletions.
- `npm test`: 33 files, 540 tests passing.