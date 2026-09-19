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
| 5 | `crearStorageAdapter` no se invoca en bootstrap ni en repos. StorageAdapter desconectado. | Paso 1.6 (detectado) | Alta |
| 6 | Tests de control en `partidas.spec.js` son laxos (`if (await btn.isVisible())`) | Paso 2.3a | Media |
| 7 | Tests de control apuntan a `#/partidas-viejo/` (consola vieja) en vez del shell nuevo | Paso 2.3a | Media |
| 8 | `indexeddb-smoke.spec.js` cambió de propósito (17 stores → 0 stores) | Paso 2.3a | Baja |
| 9 | Shell tiene 3 bugs conocidos (data-accion, colores, juego_codigo) | Paso 2.3 | Alta |
| 10 | Credenciales hardcodeadas en `tests/e2e/_helpers/auth.js` | Paso 2.3a | Baja |
| 11 | `playwright.config.js` sin config para CI | Paso 2.3a | Baja |
| 12 | Test `lista de sets sin filtro muestra mensaje` es flaky en corrida completa | Paso 2.3c (detectado) | Media |
| 13 | Flaky general en e2e ("Failed to fetch" en varios tests) | Paso 2.4a (detectado) | Media |
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
