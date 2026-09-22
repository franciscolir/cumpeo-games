# Bloque 5 — Paso 5.5-pre: Cierre documental de mecánica de Historia Enredada

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:** — (solo documentación)

---

## Objetivo

Cerrar la mecánica de Historia Enredada en GAMES.md sin código ni tests. Solo se actualizan docs: GAMES.md §10, ROADMAP.md, AUDITORIA.md y este archivo de paso.

---

## Mecánica cerrada

### Concepto

Juego narrativo y de interpretación por equipos. La app orquesta el flujo; el contenido real está en papel.

### Objetivo

Cada ronda tiene 2 historias, una por equipo. Eq1 actúa primero, luego Eq2. El conductor asigna puntos manualmente por historia. Gana el equipo con mayor puntaje total tras N rondas.

### Set

Set obligatorio (`requiere_set: true`). Cada item representa una historia.

- `titulo`: string
- `descripcion`: breve descripción para la card
- `dibujo`: referencia a imagen de la card
- `guion`: texto completo para imprimir y entregar a los jugadores
- `ruidos`: descripción de ruidos del jugador 2 si aplica

La historia completa no se muestra en la app. Se imprime y se entrega en papel.

### Selección

- Cada ronda tiene 2 historias: una por equipo.
- Orden fijo: Eq1 primero, Eq2 después.
- El conductor registra el equipo activo y la historia elegida.
- Cada equipo elige 1 historia de las cards disponibles (dibujo + breve descripción).
- La historia elegida queda registrada en el estado como `historia_elegida_id`.
- Las historias ya usadas no se pueden repetir en la misma partida.

### Desarrollo de la ronda

1. Eq1 elige historia.
2. El conductor entrega los papeles de colores al público.
3. El público escribe sus respuestas EN SECRETO en los papeles.
4. Eq1 actúa su historia leyendo los papeles en voz alta.
5. Conductor asigna puntos a Eq1 a discreción.
6. Eq2 elige historia.
7. El conductor entrega los papeles de colores al público.
8. El público escribe sus respuestas EN SECRETO en los papeles.
9. Eq2 actúa su historia leyendo los papeles en voz alta.
10. Conductor asigna puntos a Eq2 a discreción.
11. La app NO registra los papeles. Todo físico.

### Ruidos

- Los ruidos del jugador 2 están indicados en la historia.
- El jugador NO decide cuándo hacerlos. Siguen el guion.

### Puntuación

- Puntuación manual: el conductor asigna los puntos de cada historia a discreción.
- No hay ganador por aplausos automático; el conductor decide la puntuación.
- `puntos_por_historia`: configurable como máximo o guía.
- Ganador de la partida: mayor puntaje total acumulado al final de N rondas.
- Empate configurable: empate técnico o desempate.

### Turnos y rondas

- 1 ronda = 2 historias: Eq1 actúa, luego Eq2 actúa.
- Orden fijo por ronda: Eq1 primero, Eq2 después.
- N rondas configurables (default 1).
- Cada ronda: dos actuaciones, puntuación manual para cada equipo.
- Al final de N rondas: ganador por mayor puntaje total acumulado.

### Fases

`INICIO_RONDA`, `SELECCIONANDO_HISTORIA`, `PREPARANDO`, `ACTUANDO`, `VOTANDO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

### Público

- Ve: instrucciones de la fase, historia elegida (título + descripción + dibujo), equipo activo, marcador.
- NO ve: la historia completa (se imprime por separado).
- NO ve: los papeles (físicos).

### Timer

No aplica. El juego es físico.

### Matriz de estado

| Aspecto | Definición |
|---|---|
| Selección de historia | El equipo elige de una lista de cards (dibujo + breve descripción) |
| Historia completa | No se muestra. Se imprime y se entrega a los jugadores en papel |
| Proyección en pública | No |
| Papeles de colores | El conductor los entrega al público |
| Público escribe | En secreto, en los papeles |
| Vacíos | El jugador lee el papel en voz alta como parte del diálogo |
| App registra papeles | No. Todo físico |
| Ganador | Mayor puntaje total al final de N rondas. Puntuación manual por historia |
| Historias por equipo | 1 por ronda, 1 por equipo |
| Rondas | Configurable. Cada ronda = 2 historias (Eq1 y Eq2) |
| Ruidos | Indicados en la historia. El jugador no decide |

---

## Archivos modificados

- `docs/GAMES.md` — §10 actualizado a mecánica cerrada
- `docs/ROADMAP.md` — conteo Bloque 5 6/10, fila 5.5 EN CURSO, historial
- `docs/AUDITORIA.md` — fila 5.5-pre ✅ APROBADO
- `docs/roadmap/pasos/bloque-5.5-pre.md` — acta creada

---

## Veredicto

✅ APROBADO. Mecánica de Historia Enredada cerrada documentalmente. Paso 5.5-pre completado sin código ni tests.
