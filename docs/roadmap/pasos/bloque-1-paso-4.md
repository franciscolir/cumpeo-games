# Bloque 1 — Paso 1.4

**Estado:** ✅ APROBADO
**Commit:** `801bf0a`
**Fecha:** 2026-09-18

---

## Objetivo

Implementar `FotoPublicaRepository` (INV-166 a INV-170), con integración al `StorageAdapter`.

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/repositories/FotoPublicaRepository.js` | 9 métodos |
| `tests/unit/repositories/FotoPublicaRepository.test.js` | 28 tests |

---

## Métodos

| Método | Descripción |
|--------|-------------|
| `crearFoto` | Sube blob a Storage + crea registro PENDIENTE |
| `obtenerFoto` | Por id |
| `listarFotosDePartida` | Todas, ordenadas por created_at asc |
| `listarPendientesDePartida` | Solo PENDIENTES |
| `listarAprobadasDePartida` | Solo APROBADAS |
| `aprobarFoto` | PENDIENTE → APROBADO, idempotente |
| `rechazarFoto` | PENDIENTE → RECHAZADO, idempotente |
| `eliminarFoto` | Solo si RECHAZADA + elimina de Storage |
| `obtenerUrlPublica` | Solo si APROBADA; delega al Storage |

---

## Decisiones

- **Storage-first en eliminación:** se elimina el archivo antes que el registro. Si Storage falla, el registro queda intacto y el conductor puede reintentar.
- **`obtenerUrlPublica` devuelve null si no está APROBADA y NO llama al Storage.** Evita leak de URLs para fotos pendientes o rechazadas.
- **`MIME_TO_EXT`:** 5 tipos MIME soportados + fallback `'bin'`.
- **`path` en Storage:** `${partidaId}/fotos/${nuevoId()}.${ext}`.
- **Consistencia transaccional imperfecta:** si el registro falla tras eliminar el archivo, queda un huérfano en Storage. Se acepta como deuda técnica menor (recuperable con job de limpieza).

---

## Resultado

- 497 unit tests passing (antes 469, +28 nuevos).
- `node --check` OK en 2 archivos.

---

## Evidencia

- `git diff --stat`: 2 archivos, 606 insertions.
- `npm test`: 30 files, 497 tests passing.