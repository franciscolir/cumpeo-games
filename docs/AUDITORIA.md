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

| 46 | Test e2e crea respuestas con participanteId inventado (FK violada) | Paso 4.8a | Media |
| 47 | El shell calcula resultado_publico (lógica de juego en UI) | Paso 4.8a | Baja |

| 2026-09-21 | 4 | 4.8b | ✅ APROBADO | Test e2e end-to-end del flujo QPEP completo. ★ MVP alcanzado ★. | 2e19767 |

## Cierre de bloque

| Fecha | Bloque | Estado | Notas |
|-------|--------|--------|-------|
| 2026-09-21 | 4 | ✅ CERRADO | 13/13 pasos. ★ MVP alcanzado ★. 595 unit + 59 e2e. |

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
| 2026-09-21 | 5 | 5.4-pre | ✅ APROBADO | Cierre documental de mecánica de Pictionary. Decisiones: estructura del item del set, orden fijo de modos, bonus manual. | — |
| 2026-09-21 | 5 | 5.4a | ✅ APROBADO | Pictionary GameDefinition + reducers + 74 tests unitarios. Archivos: PictionaryGameDefinition.js, tests, registro.js. | ef53390 |





## Deuda técnica nueva

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
