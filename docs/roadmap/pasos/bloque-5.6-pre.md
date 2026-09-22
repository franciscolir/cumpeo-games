# Bloque 5 — Paso 5.6-pre: Cierre documental de mecánica de Trivia

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:** — (solo documentación)

---

## Objetivo

Cerrar la mecánica de Trivia en GAMES.md sin código ni tests. Solo se actualizan docs: GAMES.md §5, ROADMAP.md, AUDITORIA.md y este archivo de paso.

---

## Mecánica cerrada

### Concepto

Juego de preguntas y respuestas con sets de preguntas configurables.

### Objetivo

Responder correctamente más preguntas que el equipo rival. Gana el equipo con mayor puntaje total.

### Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda tiene 2 turnos: Eq1 primero, Eq2 después.
- Cada turno: el equipo responde 5 preguntas de un set.
- Cada equipo tiene SU PROPIO SET (pueden ser distintos).
- Sets elegidos del almacén al inicio de cada turno.

### Set (estructura del item)

```json
{
  "pregunta": "string",
  "opciones": ["A", "B", "C", "D"],
  "respuesta_correcta_index": 0,
  "dificultad": 1
}
```

- `pregunta`: string no vacío.
- `opciones`: array de 2 a 6 strings.
- `respuesta_correcta_index`: integer 0-based, válido dentro del rango de opciones.
- `dificultad`: 1 | 2 | 3 (opcional).

### Validación del set

- Debe tener al menos `preguntas_por_turno` items (default 5).
- Cada item: `pregunta` string no vacío, `opciones` array de 2-6 strings, `respuesta_correcta_index` válido.

### Selección de set por equipo

- El conductor elige un set del almacén para el equipo activo.
- Los sets pueden ser distintos para cada equipo.

### Desarrollo del turno

1. **SELECCIONANDO_SET**: el conductor elige un set del almacén.
2. **MOSTRANDO_PREGUNTA** (pregunta 1 de 5): se muestra la pregunta y opciones en la TV.
3. **SELECCIONANDO_RESPUESTA**: timer corre. El conductor selecciona la opción (A/B/C/D) que dijo el equipo. Presiona "Validar".
4. **MOSTRANDO_RESULTADO**: el sistema compara con `respuesta_correcta_index` y asigna puntos automáticamente. Muestra la respuesta correcta.
5. Se repite pasos 2-4 hasta completar 5 preguntas.
6. **CAMBIO_TURNO**: cambia al otro equipo.

### Timer

- 30 segundos por pregunta (configurable: `tiempo_por_pregunta_seg`).
- Al agotarse: la pregunta se marca como incorrecta automáticamente.

### Validación

- El conductor NO marca correcto/incorrecto manualmente.
- El conductor SELECCIONA la opción (A/B/C/D) que dijo el equipo.
- Después presiona "Validar".
- El sistema compara y asigna puntos automáticamente.

### Puntuación

- `puntos_por_acierto`: configurable (default 10).
- `penalizacion_por_error`: configurable (default 0).
- `penalizacion_por_pasar`: configurable (default 0).
- Ganador: mayor puntaje total. Empate técnico si empatan.

### Pasar

- El conductor puede pasar la pregunta (botón "Pasar").
- Aplica la penalización configurada.
- La pregunta se marca como pasada.

### Robo

NO existe.

### Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `MOSTRANDO_PREGUNTA`, `SELECCIONANDO_RESPUESTA`, `MOSTRANDO_RESULTADO`, `CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

### Público

- No vota desde el móvil.
- Ve: pregunta, opciones, timer, equipo activo, marcador.
- No ve: la respuesta correcta hasta que el conductor valida.

---

## Cambios vs. GAMES.md previo

| Sección | Antes | Después |
|---|---|---|
| §5 Trivia | "Mecánica pendiente de cierre" con lista de aspectos por definir | "Mecánica cerrada" con estructura completa: turnos, rondas, set, validación, timer, puntuación, fases, público |

---

## Archivos modificados

- `docs/GAMES.md` — §5 actualizado a mecánica cerrada
- `docs/ROADMAP.md` — conteo Bloque 5 8/10, fila 5.6 EN CURSO, historial
- `docs/AUDITORIA.md` — fila 5.6-pre ✅ APROBADO
- `docs/roadmap/pasos/bloque-5.6-pre.md` — acta creada

---

## Veredicto

✅ APROBADO. Mecánica de Trivia cerrada documentalmente. Paso 5.6-pre completado sin código ni tests.
