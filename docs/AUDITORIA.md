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
