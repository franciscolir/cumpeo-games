# Bloque 1 — Paso 1.6

**Estado:** ✅ APROBADO
**Commit:** `7c3288f`
**Fecha:** 2026-09-18

---

## Objetivo

Implementar `SupabaseStorageAdapter` y ajustar la factory para elegir
entre Local y Supabase según el adapter principal (Opción B).

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `src/adapters/storage/SupabaseStorageAdapter.js` | NUEVO |
| `src/adapters/storage/index.js` | MOD — factory Opción B |
| `tests/unit/adapters/storage/SupabaseStorageAdapter.test.js` | NUEVO (6 tests) |
| `tests/integration/adapters/storage/SupabaseStorageAdapter.integration.test.js` | NUEVO (6 tests) |

---

## Contrato implementado

| Método | Implementación |
|--------|----------------|
| `subirArchivo` | `.upload(path, blob, { contentType })` → devuelve `path` |
| `obtenerArchivo` | `.download(storageRef)` → Blob o null si 404 |
| `eliminarArchivo` | `.remove([storageRef])` → idempotente |
| `obtenerUrlPublica` | `.createSignedUrl(storageRef, 3600)` → URL firmada o null |

---

## Decisiones

- **Signed URLs con expiración de 1 hora (3600s).** Suficiente para visualización, evita URLs expuestas permanentemente.
- **Bucket `cumpeo-publico`** es privado, requiere autenticación.
- **`crearStorageAdapter(adapter)`** usa Opción B (lee `adapter.modo`).
- **Detección de "not found"** con `error.message?.includes('not found') || error.status === 404`.
- **`eliminarArchivo` idempotente:** Supabase no falla si el archivo no existe.

---

## Resultado

- 517 unit tests passing (antes 511, +6 nuevos).
- 105 integration tests passing (antes 99, +6 nuevos).
- Bucket verificado en Supabase Cloud.

---

## Deuda técnica detectada

- `crearStorageAdapter` no se invoca en bootstrap ni en repos.
  El StorageAdapter no está conectado a la aplicación todavía.
  **Prioridad alta** — bloquea el Bloque 3 (móvil).

---

## Evidencia

- `git diff --stat`: 4 archivos, 250 insertions.
- `npm test`: 32 files, 517 tests passing.
- `npm run test:integration`: 14 files, 105 tests passing.