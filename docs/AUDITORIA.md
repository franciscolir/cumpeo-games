# CUMPEO — Historial de Auditorías

**Última actualización:** 2026-09-18

---

## Formato de registro

| Fecha | Bloque | Paso | Resultado | Notas | Commit |
|-------|--------|------|-----------|-------|--------|

**Resultados posibles:** ✅ APROBADO · ❌ RECHAZADO · 🔄 EN REVISIÓN

---

## Historial

| Fecha | Bloque | Paso | Resultado | Notas | Commit |
|-------|--------|------|-----------|-------|--------|
| 2026-09-18 | 0 | 0.1–0.6 | ✅ APROBADO | Bloque documental. MASTER pendiente de integración manual. | — |
| 2026-09-23 | 5 | 5.8 (cierre) | ✅ CERRADO | Anti-Trivia 12/12 e2e. Memoricé 10/10. Run completo 179/184. 4 fallas residuales (2 pre-existentes, 2 flaky). | 1d865dd |
| 2026-09-23 | 5 | 5.9a | ✅ APROBADO | EnlacesGameDefinition + 11 reducers + 135 tests. Registro/bootstrap/seed actualizados. | 53f29e9 |
| 2026-09-23 | 5 | 5.9b | ✅ APROBADO | EnlacesGameUI + shell actions + drag-and-drop HTML5. 67 tests. | acc423f |
| 2026-09-23 | 5 | 5.9c | ✅ APROBADO | Enlaces pública + timer. 50 tests. Leak de pares_correctos y movimientos controlado (tests anti-leak). | d5e0694 |
| 2026-09-23 | 5 | 5.9d | ✅ APROBADO | 19 tests e2e Enlaces (drag-drop + flujo + puntuación + timer + validación). Deuda #61 respetada. | 9b7dfdc |
| 2026-09-23 | 7 | 7.0a | ✅ APROBADO | Refactor: extraer editores QPEP/Trivia. formulario.js 741→144. 1749 unit. | dfb901c |
| 2026-09-23 | 7 | 7.1a | ✅ APROBADO | Dominio Rosco: N rondas = N sets. 101 tests Rosco. 1780 unit. | 12145ae |
| 2026-09-23 | 7 | 7.1b | ✅ APROBADO | Modal de inicio + N sets. 43 tests UI, 18 e2e. 1794 unit. | 0f67f43 |
| 2026-09-23 | 7 | 7.1d | ✅ APROBADO | Editor de sets de Rosco (grilla 27 filas). 30 tests. 1887 unit. | 9771694 |
| 2026-09-23 | 7 | 7.1d-fix | ✅ APROBADO | Revertir SetService.crearSetCompleto sin uso. | e2eae33 |
| 2026-09-23 | 7 | 7.2a | ✅ APROBADO | Modelo Memoricé: imagen_url requerido + es_predeterminado en sets. 107 tests. 1901 unit. | 83df5b8 |
| 2026-09-23 | 7 | 7.2b | ✅ APROBADO | Storage helpers para imágenes de Memoricé. 15 tests. 1916 unit. | 5cba1fa |
---

## Correcciones pendientes

_(ninguna)_

---

## Deuda técnica acumulada

| # | Descripción | Origen | Prioridad |
|---|-------------|--------|-----------|
| 1 | `actualizarEstadoJuego` en Supabase no es atómico | H7.8 | Media |
| 2 | `expirarPartida` en Supabase no es atómico | H7.8 | Media |
| 3 | MASTER pendiente de integrar secciones del Bloque 0 | Bloque 0 | Alta |
| 2026-09-18 | 1 | 1.1 | ✅ APROBADO | Migración v3 + schema Postgres. Corrección aplicada (openCursor). 439 tests. | 7726c29 |

| 2026-09-18 | 1 | 1.2 | ✅ APROBADO | StorageAdapter + LocalStorageAdapter. Agregado NotImplementedError. 450 tests. | 70034a1 |

| 2026-09-18 | 1 | 1.3 | ✅ APROBADO | MensajePublicoRepository. 8 métodos, 19 tests. Corrección de JSDoc. | 4b6d350 |

| 2026-09-18 | 1 | 1.4 | ✅ APROBADO | FotoPublicaRepository. 9 métodos, 28 tests. Integración Storage. | 801bf0a |

| 2026-09-18 | 1 | 1.5 | ✅ APROBADO | ParticipanteRepository con session_token. Índice único en IndexedDB v4. 14 tests. | 2aee4f6 |
| 4 | `validarNoVacio` lanza `Error` genérico en vez de `ValidacionError` | Paso 1.5 (detectado) | Baja |
| 2026-09-18 | 1 | 1.6 | ✅ APROBADO | SupabaseStorageAdapter con signed URLs. 6 unit + 6 integration tests. | 7c3288f |
| 5 | ~~`crearStorageAdapter` no se invoca en bootstrap ni en repos.~~ **RESUELTA en paso 2.4b.1 (547f005)** | Paso 1.6 (detectado) | Resuelta |
| 6 | Tests de control en `partidas.spec.js` son laxos (`if (await btn.isVisible())`) | Paso 2.3a | Media |
| 7 | Tests de control apuntan a `#/partidas-viejo/` (consola vieja) en vez del shell nuevo | Paso 2.3a | Media |
| 8 | `indexeddb-smoke.spec.js` cambió de propósito (17 stores → 0 stores) | Paso 2.3a | Baja |
| 9 | Shell tiene 3 bugs conocidos (data-accion, colores, juego_codigo) | Paso 2.3 | Alta |
| 10 | Credenciales hardcodeadas en `tests/e2e/_helpers/auth.js` | Paso 2.3a | Baja |
| 11 | `playwright.config.js` sin config para CI | Paso 2.3a | Baja |
| 12 | Test `lista de sets sin filtro muestra mensaje` es flaky en corrida completa | Paso 2.3c (detectado) | Media |
| 13 | Flaky general en e2e ("Failed to fetch" en varios tests) | Paso 2.4a (detectado) | Media |
| 14 | ~~Migración 0010 no se aplicó a Supabase Cloud.~~ **RESUELTA en paso 2.4b.2** | Paso 2.4b.2 | Resuelta |
| 16 | Faltaban GRANTs en fotos_publicas y mensajes_publicos. **RESUELTA en paso 2.4b.2 (3f6d575)** | Paso 2.4b.2 | Resuelta |
| 17 | Test e2e de TriviaGameUI solo verifica registro, no renderización completa. | Paso 2.5 | Baja |
| 18 | Condición del `if` en `TriviaGameUI.renderizarAreaJuego` difícil de leer. | Paso 2.5 | Baja |
| 19 | `Boton` recibe `clase` y `id` redundantes en TriviaGameUI. | Paso 2.5 | Baja |
| 20 | Tests de circuitos fallan intermitentemente por timeout en #form-circuito | Paso 2.6c | Media |
| 21 | Políticas RLS aplicadas manualmente sin documentación completa | Bloque 3 | Media |
| 22 | Políticas de Storage aplicadas manualmente sin documentación | Bloque 3 | Media |
| 23 | `URL.revokeObjectURL` no se llama al limpiar preview | Paso 3.4 | Baja |
| 24 | Tests e2e suben archivos basura a Supabase Storage | Paso 3.4 | Baja |
| 25 | `MensajePublico` no resuelve `participante_nombre` | Paso 3.5 | Media |
| 26 | Variable `sessionId` sin usar en `_cargarModeracion` | Paso 3.5 | Baja |
| 27 | Repositorio Git se corrompió por `git add` con paths mal formados | Bloque 3 | Media |
## Cierre de bloque

| Fecha | Bloque | Estado | Notas |
|-------|--------|--------|-------|
| 2026-09-18 | 1 | ✅ CERRADO | 6/6 pasos. 517 unit + 105 integration. Commit de cierre: 7c3288f. |

| 2026-09-18 | 2 | 2.2 | ✅ APROBADO | GameUIRegistry con contrato validado. 17 tests. | 42d622c |

| 2026-09-18 | 2 | 2.3 + 2.3a | ✅ APROBADO | ShellPartida + login e2e. 39 e2e passing. Deuda técnica en tests laxos. | 73f0cbf |

| 2026-09-18 | 2 | 2.3b | ✅ APROBADO | obtenerContextoEspera enriquecido con juego_codigo. 2 tests. | 927ceac |

| 2026-09-19 | 2 | 2.3c | ✅ APROBADO | Shell corregido (botones, colores) + tests endurecidos. Flaky en sets.spec.js. | 13a01aa |

## Reorganización del Bloque 2

| Fecha | Cambio | Razón |
|-------|--------|-------|
| 2026-09-19 | Paso 2.4 (Portar consola.js) cancelado. Bloque 2 pasa de 8 a 7 pasos. | La lógica ya fue portada en paso 2.3 (ShellPartida). |

| 2026-09-19 | 2 | 2.4a | ✅ APROBADO | ShellPublica base. 4 tests. Flaky general en e2e detectado. | c75fcf5 |

| 2026-09-19 | 2 | 2.4b.1 | ✅ APROBADO | Storage + foto + mensaje en bootstrap. Bug de crearStorageAdapter corregido. | 547f005 |

| 2026-09-19 | 2 | 2.4b.2 | ✅ APROBADO | Galería + QR. Bloqueo de migración 0010 y RLS resuelto. | bc7f9e0, 3f6d575, 8d28be9 |

| 2026-09-19 | 2 | 2.4c | ✅ APROBADO | Card próximo desafío + marquee footer. 9/9 e2e shell público. | 92f54b6 |

| 2026-09-19 | 2 | 2.5 | ✅ APROBADO | TriviaGameUI registrado. Primer GameUI concreto. 8/8 e2e shell conductor. | 772316f |

| 2026-09-19 | 2 | 2.6a | ✅ APROBADO | Botones faltantes del shell (tomar control, comenzar, descartar). | ac3cff8 |
| 2026-09-19 | 2 | 2.6b | ✅ APROBADO | Tests migrados de #/partidas-viejo/ a #/partidas/. | 5cad6c0 |
| 2026-09-19 | 2 | 2.6c | ✅ APROBADO | consola.js eliminado. Bloque 2 cerrado. | 5e32d5b |

## Cierre de bloque

| Fecha | Bloque | Estado | Notas |
|-------|--------|--------|-------|
| 2026-09-19 | 2 | ✅ CERRADO | 13/13 pasos. 540 unit + 53 e2e. Commits: 5e32d5b, 5cad6c0, ac3cff8. |

| 2026-09-19 | 3 | 3.1 | ✅ APROBADO | Ruta #/movil/:codigo + pantalla base. 4 e2e tests. | c981d3e |

| 2026-09-19 | 3 | 3.2 | ✅ APROBADO | Identificación + session_token en móvil. 8 e2e tests. | 63c7f7e |

## Reorganización del Bloque 3

| Fecha | Cambio | Razón |
|-------|--------|-------|
| 2026-09-19 | Paso 3.3 (Pantalla principal) fusionado con 3.4 (Envío de mensajes). Bloque 3 pasa de 7 a 6 pasos. | La pantalla principal ya existía (pasos 3.1 + 3.2). |

| 2026-09-19 | 3 | 3.3 | ✅ APROBADO | Envío de mensajes desde móvil. 11 e2e tests. | 8e7e614 |

| 2026-09-19 | 3 | 3.4 | ✅ APROBADO | Envío de fotos desde móvil. 14 e2e tests. | 3b3c84a |

| 2026-09-19 | 3 | 3.5 | ✅ APROBADO | Cola de moderación en shell del conductor. 14 e2e tests. | fc44d02 |

| 2026-09-19 | 3 | 3.6 | ✅ APROBADO | Muro de mensajes dinámico en pública. 12 e2e tests. | 9ca4e7a |

## Cierre de bloque

| Fecha | Bloque | Estado | Notas |
|-------|--------|--------|-------|
| 2026-09-19 | 3 | ✅ CERRADO | 6/6 pasos. 540 unit + 40 e2e. Commits: 9ca4e7a, fc44d02, 3b3c84a, 8e7e614, 63c7f7e, c981d3e. |

| 2026-09-19 | 4 | 4.1 | ✅ APROBADO | Modelo de datos + GameDefinition de "¿Qué piensa el público?". 50 tests nuevos. | f1948e0 |

| 2026-09-19 | 4 | 4.2 | ✅ APROBADO | Editor de items para QPEP. 5 e2e tests. | 5e83f59 |

| 2026-09-19 | 4 | 4.3a | ✅ APROBADO | onAccion conectado a servicios. 2 e2e tests. | f4a3b5a |

| 2026-09-19 | 4 | 4.3b | ✅ APROBADO | QuePiensaElPublicoGameUI display. 1 e2e test. | 0b07d42 |

| 2026-09-19 | 4 | 4.3b | ✅ APROBADO | QuePiensaElPublicoGameUI display. 1 e2e test. | 0b07d42 |

| 2026-09-20 | 4 | 4.3c | ✅ APROBADO | Flujo de fases del conductor QPEP. 1 e2e test. | 25b5560 |

| 2026-09-20 | 4 | 4.3d | ✅ APROBADO | Timer de encuesta con auto-cierre. 1 e2e test. | b1306d5 |

| 2026-09-20 | 4 | 4.4 | ✅ APROBADO | Móvil responde A/B encuesta QPEP. 3 e2e tests. | 82079aa |

| 2026-09-20 | 4 | 4.5 | ✅ APROBADO | Registro de pronósticos + botón Revelar. 2 e2e tests. | 97ece23 |

| 2026-09-20 | 4 | 4.6 | ✅ APROBADO | Revelar + puntuar + siguiente ronda. 3 e2e tests. | c31a1d6 |

| 2026-09-21 | 4 | 4.6-fix | ✅ APROBADO | Conductor carga items del set activo. Deuda #41 resuelta. | aacf950 |

| 2026-09-21 | 4 | 4.7 | ✅ APROBADO | Pública muestra QPEP por fase + galería oculta. 3 e2e tests. | f3e5abd |

| 2026-09-21 | 4 | 4.8a | ✅ APROBADO | Conteo real de votos al cerrar encuesta. Bug resuelto. | ca6bbc0 |

| 2026-09-21 | 4 | 4.8b | ✅ APROBADO | Test e2e end-to-end del flujo QPEP completo. ★ MVP alcanzado ★. | 2e19767 |
| 2026-09-21 | 4 | ✅ CERRADO | 13/13 pasos. ★ MVP alcanzado ★. 595 unit + 59 e2e. |

## Cierre de bloque

| Fecha | Bloque | Estado | Notas |
|-------|--------|--------|-------|


| 2026-09-21 | 5 | 5.0 | ✅ APROBADO | Refactor: cargarItemsDeJuego + crearTimer. 13 tests nuevos. | (pendiente) |

| 2026-09-21 | 5 | 5.1a | ✅ APROBADO | Trivia conectada al shell. 8 tipos de acción. | 58e2043 |
| 2026-09-21 | 5 | 5.1b | ✅ APROBADO | Editor de items de Trivia. 5 e2e nuevos + 1 actualizado. 609 unit. | a2cafb5 |
| 2026-09-21 | 5 | 5.1c | ✅ APROBADO | Cierre documental: mecánicas CI/Pic/HE + reordenamiento del Bloque 5. | (pendiente) |
| 2026-09-21 | 5 | 5.1d | ✅ APROBADO | Cierre documental: mecánica de Rosco. Desglose 5.2a-d. | (pendiente) |
| 2026-09-21 | 5 | 5.2a | ✅ APROBADO | Rosco: GameDefinition + validación + reducers. Cierra deuda #57. | 79c4493 |
| 2026-09-21 | 5 | 5.2b | ✅ APROBADO | Rosco: UI conductor. Conductor no ve la respuesta. | 7ec5603 |
| 2026-09-21 | 5 | 5.2c | ✅ APROBADO | Rosco: UI pública. Definición en el centro del rosco. | a90e23b |
| 2026-09-21 | 5 | 5.2d | ✅ APROBADO | Rosco: e2e (18 tests). Incluye fix de registro en bootstrap. | 94a89d1 |
| 2026-09-21 | 5 | 5.3a | ✅ APROBADO | Canción Incompleta: GameDefinition + reducers. 13 tests. | 1934d99 |
| 2026-09-21 | 5 | 5.3b | ✅ APROBADO | Canción Incompleta: UI conductor. 6 tests. | ee9a42c |
| 2026-09-21 | 5 | 5.3c | ✅ APROBADO | Canción Incompleta: UI pública. 1 test. | 8323849 |
| 2026-09-21 | 5 | 5.3d | ❌ RECHAZADO | Canción Incompleta: tests no eran e2e (Vitest + fake-indexeddb). Reemplazados en 5.3f. | 496cc5a |
| 2026-09-21 | 5 | 5.3e | ✅ APROBADO | Canción Incompleta: FIN_DE_RONDA + timer toggle. Timer público quedó pendiente. | 8f608ee |
| 2026-09-21 | 5 | 5.3f | ✅ APROBADO | Canción Incompleta: fix helper e2e + timer público + 23 tests UI + 9 e2e reales. | a9d76d5 |
| 2026-09-22 | 5 | 5.4-pre | ✅ APROBADO | Pictionary: cierre documental de mecánica. | d076f9e |
| 2026-09-22 | 5 | 5.4a | ✅ APROBADO | Pictionary: GameDefinition + 74 tests. | ef53390 |
| 2026-09-22 | 5 | 5.4b | ✅ APROBADO | Pictionary: UI Conductor + 34 tests. | c84613e |
| 2026-09-22 | 5 | 5.4c | ✅ APROBADO | Pictionary: UI Pública + bonus inline + 32 tests. | 0835a28 |
| 2026-09-22 | 5 | 5.4d | ❌ RECHAZADO | Pictionary: e2e con 1 falla + mecánica incorrecta. | f8b8530 |
| 2026-09-22 | 5 | 5.4d-fix | ✅ APROBADO | Pictionary: corrección de avanzarModo + helper e2e. | 08e4acf |
| 2026-09-22 | 5 | 5.4d-fix-2 | ✅ APROBADO | Pictionary: assertions + timeout. | 83f9f2d |
| 2026-09-22 | 5 | 5.4-rosco-fix-v2 | ✅ APROBADO | Retry lazy en Rosco (bug #59). Rosco 18/18. | 699204b |
| 2026-09-22 | 5 | 5.4-e | ✅ APROBADO | Fix juego_nombre en obtenerContextoEspera (bug #67). Pictionary 11/11. | 3eb742d |
| 2026-09-22 | 5 | 5.5-pre | ✅ APROBADO | Cierre documental de mecánica de Historia Enredada. | — |
| 2026-09-22 | 5 | 5.5-pre-fix | ✅ APROBADO | 1 ronda = 2 historias (1 por equipo). Orden Eq1 → Eq2. | f1e7552 |
| 2026-09-22 | 5 | 5.5a | ✅ APROBADO | Historia Enredada: GameDefinition + reducers + 40 tests. | b7f6f25 |
| 2026-09-22 | 5 | 5.5a-fix | ✅ APROBADO | Conteo de juegos en bootstrap/seed (5→6). | 6321c3c |
| 2026-09-22 | 5 | 5.5b | ✅ APROBADO | Historia Enredada: UI Conductor + 30 tests. | c982efd |
| 2026-09-22 | 5 | 5.5c | ✅ APROBADO | Historia Enredada: UI Pública + 18 tests. | 068f151 |
| 2026-09-22 | 5 | 5.5d | ✅ APROBADO | Historia Enredada: e2e (9/10 passing, 1 skipped). Fix cargarItemsDeJuego (id) y shell-publica (itemsHistoria). | dc9d34e |
| 2026-09-22 | 5 | 5.6-pre | ✅ APROBADO | Cierre documental de mecánica de Trivia. Decisiones: 2 equipos, 5 preguntas por turno, sets propios, timer 30s, validación por selección de opción. | — |
| 2026-09-22 | 5 | 5.6a | ✅ APROBADO | Trivia: GameDefinition reescrito (8 fases, 9 reducers, 77 tests). | 2d9190d |
| 2026-09-22 | 5 | 5.6b-1 | ✅ APROBADO | Trivia: UI Conductor reescrita (8 fases, 31 tests). | 8bee291 |
| 2026-09-22 | 5 | 5.6b-2 | ✅ APROBADO | Trivia: shell actions (11 nuevas, retry lazy en 3). | 38eca68 |
| 2026-09-22 | 5 | 5.6c | ✅ APROBADO | Trivia: UI Pública. | 0acedd5 |
| 2026-09-22 | 5 | 5.6c-fix | ✅ APROBADO | Trivia: tests estáticos UI pública (25 tests). | 28e8b6f |
| 2026-09-22 | 5 | 5.6d | ✅ APROBADO | Trivia: e2e (10 tests) + fix wrapper items en shell. | afba7a0 |
| 2026-09-22 | 5 | 5.7-pre | ✅ APROBADO | Cierre documental de mecánica de Memoricé. Decisiones: grilla de parejas, turnos por equipo, timer por turno, puntos por pareja. | — |
| 2026-09-22 | 5 | 5.7a | ✅ APROBADO | Memoricé: GameDefinition (8 fases, 6 reducers, 77 tests). | f158afb |
| 2026-09-22 | 5 | 5.7a-fix | ✅ APROBADO | Memoricé: auto-evaluación de pareja + CAMBIO_TURNO real (92 tests). | 62617c0 |
| 2026-09-22 | 5 | 5.7b | ✅ APROBADO | Memoricé: UI Conductor + shell (32 tests UI). | a00b8d1 |
| 2026-09-22 | 5 | 5.7b-fix | ✅ APROBADO | Memoricé: PREPARANDO_GRILLA como fase real (97 + 32 tests). | 34a27fe |
| 2026-09-22 | 5 | 5.7c | ✅ APROBADO | Memoricé: UI Pública (24 tests). | 79cc2b7 |
| 2026-09-22 | 5 | 5.7d | ✅ APROBADO | Memoricé: e2e (10 tests). | d1ff93d |
| 2026-09-22 | 5 | 5.8-pre | ✅ APROBADO | Cierre documental de mecánica de Anti-Trivia. Decisiones: respuesta incorrecta válida, lista de respuestas correctas, conductor decide. | — |
| 2026-09-22 | 5 | 5.8-pre-fix | ✅ APROBADO | Anti-Trivia: ESPERA_VALIDACION cuando el timer llega a 0 y el jugador alcanzó a responder. | — |
| 2026-09-22 | 5 | 5.8a | ✅ APROBADO | Anti-Trivia: GameDefinition, set validation y reducers (128 tests). | 92cc14c |
| 2026-09-22 | 5 | 5.8b | ✅ APROBADO | Anti-Trivia: UI Conductor + shell actions (56 tests). | 141093e |
| 2026-09-22 | 5 | 5.8c | ✅ APROBADO | Anti-Trivia: UI Pública + timer (39 tests). | c384044 |
| 2026-09-22 | 5 | 5.8d | ❌ RECHAZADO | Heartbeat en shell-partida introdujo regresiones e2e (Memoricé, Rosco, HE, QPEP). Revertido en 5.8-revert. | 14a3cf3 |
| 2026-09-21 | 5 | 5.4-pre | ✅ APROBADO | Cierre documental de mecánica de Pictionary. Decisiones: estructura del item del set, orden fijo de modos, bonus manual. | — |
| 2026-09-21 | 5 | 5.4a | ✅ APROBADO | Pictionary GameDefinition + reducers + 74 tests unitarios. Archivos: PictionaryGameDefinition.js, tests, registro.js. | ef53390 |
| 2026-09-23 | 5 | ✅ CERRADO | 11/11 pasos. 9 juegos implementados. 1749 unit + ~215 e2e. Commit de cierre: 9b7dfdc. |
| 2026-09-23 | 7 | 7.1c | ✅ APROBADO | Rediseño circular del rosco (conductor + pública). renderRosco compartido. 38+57+41 tests. 1857 unit. | 3908371 |

## Deuda técnica nueva
| 46 | Test e2e crea respuestas con participanteId inventado (FK violada) | Paso 4.8a | Media |
| 47 | El shell calcula resultado_publico (lógica de juego en UI) | Paso 4.8a | Baja |
| 48 | Shell aplica `Math.max(0, ...)` en penalización de Trivia. Debería permitir puntos negativos. | Paso 5.1a | Media |
| 49 | `indexeddb-smoke.spec.js` flaky por orden de ejecución. | Paso 5.1a | Media |
| 50 | `shell-publica.spec.js:REVELANDO` flaky por race condition. | Paso 5.1a | Media |
| 51 | `AUDITORIA.md`: historial con secciones duplicadas (`## Cierre de bloque` x4), deuda #15 faltante, deudas 28-45 no listadas. (La parte de `ROADMAP.md` se resolvió en 5.1c.) | Paso 5.1b (detectado) | Media |
| 52 | Las 2 opciones iniciales de Trivia se agregan en el bind, no en el render HTML. | Paso 5.1b | Baja |
| 53 | `_agregarOpcionTrivia` no re-selecciona radio tras eliminar la opción marcada. La validación lo cubre. | Paso 5.1b | Baja |
| 54 | `docs/roadmap/pasos/bloque-5.0.md` y `bloque-5.1a.md` no fueron archivados. | Paso 5.1c (detectado) | Baja |
| 55 | Sección "2. Bloques" del ROADMAP y matriz de estado de GAMES.md podrían divergir a futuro. Conviene automatizar chequeo. | Paso 5.1c (detectado) | Baja |
| 56 | El script `update-5.1c.js` usó anclas de la sección equivocada de GAMES.md (Memoricé en lugar de Canción Incompleta). Cerrado en commit posterior. Conviene evitar anclas por texto literal en docs con secciones similares; preferir anclas por sección. | Paso 5.1c (detectado) | Baja |
| 57 | La validación de Rosco requiere N items por letra para N rondas. Si el set no cumple, el conductor no puede iniciar el juego. UX a definir. | Paso 5.1d (detectado) / 5.2a (cerrada) | Cerrada |
| 58 | El rosco tiene 27 letras (A-Z + Ñ). La UI debe manejar el layout circular o rectangular con esa cantidad. Verificar legibilidad en pantalla pública. | Paso 5.1d (detectado) | Baja |
| 59 | Stale closures en `onAccion` de shell-partida.js. El `state_version` capturado en closure queda obsoleto tras la primera acción. **Cerrado para Rosco** en 5.4-rosco-fix-v2 (retry lazy con ConflictoVersionError). **Latente** en Trivia, QPEP y otros juegos sin tests de 2 acciones rápidas consecutivas. Replicar el patrón de retry. | Paso 5.2d / 5.4-rosco-fix-v2 | Media |
| 60 | El registro de juegos requiere tocar tests/unit/app/bootstrap.test.js y tests/unit/app/seed.test.js cada vez que se agrega un juego nuevo. Acoplamiento entre registro y tests de bootstrap/seed. Revisar para que la lista de juegos registrados se derive dinámicamente. | Paso 5.2d (detectado) | Cerrada (5.3f) |
| 61 | **CRÍTICA.** El agente reporta e2e como "creados" o "pasando" sin correrlos. Ocurrió en 5.3d, 5.3e, 5.3f, 5.4d y 5.4-rosco-fix (5 veces). Impacto directo en la confiabilidad del proceso. Los prompts de e2e DEBEN exigir output crudo de Playwright. Considerar cambiar de agente si persiste. | Paso 5.3f / 5.4-rosco-fix | Crítica |
| 62 | Cada juego nuevo tiende a reinventar el helper de e2e. Extraer un helper común que parametrice crearPartida con el código del juego. | Paso 5.3f (detectado) | Media |
| 67 | `PartidaRepository.obtenerContextoEspera` no mapeaba `juego_nombre`, causando que la UI pública mostrara `PICTIONARY` (código crudo) en lugar de `Pictionary`. | Paso 5.4-e (detectado) | Cerrada (5.4-e) |
| 68 | El test "modo 1: público carga la partida" pasó por 3 versiones (simplificado → reforzado → funcional). Verificar que el refuerzo se mantuvo. | Paso 5.4-rosco-fix-v2 (detectado) | Baja |
| 69 | El cambio de `cargarItemsDeJuego` (ahora devuelve `id` además del contenido) puede afectar a Trivia cuyos tests asumen items sin `id`. Verificar al cerrar 5.6. | Paso 5.5d (detectado) | Baja |
| 70 | El test "set sin historias suficientes no permite arrancar la ronda" está `test.skip`. Para des-skipearlo, el helper necesita aceptar `itemsCount: 0`. | Paso 5.5d (detectado) | Baja |
| 71 | El test "cards excluyen historias usadas" era flaky con `waitForTimeout`. Se estabilizó con `waitForFunction`. Patrón a aplicar en tests futuros. | Paso 5.5d (detectado) | Media |
| 74 | El timer público de Trivia usa `window._triviaConfig` que no se setea en ningún lado. El timer siempre usa 30s por default, ignorando `tiempo_por_pregunta_seg`. | Paso 5.6d (detectado) | Baja |
| 75 | Tests e2e de Trivia: `turnos.spec.js:7` tarda 11s, `validacion.spec.js:111` tarda 29.7s. Considerar reducir tiempos de espera. | Paso 5.6d (detectado) | Baja |
| 76 | El agente reportó 9/10 tras 5.6d, pero el conteo real es 8/10 hasta cerrar 5.6-cierre. | Paso 5.6d (detectado) | Baja |
| 77 | El agente reporta el conteo del Bloque 5 como "10/10" antes de tiempo (5.7c y 5.7d). El conteo real es 7/10. | Paso 5.7d (detectado) | Baja |
| 78 | El helper e2e de Memoria no exporta `encontrarParejaEnEstado` / `encontrarNoParejaEnEstado` (están inline). El reporte del agente dijo que estaban exportadas. | Paso 5.7d (detectado) | Baja |
| 79 | Test `flujo-completo.spec.js:13` de Memoria tarda 10s. Considerar optimizar. | Paso 5.7d (detectado) | Baja |
| 80 | ROADMAP con deuda estructural: conteos inconsistentes (`/10`, `/16`, `/20`, `/21`), historial con `5.7` duplicado, sección 2 desincronizada. Corregido en 5.7-cierre. | Paso 5.7d (detectado) | Media |
| 82 | Agente externo construyó 5.8b, 5.8c y 5.8d sin auditoría intermedia. Violación de regla 9 de CONTINUIDAD.md. Escalar si se repite. | Paso 5.8d (detectado en auditoría) | Alta |
| 83 | Heartbeat en shell-partida.js introdujo regresión sistémica en e2e de Memoricé, Rosco, Historia Enredada y QPEP (12+ fallas nuevas). Revertido en 5.8-revert. Reabrir como paso dedicado con tests propios. | Paso 5.8d (detectado en auditoría) | Alta |
| 84 | Inconsistencia de cálculo de ganador entre AntiTriviaGameUI (pts1 > pts2) y shell-publica (calcularResultado().ganador). Resuelto en 5.8-revert (C1). | Paso 5.8d (detectado en auditoría) | Cerrada |
| 85 | El agente reportó "4 fallas e2e pre-existentes" cuando el run real mostraba 17 fallas visibles (mínimo 12 nuevas). Deuda #61 agravada. | Paso 5.8d (detectado en auditoría) | Crítica |
| 86 | El run de Playwright se corta con `tail` en el pipe. Usar `> /tmp/e2e.txt 2>&1` y leer el archivo después. | Paso 5.8d (detectado en auditoría) | Baja |
| 87 | `indexeddb-smoke.spec.js:6` falla intermitentemente en run completo (pre-existente). Revisar config del adapter o condición del test. | Run completo 5.8e (detectado) | Baja |
| 88 | `shell-partida.spec.js:277` "uiRegistry tiene QuePiensaElPublicoGameUI registrado" espera un count desactualizado (2 vs 8). Test necesita actualizarse para reflejar los 8 GameUIs. | Run completo 5.8e (detectado) | Media |
| 89 | `shell-publica.spec.js:351` "pública muestra resultado en REVELANDO" falla con `ConflictoVersionError` (race condition entre el test y el polling de 2s). | Run completo 5.8e (detectado) | Media |
| 90 | `rosco/flujo-completo.spec.js:56` "rosco se renderiza con 27 letras" flaky en run completo, pasa en aislamiento y con `--repeat-each=3`. Probable acumulación de estado. | Run completo 5.8e (detectado) | Baja |
| 91 | `GameDefinition.validarContenidoSet(contenido, config)` recibe un 2do parámetro `config` no documentado en MASTER §8.3.2. Es necesario (para validar `pares_por_turno`), pero el contrato debería actualizarse. | Paso 5.9a (detectado) | Baja |
| 92 | El contrato `GameDefinition` permite `opts` en `prepararTablero` (para inyectar RNG). Bien para testabilidad. Pero el contrato documentado en MASTER §8.3.2 no menciona reducers ni `opts`. Conviene actualizar MASTER al cerrar Bloque 5. | Paso 5.9a (detectado) | Baja |
| 93 | `_bindDragAndDrop` en `EnlacesGameUI.js` tiene una comparación duplicada: `=== 'false'` (string) y `=== false` (boolean). La segunda nunca matchea. Código muerto. | Paso 5.9b (detectado) | Baja |
| 95 | `shell-partida.js:707` sobrescribe `config.rondas` localmente para `validarSetsElegidos`. No muta la config congelada (spread), pero es frágil. Alternativa: que `validarSetsElegidos` valide `sets.length` directo. | Paso 7.1b (detectado) | Baja |
| 96 | Los prompts deben verificar el `git show` del archivo real antes de decir "MANTENER X". El agente no puede distinguir entre X real y X inventado por el prompt. | Paso 7.1a (detectado) | Media |
| 97 | `shell-publica.js` líneas 604, 616 buscan `#rosco-pub-timer-eq1` / `#rosco-pub-timer-eq2` pero el HTML no los tiene. Bug pre-existente, no tocado en 7.1c. | Paso 7.1c (detectado) | Media |
| 98 | El editor de sets no guarda atómicamente. Eliminar + agregar items puede dejar el set inconsistente si falla a mitad. Considerar `reemplazarItems` en el futuro. | Paso 7.1d (detectado) | Media |
| 99 | Los tests de gameplay de Memoricé usan `parejas_por_ronda: 2` (fuera del rango válido {6,8,10,12}). No rompen porque no llaman a `validarConfiguracion`. Cosméticamente inconsistente. | Paso 7.2a (detectado) | Baja |
| 100 | Los tests e2e de Memoricé (`_helpers/memoria.js`, `validacion.spec.js`) crean items solo con `contenido`, sin `imagen_url`. Van a romper con el nuevo modelo. Actualizar en 7.2c (editor) o 7.2e (e2e). | Paso 7.2a (detectado) | Media |
| 101 | El campo `imagen_url` de Memoricé guarda un storageRef (UUID), no una URL. La UI debe resolver a URL al renderizar. Debería llamarse `imagen_ref`. Renombrar en el futuro. | Paso 7.2c (detectado) | Media |