# Bloque 5 — Paso 5.7-pre: Cierre documental de mecánica de Memoricé

**Fecha de cierre:** 2026-09-22
**Resultado:** ✅ APROBADO
**Commits:** — (solo documentación)

---

## Objetivo

Cerrar la mecánica de Memoricé en GAMES.md sin código ni tests. Solo se actualizan docs: GAMES.md §6, ROADMAP.md, AUDITORIA.md y este archivo de paso.

---

## Mecánica cerrada

### Concepto

Juego de memoria con parejas de elementos. Los elementos se muestran boca abajo en una grilla y los equipos deben encontrar las parejas.

### Objetivo

Encontrar más parejas que el equipo rival. Gana el equipo con mayor puntaje total.

### Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda: ambos equipos juegan el mismo set de imágenes.
- 1 set = 1 ronda. Se pueden jugar N rondas con N sets.
- Se barajan N parejas de elementos boca abajo en una grilla.
- Grilla 4x4 o 5x5 según cantidad de elementos.

### Set (estructura del item)

```json
{
  "contenido": "string",
  "imagen_url": "string",
  "categoria": "string"
}
```

- `contenido`: string no vacío (palabra o texto del elemento).
- `imagen_url`: string opcional (URL de la imagen).
- `categoria`: string opcional (categoría del elemento).

### Validación del set

- Debe tener al menos `parejas_por_ronda` items (default 6).
- Cada item: `contenido` string no vacío.

### Configuración

```js
defaultConfig: {
  rondas: 1,
  parejas_por_ronda: 6,       // 6 parejas = 12 elementos
  tiempo_turno_seg: 20,
  puntos_por_pareja: 10
}
```

### Desarrollo de la ronda

1. **INICIO_RONDA**: se inicia la ronda.
2. **SELECCIONANDO_SET**: el conductor elige 1 set (aplica para ambos equipos).
3. **PREPARANDO_GRILLA**: el sistema baraja los 2N elementos y asigna `id_pareja`.
4. **JUGANDO (turno Eq1)**: timer 20s corre. El conductor presiona elemento 1 y luego elemento 2.
   - Si son pareja → +10 puntos a Eq1, elementos quedan visibles, sigue Eq1.
   - Si no → elementos se ocultan, pasa turno a Eq2.
5. Continúa hasta que todas las parejas estén encontradas.
6. **FIN_DE_RONDA**: se muestra el marcador.
   - Si hay más rondas → INICIO_RONDA con nuevo set.
   - Si no → FIN_DE_JUEGO.

### Timer

- 20 segundos por turno (configurable: `tiempo_turno_seg`).
- Al agotarse con 1 elemento volteado: los 2 se ocultan, pasa turno.
- Al agotarse sin elementos: pasa turno.

### Puntuación

- `puntos_por_pareja`: configurable (default 10).
- Ganador: mayor puntaje total. Empate técnico si empatan.

### Estado

```js
{
  ronda_actual, total_rondas, fase, equipo_actual,
  set_id, elementos (barajados), elementos_volteados,
  elementos_descubiertos, parejas_encontradas,
  parejas_equipo_1, parejas_equipo_2,
  puntos_equipo_1, puntos_equipo_2,
  timer_activo, tiempo_restante_seg
}
```

### Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `PREPARANDO_GRILLA`, `JUGANDO`, `ESPERA_CONFIRMACION`, `CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

### Público

- Ve la grilla completa con estado de cada elemento (boca abajo, volteado temporal, descubierto).
- Ve: equipo activo, timer, marcador, parejas encontradas.

---

## Cambios vs. GAMES.md previo

| Sección | Antes | Después |
|---|---|---|
| §6 Memoricé | "Mecánica pendiente de cierre" con lista de 12 aspectos por definir | "Mecánica cerrada" con estructura completa: grilla de parejas, turnos por equipo, timer, puntuación, fases, público |

---

## Archivos modificados

- `docs/GAMES.md` — §6 actualizado a mecánica cerrada
- `docs/ROADMAP.md` — conteo Bloque 5 10/10, fila 5.7 EN CURSO, historial
- `docs/AUDITORIA.md` — fila 5.7-pre ✅ APROBADO
- `docs/roadmap/pasos/bloque-5.7-pre.md` — acta creada

---

## Veredicto

✅ APROBADO. Mecánica de Memoricé cerrada documentalmente. Paso 5.7-pre completado sin código ni tests. Bloque 5 cerrado (10/10).
