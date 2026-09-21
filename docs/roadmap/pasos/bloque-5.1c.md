# Bloque 5 — Paso 5.1c: Cierre documental de mecánicas recién definidas

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commit:** (pendiente)

---

## Objetivo

Cerrar documentalmente las mecánicas de Canción Incompleta, Pictionary e
Historia Enredada, y reordenar el Bloque 5 por madurez de mecánica.

Sin código. Sin tests.

---

## Mecánicas cerradas

### Canción Incompleta

| Aspecto | Definición |
|---|---|
| Set | No existe set de canciones en la app |
| Selección | El conductor elige a discreción |
| Reproductor | Externo (fuera de la app) |
| Pausa | El conductor decide cuándo pausar |
| Verificación | Se reanuda la canción → se comprueba el acierto |
| Letra en pantalla | No |
| Puntos por acierto | Configurable |
| Penalización por error | Configurable |
| Si falla | Pasa el turno. El equipo no gana puntos |
| Rebote | No existe |
| Ronda | 2 canciones (1 por equipo) |

### Pictionary

| Aspecto | Definición |
|---|---|
| Modos | 4: palabras prohibidas, gestos, dibujo, preguntas sí/no |
| Set | Sí, por modo |
| Selección de palabras | Aleatoria del set |
| Adivinador | Mismo en los 4 modos. El sistema no identifica quién adivina, solo el equipo en turno |
| Modo 1 (palabras prohibidas) | La TV muestra concepto + palabras prohibidas. El adivinador de espaldas |
| Modo 2 (gestos) | Igual lógica, sin palabras |
| Modo 3 (dibujo) | Pizarra física. No hay canvas en la app |
| Modo 4 (preguntas) | Adivinador de espaldas pregunta sí/no. Compañero responde solo sí/no. Sin límite de preguntas |
| Pasar palabra | Sí. Penalización configurable |
| Puntos | Configurable. Bonus por cantidad configurable |
| Ronda | 4 modos por equipo = 1 ronda |
| Tiempo | Configurable por modo |

### Historia Enredada

| Aspecto | Definición |
|---|---|
| Selección de historia | El equipo elige de una lista de cards (dibujo + breve descripción) |
| Historia completa | No se muestra. Se imprime y se entrega a los jugadores en papel |
| Proyección en pública | No |
| Papeles de colores | El conductor los entrega al público |
| Público escribe | En secreto, en los papeles |
| Vacíos | El jugador lee el papel en voz alta como parte del diálogo |
| App registra papeles | No. Todo físico |
| Ganador | Por aplausos del público. El conductor determina. Puntos configurables |
| Historias por equipo | 1 |
| Rondas | Configurable |
| Ruidos | Indicados en la historia. El jugador no decide |

---

## Reordenamiento del Bloque 5

Se prioriza por **madurez de mecánica** en lugar de por orden del catálogo.

| # | Juego / Paso | Estado |
|---|--------------|--------|
| 5.0 | Refactor: `cargarItemsDeJuego` + `crearTimer` | ✅ |
| 5.1a | Trivia conectada al shell del conductor | ✅ |
| 5.1b | Editor de items de Trivia en formulario de sets | ✅ |
| 5.1c | Cierre documental: mecánicas CI/Pic/HE + reordenamiento | ✅ |
| 5.2 | Rosco end-to-end | ⬜ |
| 5.3 | Canción Incompleta end-to-end | ⬜ |
| 5.4 | Pictionary end-to-end | ⬜ |
| 5.5 | Historia Enredada end-to-end | ⬜ |
| 5.6 | Trivia — cerrar mecánica + UI pública/móvil/tests | ⬜ |
| 5.7 | Memoricé — cerrar mecánica + implementar | ⬜ |
| 5.8 | Anti-Trivia — cerrar mecánica + implementar | ⬜ |
| 5.9 | Enlaces — cerrar mecánica + implementar | ⬜ |

**Fundamento:**
- Rosco: mecánica cerrada.
- Canción Incompleta, Pictionary, Historia Enredada: mecánicas recién cerradas.
- Trivia, Memoricé, Anti-Trivia, Enlaces: requieren decisiones de diseño antes de implementar.

---

## Archivos modificados

- `docs/roadmap/pasos/bloque-5.1c.md` (creado)
- `docs/GAMES.md`
- `docs/ROADMAP.md`
- `docs/AUDITORIA.md`

---

## Veredicto

✅ APROBADO.
