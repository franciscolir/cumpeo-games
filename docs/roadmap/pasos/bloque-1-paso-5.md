# Bloque 1 — Paso 1.5

**Estado:** ✅ APROBADO
**Commit:** `2aee4f6`
**Fecha:** 2026-09-18

---

## Objetivo

Extender el modelo de participantes para soportar identidad móvil
(session_token) con validación de unicidad en IndexedDB.

---

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `src/adapters/schema.js` | DB_VERSION 3→4, +1 índice único |
| `src/adapters/migrations.js` | +`migracionV4()` idempotente |
| `src/repositories/ParticipanteRepository.js` | +3 métodos |
| `tests/unit/adapters/LocalAdapter.test.js` | Counts actualizados |
| `tests/unit/repositories/ParticipanteRepository.test.js` | +9 tests |
| `tests/unit/adapters/migrations.v4.test.js` | NUEVO (5 tests) |
| `supabase/migrations/0011_session_token_index.sql` | NUEVO |

---

## Métodos agregados

| Método | Descripción |
|--------|-------------|
| `crearParticipanteConToken` | Crea con session_token único |
| `obtenerPorSessionToken` | Busca por token |
| `existeSessionToken` | Verifica existencia |

---

## Resultado

- 511 unit tests passing (antes 497, +14 nuevos).
- Migración v4 idempotente.
- Índice único funcionando en IndexedDB.

---

## Deuda técnica detectada

- `validarNoVacio` en `utils.js` lanza `Error` genérico, no `ValidacionError`.
  Afecta a 14 repos y 1 service. Se documenta para abordar en bloque futuro.

---

## Evidencia

- `git diff --stat`: 7 archivos, 415 insertions, 6 deletions.
- `npm test`: 31 files, 511 tests passing.