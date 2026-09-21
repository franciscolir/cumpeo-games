# Bloque 5 — Paso 5.1b: Editor de items de Trivia

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commit de código:** a2cafb5

---

## Objetivo

Extender el formulario de sets para soportar el editor de items de Trivia,
análogo al editor de QPEP. Incluye:

1. Rename de funciones QPEP con sufijo `QPEP` para desambiguar.
2. Funciones nuevas de Trivia: render, carga, bind, agregar/eliminar opciones,
   validación, carga en form, limpieza, actualización de botones.
3. Detección `esTrivia` y renderizado condicional.
4. Tests e2e: 5 nuevos + 1 existente actualizado.

---

## Archivos modificados

- `src/ui/sets/formulario.js` (+410 / -26)
- `tests/e2e/sets.spec.js` (+152 / -?)

---

## Evidencia

- `node --check` OK en ambos archivos.
- `npm test`: 38 files / 609 tests passed.
- `git status --short`: solo los 2 archivos esperados.
- Commit: `a2cafb5 feat(ui): add Trivia item editor in set form (block 5.1b)`

---

## Funciones renombradas (QPEP)

| Antes | Después |
|---|---|
| `_renderEditorItems` | `_renderEditorItemsQPEP` |
| `_cargarItems` | `_cargarItemsQPEP` |
| `_bindEditorItems` | `_bindEditorItemsQPEP` |
| `_limpiarFormItem` | `_limpiarFormItemQPEP` |
| `_cargarItemEnForm` | `_cargarItemEnFormQPEP` |
| `_validar` | `_validarQPEP` |

## Funciones nuevas (Trivia)

- `_renderEditorItemsTrivia`
- `_agregarOpcionTrivia`
- `_eliminarOpcionTrivia` (con re-indexado)
- `_actualizarBotonesOpcionTrivia`
- `_cargarItemsTrivia`
- `_limpiarFormItemTrivia`
- `_cargarItemEnFormTrivia`
- `_validarItemTrivia`
- `_bindEditorItemsTrivia`

## Tests e2e

1. `editor de items no aparece si el set no es de ¿Qué piensa el público? ni de Trivia` (actualizado)
2. `editor de Trivia aparece en set de Trivia` (nuevo)
3. `agregar pregunta de Trivia con 2 opciones` (nuevo)
4. `agregar opción adicional a pregunta de Trivia` (nuevo)
5. `eliminar opción de pregunta de Trivia` (nuevo)
6. `editar pregunta de Trivia` (nuevo)

---

## Notas no bloqueantes

1. Las 2 opciones iniciales se agregan en `_bindEditorItemsTrivia` (init),
   no en el render HTML. Funcionalmente equivalente.
2. `_agregarOpcionTrivia` no fuerza re-selección del radio tras eliminar la
   opción marcada. La validación lo cubre al guardar.
3. El reordenar de Trivia replica el patrón de QPEP (swap en memoria +
   `reordenarItems`). Consistente.

---

## Veredicto

✅ **APROBADO.** Contrato cumplido. Invariantes respetadas. Tests verdes.
Sin scope creep. Evidencia real.
