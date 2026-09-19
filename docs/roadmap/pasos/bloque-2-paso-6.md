# Bloque 2 — Paso 2.6 (a + b + c)

**Estado:** ✅ APROBADO
**Commits:** `ac3cff8`, `5cad6c0`, `5e32d5b`
**Fecha:** 2026-09-19

---

## Objetivo

Cerrar el Bloque 2 eliminando el código legacy de la consola vieja,
migrando los tests al shell nuevo, y agregando los botones faltantes.

---

## Sub-pasos

### 2.6a — Botones del shell conductor

**Commit:** `ac3cff8`

- `#btn-tomar-control` (visible si NO tengo control y CONFIGURANDO).
- `#btn-comenzar` (visible si tengo control y CONFIGURANDO).
- `#btn-descartar` (visible si tengo control y EN_CURSO).
- 3 tests e2e nuevos.

### 2.6b — Migrar tests

**Commit:** `5cad6c0`

- 3 tests en `partidas.spec.js` migrados de `#/partidas-viejo/` a `#/partidas/`.
- 1 test en `publica.spec.js` migrado.
- Selectores `button[data-accion="X"]` → `#btn-*`.

### 2.6c — Eliminar consola.js

**Commit:** `5e32d5b`

- `consola.js` eliminado (358 líneas).
- Import y ruta `#/partidas-viejo/:id` eliminados de `main.js`.
- 0 referencias restantes.

---

## Resultado

- 540 unit tests passing.
- 53 e2e passing (2 flaky en circuitos).
- Bloque 2 cerrado (13/13 pasos).

---

## Deuda técnica registrada

- Tests de circuitos fallan intermitentemente por timeout en `#form-circuito`.
- Flaky general en e2e.

---

## Evidencia

- `git diff --stat`: 3 commits, 82 + 28 + 360 cambios.
- `npm test`: 33 files, 540 tests passing.
- `npx playwright test`: 53 passing, 2 flaky.