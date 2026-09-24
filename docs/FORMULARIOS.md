```markdown
# CUMPEO — Documento Maestro de Formularios

**Versión:** 1.0
**Estado:** Decisiones cerradas. Implementación en curso (Bloque 7).
**Última actualización:** 2026-09-24
**Propósito:** Especificación única de la administración de contenido (sets y
configuración) de todos los juegos. Es la fuente de verdad para los editores
del Bloque 7 y para la validación de sets.

---

## Índice

1. Propósito y alcance
2. Principios
3. Decisiones cerradas (D1–D7)
4. Matriz de formularios por juego
5. Contrato por juego
6. Componentes reutilizables
7. Contrato de validación
8. Contrato de persistencia
9. Migración
10. Estado de implementación por paso
11. Deudas técnicas (cerradas y nuevas)
12. Compatibilidad con la app existente

---

## 1. Propósito y alcance

Este documento define **cómo se administra el contenido** de cada juego en CUMPEO:
qué formularios existen, qué campos tienen, qué validaciones aplican, y dónde se
persisten los datos.

**Dentro del alcance:**

- Formularios de creación/edición de sets.
- Formularios de configuración de juego (bancos, colores).
- Validaciones de contenido.
- Persistencia.

**Fuera del alcance:**

- Mecánica de los juegos (→ `docs/GAMES.md`).
- Contrato de ejecución de partida (→ `docs/MASTER.md` §8.3.2).
- Criterios visuales (→ `docs/AC-VISUAL.md`).
- UI de ejecución (conductor, pública, móvil).

**Regla:** los formularios **no se mezclan** con la interfaz de ejecución.
La administración de contenido es una sección separada de la app.

---

## 2. Principios

1. **Reutilizar antes que crear.** Componentes comunes antes que duplicados.
2. **No forzar uniformidad.** Cada juego tiene sus campos y reglas. Se comparte
   comportamiento, no estructura.
3. **Validación doble.** En el formulario y en el dominio.
4. **Retrocompatibilidad.** Los sets existentes no se rompen.
5. **Persistencia clara.** Cada dato sabe a qué entidad pertenece.
6. **Separación contenido/ejecución.** Los sets se administran en `#/sets`.
   La configuración de juego en `#/juegos/:codigo/configuracion`.
7. **Un formulario por tipo de contenido.** No hay formularios genéricos que
   fuercen una estructura común.

---

## 3. Decisiones cerradas (D1–D7)

Cerradas el 2026-09-24 con el operador del proyecto.

### D1 — Enlaces: `pares_por_turno` configurable, máximo 10

- `pares_por_turno` sigue siendo configurable (default 8).
- El set debe tener **mínimo `pares_por_turno`** y **máximo 10 items**.
- Al iniciar la partida, el juego toma los primeros `pares_por_turno` del set.
- El editor valida el máximo 10.

**Justificación:** el máximo 10 evita sets demasiado largos que no aportan al
juego. El mínimo configurable da flexibilidad al conductor.

### D2 — Anti-Trivia: solo dificultad individual

- Se agrega `dificultad: 1|2|3` (opcional) al item del set.
- NO se agrega dificultad general del set.
- El editor Anti-Trivia (7.3) expone el campo.

**Justificación:** la dificultad general no aporta al juego (cada pregunta ya
tiene su propia dificultad). Decisión del operador.

### D3 — Trivia: checkbox visual, modelo intacto

- El editor muestra 4 checkboxes (uno por alternativa).
- El conductor marca exactamente uno.
- Al persistir, el editor traduce a `respuesta_correcta_index` (0-based).
- Al cargar, marca el checkbox del `respuesta_correcta_index`.
- **Cero cambios de dominio. Cero migración.**

**Justificación:** el modelo actual (`respuesta_correcta_index`) es correcto.
El checkbox es solo una representación más clara para el usuario.

### D4 — Pictionary: un juego, cuatro submodos (A1)

- Se mantiene **un solo juego** `PICTIONARY`.
- La entidad `Set` gana un campo **`submodo`** nullable:
  `'PALABRAS' | 'GESTOS' | 'PREGUNTAS' | 'DIBUJO'`.
- Cada set de Pictionary tiene un `submodo` fijo.
- El editor muestra 4 secciones (una por submodo), cada una con su propio set.
- El conductor elige un set por submodo al iniciar Pictionary.

**Justificación:** un solo `GameDefinition` sigue siendo válido. Menos filas en
`juegos`. El campo `submodo` es nullable y solo aplica a Pictionary.

### D5 — Pictionary: bancos de condiciones en `juego.configuracion`

- Se agrega **`configuracion JSONB`** a la entidad `Juego`.
- Los bancos de condiciones viven en `PICTIONARY.configuracion`:

```json
{
  "condiciones_gestos": ["Solo manos", "Solo cara", "Una mano", "De espalda"],
  "condiciones_dibujo": ["Ojos cerrados", "Mano contraria"]
}
```


- Editables desde `#/juegos/pictionary/configuracion`.
- Independientes entre sí (Gestos ≠ Dibujo).

**Justificación:** es configuración, no contenido. No requiere entidad nueva.
Migrable a entidad si crece.

### D6 — Historia Enredada: colores en `juego.configuracion`

- Los colores viven en `HISTORIA_ENREDADA.configuracion`:

```json
{
  "colores": [
    { "color": "AZUL", "pregunta": "Nombre de alguien presente" },
    { "color": "ROJO", "pregunta": "Algún sobrenombre que conozcas" }
  ]
}
```


- Editables desde `#/juegos/historia-enredada/configuracion`.
- Las historias (sets) no duplican las preguntas de colores.

**Justificación:** mismo razonamiento que D5.

### D7 — Migración

- **IndexedDB v6:** agregar `configuracion` a `juegos`, agregar `submodo` a `sets`.
- **Supabase:** `0010_juego_configuracion.sql`:
  - `ALTER TABLE juegos ADD COLUMN configuracion JSONB DEFAULT '{}'::jsonb;`
  - `ALTER TABLE sets ADD COLUMN submodo TEXT NULL;`
- **Retrocompatible:** juegos y sets existentes quedan con valores por defecto.

---

## 4. Matriz de formularios por juego

| Juego | Editor | Tipo | Ubicación | Estado |
|---|:---:|---|---|---|
| Rosco | ✅ | Set | `#/sets/:id` | ✅ 7.1d |
| Memoria | ✅ | Set + predeterminados | `#/sets/:id` | ✅ 7.2c/e |
| Canción Incompleta | ❌ | — | — | N/A |
| Pictionary — Palabras | 🔜 | Set con `submodo: PALABRAS` | `#/sets/:id` | 7.7 |
| Pictionary — Gestos | 🔜 | Set con `submodo: GESTOS` | `#/sets/:id` | 7.7 |
| Pictionary — Preguntas | 🔜 | Set con `submodo: PREGUNTAS` | `#/sets/:id` | 7.7 |
| Pictionary — Dibujo | 🔜 | Set con `submodo: DIBUJO` | `#/sets/:id` | 7.7 |
| Pictionary — Bancos | 🔜 | Config del juego | `#/juegos/pictionary/config` | 7.7 |
| Historia Enredada — Historias | 🔜 | Set | `#/sets/:id` | 7.8 |
| Historia Enredada — Colores | 🔜 | Config del juego | `#/juegos/historia-enredada/config` | 7.8 |
| Anti-Trivia | ✅ | Set | `#/sets/:id` | ✅ 7.3 + D2 en 7.3a |
| Enlaces | ✅ | Set | `#/sets/:id` | ✅ 7.4 + D1 (7.4a) |
| Trivia | ✅ | Set | `#/sets/:id` | ✅ 7.5 |
| ¿Qué Dice el Público? (QPEP) | ✅ | Set | `#/sets/:id` | ✅ 7.6 |

---

## 5. Contrato por juego

### 5.1 Rosco

**Estado:** ✅ Implementado (7.1d).

**Set:** 27 items (uno por letra A–Z + Ñ).

**Item:**

```json
{ "letra": "A", "definicion": "Fruta...", "respuesta": "Ananá" }
```


**Datos generales:** nombre, descripción, dificultad.

**Validación:**

- 27 items exactos.
- 1 item por letra.
- `definicion` y `respuesta` no vacíos.

**Persistencia:** `Set` + `ItemSet`, con `submodo = null`.

---

### 5.2 Memoria

**Estado:** ✅ Implementado (7.2c/e).

**Set:** entre 6 y 12 items, cantidad par.

**Item:**

```json
{ "contenido": "string", "imagen_url": "storageRef", "categoria": "string" }
```


**Validación:**

- `parejas_por_ronda ∈ {6, 8, 10, 12}`.
- `items.length === parejas_por_ronda`.
- Cada item tiene `imagen_url` resuelto a storageRef.

**Sets predeterminados:**

- `es_predeterminado = true`.
- No editables, no eliminables.
- Ejemplos: Emojis, Íconos simples.

**Persistencia:** `Set` + `ItemSet`, con `submodo = null`.

---

### 5.3 Canción Incompleta

**Estado:** Sin editor (correcto).

**No crear:**

- Sets.
- Formulario de canciones.
- Formulario de contenido.

El conductor elige la canción a discreción; el reproductor es externo.

---

### 5.4 Pictionary

**Estado:** 🔜 7.7d (4 editores + config de bancos). GameDefinition con
submodos en ✅ 7.7b. UI + shell con submodos en ✅ 7.7c.

**Estructura:** 4 sets (uno por submodo) + 1 configuración de bancos.

**Submodo:** `'PALABRAS' | 'GESTOS' | 'PREGUNTAS' | 'DIBUJO'` (en `Set.submodo`).

**4 editores** (uno por submodo) + **1 editor de bancos** (config del juego).

#### 5.4.1 Pictionary — Palabras

**Item:**

```json
{ "concepto": "PERRO", "prohibidas": ["mascota", "guau"], "dificultad": 1 }
```


**Validación:**

- `concepto` no vacío.
- `prohibidas` array no vacío.
- `dificultad ∈ {1, 2, 3}`.

**Set:** ilimitado.

#### 5.4.2 Pictionary — Gestos

**Item:**

```json
{ "concepto": "NADAR", "dificultad": 1 }
```


**Validación:**

- `concepto` no vacío.
- `dificultad ∈ {1, 2, 3}`.

**Banco de condiciones (config):**

- Lista editable.
- Ejemplos: "Solo manos", "Solo cara", "Una mano", "De espalda".
- Independiente del banco de Dibujo.

#### 5.4.3 Pictionary — Preguntas

**Item:**

```json
{ "concepto": "string", "dificultad": 1 }
```


**Validación:**

- `concepto` no vacío.
- `dificultad ∈ {1, 2, 3}`.

#### 5.4.4 Pictionary — Dibujo

**Item:**

```json
{ "concepto": "CASTILLO", "dificultad": 1 }
```


**Validación:**

- `concepto` no vacío.
- `dificultad ∈ {1, 2, 3}`.

**Banco de condiciones (config):**

- Lista editable.
- Ejemplos: "Ojos cerrados", "Mano contraria".
- Independiente del banco de Gestos.

#### 5.4.5 Configuración de bancos

**Ubicación:** `#/juegos/pictionary/config`.

**Estructura en `Juego.configuracion`:**

```json
{
  "condiciones_gestos": ["..."],
  "condiciones_dibujo": ["..."]
}
```


**UI:** dos listas editables (agregar, editar, eliminar). Validación: al menos
una condición por banco.

---

### 5.5 Historia Enredada

**Estado:** 🔜 7.8 (editor + config).

**Estructura:** 1 set (Historias) + 1 configuración (Colores).

#### 5.5.1 Historias

**Item:**

```json
{
  "titulo": "string",
  "descripcion": "string",
  "guion": "string",
  "ruidos": "string"
}
```


**Nota:** el documento original usa "Resumen" e "Historia". GAMES.md §10 usa
`descripcion` y `guion`. Se alinean los nombres a GAMES.md; en UI se muestran
como "Resumen" y "Historia".

**Validación:**

- `titulo` no vacío.
- `descripcion` no vacío (texto breve).
- `guion` no vacío (textarea).
- `ruidos` opcional.

**Set:** ilimitado.

#### 5.5.2 Colores

**Ubicación:** `#/juegos/historia-enredada/config`.

**Estructura en `Juego.configuracion`:**

```json
{ "colores": [{ "color": "AZUL", "pregunta": "Nombre de alguien presente" }] }
```


**UI:** lista editable de `{color, pregunta}`.

**Validación:** al menos 1 color. `color` y `pregunta` no vacíos.

---

### 5.6 Anti-Trivia

**Estado:** ✅ Implementado (7.3) + D2 (7.3a).

**Set:** lista ilimitada de preguntas.

**Item:**

```json
{
  "pregunta": "string",
  "respuestas_correctas": ["..."],
  "categoria": "string",
  "dificultad": 1
}
```


**Validación:**

- `pregunta` no vacía.
- `respuestas_correctas` array no vacío.
- `dificultad` opcional, `∈ {1, 2, 3}`. `null` se trata como ausente.

**D2 (implementado en 7.3a):** el editor expone un select de dificultad
individual (1 | 2 | 3 | vacío). NO existe dificultad general del set.
`AntiTriviaGameDefinition.validarContenidoSet` valida el campo si está presente.

---

### 5.7 Enlaces

**Estado:** ✅ Implementado (7.4) + D1 (7.4a).

**Set:** mínimo `pares_por_turno` (default 8), máximo 10.

**Item:**

```json
{
  "concepto_a": "string",
  "concepto_b": "string",
  "categoria": "string",
  "dificultad": 1
}
```


**Validación:**

- `items.length >= pares_por_turno` y `items.length <= 10`.
- `concepto_a` único.
- `concepto_b` único.
- `dificultad` opcional.

**D1 (implementado en 7.4a):** el editor bloquea agregar el 11º par
(`editandoId === null && items.length >= 10`); NO bloquea editar.
`EnlacesGameDefinition.validarContenidoSet` lanza
`items no puede tener más de 10 items (máximo 10)`.

---

### 5.8 Trivia

**Estado:** ✅ Implementado en 7.5 (rediseño + deuda #108).

**Set:** lista ilimitada.

**Item:**

```json
{
  "pregunta": "string",
  "opciones": ["A", "B", "C", "D"],
  "respuesta_correcta_index": 0,
  "dificultad": 1
}
```


**Validación:**

- `pregunta` no vacía.
- `opciones` array de 2 a 6 strings.
- `respuesta_correcta_index` entero en rango.
- `dificultad ∈ {1, 2, 3}` (opcional, ya existe desde 5.1b).

**UI del editor (D3):**

- 2 a 6 inputs de alternativa (dinámicos, con "+ Agregar opción").
- Radios (NO checkboxes) — uno por alternativa, `name="respuesta-correcta-trivia"`.
- Exactamente 1 marcado. Mensaje sin marcado: `Elegí la respuesta correcta`.
- Al guardar: `respuesta_correcta_index` directo del radio marcado.
- Select de dificultad individual (Sin dificultad | 1 Fácil | 2 Media | 3 Difícil).
- NO existe dificultad general del set (rechazada por consistencia con D2).

**Rediseño (7.5):**

- Editor al patrón nuevo (lista + form inline, innerHTML + re-bind,
  estado en `container.__triviaEstado`).
- Deuda #108 corregida: `reordenarItems` con `[{id}]`.

---

### 5.9 ¿Qué Dice el Público? (QPEP)

**Estado:** ✅ Implementado en 7.6 (rediseño al patrón nuevo + deuda #108).

**Set:** solo nombre. Sin descripción, sin dificultad.

**Item:**

```json
{ "pregunta": "string", "opcion_a": "string", "opcion_b": "string" }
```

El dominio sigue aceptando opcionales `tiempo_seg` y `puntos_acierto`;
el editor NO los expone.

**Validación:**

- `pregunta` no vacía.
- `opcion_a` y `opcion_b` no vacías.
- **NO existe respuesta correcta.**
- **NO agregar checkbox de respuesta correcta.**

**Set:** ilimitado.

**UI del editor (7.6):**

- Patrón nuevo: `innerHTML` + `container.__qpepEstado` (sin closures).
- Ids renombrados a `*-qpep` (`item-pregunta-qpep`, `item-opcion-a-qpep`, …).
- Sin inputs de `tiempo_seg` ni `puntos_acierto`.
- Contenido guardado: solo `{ pregunta, opcion_a, opcion_b }`.
- `reordenarItems` con `[{ id }]` (deuda #108 corregida).

---

## 6. Componentes reutilizables

Componentes ya existentes en `src/ui/components/`:

- `Boton` — botón cómic con variantes (`primary`, `secondary`, `danger`, `ghost`).
- `Input` — input cómic.
- `Header` — header común.

Componentes comunes a los editores (patrón ya establecido):

- **Lista de items:** `<ul>` con `<li>` por item + 4 botones (`↑ ↓ ✎ ✗`).
- **Form de agregar/editar:** inputs + botón "Agregar" / "Guardar cambios".
- **Botón cancelar:** oculto al inicio, visible en modo edición.
- **Mensaje de error:** `<p id="item-error-*">` oculto, con clase `text-error`.
- **Confirmación:** `confirm()` nativo para eliminar.
- **Reordenar:** swap + `reordenarItems(setId, [{id}])`.
- **Estado:** `container.__<juego>Estado` (precedente deuda #102).

**Regla:** los componentes compartidos están en `src/ui/components/`. Los
patrones compartidos (lista, form inline) se replican por copia (no se
abstraen en un componente genérico) para no forzar uniformidad.

---

## 7. Contrato de validación

**Dos niveles:**

1. **Formulario:** validación inmediata, con mensaje específico.
2. **Dominio:** `GameDefinition.validarContenidoSet` valida al iniciar el juego.

**Reglas transversales:**

- Strings no vacíos tras `.trim()`.
- Arrays con mínimo/máximo según juego.
- Duplicados según juego (Enlaces A/B, Pictionary concepto).
- Dificultad `∈ {1, 2, 3}` si aplica.

**Mensajes de error:**

- ❌ "Error de validación." (genérico)
- ✅ "Falta la definición de la letra M."
- ✅ "Debes marcar exactamente una respuesta correcta."
- ✅ "El concepto A 'Cervantes' ya existe en el set."
- ✅ "El set debe tener entre 8 y 10 pares."

**Regla:** el mensaje debe identificar el campo concreto.

**Divergencia conocida (deuda #110):** el editor de Enlaces valida unicidad
con `.trim()`, el dominio sin `.trim()`. El editor es más estricto. A
futuro, alinear el dominio.

---

## 8. Contrato de persistencia

### Entidades involucradas

| Entidad | Uso |
|---|---|
| `Set` | Contenedor de items. |
| `ItemSet` | Elemento individual. |
| `Juego` | Catálogo. Gana `configuracion JSONB`. |
| `SetSnapshot` | Copia inmutable. |

### Campos nuevos

**`Juego.configuracion` (JSONB, default `{}`):**

- Solo Pictionary e Historia Enredada lo usan hoy.
- Estructura por juego (§5.4.5, §5.5.2).

**`Set.submodo` (TEXT, nullable):**

- Solo Pictionary lo usa.
- Valores: `'PALABRAS' | 'GESTOS' | 'PREGUNTAS' | 'DIBUJO'`.

### Rutas de administración

| Ruta | Qué |
|---|---|
| `#/sets` | Lista de sets (filtrable por juego y submodo). |
| `#/sets/:id` | Editor de set (dispatch por juego). |
| `#/juegos/:codigo/config` | Configuración de juego (bancos, colores). |

### API de servicios

- `SetService.crearSet(payload)` / `actualizarSet` / `eliminarSet`.
- `SetService.agregarItem(setId, contenido)` / `actualizarItem` / `eliminarItem`.
- `SetService.reordenarItems(setId, [{id}])` — **contrato: Array<{id}>**.
- `JuegoService.obtenerConfiguracion(juegoId)`.
- `JuegoService.actualizarConfiguracion(juegoId, config)`.

**Regla:** `reordenarItems` recibe `Array<{id}>`, NO `Array<string>` (deuda #108).

---

## 9. Migración

### IndexedDB

**Versión 6 (no-op estructural):**

Solo se sube `DB_VERSION` de 5 a 6. **No hay cambios estructurales** en
IndexedDB (no se agregan stores ni índices).

Los campos `juegos.configuracion` y `sets.submodo` se agregan al crear
los registros nuevos. Los registros existentes quedan sin ellos, y los
repos los tratan como `{}` y `null` respectivamente.

### Supabase

**Migración `0017_juego_configuracion.sql`:**

```sql
ALTER TABLE juegos
  ADD COLUMN IF NOT EXISTS configuracion JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS submodo TEXT NULL;
```

Ambos campos son **opcionales**: `configuracion` default `{}`, `submodo`
default `NULL`.

**Sin índices adicionales.** `submodo` se filtra en memoria (los sets de un
juego son pocos).

**Sin cambios a snapshots.** El snapshot copia el set completo, incluido `submodo`.

---

## 10. Estado de implementación por paso

| Paso | Juego / actividad | Estado | Requiere |
|---|---|:---:|---|
| 7.0a | Refactor editores QPEP/Trivia | ✅ | — |
| 7.1a–d | Rosco | ✅ | — |
| 7.2a–e | Memoria | ✅ | — |
| 7.3 | Anti-Trivia | ✅ | D2 (dificultad individual) cerrada en 7.3a |
| 7.4 | Enlaces | ✅ | D1 (máximo 10) cerrada en 7.4a |
| 7.5 | Trivia | ✅ | Rediseño + deuda #108 |
| 7.6 | QPEP | ✅ | Rediseño + deuda #108 |
| 7.6a | Migración config + submodo | ✅ | Cerrada #113 y #114 |
| 7.7a | RPC con submodo | ✅ | Cerrada #120 |
| 7.7b | GameDefinition con submodos | ✅ | — |
| 7.7c | UI + shell con submodos (shims eliminados) | ✅ | — |
| 7.7 | Pictionary | 🔜 | 4 editores + config bancos + D4 + D5 |
| 7.8 | Historia Enredada | 🔜 | Editor + config colores + D6 |
| N/A | Canción Incompleta | Sin editor | — |

**Ajustes D1 y D2:** cerrados como pasos cortos — D2 en 7.3a, D1 en 7.4a.

---

## 11. Deudas técnicas (cerradas y nuevas)

### Cerradas por este documento

- **#106** (parcial → 7.3a): dificultad individual de Anti-Trivia
  **cerrada en 7.3a** (dominio + editor + tests). La parte de
  dificultad general queda **rechazada por decisión** (D2).

### Nuevas

| **#DescripciónPrioridad** |                                                                   |       |
| ------------------------- | ----------------------------------------------------------------- | ----- |
| #111                      | ~~Enlaces: agregar validación de máximo 10 en editor y dominio.~~ **Cerrada en 7.4a.** | ~~Media~~ Cerrada |
| #112                      | ~~Anti-Trivia: agregar `dificultad` individual al item y al editor.~~ **Cerrada en 7.3a.** | ~~Media~~ Cerrada |
| #113                      | ~~Agregar `Juego.configuracion` (IndexedDB v6 + Supabase 0017).~~ **Cerrada en 7.6a.** | ~~Alta~~ Cerrada |
| #114                      | ~~Agregar `Set.submodo` (IndexedDB v6 + Supabase 0017).~~ **Cerrada en 7.6a.** | ~~Alta~~ Cerrada |
| #115                      | Pictionary: 4 editores + 1 editor de bancos. **En curso (7.7c hecho, 7.7d pendiente).** | Alta  |
| #116                      | Historia Enredada: editor de historias + editor de colores.       | Alta  |
| #117                      | ~~Trivia: rediseño de editor + checkboxes + fix deuda #108.~~ **Cerrada en 7.5** (radios, no checkboxes). | ~~Alta~~ Cerrada |
| #118                      | ~~QPEP: simplificación de editor + fix deuda #108.~~ **Cerrada en 7.6** (rediseño + `[{id}]`). | ~~Media~~ Cerrada |
| #120                      | ~~La RPC crear_set_completo no acepta submodo.~~ **Cerrada en 7.7a** (migración 0018). | ~~Media~~ Cerrada |

**Deuda #108:** `trivia/editor.js` corregido en 7.5 y
`que-piensa-el-publico/editor.js` corregido en 7.6
(`reordenarItems` con `[{id}]` en ambos). **Cerrada totalmente.**

**Deuda #110** (vigente): divergencia de `.trim()` entre editor y dominio de
Enlaces. No bloquea.

---

## 12. Compatibilidad con la app existente

- **No rompe datos.** Los sets y juegos existentes quedan con valores por
  defecto (`configuracion = {}`, `submodo = null`).
- **No rompe GameDefinitions.** Los cambios de validación son retrocompatibles
  (agregar máximo 10 no invalida sets de 8; agregar `dificultad` opcional no
  rompe items sin `dificultad`).
- **No rompe snapshots.** El snapshot copia el set completo.
- **No rompe e2e.** Los e2e usan LocalAdapter y los editores existentes.
- **No rompe RLS.** Las nuevas columnas son nullable con default.
- **No rompe partidas en curso.** Los cambios son de contenido, no de ejecución.

---

**Fin del Documento Maestro de Formularios v1.0**
