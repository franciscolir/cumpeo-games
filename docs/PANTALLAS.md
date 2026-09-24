# CUMPEO — Pantallas y UI

**Versión:** 1.0
**Estado:** Documentación del estado actual + TO-BE (rediseño propuesto).
**Última actualización:** 2026-09-24
**Propósito:** Referencia canónica de las pantallas del conductor y del
público. Describe qué existe hoy y qué se propone construir.

**Fuentes relacionadas:**
- `docs/MASTER.md` — modelo conceptual, invariantes, arquitectura.
- `docs/FORMULARIOS.md` — administración de contenido (sets y config de juego).
- `docs/GAMES.md` — mecánica funcional de cada juego.
- `docs/ROADMAP.md` — estado de bloques y pasos.

---

## Índice

1. Propósito y alcance
2. Mapa de pantallas
3. Vista del conductor
4. Vista pública
5. Estados y transiciones
6. Sistemas existentes
7. Gaps identificados
8. Plan de implementación sugerido (Bloque 8)
9. Referencias cruzadas

---

## 1. Propósito y alcance

Este documento define la **estructura de pantallas** de CUMPEO desde el punto
de vista de UI/UX. No duplica el modelo de datos ni la mecánica de los juegos:
los referencia.

**Dentro del alcance:**

- Estructura visual de las pantallas de conductor y pública.
- Inventario de elementos (top bar, scoreboard, controles, modales).
- Estados de UI y sus transiciones.
- Diferencias entre lo que ve el conductor y lo que ve el público.
- Gaps entre el estado actual y el objetivo.

**Fuera del alcance:**

- Mecánica funcional de cada juego (→ `GAMES.md`).
- Modelo de datos y persistencia (→ `MASTER.md`).
- Formularios de administración (→ `FORMULARIOS.md`).
- Criterios visuales detallados (→ `AC-VISUAL.md`).

**Regla:** este documento distingue explícitamente entre **estado actual**
(lo que existe hoy) y **TO-BE** (rediseño propuesto). No mezcla ambas
dimensiones sin marcarlas.

---

## 2. Mapa de pantallas

### 2.1 Pantallas del conductor

| Ruta | Rol | Archivo | Estado |
|------|-----|---------|--------|
| `#/` | Dashboard | `src/ui/dashboard.js` | ✅ Implementado |
| `#/circuitos` | Lista de circuitos | `src/ui/circuitos/lista.js` | ✅ |
| `#/circuitos/nuevo` | Nuevo circuito | `src/ui/circuitos/formulario.js` | ✅ |
| `#/circuitos/:id` | Editar circuito | `src/ui/circuitos/formulario.js` | ✅ |
| `#/sets` | Lista de sets | `src/ui/sets/lista.js` | ✅ |
| `#/sets/nuevo` | Nuevo set | `src/ui/sets/formulario.js` | ✅ |
| `#/sets/:id` | Editar set (dispatch por juego) | `src/ui/sets/formulario.js` | ✅ |
| `#/juegos/:codigo/config` | Config de juego | `src/ui/juegos/config.js` | ✅ |
| `#/partidas` | Lista de partidas | `src/ui/partidas/lista.js` | ✅ |
| `#/partidas/nueva` | Nueva partida | `src/ui/partidas/nueva.js` | ✅ |
| **`#/partidas/:id`** | **Shell de partida (conductor)** | **`src/ui/partidas/shell-partida.js`** | **⚠️ A rediseñar (Bloque 8)** |

### 2.2 Pantallas públicas

| Ruta | Rol | Archivo | Estado |
|------|-----|---------|--------|
| **`#/publica-nueva/:codigo`** | **Shell pública (nueva)** | **`src/ui/publica/shell-publica.js`** | **⚠️ A rediseñar (Bloque 8)** |
| `#/publica/:codigo` | Pantalla pública legacy | `src/ui/publica/pantalla.js` | ⚠️ Legacy |
| `#/movil/:codigo` | Móvil participante | `src/ui/movil/pantalla.js` | ✅ |

### 2.3 Pantallas técnicas

| Ruta | Rol | Archivo |
|------|-----|---------|
| `#/login` | Login (Supabase Auth) | `src/ui/login.js` |

---

## 3. Vista del conductor

### 3.1 Estado actual (`ShellPartida`)

Archivo: `src/ui/partidas/shell-partida.js` (~1614 líneas).

**Estructura actual:**
┌─────────────────────────────────────────────────────────────┐
│ _renderTopBar │
│ CUMPEO Partida ESTADO [CÓDIGO] [Tomar control / etc.] │
├─────────────────────────────────────────────────────────────┤
│ _renderHeroScoreboard │
│ Juego activo Eq1 pts VS Eq2 pts │
│ Ronda N │
│ Fase │
├─────────────────────────────────────────────────────────────┤
│ │
│ Área de juego (GameUI.renderizarAreaJuego) │
│ │
├─────────────────────────────────────────────────────────────┤
│ │
│ Panel conductor (GameUI.renderizarPanelConductor) │
│ │
├─────────────────────────────────────────────────────────────┤
│ Cola de moderación (si aplica) │
└─────────────────────────────────────────────────────────────┘

text

**Elementos existentes:**

| Elemento | Ubicación actual | Notas |
|----------|------------------|-------|
| `TIME` | Dentro de cada GameUI (área de juego) | No unificado. Cada juego renderiza su propio timer. |
| `SCORE` | `_renderHeroScoreboard` | Unificado. Usa `fmtPuntos`. |
| `ESTADO` | `_renderTopBar` (`partida.estado`) | Muestra CONFIGURANDO / EN_CURSO / PAUSADO / FINALIZADA / DESCARTADA. |
| `START / COMIENZO` | `_renderTopBar` (botón "Comenzar") | Solo en `CONFIGURANDO`. |
| `PAUSA` | `_renderTopBar` (botón "Pausar") | Solo en `EN_CURSO`. |
| `REANUDAR` | `_renderTopBar` (botón "Reanudar") | Solo en `PAUSADO`. |
| `DESCARTAR` | `_renderTopBar` (botón "Descartar") | Solo en `EN_CURSO`. |
| `FIN` | `_renderTopBar` (botón "Fin") | En `EN_CURSO` o `PAUSADO`. |
| `VER PÚBLICA` | `_renderTopBar` (link) | Abre en nueva pestaña. |
| `TOMAR CONTROL` | `_renderTopBar` | Solo si no tiene control. |
| Selector A/B | Dentro de cada GameUI | No unificado. |
| `RESPUESTA` | Dentro de cada GameUI | No unificado. |
| `CORRECTO / ERROR / SIGUIENTE` | Dentro de cada GameUI | No unificado. |
| `AJUSTES` | ❌ No existe | — |
| `MODO ESPERA` | ❌ No existe | — |
| `EXTRAS` | ❌ No existe | — |
| Cola de moderación | `_renderColaModeracion` | Existe. |

**Notas:**

- El `ShellPartida` **no tiene un panel derecho fijo**. La estructura es
  vertical: top bar → hero → game container → panel conductor.
- El `GameUI` **renderiza dos áreas separadas**: `renderizarAreaJuego` y
  `renderizarPanelConductor`. El shell las coloca en el mismo flujo vertical.

### 3.2 Estructura TO-BE

**Layout objetivo (dos columnas):**
┌─────────────────────────────────────────────────────────────┐
│ BARRA SUPERIOR │
│ TIME SCORE A : SCORE B ESTADO DEL JUEGO │
├───────────────────────────────────────┬─────────────────────┤
│ │ │
│ │ PANEL CONDUCTOR │
│ │ │
│ │ START / PAUSE │
│ ÁREA PRINCIPAL DEL JUEGO │ FINISH / NEXT │
│ │ MODO ESPERA │
│ (GameUI.renderizarAreaJuego) │ │
│ │ [ A ] [ B ] │
│ │ RESPUESTA │
│ │ CORRECTO / ERROR / │
│ │ SIGUIENTE │
│ │ │
│ │ AJUSTES │
├───────────────────────────────────────┴─────────────────────┤
│ AVATAR REACT │ SOUND BAR │ EXTRAS │
│ (en construcción) │ (en construcción) │ │
└─────────────────────────────────────────────────────────────┘

text

**Cambios conceptuales:**

1. **Barra superior unificada.** `TIME + SCORE + ESTADO` en una sola franja
   horizontal, siempre visible, gestionada por el shell (no por cada GameUI).
2. **Panel derecho dedicado.** Los controles del conductor salen del flujo
   vertical y van a una columna derecha fija.
3. **Área de juego más grande.** Al mover los controles a la derecha, el
   área de juego ocupa 2/3 o 3/4 de la pantalla.
4. **Zona inferior.** Espacios reservados para Avatar React, Sound Bar y
   Extras.
5. **Modales** centralizados (pausa, ajustes).

### 3.3 Elementos por elemento

#### TIME

- **Estado actual:** el shell conductor renderiza un único `#shell-timer`
  en la franja superior (**8.2**, `_renderShellTimer(estadoJuego)`), que
  muestra `estadoJuego.tiempo_restante_seg` (formato `SS` o `MM:SS`) o no
  se renderiza si el juego no expone tiempo (p. ej. Historia Enredada).
  Cada GameUI aún renderiza además su propio timer (`#pic-timer`,
  `#ci-timer-publico`, `#rosco-pub-timer-eq1`, etc.): duplicación
  transitoria hasta 8.7.
- **TO-BE:** un único `#shell-timer` en la barra superior, gestionado por
  el shell. Los GameUIs exponen el tiempo restante como parte del estado
  de juego (`tiempo_restante_seg` ya existe en varios).
- **Regla:** no todos los juegos tienen timer (Historia Enredada no, por
  ejemplo). El `TIME` se oculta si el juego no lo requiere.

#### SCORE

- **Estado actual:** `_renderHeroScoreboard`. Renderiza `equipo1.puntaje`
  y `equipo2.puntaje` con `fmtPuntos`.
- **TO-BE:** mantener. Mover al centro de la barra superior.
- **Fuente de datos:** `equipos` (de `equipo_partidas`). No crear un
  segundo sistema de puntuación.

#### ESTADO DEL JUEGO

- **Estado actual:** `partida.estado` en `_renderTopBar`.
- **TO-BE:** ampliar a **estados de UI** derivados (ver §5):
  - `MODO ESPERA` (deriva de `CONFIGURANDO` o de estado UI local).
  - `JUEGO ACTIVO` (deriva de `EN_CURSO`).
  - `PAUSA` (deriva de `PAUSADO`).
  - `FIN` (deriva de `FINALIZADA`).
- **Regla:** `MODO ESPERA` **no es un estado del dominio**. Es un estado
  de UI derivado. Ver §5.

#### START / PAUSE

- **Estado actual:** botones separados "Comenzar" / "Pausar" / "Reanudar"
  en `_renderTopBar`.
- **TO-BE:** **un único botón toggle** `START / PAUSE`:
  - Si estado es `MODO ESPERA` o `PAUSADO`: muestra `START`.
  - Si estado es `JUEGO ACTIVO`: muestra `PAUSE`.
- **Comportamiento:**
  - `START` → `partida.comenzarPartida` o `partida.reanudarJuego`.
  - `PAUSE` → `partida.pausarJuego` + abrir modal de pausa + iniciar
    contador de pausa.

#### FINISH / NEXT

- **Estado actual:** botón "Fin" en `_renderTopBar` (descartar partida).
- **TO-BE:** renombrar a `FINISH / NEXT`. Su función depende del estado:
  - En `EN_CURSO`: finaliza el juego activo o avanza al siguiente.
  - En `PAUSADO`: finaliza o descarta.
- **Regla:** conservar la confirmación para acciones destructivas
  (`window.confirm` actual).

#### MODO ESPERA

- **Estado actual:** ❌ no existe.
- **TO-BE:** botón que fuerza la transición `JUEGO ACTIVO → MODO ESPERA`.
- **Comportamiento:**
  - Suspende el juego (no finaliza).
  - Conserva el estado actual del juego.
  - Cambia la UI a estado "espera".
  - La vista pública recibe el estado y muestra su modo espera.

#### Selector A/B

- **Estado actual:** existe en algunos GameUIs (Pictionary, Rosco,
  Anti-Trivia). No unificado.
- **TO-BE:** un único componente `SelectorEquipo` en el panel derecho.
  Los GameUIs leen `estadoJuego.equipo_actual`.

#### RESPUESTA

- **Estado actual:** cada GameUI expone su propio elemento.
- **TO-BE:** slot reservado en el panel derecho, con contenido específico
  por juego.

#### CORRECTO / ERROR / SIGUIENTE

- **Estado actual:** cada GameUI define sus botones (`marcar-acierto-pictionary`,
  `marcar-error-pictionary`, `pasar-palabra-pictionary`).
- **TO-BE:** conjunto de botones unificado visualmente en el panel derecho.
  Las acciones siguen siendo específicas por juego (`onAccion` con tipo).

#### AJUSTES

- **Estado actual:** modelo creado en 8.1 (`AjustesGlobales` singleton, store
  `ajustes_globales`, tabla Supabase 0019). UI ❌ no existe (es 8.6).
  Los ajustes de set/juego siguen en `#/sets/:id` o `#/juegos/:codigo/config`.
- **TO-BE:** botón `AJUSTES` en el panel derecho que abre un modal.
  Dentro del modal:
  - **Configuración general de partida:**
    - Tiempo máximo en pausa (default: 2 minutos, `tiempo_max_pausa_seg`).
  - **Configuración específica del juego activo** (opcional, si el juego
    lo requiere).
- **Persistencia:** `AjustesGlobales` (singleton `id='default'`), fila única
  en IndexedDB y en Supabase.

#### Zona inferior

##### AVATAR REACT

- **Estado actual:** ❌ no existe.
- **TO-BE:** espacio reservado. Placeholder "En construcción".
- **Especificación:** pendiente.

##### SOUND BAR

- **Estado actual:** ❌ no existe.
- **TO-BE:** espacio reservado. Placeholder "En construcción".
- **Especificación:** pendiente.

##### EXTRAS

- **Estado actual:** modelo (entidad `Extra`, `ExtraUso`) existe. UI ❌ no existe.
- **TO-BE:** botón/acceso a herramientas auxiliares:
  - Tómbola de nombres.
  - Dados.
  - Dinamita.
- **Regla:** `Extras` **no son funciones propias del juego**. Son
  herramientas auxiliares del conductor.

### 3.4 Modal de pausa (TO-BE)

**Estado actual:** 🕓 **parcial — implementado en 8.3.** El modal
`#modal-pausa` se abre al presionar `PAUSE` (tras `pausarJuego` OK),
muestra el contador y el límite, y ofrece `REANUDAR`. **Quedan pendientes**
(el botón `MODO ESPERA` y la auto-transición): ver §3.5 y deuda #123.

**Contenido conceptual:**
┌───────────────────────────────┐
│ JUEGO EN PAUSA │
│ │
│ Tiempo en pausa: │
│ 01:24 │
│ │
│ [ REANUDAR ] │
│ [ MODO ESPERA ] │
└───────────────────────────────┘

text

**Comportamiento:**

- ✅ Se abre al presionar `PAUSE` (8.3: `#btn-pausar` → `pausarJuego` →
  `_abrirModalPausa`; montado en `document.body`, `cerrable: false`).
- ✅ Muestra un contador de tiempo de pausa (8.3: `#pausa-contador`,
  desde `pausado_at` de 8.1, `pausado_at` validado presente y parseable,
  `setInterval` 1s). ~~Línea "Tiempo máximo: MM:SS"~~ eliminada en D4.
- ✅ Botón `REANUDAR` (8.3: `#btn-pausa-reanudar`): cierra el modal,
  transiciona `PAUSADO → EN_CURSO`.
- ⬜ Botón `MODO ESPERA`: cierra el modal, transiciona a `MODO ESPERA`. (8.4)
- ⬜ Si el contador alcanza el **tiempo máximo configurado**:
  - Cierra el modal.
  - Detiene el contador.
  - Transiciona a `MODO ESPERA`.
  - **No finaliza el juego.**
  - **No reinicia el juego.**
  (Deuda #123 — depende de 8.4.)

**Reutilización:** ~~el proyecto no tiene componente `Modal` compartido.~~
**Componente `Modal` creado en `src/ui/components/modal.js` (8.0).
Rosco y Memoria migrados al componente. El modal de pausa lo reutiliza
desde 8.3.**

### 3.5 Modo espera (TO-BE)

**Estado actual:** ❌ no existe como concepto.

**Comportamiento:**

- **Conductor:** muestra claramente `MODO ESPERA` en la barra superior y
  los controles apropiados para retomar el juego.
- **Público:** recibe el estado y muestra su pantalla de espera.
- **Regla:** `MODO ESPERA ≠ FIN`. La partida sigue viva.

**Cómo se llega:**

1. El conductor presiona el botón `MODO ESPERA` (transición manual).
2. El contador de pausa alcanza el tiempo máximo configurado
   (transición automática).

### 3.6 Zona inferior

Ver §3.3 "Zona inferior".

---

## 4. Vista pública

### 4.1 Estado actual (`ShellPublica`)

Archivo: `src/ui/publica/shell-publica.js` (~2130 líneas).

**Estructura actual:**
┌─────────────────────────────────────────────────────────────┐
│ Header público │
│ CUMPEO Código [tema] │
├───────────────────────────────────────┬─────────────────────┤
│ │ │
│ Escenario del juego │ Galería │
│ (según juego activo) │ │
│ │ Anuncio │
│ │ │
│ │ Marcador │
│ │ │
│ │ QR │
├───────────────────────────────────────┴─────────────────────┤
│ Muro de mensajes (marquee) │
└─────────────────────────────────────────────────────────────┘

text

**Elementos existentes:**

| Elemento | Ubicación actual | Notas |
|----------|------------------|-------|
| Header público | Top | Con código y toggle de tema |
| Escenario por juego | Centro | `_renderEscenarioX` por juego |
| Galería de fotos | Columna derecha | `_renderGaleria` |
| Anuncio | Columna derecha | `_renderAnuncio` |
| Marcador | Columna derecha | `_renderMarcador` |
| QR para móvil | Columna derecha | `_renderQR` |
| Muro de mensajes | Footer | Marquee |
| Pantalla de espera | Escenario por juego | `fase === 'INICIO_RONDA'` |

**Timers por juego (público):**

- Rosco: `_roscoTimerEq1`, `_roscoTimerEq2`.
- Canción Incompleta: `_ciTimer`.
- Pictionary: `_picTimer`.
- Trivia: `_triviaTimer`.
- Anti-Trivia: `_antiTriviaTimer`.
- Enlaces: `_enlacesTimer`.

**Nota:** el shell público tiene lógica por juego. Es un shell específico
con dispatch interno, no un shell genérico.

### 4.2 Estructura TO-BE

**Layout objetivo:**
┌──────────────────────────────────────────┐
│ TIME │
│ SCORE A : SCORE B │
├──────────────────────────────────────────┤
│ │
│ │
│ ÁREA PÚBLICA DEL JUEGO │
│ │
│ contenido específico del juego │
│ │
│ │
├──────────────────────────────────────────┤
│ MENSAJES DESDE MÓVIL │
└──────────────────────────────────────────┘

text

**Cambios conceptuales:**

1. **Barra superior** con `TIME + SCORE A : SCORE B`. Actualmente no hay
   una barra superior unificada en la pública; cada escenario renderiza
   su propio marcador.
2. **Unificación del escenario.** Cada juego tiene su `_renderEscenarioX`.
   El objetivo es un contrato común (`renderizarEscenarioPublico`) análogo
   al `GameUI` del conductor.
3. **Footer de mensajes** ya existe. Mantener.

### 4.3 Elementos que NO van en público

La vista pública **NO** debe mostrar:

- `START`
- `PAUSE`
- `FINISH`
- `NEXT`
- `MODO ESPERA` (como control)
- Selector `A / B` del conductor
- `CORRECTO`
- `ERROR`
- `SIGUIENTE`
- `AJUSTES`
- `EXTRAS`

El público **ve el resultado** de estas acciones, pero no las ejecuta.

### 4.4 Mensajes desde móvil

- **Estado actual:** ✅ existe. Muro de mensajes (marquee) en el footer.
- **TO-BE:** mantener. Sin cambios.

---

## 5. Estados y transiciones

### 5.1 Estados del dominio

Definidos en `MASTER.md` §4.7 y §4.8.

**`Partida.estado`:**
CONFIGURANDO → EN_CURSO → { FINALIZADA, DESCARTADA, EXPIRADA }

text

**`JuegoEjecutado.estado`:**
PENDIENTE → EN_CURSO ⇄ PAUSADO → FINALIZADO
→ NO_JUGADO

text

**Regla:** estos estados son del dominio. Persisten en la BD.

### 5.2 Estados de UI (propuestos)

Los estados de UI **derivan** del dominio o son locales al shell.

| Estado UI | Deriva de | Persistido |
|-----------|-----------|------------|
| `MODO_ESPERA` | `CONFIGURANDO` o estado local del shell | ❌ |
| `JUEGO_ACTIVO` | `EN_CURSO` | ❌ (deriva) |
| `PAUSA` | `PAUSADO` | ❌ (deriva) |
| `FIN` | `FINALIZADA` | ❌ (deriva) |

**Importante:** `MODO ESPERA` **no se agrega al modelo de datos**. Es un
estado de UI. El shell lo maneja localmente. Si el conductor recarga la
página, el estado se recalcula desde `Partida.estado` + `JuegoEjecutado.estado`.

### 5.3 Diagrama de transiciones
MODO ESPERA
│
│ START
▼
JUEGO ACTIVO
│
│ PAUSE
▼
PAUSA
│
├──────── START ────────► JUEGO ACTIVO
│
├──── MODO ESPERA ─────► MODO ESPERA
│
└── tiempo máximo ─────► MODO ESPERA

JUEGO ACTIVO
│
│ FINISH
▼
FIN / TRANSICIÓN

text

**Mapeo a acciones reales:**

| Transición UI | Acción de dominio |
|---------------|-------------------|
| MODO ESPERA → JUEGO ACTIVO | `comenzarPartida` o `reanudarJuego` |
| JUEGO ACTIVO → PAUSA | `pausarJuego` |
| PAUSA → JUEGO ACTIVO | `reanudarJuego` |
| PAUSA → MODO ESPERA | `pausarJuego` + estado UI local |
| JUEGO ACTIVO → MODO ESPERA | estado UI local (sin cambio de dominio) |
| JUEGO ACTIVO → FIN | `finalizarJuego` |
| FIN → siguiente juego | `iniciarJuego` |

**Regla:** las transiciones que tocan el dominio usan las acciones ya
existentes (`comenzarPartida`, `pausarJuego`, `reanudarJuego`,
`finalizarJuego`). Las transiciones puramente UI no tocan el dominio.

---

## 6. Sistemas existentes

### 6.1 Timers

- Componente: `crearTimer` en `src/ui/games/_shared/timer.js`.
- Uso actual: por juego, en el área de juego del conductor y en el shell
  público.
- **No hay un timer central.** Cada GameUI crea el suyo.

### 6.2 Modales

- **Componente Modal compartido en `src/ui/components/modal.js`.** Rosco y Memoria ya migrados.
- Otras acciones destructivas usan `window.confirm` y `window.alert`.

### 6.3 Configuración

- Por juego: `#/juegos/:codigo/config`.
- Por set: `#/sets/:id`.
- **No hay configuración general de partida.**

### 6.4 Persistencia y sincronización

- **Realtime:** `SupabaseAdapter.suscribir` en conductor y pública.
- **Polling fallback:** `setInterval(2s)` con `LocalAdapter`.
- **Control de partida:** `ControlService` (lease de 30s, heartbeat cada 10s).

---

## 7. Gaps identificados

| # | Gap | Impacto | Complejidad | Prioridad |
|---|-----|---------|-------------|-----------|
| 1 | ~~No hay componente `Modal` compartido~~ **✅ resuelto en 8.0** | Cada GameUI implementa modales inline | Media | Alta |
| 2 | ~~No hay `pausado_at` en `JuegoEjecutado`~~ **✅ resuelto en 8.1** | No se puede medir tiempo de pausa | Media | Alta |
| 3 | ~~No hay sistema de "ajustes generales"~~ **✅ resuelto en 8.1** (modelo; UI en 8.6) | No se puede configurar tiempo máx de pausa | Media | Alta |
| 4 | No hay botón `MODO ESPERA` | El conductor no puede forzar el estado | Baja | Media |
| 5 | No hay `AJUSTES` global | No hay punto de entrada a config general | Media | Media |
| 6 | No hay `EXTRAS` UI | No se pueden usar herramientas auxiliares | Alta | Media |
| 7 | No hay `AVATAR REACT` | Reservado, sin especificación | TBD | Baja |
| 8 | No hay `SOUND BAR` | Reservado, sin especificación | TBD | Baja |
| 9 | `CORRECTO / ERROR / SIGUIENTE` por juego, no unificados | Inconsistencia visual | Media | Media |
| 10 | Selector A/B por juego, no unificado | Inconsistencia visual | Media | Media |
| 11 | ~~Barra superior fragmentada (cada GameUI renderiza su timer)~~ **⏳ parcialmente resuelto en 8.2** (shell con `#shell-timer`; timers de GameUI aún activos, duplicación hasta 8.7) | Inconsistencia visual | Media | Media |

---

## 8. Plan de implementación sugerido (Bloque 8)

**Bloque 8 — Rediseño del shell de partida.**

### Pasos propuestos

| # | Paso | Qué hace | Complejidad | Cierra gap |
|---|------|----------|-------------|------------|
| 8.0 | `Modal` componente compartido | Botón, título, contenido, acciones | Media | 1 |
| 8.1 | `pausado_at` en `JuegoEjecutado` + ajustes generales | Migración v7 + Supabase 0019 + AjustesGlobales | Alta | 2, 3 |
| 8.2 | Barra superior unificada (conductor) | TIME en el shell (`#shell-timer`); SCORE/ESTADO quedan donde están hasta 8.5 | Media | 11 (parcial) |
| 8.3 | Modal de pausa + contador | Modal de 8.0 en `document.body` (`#modal-pausa`, `cerrable: false`) + contador desde `pausado_at` de 8.1 + límite de ajustes; `REANUDAR` opera. Auto-transición y `MODO ESPERA` → 8.4 (deuda #123) | Media | 1, 2, 3 (parcial: botón/estado MODO ESPERA en 8.4) |
| 8.4 | Botón `MODO ESPERA` + estado UI | Estado UI + botón | Media | 4 |
| 8.5 | Panel conductor unificado (conductor) | Shell unifica START/PAUSE, FINISH/NEXT, A/B, CORRECTO/ERROR/SIGUIENTE | Alta | 9, 10 |
| 8.6 | `AJUSTES` global | Modal/pantalla nueva | Media | 5 |
| 8.7 | Refactor de los 9 GameUIs al panel unificado | Refactor masivo | Muy alta | — |
| 8.8 | Zona inferior (placeholder) | Espacios reservados Avatar + Sound | Baja | 7, 8 |
| 8.9 | `EXTRAS` UI | Tómbola, Dados, Dinamita | Alta | 6 |
| 8.10 | Barra superior unificada (pública) | TIME + SCORE en el shell público | Media | 11 |

### Notas

- **Bloque 8 es un bloque grande.** Puede tomar varias sesiones.
- Los pasos **8.0, 8.1** son prerequisitos para varios otros.
- El paso **8.7** (refactor de los 9 GameUIs) es el más riesgoso: puede
  introducir regresiones. Requiere tests por cada GameUI.
- Avatar React y Sound Bar quedan como **espacios reservados**. No hay
  especificación de qué harán.

---

## 9. Referencias cruzadas

| Documento | Qué contiene |
|-----------|--------------|
| `docs/MASTER.md` | Modelo de datos, invariantes, arquitectura, repos |
| `docs/FORMULARIOS.md` | Administración de contenido (sets, config de juego) |
| `docs/GAMES.md` | Mecánica funcional de cada juego |
| `docs/ROADMAP.md` | Bloques y pasos |
| `docs/AUDITORIA.md` | Deudas técnicas |
| `docs/CONTINUIDAD.md` | Prompt de retoma |
| `docs/AC-VISUAL.md` | Criterios de aceptación visual |

---

**Fin del documento v1.0**

Este documento se actualiza al cerrar el Bloque 8 o si cambia el rediseño
propuesto.