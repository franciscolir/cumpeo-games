# CUMPEO — Roadmap de Construcción

**Versión:** 1.0
**Última actualización:** 2026-09-18
**Estado global:** Bloques 0, 1, 2, 3, 4, 5 cerrados · Bloque 6 pospuesto · Bloque 7 en progreso (11/16) · ★ MVP alcanzado ★
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
| Bloques totales | 8 (0 al 7) |
| Bloques cerrados | 6 (Bloques 0, 1, 2, 3, 4, 5) |
| Bloques en progreso | 1 (Bloque 7) |
| Bloques pendientes | 1 (Bloque 6, opcional) |
| MVP alcanzado | Sí (al cerrar Bloque 4, 2026-09-21) |
| Fecha estimada MVP | Alcanzado |


## 2. Bloques

| # | Bloque | Estado | Pasos | Commit cierre | Fecha |
|---|--------|--------|:-----:|---------------|-------|
| 0 | Cierre documental | ✅ CERRADO | 6/6 | — | 2026-09-18 |
| 1 | Modelo de datos extendido | ✅ CERRADO | 6/6 | 7c3288f | 2026-09-18 |
| 2 | Shell de partida (Conductor + Pública) | ✅ CERRADO | 13/13 | 5e32d5b | 2026-09-19 |
| 3 | Móvil + moderación | ✅ CERRADO | 6/6 | 9ca4e7a | 2026-09-19 |
| 4 | "¿Qué piensa el público?" | ✅ CERRADO | 13/13 | 2e19767 | 2026-09-21 |
| 5 | Juegos restantes | ✅ CERRADO | 11/11 | 9b7dfdc | 2026-09-23 |
| 6 | Migración e2e a Supabase (opcional) | ⏸️ POSPUESTO | — | — | 2026-09-23 |
| 7 | Formularios de sets por juego | 🔄 EN PROGRESO | 11/16 | — | — |

**★ MVP se alcanza al cerrar el Bloque 4 ★**
**Decisión al cerrar Bloque 5 (2026-09-23):** POSPUESTO INDEFINIDAMENTE.

Razones:
- Los 99 integration tests ya cubren Supabase (adapter, repos, RPCs, RLS, Realtime, Auth).
- Los ~215 e2e cubren la UI con LocalAdapter.
- Migrar e2e a Supabase introduce flakiness (rate limiting, red) y lentitud (~2h por corrida).
- El MVP está completo y testeado con la combinación óptima: unit + integration + e2e.

Si en el futuro aparece una necesidad concreta de e2e contra Supabase, se retoma.

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

### Bloque 1 — Modelo de datos extendido ✅ CERRADO (6/6)

**Objetivo:** Crear las entidades `MensajePublico` y `FotoPublica`, extender `ParticipantePartida` con `session_token`, e introducir la abstracción de Storage.

**Diseño cerrado:** Ver documento de diseño del Bloque 1 (producido en conversación).

#### Pasos

| # | Paso | Estado | Commit | Prompt archivado |
|---|------|--------|--------|------------------|
| 1.1 | Migración IndexedDB v3 + schema Postgres | ✅ | 7726c29 | bloque-1-paso-1.md |
| 1.2 | StorageAdapter (contrato + Local) | ✅ | 70034a1 | bloque-1-paso-2.md |
| 1.3 | MensajePublicoRepository + tests | ✅ | 4b6d350 | bloque-1-paso-3.md |
| 1.4 | FotoPublicaRepository + tests | ✅ | 801bf0a | bloque-1-paso-4.md |
| 1.5 | Extensión ParticipanteRepository | ✅ | 2aee4f6 | bloque-1-paso-5.md |
| 1.6 | StorageAdapter Supabase + integration | ✅ | 7c3288f | bloque-1-paso-6.md |
| 1.7 | Commit atómico del bloque | ⬜ PENDIENTE | — | — |

#### Paso actual

**Bloque 1 cerrado. Bloque 2 en preparación (Shell de partida).**
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

### Bloque 2 — Shell de partida (Conductor + Pública) ✅ CERRADO (13/13)

**Objetivo:** Crear el shell común de partida que permite enchufar cualquier juego sin rehacer UI.

#### Pasos (preliminares)
| # | Paso | Estado | Commit | Prompt archivado |
|---|------|--------|--------|------------------|
| 2.1 | Criterios de aceptación visuales (AC-VISUAL) | ✅ | 5c8dff0 | — |
| 2.2 | Contrato GameUI | ✅ | 42d622c | bloque-2-paso-2.md |
| 2.3 | ShellPartida (Conductor) | ✅ | 73f0cbf | bloque-2-paso-3.md |
| 2.3a | Login programático e2e | ✅ | 73f0cbf | bloque-2-paso-3.md |
| 2.3b | Extender obtenerContextoEspera con juego_codigo | ✅ | 927ceac | bloque-2-paso-3b.md |
| 2.3c | Corregir shell (data-accion, colores) | ✅ | 13a01aa | bloque-2-paso-3c.md |
| 2.4a | Shell pública base | ✅ | c75fcf5 | bloque-2-paso-4a.md |
| 2.4b.1 | Conectar Storage + repos al bootstrap | ✅ | 547f005 | bloque-2-paso-4b1.md |
| 2.4b.2 | Galería de fotos + QR en shell | ✅ | bc7f9e0 | bloque-2-paso-4b2.md |
| 2.4c | Marquee + próximo desafío | ✅ | 92f54b6 | bloque-2-paso-4c.md |
| 2.5 | Migrar Trivia al shell | ✅ | 772316f | bloque-2-paso-5.md |
| 2.6 | Eliminar consola.js viejo | ⬜ PENDIENTE | — | — |


**Bloque 2 cerrado. Bloque 3 en preparación (Móvil + moderación).**
**Nota:** El paso "2.4 Portar lógica de consola.js" fue cancelado porque la
lógica ya fue portada durante el paso 2.3 (ShellPartida). Los pasos 2.5, 2.6
y 2.7 originales fueron renumerados a 2.4, 2.5 y 2.6 respectivamente.
---

### Bloque 3 — Móvil + moderación ✅ CERRADO (6/6)

**Objetivo:** Implementar la interfaz móvil con identificación por nombre, envío de mensajes y fotos, y cola de moderación en el conductor.

#### Pasos (preliminares)

| # | Paso | Estado | Commit | Prompt archivado |
|---|------|--------|--------|------------------|
| 3.1 | Ruta #/movil/:codigo + pantalla base | ✅ | c981d3e | — |
| 3.2 | Identificación + session_token | ✅ | 63c7f7e | — |
| 3.3 | Envío de mensajes | ✅ | 8e7e614 | — |
| 3.4 | Envío de fotos | ✅ | 3b3c84a | — |
| 3.5 | Cola de moderación | ✅ | fc44d02 | — |
| 3.6 | Móvil + moderación | ✅ | 9ca4e7a | 2026-09-19 |
**Bloque 3 cerrado. Bloque 4 en progreso (12/13) ("¿Qué piensa el público?").**
**Nota:** El paso "3.3 Pantalla principal del móvil" fue fusionado
con "3.4 Envío de mensajes" porque la pantalla ya existía (pasos 3.1 + 3.2).
El Bloque 3 pasa de 7 a 6 pasos.
---

### Bloque 4 — "¿Qué piensa el público?" ✅ CERRADO (13/13)

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
**Bloque 4 cerrado. ★ MVP alcanzado ★. Bloque 5 en progreso.**
---

### Bloque 5 — Juegos restantes ✅ CERRADO (11/11)

| # | Juego / Paso | Estado | Commits clave |
|---|--------------|--------|---------------|
| 5.0 | Refactor: `cargarItemsDeJuego` + `crearTimer` | ✅ APROBADO | 96ba9c5 |
| 5.1 | Trivia (conductor + editor + mecánica) | ✅ APROBADO | 58e2043, a2cafb5, efc9b9a |
| 5.2 | Rosco end-to-end | ✅ APROBADO | 79c4493, 7ec5603, a90e23b, 94a89d1, 08ca2d2 |
| 5.3 | Canción Incompleta end-to-end | ✅ APROBADO | 1934d99, ee9a42c, 8323849, a9d76d5 |
| 5.4 | Pictionary end-to-end | ✅ APROBADO | d076f9e, ef53390, c84613e, 0835a28, 3eb742d |
| 5.5 | Historia Enredada end-to-end | ✅ APROBADO | 65e86e6, b7f6f25, c982efd, 068f151, dc9d34e |
| 5.6 | Trivia end-to-end | ✅ APROBADO | 9269eb1, 2d9190d, 8bee291, 38eca68, 0acedd5, 28e8b6f, afba7a0 |
| 5.7 | Memoricé end-to-end | ✅ APROBADO | cc06fee, f158afb, 62617c0, a00b8d1, 34a27fe, 79cc2b7, d1ff93d |
| 5.8 | Anti-Trivia end-to-end | ✅ CERRADO | 92cc14c, 141093e, c384044, 14a3cf3, 5d9cd95, 1d865dd |
| 5.9 | Enlaces — cerrar mecánica + implementar | ✅ CERRADO | 9496347 (pre), 53f29e9 (a), acc423f (b), d5e0694 (c), 9b7dfdc (d) |

#### Detalle del paso 5.8 — Anti-Trivia (CERRADO)

| Sub-paso | Descripción | Estado | Commit |
|----------|-------------|--------|--------|
| 5.8-pre | Cierre documental de mecánica | ✅ APROBADO | — |
| 5.8-pre-fix | ESPERA_VALIDACION + confirmaciones tras time up | ✅ APROBADO | d00f066 |
| 5.8a | GameDefinition, validación de set y reducers | ✅ APROBADO | 92cc14c |
| 5.8b | UI Conductor + shell actions | ✅ APROBADO (retroactivo) | 141093e |
| 5.8c | UI Pública + timer | ✅ APROBADO (retroactivo) | c384044 |
| 5.8d | e2e + heartbeat en shell | ❌ RECHAZADO | 14a3cf3 |
| 5.8-revert | Revert heartbeat + C1 (unificar ganador) | ✅ APROBADO | 5d9cd95 |
| 5.8e | Heartbeat en ControlService | ✅ APROBADO | 1d865dd |

**Nota:** el commit 14a3cf3 introdujo un heartbeat en `shell-partida.js` (scope creep) que causó regresión sistémica en e2e de Memoricé, Rosco, Historia Enredada y QPEP. Revertido en `5d9cd95` y reimplementado correctamente en `1d865dd` (5.8e). Anti-Trivia: 12/12 e2e. Memoricé: 10/10. Run completo: 179/184, con 4 fallas residuales (2 pre-existentes, 2 flaky).

**Nota:** Los sub-pasos (5.x-pre, 5.xa, 5.xb, etc.) se documentan en
`docs/roadmap/pasos/bloque-5.x-cierre.md` y no cuentan como pasos separados.
El detalle granular queda en los acta de cierre de cada juego.

**Reordenamiento (5.1c):** se prioriza por madurez de mecánica. Rosco,
Canción Incompleta, Pictionary e Historia Enredada tienen mecánica cerrada.
Trivia, Memoricé, Anti-Trivia y Enlaces requieren decisiones de diseño antes
de implementarse.


### Bloque 6 — Migración e2e a Supabase (opcional) ⬜ PENDIENTE

**Objetivo:** Migrar los 35 tests e2e de LocalAdapter a Supabase.

**Estado:** Opcional. Se decide al cerrar Bloque 5.

---

### Bloque 7 — Formularios de sets por juego 🔄 EN PROGRESO (17/19)

**Objetivo:** Crear formularios de sets dedicados por juego y rediseñar el rosco.

| # | Paso | Estado | Commit |
|---|------|--------|--------|
| 7.0a | Refactor: extraer editores QPEP/Trivia | ✅ APROBADO | dfb901c |
| 7.1a | Dominio de Rosco: N rondas = N sets | ✅ APROBADO | 12145ae |
| 7.1b | UI conductor de Rosco: modal inicio | ✅ APROBADO | 0f67f43 |
| 7.1c | Rediseño del rosco (conductor + pública) | ✅ APROBADO | 3908371 |
| 7.1d | Editor de Rosco: grilla 27 filas | ✅ APROBADO | 9771694 |
| 7.2a | Modelo Memoricé: imagen_url + es_predeterminado | ✅ APROBADO | 83df5b8 |
| 7.2b | Storage helpers para imágenes | ✅ APROBADO | 5cba1fa |
| 7.2c | Editor de Memoricé | ✅ APROBADO | 353f1d0 |
| 7.2d | Resolver storageRef a URL en UI | ✅ APROBADO | 3ea02b9 |
| 7.2e | Sets predeterminados (Emojis, Íconos) | ✅ APROBADO | b576d22 |
| 7.3 | Anti-Trivia: editor | ✅ APROBADO | 31cfb0b |
| 7.4 | Enlaces: editor | ✅ APROBADO | 2d4f441 |
| 7.4a | Enlaces: validación máximo 10 (deuda #111) | ✅ APROBADO | be6f30b |
| 7.5 | Trivia: editor (rediseño + deuda #108) | ✅ APROBADO | b31965d |
| 7.6 | QPEP: editor simplificado | ✅ APROBADO | 185d85c |
| 7.6a | Config juego + submodo set (deudas #113/#114) | ✅ APROBADO | 7077163 |
| 7.7a | RPC crear_set_completo con submodo (deuda #120) | ✅ APROBADO | 0d31604 |
| 7.7 | Pictionary: 4 editores + 2 bancos | ⬜ PENDIENTE | — |
| 7.8 | Historia Enredada: historias + colores | ⬜ PENDIENTE | — |

## 4. Historial de actualizaciones

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-09-18 | Creación del roadmap. Bloque 0 cerrado. Bloque 1 en preparación. |
| 1.1 | 2026-09-18 | Bloque 1 cerrado. 6 pasos, 517 unit / 105 integration tests. |
| 1.2 | 2026-09-18 | Bloque 2 iniciado. AC-VISUAL definidos. 7 pasos. |
| 1.4 | 2026-09-19 | Paso 2.4 cancelado. Bloque 2 renumerado: 7 pasos. |
| 2.0 | 2026-09-19 | Bloque 2 cerrado. 13/13 pasos. 540 unit + 53 e2e. |
| 3.0 | 2026-09-19 | Bloque 3 cerrado. 6/6 pasos. 540 unit + 40 e2e. |
| 4.0 | 2026-09-21 | Bloque 4 cerrado. ★ MVP alcanzado ★. 13/13 pasos. |
| 5.0 | 2026-09-21 | Bloque 5 iniciado. 5.0 y 5.1a aprobados. 609 unit + 59 e2e. |
| 5.1 | 2026-09-21 | Paso 5.1b aprobado (editor de items de Trivia). Conteo 1/10. |
| 5.2 | 2026-09-21 | Reordenamiento del Bloque 5 por madurez de mecánica. CI/Pic/HE cerradas. Conteo 2/10. |
| 5.3 | 2026-09-21 | Mecánica de Rosco cerrada. Desglose 5.2a-d. Conteo 2/10. |
| 5.4 | 2026-09-21 | Rosco completo (5.2a-d). Conteo 3/10. |
| 5.5 | 2026-09-21 | Canción Incompleta completa (5.3a-f). 9 e2e reales + 23 tests UI. Conteo 4/10. |
| 5.6 | 2026-09-21 | Cierre documental de mecánica de Pictionary. Conteo 4/10. |
| 5.7 | 2026-09-22 | Pictionary completo (5.4a-e). Bug #59 y #67 resueltos. Rosco 18/18. Conteo 5/10. |
| 5.8 | 2026-09-22 | Cierre documental de mecánica de Historia Enredada. Conteo 5/10. |
| 5.9 | 2026-09-22 | Historia Enredada completa (5.5a-d). Fix en cargarItemsDeJuego y shell-publica. 9/10 e2e. Conteo 6/10. |
| 5.10 | 2026-09-22 | Cierre documental de mecánica de Trivia. Conteo 6/10. |
| 5.11 | 2026-09-22 | Trivia completa (5.6a-d). Fix wrapper items en shell. 10 e2e. Conteo 7/10. |
| 5.12 | 2026-09-22 | Cierre documental de mecánica de Memoricé. Conteo 7/10. |
| 5.13 | 2026-09-22 | Memoricé completa (5.7a-d). 10 e2e. Conteo 8/10. |
| 5.14 | 2026-09-22 | Cierre documental de 5.7. ROADMAP limpiado (conteos consistentes). |
| 5.15 | 2026-09-22 | Cierre documental de mecánica de Anti-Trivia. Conteo 9/10. |
| 5.16 | 2026-09-22 | 5.8-pre-fix: ESPERA_VALIDACION y confirmaciones tras time up. |
| 5.17 | 2026-09-23 | 5.8-revert: heartbeat removido (regresión e2e). C1 aplicado. 1497 unit. |
| 5.18 | 2026-09-23 | 5.8e: heartbeat en ControlService. Anti-Trivia 12/12, Memoricé 10/10, run completo 179/184. 5.8 CERRADO. |
| 5.19 | 2026-09-23 | 5.9a: EnlacesGameDefinition + 135 tests. 1632 unit totales. |
| 5.20 | 2026-09-23 | 5.9b: EnlacesGameUI + drag-and-drop. 1699 unit. |
| 5.21 | 2026-09-23 | 5.9c: Enlaces pública + timer. 50 tests. Leak controlado. 1749 unit. |
| 5.22 | 2026-09-23 | 5.9d: e2e Enlaces (19 tests). ★ BLOQUE 5 CERRADO ★. 1749 unit. |
| 7.1 | 2026-09-23 | 7.0a: editores extraídos. 1749 unit. |
| 7.2 | 2026-09-23 | 7.1a: dominio Rosco N sets. 1780 unit. |
| 7.3 | 2026-09-23 | 7.1b: modal inicio + N sets. 1794 unit. |
| 7.4 | 2026-09-23 | 7.1c: rediseño circular del rosco. 1857 unit. |
| 7.5 | 2026-09-23 | 7.1d: editor de Rosco. 1887 unit. |
| 7.6 | 2026-09-23 | 7.2a: modelo Memoricé. 1901 unit. |
| 7.7 | 2026-09-23 | 7.2b: storage helpers. 1916 unit. |
| 7.8 | 2026-09-23 | 7.2c: editor de Memoricé. 1956 unit. |
| 7.9 | 2026-09-23 | 7.2d: resolver ref a URL en UI. 1964 unit. |
| 7.10 | 2026-09-23 | 7.2e: sets predeterminados con emojis e íconos. 1986 unit. |
| 7.11 | 2026-09-23 | 7.3: editor de Anti-Trivia (lista + respuestas dinámicas). 45 tests. 2031 unit. |
| 7.12 | 2026-09-24 | 7.4: editor de Enlaces (49 tests, validación unicidad). 2080 unit. |
| 7.13 | 2026-09-24 | 7.4a: validación máximo 10 en Enlaces (deuda #111). +12 tests, 2109 unit. |
| 7.14 | 2026-09-24 | 7.5: rediseño del editor de Trivia + fix deuda #108. 62 tests nuevos, 2171 unit. |
| 7.15 | 2026-09-24 | 7.6: rediseño del editor de QPEP + fix deuda #108. 42 tests nuevos, 2213 unit. |
| 7.16 | 2026-09-24 | 7.6a: Juego.configuracion + Set.submodo (deudas #113/#114). Migración 0017. |
| 7.17 | 2026-09-24 | 7.7a: RPC crear_set_completo con submodo (deuda #120). Migración 0018. |
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