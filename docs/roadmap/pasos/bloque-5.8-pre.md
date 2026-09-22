# Bloque 5 — Paso 5.8-pre: Cierre documental de mecánica de Anti-Trivia

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:** — (solo documentación)

---

## Objetivo

Cerrar la mecánica de Anti-Trivia en GAMES.md sin código ni tests.
Solo se actualizan docs: GAMES.md §11, ROADMAP.md, AUDITORIA.md y este
archivo de paso.

---

## Mecánica cerrada

### Concepto

Anti-juego de preguntas y respuestas. A diferencia de una Trivia
convencional, el jugador debe dar una respuesta INCORRECTA.

Se muestra la pregunta + una lista de respuestas correctas en pantalla.
El jugador NO debe decir ninguna de las respuestas correctas.
Debe dar una respuesta que NO esté en la lista.

### Objetivo

Dar la mayor cantidad de respuestas incorrectas válidas. Gana el
equipo con mayor puntaje total.

### Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda = 2 turnos: Eq1 → Eq2.
- Cada turno: el equipo responde N preguntas de su set.
- Cada equipo tiene SU PROPIO SET.
- Sets elegidos al inicio de cada turno.
- N rondas configurables (default 1).

### Set (estructura del item)

```json
{
  "pregunta": "string",
  "respuestas_correctas": ["string", "string"],
  "categoria": "string"
}
```

- `pregunta`: string no vacío.
- `respuestas_correctas`: array no vacío de strings (las respuestas
  correctas a evitar).
- `categoria`: string opcional.

### Validación del set

- Debe tener al menos `preguntas_por_turno` items (default 5).
- Cada item: `pregunta` no vacía, `respuestas_correctas` array no vacío.

### Configuración

```js
{
  rondas: 1,
  preguntas_por_turno: 5,
  tiempo_respuesta_seg: 30,
  penalizacion_por_error: 0,
  puntos_por_acierto: 10
}
```

### Desarrollo del turno

1. SELECCIONANDO_SET: conductor elige 1 set para el equipo activo.
2. MOSTRANDO_PREGUNTA: se muestra pregunta + lista de respuestas correctas.
3. RESPONDIENDO: timer 30s corre. El equipo dice una respuesta verbal.

Desde RESPONDIENDO hay 3 transiciones posibles:

- **Caso A** — Conductor marca Acierto/Error mientras corre el timer:
  fase → MOSTRANDO_RESULTADO, timer cancelado.
- **Caso B** — Timer llega a 0 y el conductor confirma que NO respondió:
  fase → MOSTRANDO_RESULTADO sin puntaje.
- **Caso C** — Timer llega a 0 y el conductor confirma que SÍ respondió:
  fase → ESPERA_VALIDACION, el conductor valida.

4. ESPERA_VALIDACION: el conductor presiona "Acierto" o "Error".
5. MOSTRANDO_RESULTADO: se revela la decisión.
6. Continúa con la siguiente pregunta.
7. Al terminar N preguntas → CAMBIO_TURNO.
8. Eq2 juega su set.
9. FIN_DE_RONDA.

### Timer

- 30s por pregunta (configurable).
- Corre solo en RESPONDIENDO.
- Al llegar a 0: se detiene. NO es error automático. El conductor decide
  si el jugador respondió (→ ESPERA_VALIDACION) o no respondió
  (→ MOSTRANDO_RESULTADO sin puntaje).
- El conductor puede marcar Acierto/Error en cualquier momento.

### Puntuación

- `puntos_por_acierto`: configurable (default 10).
- `penalizacion_por_error`: configurable (default 0).
- Ganador: mayor puntaje total. Empate técnico.

### Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `MOSTRANDO_PREGUNTA`,
`RESPONDIENDO`, `ESPERA_VALIDACION`, `MOSTRANDO_RESULTADO`,
`CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

### Público

- Ve: pregunta, lista de respuestas correctas, equipo activo, timer,
  marcador.
- Ve: si la respuesta fue acierto o error (color verde/rojo).
- NO ve: la respuesta específica que dio el jugador (no se tipea).

### Cambios vs. GAMES.md previo

- Antes: "La mecánica todavía no está suficientemente documentada".
- Ahora: mecánica completa con 9 fases, set, timer, puntuación,
  público.

### Veredicto

✅ APROBADO. Anti-Trivia cerrada documentalmente. Bloque 5 en 9/10.
Siguiente: 5.8a (dominio).

---

## Correcciones post-cierre

**5.8-pre-fix (2026-09-22):** se ajustó la mecánica para agregar la fase
`ESPERA_VALIDACION`. El timer puede llegar a 0 y el conductor decide si
el jugador alcanzó a responder. Si sí → ESPERA_VALIDACION. Si no →
MOSTRANDO_RESULTADO sin puntaje.
