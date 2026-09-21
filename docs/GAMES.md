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

# 5. TRIVIA

## Concepto

Juego de preguntas y respuestas.

## Objetivo

Responder correctamente las preguntas del contenido seleccionado.

## Contenido

Puede utilizar Sets de preguntas.

## Mecánica pendiente de cierre

Todavía deben definirse:

-   número de preguntas;
-   rondas;
-   orden de participación;
-   quién responde;
-   tiempo por pregunta;
-   puntos por acierto;
-   penalización;
-   robo;
-   pasar;
-   condición de finalización;
-   desempate.

No deben inventarse estas reglas.

## Estado conceptual

-   pregunta actual;
-   respuesta;
-   validación;
-   equipo activo;
-   participante activo si corresponde;
-   puntuación;
-   progreso;
-   temporizador si corresponde.

------------------------------------------------------------------------

# 6. MEMORICÉ

## Concepto

Juego basado en memoria.

## Objetivo

Recordar correctamente elementos previamente mostrados o presentados.

## Mecánica pendiente de cierre

Falta definir:

-   cantidad de elementos;
-   tiempo de exposición;
-   orden;
-   rondas;
-   participantes;
-   forma de ocultar elementos;
-   respuesta;
-   puntuación;
-   errores;
-   repetición;
-   victoria;
-   uso de Sets.

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

Preguntas asociadas a las letras de un rosco alfabético.

## Set

El Set puede utilizar:

-   A-Z;
-   A-Z + Ñ.

El mismo Set se utiliza para ambos equipos.

## Turnos

Cada equipo dispone de un turno completo.

## Desarrollo

Durante el turno se recorren las letras y se responden las preguntas
asociadas.

Cada letra conserva su estado.

## Pasapalabra

Cuando se utiliza `Pasapalabra`:

-   la letra no se considera resuelta;
-   vuelve al final de las letras pendientes;
-   puede intentarse nuevamente.

## Tiempo

Utiliza un temporizador total por equipo/turno.

El temporizador puede pausarse y reanudarse.

## Puntuación

La puntuación es configurable.

## Finalización

El Rosco termina al cumplirse la condición de finalización, incluyendo:

-   completar el rosco;
-   agotamiento del tiempo.

## Estado específico

Conceptualmente:

-   alfabeto;
-   letras;
-   letra actual;
-   letras pendientes;
-   letras resueltas;
-   respuesta actual;
-   estado de respuesta;
-   equipo actual;
-   puntuación de ambos equipos;
-   temporizador.

## Público

El público puede ver:

-   rosco completo;
-   estado de las letras;
-   progreso;
-   pregunta/información pública correspondiente;
-   respuesta después de la validación.

------------------------------------------------------------------------

# 9. PICTIONARY

## Concepto

Juego de dibujo y adivinanza.

## Objetivo

Representar un concepto mediante dibujo para que el equipo lo
identifique.

## Mecánica cerrada

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


# 10. HISTORIA ENREDADA

## Concepto

Juego narrativo y de interpretación por equipos.

## Selección de historia

El conductor recibe una lista de historias.

Cada historia muestra únicamente:

-   título;
-   breve descripción.

No se muestran previamente todos los detalles de la historia en la
selección.

## Roles

Participan dos papeles:

1.  personaje representado por el conductor;
2.  personaje representado por un participante del otro equipo.

## Participación del público

El público aporta palabras para completar la historia.

La dinámica contempla exactamente:

**6 espacios**.

Las palabras aportadas se utilizan posteriormente durante la narración.

## Narración

El conductor desarrolla/narra la historia utilizando los elementos
obtenidos.

## Sonido

La dinámica contempla efectos de sonido. El conductor dispone de
mecanismos para disparar dichos efectos durante la narración.

## Estado conceptual

-   historia seleccionada;
-   personaje del conductor;
-   personaje del participante;
-   equipo del participante;
-   seis espacios;
-   palabras recibidas;
-   palabras asignadas;
-   fase;
-   efectos de sonido;
-   estado de narración.

## Mecánica cerrada

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


# 11. ANTI-TRIVIA

## Concepto

Juego relacionado con preguntas y respuestas, pero con una lógica
diferente de una Trivia convencional.

## Estado de definición

La mecánica todavía no está suficientemente documentada.

No deben inventarse:

-   respuesta;
-   puntuación;
-   tiempo;
-   turnos;
-   rondas;
-   penalizaciones;
-   victoria;
-   Sets;
-   participación pública.

------------------------------------------------------------------------

# 12. ENLACES

## Concepto

Juego basado en establecer conexiones entre elementos.

## Estado de definición

La mecánica funcional todavía no está cerrada.

Falta definir:

-   elementos que se conectan;
-   objetivo;
-   selección;
-   respuesta válida;
-   turnos;
-   rondas;
-   tiempo;
-   puntuación;
-   errores;
-   finalización;
-   Set;
-   participación pública.

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
  Anti-Trivia               Pendiente  TBD   TBD          TBD            TBD
  Enlaces                   Pendiente  TBD   TBD          TBD            TBD
