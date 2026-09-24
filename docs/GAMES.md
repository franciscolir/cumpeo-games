# CUMPEO --- Manual de juegos e instrucciones

**Documento de referencia funcional**

> Este documento distingue entre reglas ya cerradas y aspectos todavía
> pendientes. No inventa tiempos, puntuaciones o mecánicas que no hayan
> sido definidos.

## 1. Catálogo

CUMPEO contempla actualmente:

1.  ¿Qué piensa el público?
2.  Trivia
3.  Memoricé
4.  Canción Incompleta
5.  Rosco
6.  Pictionary
7.  Historia Enredada
8.  Anti-Trivia
9.  Enlaces

------------------------------------------------------------------------

# 2. Reglas generales

## 2.1 Equipos

La partida utiliza dos equipos:

-   Equipo 1
-   Equipo 2

Cada participante pertenece a un equipo.

## 2.2 Partida

Estados de la partida:

`BORRADOR → CONFIGURANDO → EN_CURSO → FINALIZADA`

También existen `DESCARTADA` y `EXPIRADA`.

No existe una partida en estado `PAUSADA`. La pausa pertenece al juego
ejecutado.

## 2.3 Juego ejecutado

Estados:

`PENDIENTE → EN_CURSO → FINALIZADO`

Un juego pendiente puede terminar como `NO_JUGADO`.

Existe como máximo un juego ejecutado activo simultáneamente.

Cada juego ejecutado mantiene estado específico, `state_version`,
resultado cuando corresponde, razón de finalización y fechas de
actualización.

## 2.4 Pausa

Un juego puede pasar:

`EN_CURSO → PAUSADO → EN_CURSO`

La pausa congela el temporizador. Los Extras pueden utilizarse mientras
el juego está pausado.

## 2.5 Control

Las operaciones críticas requieren control de la partida mediante sesión
y lease. La implementación actual utiliza un lease de 30 segundos.

## 2.6 Público

La vista pública no controla el juego. Recibe la proyección pública del
estado.

`estado_publico` se mantiene separado de `estado_juego`; la interfaz
pública no debe recibir el estado interno completo.

------------------------------------------------------------------------

# 3. Sets

Un Set es contenido reutilizable asociado a un juego.

Contiene:

-   nombre;
-   descripción;
-   juego;
-   versión;
-   activo/inactivo;
-   items ordenados.

La versión aumenta cuando cambia el contenido:

-   nombre;
-   descripción;
-   items;
-   orden de items.

Cambiar solamente `activo` no aumenta la versión.

El reordenamiento recibe la colección completa en su orden final y debe
ser una permutación válida. No se infieren elementos faltantes. El
cambio de orden y el incremento de versión ocurren en una única
transacción atómica.

Los `SetSnapshot` son inmutables y permiten conservar exactamente el
contenido usado por una partida.

------------------------------------------------------------------------

# 4. ¿QUÉ PIENSA EL PÚBLICO?

## Concepto

Juego basado en comparar una respuesta de los participantes con una
respuesta obtenida previamente del público.

## Objetivo

Intentar coincidir con la respuesta que representa la opinión o elección
del público.

## Mecánica

La definición funcional recuperada todavía no fija:

-   número de preguntas;
-   rondas;
-   participantes por equipo;
-   mecanismo exacto de respuesta;
-   respuestas posibles;
-   revelación;
-   puntuación;
-   tiempo;
-   condición de victoria;
-   desempate;
-   estructura del Set.

Estos puntos deben definirse antes de implementar la lógica.

## Estado específico que deberá contemplarse

-   pregunta actual;
-   respuesta del público;
-   respuesta introducida;
-   equipo/participante activo;
-   puntuación;
-   progreso;
-   fase del turno.

------------------------------------------------------------------------

# 5. TRIVIA — Mecánica cerrada

## Concepto

Juego de preguntas y respuestas con sets de preguntas configurables.

## Objetivo

Responder correctamente más preguntas que el equipo rival. Gana el equipo con mayor puntaje total.

## Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda tiene 2 turnos: Eq1 primero, Eq2 después.
- Cada turno: el equipo responde 5 preguntas de un set.
- Cada equipo tiene SU PROPIO SET (pueden ser distintos).
- Sets elegidos del almacén al inicio de cada turno.

## Set (estructura del item)

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

## Validación del set

- Debe tener al menos `preguntas_por_turno` items (default 5).
- Cada item: `pregunta` string no vacío, `opciones` array de 2-6 strings, `respuesta_correcta_index` válido.

## Selección de set por equipo

- El conductor elige un set del almacén para el equipo activo.
- Los sets pueden ser distintos para cada equipo.

## Desarrollo del turno

1. **SELECCIONANDO_SET**: conductor elige 1 set para el equipo activo.
2. **MOSTRANDO_PREGUNTA**: se muestra pregunta + lista de respuestas correctas en pantalla.
3. **RESPONDIENDO**: timer 30s corre. El equipo dice una respuesta verbal.

Desde RESPONDIENDO hay 3 transiciones posibles:

**Caso A — Conductor marca Acierto/Error mientras corre el timer:**
- Fase → MOSTRANDO_RESULTADO.
- Timer se cancela.

**Caso B — Timer llega a 0 y el conductor confirma que el jugador NO respondió:**
- Fase → MOSTRANDO_RESULTADO (sin puntaje).
- Registrado como "sin respuesta".

**Caso C — Timer llega a 0 y el conductor confirma que el jugador SÍ respondió:**
- Fase → ESPERA_VALIDACION.
- El conductor valida (Acierto/Error).
- Fase → MOSTRANDO_RESULTADO.

4. **ESPERA_VALIDACION**: el conductor presiona "Acierto" o "Error". El timer está detenido.
5. **MOSTRANDO_RESULTADO**: se revela la decisión.
6. Continúa con la siguiente pregunta.
7. Al terminar N preguntas → CAMBIO_TURNO.
8. Eq2 juega su set.
9. FIN_DE_RONDA.

## Timer

- 30s por pregunta (configurable: `tiempo_respuesta_seg`).
- Corre solo en fase RESPONDIENDO.
- Al llegar a 0: se detiene. NO es error automático. El conductor decide:
  - Confirma que el jugador respondió → ESPERA_VALIDACION.
  - Confirma que el jugador no respondió → MOSTRANDO_RESULTADO sin puntaje.
- El conductor puede marcar Acierto/Error en cualquier momento (RESPONDIENDO o ESPERA_VALIDACION).

## Puntuación

- `puntos_por_acierto`: configurable (default 10).
- `penalizacion_por_error`: configurable (default 0).
- `penalizacion_por_pasar`: configurable (default 0).
- Ganador: mayor puntaje total. Empate técnico si empatan.

## Pasar

- El conductor puede pasar la pregunta (botón "Pasar").
- Aplica la penalización configurada.
- La pregunta se marca como pasada.

## Robo

NO existe.

## Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `MOSTRANDO_PREGUNTA`,
`RESPONDIENDO`, `ESPERA_VALIDACION`, `MOSTRANDO_RESULTADO`,
`CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

## Público

- No vota desde el móvil.
- Ve: pregunta, opciones, timer, equipo activo, marcador.
- No ve: la respuesta correcta hasta que el conductor valida.

------------------------------------------------------------------------

# 6. MEMORICÉ

## Concepto

Juego basado en memoria.

## Objetivo

Recordar correctamente elementos previamente mostrados o presentados.

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

### Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `PREPARANDO_GRILLA`, `JUGANDO`, `ESPERA_CONFIRMACION`, `CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

### Público

- Ve la grilla completa con estado de cada elemento (boca abajo, volteado temporal, descubierto).
- Ve: equipo activo, timer, marcador, parejas encontradas.

------------------------------------------------------------------------

# 7. CANCIÓN INCOMPLETA

## Concepto

Juego musical basado en identificar o completar una canción a partir de
contenido incompleto.

## Objetivo

Resolver correctamente el contenido faltante o identificar la canción,
según la modalidad que se cierre.

## Mecánica cerrada

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


------------------------------------------------------------------------

# 8. ROSCO

## Concepto

Preguntas asociadas a letras de un rosco alfabético.

## Set

27 letras fijas A–Z + Ñ en orden alfabético tradicional español.

El alfabeto NO es configurable. Siempre incluye la Ñ.

El mismo Set se utiliza para ambos equipos.

Rondas por partida: configurable (N rondas). 1 ronda = 1 set.
N rondas = N sets elegidos al iniciar el juego.

### Item del set

```js
{
  letra: 'A',
  definicion: 'Fruta...',
  respuesta: 'Ananá'
}
```

### Validación del set

| Regla | Detalle |
|-------|---------|
| Items requeridos | Exactamente 27 items (1 por letra) |
| Items por letra | Exactamente 1 item por letra (A–Z + Ñ) |

## Turnos

Dinámica tipo tenis.

1 o 2 jugadores designados por equipo. El equipo responde mientras
acierta. Cambio de turno al errar o al usar pasapalabra.

Si un equipo nunca erra, sigue jugando; el otro solo entra con error o
pasapalabra.

Pausa entre turnos: el conductor presiona "Siguiente equipo".

No existe "robo" como mecánica separada; la letra pasa al otro equipo
como flujo de pasapalabra.

## Desarrollo

Durante el turno se recorren las letras y se responden las preguntas
asociadas.

Cada letra conserva su estado:

| Estado | Descripción |
|--------|-------------|
| Pendiente | No fue mostrada aún en esta ronda |
| Correcta | Acierto del equipo |
| Incorrecta | Error del equipo. No se reintenta |
| Pasada | Pasapalabra; pasa al otro equipo |

## Pasapalabra

Cuando se utiliza pasapalabra:

-   la letra no se considera resuelta;
-   pasa al otro equipo;
-   si ambos pasan, queda pendiente hasta la otra vuelta;
-   vuelven al final de la lista;
-   cuando no queden frescas, se retoman las pendientes;
-   puede intentarse nuevamente.

## Tiempo

Timer total de ronda. Corre siempre que hay turno activo.

Se pausa con "Siguiente equipo" y se reanuda al arrancar el nuevo
turno.

2 timers en pantalla (uno por equipo).

Duración configurable, default 60s por equipo.

Fin de tiempo: termina la ronda; pendientes = no resueltas.

## Puntuación

-   Puntos por acierto: configurable.
-   Penalización por error: configurable.
-   Puntuación acumulativa entre rondas.
-   Ganador: mayor puntuación total.
-   Desempate: por letras completadas.

## Finalización

El Rosco termina al cumplirse la condición de finalización:

-   completar el rosco (todas las letras resueltas);
-   agotamiento del tiempo.

N rondas configurables. Fin de partida tras N rondas.
Cada ronda usa un set distinto (el set N de los N elegidos al iniciar).

## Validación

El conductor valida cada respuesta. Marca OK o X en la UI.

La respuesta es verbal, NO se tipea.

## Intervención del conductor

| Permitido | Prohibido |
|-----------|-----------|
| Pausar/reanudar timer | Retroceder letras ya marcadas |
| Saltar a la siguiente letra | |

## Estado específico

| Campo | Descripción |
|-------|-------------|
| Alfabeto | A–Z + Ñ (fijo) |
| Letras | Array de 27 letras con estado |
| Letra actual | Letra que se está mostrando |
| Pendientes | Letras sin resolver en esta ronda |
| Resueltas | Letras correctas o incorrectas |
| Respuesta actual | Texto que se está evaluando |
| Estado de respuesta | OK, X o pendiente |
| Equipo actual | 1 o 2 |
| Puntuación ambos equipos | Acumulada entre rondas |
| 2 temporizadores | Uno por equipo |
| Ronda actual | Número de ronda en curso |
| Total de rondas | N configuradas |
| Sets por ronda | Array de N sets (1 por ronda) |
| Set de ronda actual | El set activo en la ronda en curso |

## Público

El público muestra:

-   rosco completo;
-   estado de las letras;
-   progreso;
-   definición en el CENTRO del rosco;
-   respuesta después de la validación;
-   2 timers.

## Reinicio entre rondas

-   El rosco se limpia (todas las letras vuelven a "pendiente").
-   Se carga el set de la nueva ronda (N rondas = N sets distintos).

------------------------------------------------------------------------

# 9. PICTIONARY — Mecánica cerrada

## Concepto

Juego de adivinanza con 4 modos de representación: palabras
prohibidas, gestos, dibujo y preguntas sí/no.

## Objetivo

El equipo debe adivinar un concepto mientras un compañero lo
representa según el modo activo.

## Modos

| # | Modo | Descripción |
|---|------|-------------|
| 1 | Palabras prohibidas | La TV muestra el concepto y una lista de palabras prohibidas. El adivinador mira la pantalla. |
| 2 | Gestos | Igual lógica que el modo 1, pero sin palabras en pantalla. El representante usa gestos. |
| 3 | Dibujo | Pizarra física. No hay canvas en la app. El representante dibuja. |
| 4 | Preguntas sí/no | El adivinador está de espaldas y pregunta sí/no. El compañero responde solo sí o no. Sin límite de preguntas. |

## Set

Obligatorio (`requiere_set: true`).

Un solo set con items etiquetados por modo.

### Estructura del item

```json
{
  "modo": 1,
  "concepto": "PERRO",
  "prohibidas": ["mascota", "guau", "mejor amigo", "firulais"],
  "dificultad": 1
}
```

-   `modo`: 1 | 2 | 3 | 4.
-   `concepto`: palabra o frase a adivinar.
-   `prohibidas`: array de palabras no permitidas. Solo obligatorio en
    modo 1. En modos 2, 3 y 4 puede estar vacío u omitirse.
-   `dificultad`: 1 | 2 | 3 (opcional).

### Validación del set

-   Cada modo debe tener al menos N items, donde N = rondas ×
    palabras_por_modo.
-   Modo 1: `prohibidas` debe ser array no vacío.
-   Modos 2, 3 y 4: `prohibidas` puede estar vacío u omitirse.

## Turnos y orden de modos

-   Un turno comprende los 4 modos en orden fijo: 1 → 2 → 3 → 4.
-   Los equipos alternan turnos.
-   Cada turno completo (4 modos) equivale a 1 ronda.
-   Rondas por partida: configurable.
-   El adivinador es el mismo en los 4 modos de un turno. El sistema
    no identifica quién adivina.

## Timer

-   Un solo `segundos_por_modo` configurable.
-   `palabras_por_modo`: configurable, default 1.

## Validación

-   El conductor marca correcto o incorrecto.
-   Pasar palabra: configurable. El conductor decide si penaliza.

## Puntuación

-   `puntos_por_acierto`: configurable.
-   `penalizacion_por_error`: configurable.
-   `penalizacion_por_pasar`: configurable.
-   Bonus manual: el conductor tiene un botón "Bonus" para agregar X
    puntos a discreción.

## Fases

`INICIO_RONDA`, `SELECCIONANDO_MODO`, `MOSTRANDO_PALABRA`,
`ADIVINANDO`, `ESPERA_VALIDACION`, `CAMBIO_MODO`, `FIN_DE_RONDA`,
`FIN_DE_JUEGO`.

## Público

El público puede ver:

-   el modo activo;
-   el concepto (según el modo);
-   las palabras prohibidas (modo 1);
-   el progreso del turno;
-   la puntuación.


# 10. HISTORIA ENREDADA — Mecánica cerrada

## Concepto

Juego narrativo y de interpretación por equipos. La app orquesta el flujo; el contenido real está en papel.

## Objetivo

Cada equipo elige una historia, la actúa con guion físico y ruidos indicados, y gana por aplausos del público.

## Set (estructura del item)

Set obligatorio (`requiere_set: true`). Cada item representa una historia.

Estructura sugerida:
- `titulo`: string
- `descripcion`: breve descripción para la card
- `dibujo`: referencia a imagen de la card
- `guion`: texto completo para imprimir y entregar a los jugadores
- `ruidos`: descripción de ruidos del jugador 2 si aplica

La historia completa no se muestra en la app. Se imprime y se entrega en papel.

## Selección de equipo e historia

- Cada ronda tiene 2 historias: una por equipo.
- Orden fijo: Eq1 primero, Eq2 después.
- El conductor registra el equipo activo y la historia elegida.
- Cada equipo elige 1 historia de las cards disponibles (dibujo + breve descripción).
- La historia elegida queda registrada en el estado como `historia_elegida_id`.
- Las historias ya usadas no se pueden repetir en la misma partida.

## Desarrollo de la ronda

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

## Ruidos

- Los ruidos del jugador 2 están indicados en la historia.
- El jugador NO decide cuándo hacerlos. Siguen el guion.

## Puntuación

- Puntuación manual: el conductor asigna los puntos de cada historia a discreción.
- No hay ganador por aplausos automático; el conductor decide la puntuación.
- `puntos_por_historia`: configurable como máximo o guía.
- Ganador de la partida: mayor puntaje total acumulado al final de N rondas.
- Empate configurable: empate técnico o desempate.

## Turnos y rondas

- 1 ronda = 2 historias: Eq1 actúa, luego Eq2 actúa.
- Orden fijo por ronda: Eq1 primero, Eq2 después.
- N rondas configurables (default 1).
- Cada ronda: dos actuaciones, puntuación manual para cada equipo.
- Al final de N rondas: ganador por mayor puntaje total acumulado.

## Fases

`INICIO_RONDA`, `SELECCIONANDO_HISTORIA`, `PREPARANDO`, `ACTUANDO`, `VOTANDO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

## Público

- Ve: instrucciones de la fase, historia elegida (título + descripción + dibujo), equipo activo, marcador.
- NO ve: la historia completa (se imprime por separado).
- NO ve: los papeles (físicos).

## Timer

No aplica. El juego es físico.

## Matriz de estado

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


# 11. ANTI-TRIVIA — Mecánica cerrada

## Concepto

Anti-juego de preguntas y respuestas. A diferencia de una Trivia
convencional, el jugador debe dar una respuesta INCORRECTA.

Se muestra la pregunta + una lista de respuestas correctas en pantalla.
El jugador NO debe decir ninguna de las respuestas correctas.
Debe dar una respuesta que NO esté en la lista.

## Objetivo

Dar la mayor cantidad de respuestas incorrectas válidas. Gana el
equipo con mayor puntaje total.

## Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda = 2 turnos: Eq1 → Eq2.
- Cada turno: el equipo responde N preguntas de su set.
- Cada equipo tiene SU PROPIO SET.
- Sets elegidos al inicio de cada turno.
- N rondas configurables (default 1).

## Set (estructura del item)

```json
{
  "pregunta": "string",
  "respuestas_correctas": ["string", "string"],
  "categoria": "string",
  "dificultad": 1
}
```

- `pregunta`: string no vacío.
- `respuestas_correctas`: array no vacío de strings (las respuestas correctas a evitar).
- `categoria`: string opcional.
- `dificultad`: 1 | 2 | 3 (opcional). `null` se trata como ausente.

## Validación del set

- Debe tener al menos `preguntas_por_turno` items (default 5).
- Cada item: `pregunta` no vacía, `respuestas_correctas` array no vacío.
- Si `dificultad` está presente (distinta de `undefined` y `null`): debe ser
  un entero en 1..3. Mensaje: `items[i].dificultad debe ser 1, 2 o 3 si está presente`.

## Configuración

```js
{
  rondas: 1,
  preguntas_por_turno: 5,
  tiempo_respuesta_seg: 30,
  penalizacion_por_error: 0,
  puntos_por_acierto: 10
}
```

## Desarrollo del turno

1. **SELECCIONANDO_SET**: conductor elige 1 set para el equipo activo.
2. **MOSTRANDO_PREGUNTA**: se muestra pregunta + lista de respuestas correctas en pantalla.
3. **RESPONDIENDO**: timer 30s corre. El equipo dice una respuesta verbal.

Desde RESPONDIENDO hay 3 transiciones posibles:

- **Caso A** — El conductor marca Acierto/Error mientras corre el timer: fase → MOSTRANDO_RESULTADO, timer cancelado.
- **Caso B** — El timer llega a 0 y el conductor confirma que el jugador NO respondió: fase → MOSTRANDO_RESULTADO sin puntaje.
- **Caso C** — El timer llega a 0 y el conductor confirma que el jugador SÍ respondió: fase → ESPERA_VALIDACION.

4. **ESPERA_VALIDACION**: el conductor presiona "Acierto" o "Error". El timer está detenido.
5. **MOSTRANDO_RESULTADO**: se revela la decisión.
6. Continúa con la siguiente pregunta.
7. Al terminar N preguntas → CAMBIO_TURNO.
8. Eq2 juega su set.
9. FIN_DE_RONDA.

## Timer

- 30s por pregunta (configurable: `tiempo_respuesta_seg`).
- Corre solo en fase RESPONDIENDO.
- Al llegar a 0: se detiene. NO es error automático. El conductor decide:
  - Confirma que el jugador respondió → ESPERA_VALIDACION.
  - Confirma que no respondió → MOSTRANDO_RESULTADO sin puntaje.
- El conductor puede marcar Acierto/Error en cualquier momento (RESPONDIENDO o ESPERA_VALIDACION).

## Puntuación

- `puntos_por_acierto`: configurable (default 10).
- `penalizacion_por_error`: configurable (default 0).
- Ganador: mayor puntaje total. Empate técnico.

## Fases

`INICIO_RONDA`, `SELECCIONANDO_SET`, `MOSTRANDO_PREGUNTA`,
`RESPONDIENDO`, `ESPERA_VALIDACION`, `MOSTRANDO_RESULTADO`,
`CAMBIO_TURNO`, `FIN_DE_RONDA`, `FIN_DE_JUEGO`.

## Público

- Ve: pregunta, lista de respuestas correctas, equipo activo, timer, marcador.
- Ve: si la respuesta fue acierto o error (color verde/rojo).
- NO ve: la respuesta específica que dio el jugador.

------------------------------------------------------------------------

# 12. ENLACES — Mecánica cerrada

## Concepto

Juego de asociación 1:1. Se muestran dos columnas de conceptos: la
columna A (fija) y la columna B (desordenada). El equipo debe ordenar
la columna B para que cada elemento quede alineado con su par
correspondiente de la columna A.

## Objetivo

Alinear correctamente la mayor cantidad de pares posible. Gana el
equipo con más aciertos al final de N rondas.

## Estructura

- 2 equipos (Eq1 y Eq2).
- Cada ronda tiene 2 turnos: Eq1 primero, Eq2 después.
- Cada turno: el equipo ordena una columna B de `pares_por_turno`
  elementos (default 8).
- Cada equipo tiene SU PROPIO SET (pueden ser distintos).
- Sets elegidos del almacén al inicio de cada turno.
- N rondas configurables (default 1).

## Set (estructura del item)

```json
{
  "concepto_a": "Cervantes",
  "concepto_b": "Quijote",
  "categoria": "Literatura",
  "dificultad": 1
}
concepto_a: string no vacío (columna A).

concepto_b: string no vacío (columna B).

categoria: string opcional.

dificultad: 1 | 2 | 3 (opcional).

Cada item del set es UN PAR correcto (concepto_a ↔ concepto_b).

Validación del set
Debe tener al menos pares_por_turno items (default 8).

Cada item: concepto_a y concepto_b strings no vacíos.

No puede haber concepto_a duplicados ni concepto_b duplicados
dentro del mismo set (cada elemento aparece una sola vez).

Selección de set por equipo
El conductor elige un set del almacén para el equipo activo.

Los sets pueden ser distintos para cada equipo.

Desarrollo del turno
SELECCIONANDO_SET: el conductor elige 1 set para el equipo activo.

PREPARANDO_TABLERO: el sistema toma pares_por_turno items del
set, extrae los concepto_a (columna A, orden fijo) y los
concepto_b (columna B, orden aleatorio).

ORDENANDO: timer tiempo_turno_seg corre (default 60s). El
equipo mira la pantalla pública y dicta verbalmente al conductor qué
mover. El conductor arrastra elementos de la columna B arriba/abajo
para ordenarlos.

El conductor puede deshacer movimientos mientras el timer corre.

Time-up: la columna B se congela. Fase → ESPERA_VALIDACION.
Ya no se puede mover nada.

Validar (el conductor presiona "Validar" en cualquier momento, o
después del time-up): fase → MOSTRANDO_RESULTADO.

MOSTRANDO_RESULTADO: se evalúa cada fila. Para cada posición i,
si columna_B[i] es el par de columna_A[i], es acierto. Cada
acierto suma puntos_por_acierto.

Al terminar el turno de Eq1, pasa a Eq2.

CAMBIO_TURNO.

Eq2 juega su set.

FIN_DE_RONDA.

FIN_DE_JUEGO si no hay más rondas.

Timer
tiempo_turno_seg: configurable (default 60s).

Corre solo en fase ORDENANDO.

Al llegar a 0: se detiene. La columna B se congela.

Pasa automáticamente a ESPERA_VALIDACION.

El conductor puede validar antes del time-up sin esperar.

Puntuación
puntos_por_acierto: configurable (default 10).

No hay penalización por error. Una fila incorrecta simplemente
no suma puntos.

No hay penalización por no terminar.

Ganador: mayor puntaje total. Empate técnico si empatan.

Pasar
NO existe. El equipo no "pasa" filas. Solo ordena lo que puede.

Deshacer
El conductor puede deshacer movimientos mientras el timer corre.

Una vez que el timer llega a 0, no se puede deshacer.

Después de validar, no se puede deshacer.

Interacción del conductor
Drag-and-drop real de los elementos de la columna B.

Arrastra un elemento arriba o abajo para cambiar su posición.

El resto de la columna se reordena automáticamente.

Botón "Validar" para forzar la evaluación antes del time-up.

Botón "Deshacer" (opcional, mientras el timer corre).

La implementación del drag-and-drop se decide en 5.9a.

Configuración
js
{
  rondas: 1,
  pares_por_turno: 8,
  tiempo_turno_seg: 60,
  puntos_por_acierto: 10
}
Fases
INICIO_RONDA, SELECCIONANDO_SET, PREPARANDO_TABLERO, ORDENANDO,
ESPERA_VALIDACION, MOSTRANDO_RESULTADO, CAMBIO_TURNO,
FIN_DE_RONDA, FIN_DE_JUEGO.

Público
Ve: columna A (fija), columna B (en movimiento en vivo, reflejando
los movimientos del conductor), timer, marcador, equipo activo,
progreso de la ronda.

Ve: los movimientos del conductor en tiempo real.

NO ve: cuáles son los pares correctos hasta que se valida.

NO ve: la respuesta correcta antes de MOSTRANDO_RESULTADO.

Estado específico
Campo	Descripción
equipo_actual	1 o 2
ronda_actual	Ronda en curso
total_rondas	Total de rondas
fase	Fase actual
columna_a	Array de concepto_a (orden fijo)
columna_b	Array de concepto_b (orden actual)
orden_inicial_b	Orden inicial aleatorio
movimientos	Historial de movimientos (para deshacer)
validado	Boolean (true si el conductor validó)
resultado_turno	{ aciertos, total }
puntos_equipo_1	Puntaje acumulado Eq1
puntos_equipo_2	Puntaje acumulado Eq2
tiempo_restante_seg	Tiempo restante
tiempo_agotado	Boolean

------------------------------------------------------------------------

# 13. EXTRAS

Los Extras no son juegos. Son mecanismos que realizan trabajos de apoyo
al conductor.

Al utilizar un Extra:

`Juego → Extra → modal de pantalla completa → ejecución → cierre → regreso al juego`

## 13.1 Tómbola de nombres

### Objetivo

Seleccionar un participante al azar.

### Funcionamiento

1.  El conductor selecciona un equipo.
2.  Ejecuta la Tómbola.
3.  El sistema selecciona aleatoriamente un participante válido de ese
    equipo.
4.  Se muestra el resultado.
5.  Se cierra el Extra.
6.  Se regresa al juego.

## 13.2 Dados

### Objetivo

Realizar una comparación aleatoria entre los equipos.

### Funcionamiento

Se lanzan dos dados:

-   uno del Equipo 1;
-   uno del Equipo 2.

Cada dado utiliza el color correspondiente a su equipo.

El número más alto gana la comparación.

La regla para empate todavía no está definida.

## 13.3 Dinamita

### Concepto

Cuenta regresiva visual con una dinamita y una mecha encendida.

### Funcionamiento

1.  Se inicia la cuenta.
2.  Se visualiza la mecha.
3.  El contador avanza.
4.  Al llegar a cero se produce la explosión.
5.  Se cierra el Extra.
6.  Se regresa al juego.

La duración exacta y cualquier consecuencia sobre la partida todavía
deben definirse.

------------------------------------------------------------------------

# 14. ESPECIFICACIÓN MÍNIMA DE CADA JUEGO

Antes de considerar un juego completamente definido deben estar
resueltos:

1.  objetivo;
2.  participantes;
3.  equipos;
4.  quién comienza;
5.  turnos;
6.  rondas;
7.  contenido;
8.  Set;
9.  acciones del conductor;
10. información pública;
11. temporizador;
12. pausa;
13. reanudación;
14. aciertos;
15. errores;
16. pasar;
17. puntuación;
18. penalizaciones;
19. desempate;
20. condición de finalización;
21. resultado;
22. configuración;
23. excepciones;
24. estado interno;
25. proyección pública.

------------------------------------------------------------------------

# 15. PRINCIPIO DE DESARROLLO

**El código debe implementar las reglas del juego; las reglas no deben
ser inventadas por el código.**

Flujo:

`Reglas funcionales → GameDefinition → GameComponent → estado específico → controles del conductor → proyección pública → tests`

Cuando una regla todavía no esté definida, debe permanecer
explícitamente como **TBD** hasta ser acordada.

------------------------------------------------------------------------

# 16. MATRIZ DE ESTADO

  Juego                     Mecánica   Set   Tiempo       Puntuación     Público
  ------------------------- ---------- ----- ------------ -------------- ---------
  ¿Qué piensa el público?   Cerrada    Sí    Sí           Configurable   Sí
  Trivia                    Parcial    Sí    TBD          TBD            Sí
  Memoricé                  Parcial    TBD   TBD          TBD            Sí
  Canción Incompleta        Cerrada    No    Configurable Configurable   No
  Rosco                     Cerrada    Sí    Sí           Configurable   Sí
  Pictionary                Cerrada    Sí    Configurable Configurable   Sí
  Historia Enredada         Cerrada    Sí    No aplica    Configurable   No
  Anti-Trivia               Cerrada    Sí    Configurable Configurable   No
  Enlaces                   Pendiente  TBD   TBD          TBD            TBD
