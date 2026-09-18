# CUMPEO — Roadmap de Construcción

**Versión:** 1.0
**Última actualización:** 2026-09-18
**Estado global:** Bloque 0 cerrado · Bloque 1 en progreso (1/7)
**Rama:** feature/vertical-slice

---

## Índice

1. Estado global
2. Bloques
3. Detalle por bloque
4. Historial de actualizaciones
5. Convenciones

---

## 1. Estado global

| Métrica | Valor |
|---------|-------|
| Bloques totales | 7 (0 al 6) |
| Bloques cerrados | 1 (Bloque 0) |
| Bloques en progreso | 0 |
| Bloques pendientes | 6 |
| MVP alcanzado | No |
| Fecha estimada MVP | Por definir |

---

## 2. Bloques

| # | Bloque | Estado | Pasos | Commit cierre | Fecha |
|---|--------|--------|:-----:|---------------|-------|
| 0 | Cierre documental | ✅ CERRADO | 6/6 | — | 2026-09-18 |
| 1 | Modelo de datos extendido | ⬜ PENDIENTE | 0/7 | — | — |
| 2 | Shell de partida (Conductor + Pública) | ⬜ PENDIENTE | 0/5 | — | — |
| 3 | Móvil + moderación | ⬜ PENDIENTE | 0/7 | — | — |
| 4 | "¿Qué piensa el público?" | ⬜ PENDIENTE | 0/7 | — | — |
| 5 | 8 juegos restantes | ⬜ PENDIENTE | 0/8 | — | — |
| 6 | Migración e2e a Supabase (opcional) | ⬜ PENDIENTE | 0/? | — | — |

**★ MVP se alcanza al cerrar el Bloque 4 ★**

---

## 3. Detalle por bloque

### Bloque 0 — Cierre documental ✅ CERRADO

**Objetivo:** Incorporar al MASTER las 5 decisiones cerradas, la especificación de interfaces y las invariantes nuevas.

| # | Paso | Estado | Commit |
|---|------|--------|--------|
| 0.1 | Sección "Especificación de Interfaces" | ✅ | — |
| 0.2 | Matriz de responsabilidades | ✅ | — |
| 0.3 | 5 decisiones cerradas | ✅ | — |
| 0.4 | Definición cerrada de "¿Qué piensa el público?" | ✅ | — |
| 0.5 | Invariantes INV-161 a INV-188 | ✅ | — |
| 0.6 | Roadmap actualizado | ✅ | — |

**Notas:** Bloque puramente documental. No tocó código. El MASTER queda pendiente de integración manual de las secciones producidas.

---

### Bloque 1 — Modelo de datos extendido 🔄 EN PROGRESO (1/7)

**Objetivo:** Crear las entidades `MensajePublico` y `FotoPublica`, extender `ParticipantePartida` con `session_token`, e introducir la abstracción de Storage.

**Diseño cerrado:** Ver documento de diseño del Bloque 1 (producido en conversación).

#### Pasos

| # | Paso | Estado | Commit | Prompt archivado |
|---|------|--------|--------|------------------|
| 1.1 | Migración IndexedDB v3 + schema Postgres | ✅ | 7726c29 | bloque-1-paso-1.md |
| 1.2 | StorageAdapter (contrato + Local) | ⬜ PENDIENTE | — | — |
| 1.3 | MensajePublicoRepository + tests | ⬜ PENDIENTE | — | — |
| 1.4 | FotoPublicaRepository + tests | ⬜ PENDIENTE | — | — |
| 1.5 | Extensión ParticipanteRepository | ⬜ PENDIENTE | — | — |
| 1.6 | StorageAdapter Supabase + integration | ⬜ PENDIENTE | — | — |
| 1.7 | Commit atómico del bloque | ⬜ PENDIENTE | — | — |

#### Paso actual

**Paso 1.2 en preparación.**

#### Criterios de cierre del bloque

- [ ] Migración IndexedDB v3 aplicada sin pérdida de datos
- [ ] Schema Postgres extendido aplicado en Supabase Cloud
- [ ] Bucket `cumpeo-publico` creado
- [ ] Repos nuevos con tests unit verdes
- [ ] Repos nuevos con tests integration verdes
- [ ] `ParticipantePartida.session_token` funcionando en ambos adapters
- [ ] `StorageAdapter` con dos implementaciones conmutables
- [ ] `node --check` en todos los archivos nuevos
- [ ] `git status --short` limpio antes y después del commit
- [ ] Commit atómico del bloque

---

### Bloque 2 — Shell de partida (Conductor + Pública) ⬜ PENDIENTE

**Objetivo:** Crear el shell común de partida que permite enchufar cualquier juego sin rehacer UI.

#### Pasos (preliminares)

| # | Paso | Estado |
|---|------|--------|
| 2.1 | `ShellPartida`: cabecera + marcador + área de juego + panel conductor | ⬜ |
| 2.2 | `ShellPublica`: cabecera + marcador + área de juego (solo lectura) | ⬜ |
| 2.3 | Contrato `GameUI` | ⬜ |
| 2.4 | `estado_publico` derivado de `estado_juego` | ⬜ |
| 2.5 | Criterios de aceptación visuales | ⬜ |

---

### Bloque 3 — Móvil + moderación ⬜ PENDIENTE

**Objetivo:** Implementar la interfaz móvil con identificación por nombre, envío de mensajes y fotos, y cola de moderación en el conductor.

#### Pasos (preliminares)

| # | Paso | Estado |
|---|------|--------|
| 3.1 | Ruta `#/movil/:public_codigo` | ⬜ |
| 3.2 | Identificación por nombre + `session_token` | ⬜ |
| 3.3 | Pantalla principal: juego actual + marcador | ⬜ |
| 3.4 | Envío de mensajes → PENDIENTE | ⬜ |
| 3.5 | Envío de fotos → PENDIENTE | ⬜ |
| 3.6 | Conductor: cola de moderación | ⬜ |
| 3.7 | Pública: muro de mensajes + fotos APROBADOS | ⬜ |

---

### Bloque 4 — "¿Qué piensa el público?" ⬜ PENDIENTE

**Objetivo:** Primer juego completo. Cierra el MVP.

**Diseño cerrado:** Ver definición funcional en MASTER (sección pendiente de integración).

#### Pasos (preliminares)

| # | Paso | Estado |
|---|------|--------|
| 4.1 | Estructura de datos de encuesta | ⬜ |
| 4.2 | Conductor: preparar/seleccionar/activar pregunta | ⬜ |
| 4.3 | Móvil: responder A/B | ⬜ |
| 4.4 | Equipos: predicción antes de revelar | ⬜ |
| 4.5 | Pública: resultado en vivo | ⬜ |
| 4.6 | Regla: una encuesta activa; repetición si 0 respuestas o pronóstico nulo | ⬜ |
| 4.7 | Puntuación + cierre + actualización de marcador | ⬜ |

**★ Al cerrar este bloque se alcanza el MVP ★**

---

### Bloque 5 — 8 juegos restantes ⬜ PENDIENTE

**Objetivo:** Implementar los 8 juegos restantes en orden del GAMES.md.

#### Pasos (preliminares)

| # | Juego | Estado |
|---|-------|--------|
| 5.1 | Trivia | ⬜ |
| 5.2 | Memoricé | ⬜ |
| 5.3 | Canción Incompleta | ⬜ |
| 5.4 | Rosco | ⬜ |
| 5.5 | Pictionary | ⬜ |
| 5.6 | Historia Enredada | ⬜ |
| 5.7 | Anti-Trivia | ⬜ |
| 5.8 | Enlaces | ⬜ |

Cada juego se cierra con su propio bloque interno (GameDefinition + UI Conductor + UI Pública + tests + screenshot).

---

### Bloque 6 — Migración e2e a Supabase (opcional) ⬜ PENDIENTE

**Objetivo:** Migrar los 35 tests e2e de LocalAdapter a Supabase.

**Estado:** Opcional. Se decide al cerrar Bloque 5.

---

## 4. Historial de actualizaciones

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-09-18 | Creación del roadmap. Bloque 0 cerrado. Bloque 1 en preparación. |

---

## 5. Convenciones

### 5.1 Flujo de trabajo por paso
Se indica el PRÓXIMO PASO del roadmap

Se entrega PROMPT para agente externo

El agente externo construye y devuelve evidencia

Se pasa la evidencia al auditor

El auditor verifica:

Contrato del paso cumplido

Invariantes respetadas

Tests verdes

node --check

git status limpio

Si NO APROBADO → comandos de corrección exactos

Si APROBADO → se actualiza este roadmap y se pasa al próximo paso

### 5.2 Formato de evidencia obligatorio

El agente externo debe devolver siempre:

- `git diff --stat` de lo que tocó
- `npm test` output (tests unit)
- `npm run test:integration` output (si aplica)
- `node --check` output por archivo modificado
- `git status --short` antes y después
- Screenshots (si el paso incluye UI)

Sin esta evidencia, no se audita.

### 5.3 Formato de prompt para agente externo

Cada prompt incluye:

- **Contexto:** qué bloque, qué paso.
- **Objetivo:** qué se debe lograr.
- **Archivos a crear/modificar:** lista exacta.
- **Contratos/interfaces:** firmas esperadas.
- **Tests esperados:** qué debe testearse.
- **Criterios de aceptación:** lista verificable.
- **Qué NO hacer:** para evitar scope creep.
- **Evidencia a devolver:** según 5.2.

### 5.4 Versionado

- Cada actualización del roadmap incrementa versión.
- Los prompts de pasos cerrados se archivan en `docs/roadmap/pasos/`.
- Los commits del repo referencian el paso del roadmap.

---

**Fin del roadmap v1.0**