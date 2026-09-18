# Bloque 1 — Paso 1.1

**Estado:** ✅ APROBADO
**Commit:** `7726c29`
**Fecha:** 2026-09-18

---

## Objetivo

Extender el modelo de datos de CUMPEO para soportar:
1. Mensajes públicos enviados por el móvil (con moderación).
2. Fotos públicas enviadas por el móvil (con moderación, binario fuera de la DB).
3. Identidad técnica de participación móvil (session_token en participante_partidas).
4. Store local para archivos binarios en dev (archivos_publicos).

---

## Archivos tocados

| Archivo | Acción |
|---------|--------|
| `src/adapters/schema.js` | Modificado — DB_VERSION=3, 3 stores nuevos |
| `src/adapters/migrations.js` | Modificado — migracionV3 + upgradeTx param |
| `src/adapters/LocalAdapter.js` | Modificado — pasa upgradeTx a aplicarMigraciones |
| `tests/unit/adapters/LocalAdapter.test.js` | Modificado — counts: 20 stores, 56 indexes |
| `supabase/migrations/0010_mensajes_fotos_session_token.sql` | Creado |
| `tests/unit/adapters/migrations.v3.test.js` | Creado (6 tests) |

---

## Resultado

- 439 unit tests passing (antes 433, +6 nuevos).
- SQL sintácticamente válido.
- Migración idempotente.
- session_token asignado a participantes existentes.
- `node --check` OK en 4 archivos.

---

## Corrección aplicada

**Problema detectado:** `migracionV3` usaba `getAll()` + `onsuccess` para asignar session_token, lo cual es frágil durante `onupgradeneeded` porque la transacción puede cerrarse antes de que los `put` se ejecuten.

**Solución:** `openCursor()` + `cursor.continue()` mantiene la transacción activa durante el recorrido.

**Verificación:** aplicado y tests siguen pasando.

---

## Evidencia

- `git diff --stat`: 6 archivos, 342 insertions, 8 deletions.
- `npm test`: 27 files, 439 tests passing.
- `node --check`: 4/4 sin errores.
- SQL: revisado, CHECKs y FKs correctos.
