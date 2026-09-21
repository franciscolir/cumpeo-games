# Bloque 5 — Paso 5.4-pre: Cierre documental de mecánica de Pictionary

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commits:** — (solo documentación)

---

## Objetivo

Cerrar la mecánica de Pictionary en GAMES.md sin código ni tests. Solo
se actualizan docs: GAMES.md, ROADMAP.md, AUDITORIA.md y este archivo
de paso.

---

## Mecánica cerrada

### Estructura

| Aspecto | Definición |
|---------|------------|
| Modos | 4: palabras prohibidas, gestos, dibujo, preguntas sí/no |
| Set | Sí, obligatorio (`requiere_set: true`). Un solo set con items etiquetados por modo |
| Selección de palabras | Aleatoria del set, filtrada por el modo actual |
| Ronda | 4 modos por equipo = 1 ronda (8 turnos por ronda) |
| Rondas por partida | Configurable |
| Adivinador | Mismo en los 4 modos. El sistema no identifica quién adivina, solo el equipo en turno |
| Orden de modos | Fijo 1 → 2 → 3 → 4, alternando equipos |

### Modos

| # | Modo | Descripción |
|---|------|-------------|
| 1 | Palabras prohibidas | La TV muestra concepto + palabras prohibidas. Adivinador de espaldas a la pantalla. |
| 2 | Gestos | Igual lógica que el modo 1, pero sin palabras en pantalla. El representante usa gestos. |
| 3 | Dibujo | Pizarra física. No hay canvas en la app. El representante dibuja. |
| 4 | Preguntas sí/no | Adivinador de espaldas pregunta sí/no. Compañero responde solo sí/no. Sin límite de preguntas. |

### Item del set

```json
{
  "modo": 1,
  "concepto": "PERRO",
  "prohibidas": ["mascota", "guau", "mejor amigo", "firulais"],
  "dificultad": 1
}
```

- `modo`: 1 | 2 | 3 | 4.
- `concepto`: palabra o frase a adivinar.
- `prohibidas`: array de palabras no permitidas. Solo obligatorio en
  modo 1. En modos 2, 3 y 4 puede estar vacío u omitirse.
- `dificultad`: 1 | 2 | 3 (opcional).

### Validación del set

| Regla | Detalle |
|-------|---------|
| Items requeridos | Cada modo debe tener al menos N items (N = rondas × palabras_por_modo) |
| Modo 1 | `prohibidas` debe ser array no vacío |
| Modos 2, 3, 4 | `prohibidas` puede estar vacío u omitirse |

### Timer

| Aspecto | Definición |
|---------|------------|
| Timer | Un solo `segundos_por_modo` configurable |
| Palabras por modo | Configurable, default 1 |

### Validación

| Aspecto | Definición |
|---------|------------|
| Quién valida | El conductor |
| UI | Marca correcto o incorrecto |
| Pasar palabra | Configurable. El conductor decide si penaliza |

### Puntuación

| Aspecto | Definición |
|---------|------------|
| Puntos por acierto | Configurable |
| Penalización por error | Configurable |
| Penalización por pasar | Configurable |
| Bonus manual | El conductor tiene un botón "Bonus" para agregar X puntos a discreción. X configurable. |

### Fases

`INICIO_RONDA`, `SELECCIONANDO_MODO`, `MOSTRANDO_PALABRA`,
`ADIVINANDO`, `ESPERA_VALIDACION`, `CAMBIO_MODO`, `FIN_DE_RONDA`,
`FIN_DE_JUEGO`.

### Pública

| Aspecto | Definición |
|---------|------------|
| Modo activo | Visible |
| Concepto | Visible (según el modo) |
| Palabras prohibidas | Visibles (modo 1) |
| Progreso del turno | Visible |
| Puntuación | Visible |

---

## Cambios vs. GAMES.md previo

| # | Cambio | Impacto |
|---|--------|---------|
| 1 | Título §9: "PICTIONARY" → "PICTIONARY — Mecánica cerrada" | Bajo |
| 2 | Concepto ampliado con descripción de los 4 modos | Bajo |
| 3 | Tabla de modos con descripción detallada por modo | Alto |
| 4 | Sección "Set" con estructura del item + validación | Alto |
| 5 | Sección "Turnos y orden de modos" con orden fijo 1→2→3→4 | Alto |
| 6 | Sección "Timer" con segundos_por_modo y palabras_por_modo | Medio |
| 7 | Sección "Validación" con conductor marca OK/X | Medio |
| 8 | Sección "Puntuación" con 3 penalizables + bonus manual | Alto |
| 9 | Sección "Fases" con 8 fases | Alto |
| 10 | Sección "Pública" con información visible | Medio |

---

## Decisiones de diseño

1. **Estructura del item del set:** Se optó por un solo campo `modo`
   en cada item, en lugar de 4 arrays separados por modo. Esto
   simplifica la validación del set y permite un solo `listarItemsDeJuego`.

2. **Orden fijo de modos:** 1 → 2 → 3 → 4, sin variación. Esto
   mantiene la previsibilidad y evita complejidad en la UI del
   conductor para seleccionar el orden.

3. **Bonus manual:** El conductor tiene un botón "Bonus" para agregar
   puntos a discreción. Esto permite flexibilidad sin complicar la
   mecánica automática de puntuación.

4. **Adivinador único:** El sistema no identifica quién adivina, solo
   el equipo en turno. Esto evita la necesidad de gestión de roles
   por parte del sistema.

5. **Pizarra física para modo 3:** No hay canvas en la app. El modo
   dibujo utiliza pizarra física fuera de la aplicación.

---

## Veredicto

✅ **APROBADO** — Mecánica de Pictionary cerrada. Siguiente: 5.4
Pictionary end-to-end.
