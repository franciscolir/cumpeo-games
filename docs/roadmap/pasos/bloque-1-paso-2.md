# Bloque 1 — Paso 1.2

**Estado:** ✅ APROBADO
**Commit:** `70034a1`
**Fecha:** 2026-09-18

---

## Objetivo

Definir el contrato de Storage y su implementación Local (dev).

- Contrato `StorageAdapter` con 4 métodos.
- `LocalStorageAdapter` que usa el store `archivos_publicos`.
- Factory `crearStorageAdapter`.
- Sin Supabase (eso es paso 1.6).

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `src/adapters/storage/StorageAdapter.js` | Contrato abstracto (4 métodos con NotImplementedError) |
| `src/adapters/storage/LocalStorageAdapter.js` | Implementación con IndexedDB |
| `src/adapters/storage/index.js` | Exports + factory |
| `tests/unit/adapters/storage/LocalStorageAdapter.test.js` | 11 tests |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/adapters/errors.js` | Agregado `NotImplementedError extends DataError` |

---

## Contrato

```js
subirArchivo(path, blob, mimeType) -> Promise<string>
obtenerArchivo(storageRef)         -> Promise<Blob|null>
eliminarArchivo(storageRef)        -> Promise<void>
obtenerUrlPublica(storageRef)      -> Promise<string|null>
Resultado
450 unit tests passing (antes 439, +11 nuevos).

4 métodos implementados.

Factory funcional.

node --check OK en 3 archivos.

Decisiones
obtenerUrlPublica devuelve Promise<string|null> (más honesto que string).

Se agregó NotImplementedError a errors.js (el agente lo detectó como faltante).

path se guarda como metadata (en Supabase será el path real del bucket).

Evidencia
git diff --stat: 5 archivos, 313 insertions.

npm test: 28 files, 450 tests passing.

node --check: 3/3 sin errores.

Test run aislado del adapter: 11/11 passing.

text

---

### Comando 2: Agregar registro a `docs/AUDITORIA.md`

```bash
cat >> docs/AUDITORIA.md <<'EOF'

| 2026-09-18 | 1 | 1.2 | ✅ APROBADO | StorageAdapter + LocalStorageAdapter. Agregado NotImplementedError. 450 tests. | 70034a1 |
EOF