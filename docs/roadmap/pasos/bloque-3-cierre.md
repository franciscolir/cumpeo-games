# Bloque 3 — Cierre

**Estado:** ✅ CERRADO
**Commits:** c981d3e, 63c7f7e, 8e7e614, 3b3c84a, fc44d02, 9ca4e7a
**Fecha:** 2026-09-19

---

## Objetivo

Implementar la interfaz móvil (identificación, envío de mensajes y fotos)
y la cola de moderación en el conductor, más el muro de mensajes en la pública.

---

## Pasos completados

| # | Paso | Commit | Tests |
|---|------|--------|:-----:|
| 3.1 | Ruta `#/movil/:codigo` + pantalla base | c981d3e | 4 |
| 3.2 | Identificación + session_token | 63c7f7e | 4 |
| 3.3 | Envío de mensajes | 8e7e614 | 4 |
| 3.4 | Envío de fotos | 3b3c84a | 4 |
| 3.5 | Cola de moderación (conductor) | fc44d02 | 3 |
| 3.6 | Muro de mensajes (pública) | 9ca4e7a | 4 |

---

## Resultado

- 540 unit tests passing.
- 14 e2e (móvil) + 14 e2e (shell conductor) + 12 e2e (shell pública).
- 1 flaky general (circuitos).

---

## Funcionalidad cerrada

- Móvil: identificación por nombre + session_token persistido.
- Envío de mensajes → estado PENDIENTE.
- Envío de fotos → Storage + estado PENDIENTE.
- Conductor: cola de moderación con aprobar/rechazar.
- Pública: muro dinámico con últimos 10 mensajes aprobados (truncados a 5 palabras).

---

## Migraciones aplicadas en Supabase Cloud

| # | Contenido |
|---|-----------|
| 0012 | RLS para fotos_publicas y mensajes_publicos |
| 0013 | Políticas RLS para anon en tablas públicas |
| 0014 | Políticas de Storage para anon |

---

## Deuda técnica registrada

- #21: Políticas RLS aplicadas manualmente sin documentación completa.
- #22: Políticas de Storage aplicadas manualmente sin documentación.
- #23: `URL.revokeObjectURL` no se llama al limpiar preview de foto.
- #24: Tests e2e suben archivos basura a Supabase Storage.
- #25: `MensajePublico` no resuelve `participante_nombre`.
- #26: Variable `sessionId` sin usar en `_cargarModeracion`.
- #27: Repositorio Git se corrompió por git add con paths mal formados.

---

## Evidencia

- 6 pasos cerrados.
- 6 commits de código + 6 commits de docs.
- 540 unit + 40 e2e.