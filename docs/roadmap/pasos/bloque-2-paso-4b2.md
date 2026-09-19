# Bloque 2 — Paso 2.4b.2

**Estado:** ✅ APROBADO
**Commits:** `bc7f9e0`, `3f6d575`, `8d28be9`
**Fecha:** 2026-09-19

---

## Objetivo

Agregar galería de fotos rotativa y QR dinámico al shell público.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `index.html` | +qrcodejs desde CDN |
| `src/ui/publica/shell-publica.js` | +135 líneas (galería + QR + layout 2 col) |
| `tests/e2e/shell-publica.spec.js` | +3 tests, sin skip |
| `src/app/bootstrap.js` | +`services.participante` |
| `tests/unit/app/bootstrap.test.js` | 8 → 9 servicios |

## Migraciones aplicadas (resolución de bloqueo)

| Archivo | Commit | Contenido |
|---------|--------|-----------|
| `supabase/migrations/0012_rls_fotos_mensajes.sql` | `8d28be9` | 4 políticas RLS |
| (mismo archivo) | `3f6d575` | +GRANTs para authenticated y anon |

---

## Cambios

- **Layout:** 2 columnas en `lg+` (7/12 izq: escenario + galería + anuncio; 5/12 der: marcador + QR).
- **Galería:** rotación cada 5s con fotos APROBADAS.
- **QR:** apunta a `#/movil/:codigo`.
- **qrcodejs:** cargado desde CDN.
- **Cleanup:** `intervalGaleriaId` se limpia al desmontar.

---

## Bloqueo resuelto durante el paso

1. La migración 0010 (fotos/mensajes) **nunca se aplicó** a Supabase Cloud.
   → Aplicada manualmente.
2. Las tablas nuevas no tenían **políticas RLS**.
   → Migración 0012 con 4 políticas.
3. Las tablas nuevas no tenían **GRANTs** para `authenticated` / `anon`.
   → Migración 0012 extendida.

---

## Resultado

- 540 unit tests passing.
- 7/7 e2e passing (shell público).
- `node --check` OK.

---

## Deuda técnica

- Flaky en `SupabaseAdapter.suscribir > desuscribir deja de recibir eventos` (no relacionado).
- Proceso de aplicación de migraciones: agregar verificación post-migración.

---

## Evidencia

- `git diff --stat`: 5 archivos, 196 insertions.
- `npm test`: 33 files, 540 tests passing.
- `npx playwright test shell-publica.spec.js`: 7/7 passing.