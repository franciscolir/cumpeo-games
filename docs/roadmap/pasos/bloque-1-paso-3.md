# Bloque 1 — Paso 1.3

**Estado:** ✅ APROBADO
**Commit:** `4b6d350`
**Fecha:** 2026-09-18

---

## Objetivo

Implementar `MensajePublicoRepository` (INV-161 a INV-165).

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/repositories/MensajePublicoRepository.js` | 8 métodos |
| `tests/unit/repositories/MensajePublicoRepository.test.js` | 19 tests |

---

## Métodos

| Método | Descripción |
|--------|-------------|
| `crearMensaje` | Crea en PENDIENTE, valida texto no vacío |
| `obtenerMensaje` | Por id |
| `listarMensajesDePartida` | Todos, ordenados por created_at asc |
| `listarPendientesDePartida` | Solo PENDIENTES |
| `listarAprobadosDePartida` | Solo APROBADOS |
| `aprobarMensaje` | PENDIENTE → APROBADO, idempotente |
| `rechazarMensaje` | PENDIENTE → RECHAZADO, idempotente |
| `eliminarMensaje` | Solo si RECHAZADO |

---

## Decisiones

- Moderación idempotente: aprobar/rechazar sobre el mismo estado devuelve la entidad sin cambio.
- Transiciones inválidas (RECHAZADO→APROBADO, APROBADO→RECHAZADO) lanzan `OperacionInvalidaError`.
- `eliminarMensaje` solo permite RECHAZADOS.
- `texto` se guarda con `trim()` aplicado.

---

## Resultado

- 469 unit tests passing (antes 450, +19 nuevos).
- `node --check` OK en 2 archivos.

---

## Evidencia

- `git diff --stat`: 2 archivos, 454 insertions.
- `npm test`: 29 files, 469 tests passing.