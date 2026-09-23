# CUMPEO — Prompt Inicial de Continuidad

**Versión:** 1.1
**Fecha:** 2026-09-23
**Propósito:** Este archivo es un **prompt inicial**. Cualquier persona o asistente que retome el proyecto debe leerlo primero. No duplica información: indica **qué leer** y **cómo trabajar**.

---

## 1. Qué es CUMPEO

**CUMPEO** es una aplicación personal para gestionar eventos de juegos tipo "Noche de Juegos". Tiene tres interfaces:

- **Conductor:** controla la partida.
- **Pública:** expone el juego y el estado al público.
- **Móvil:** permite al público participar (mensajes, fotos, encuestas).

Stack actual:
- JavaScript vanilla (sin frameworks).
- IndexedDB (dev) + Supabase (prod).
- Vitest (unit) + Playwright (e2e) + Vitest integration.

**Estado actual (2026-09-23):** Bloques 0–5 cerrados. 9 juegos implementados end-to-end (QPEP, Trivia, Rosco, Canción Incompleta, Pictionary, Historia Enredada, Memoricé, Anti-Trivia, Enlaces). MVP alcanzado al cerrar Bloque 4. Bloque 6 (migración e2e a Supabase) es opcional y no iniciado.
---

## 2. Antes de cualquier acción: leer estos documentos

En este orden:

| # | Documento | Qué contiene |
|---|-----------|--------------|
| 1 | **`docs/MASTER.md`** | Modelo conceptual, invariantes, decisiones de arquitectura |
| 2 | **`docs/ROADMAP.md`** | Estado actual, bloques, pasos, commits por paso |
| 3 | **`docs/AUDITORIA.md`** | Historial de auditorías, deuda técnica acumulada |
| 4 | **`docs/AC-VISUAL.md`** | Criterios de aceptación visuales |
| 5 | **`docs/GAMES.md`** | Reglas funcionales de los 9 juegos |
| 6 | **`docs/roadmap/pasos/`** | Prompts y evidencias de pasos cerrados |
| 7 | **`docs/roadmap/README.md`** | Convenciones de la carpeta de pasos |

**Regla:** antes de escribir código o prompts, verificar el estado actual en `ROADMAP.md`. El estado cambia con cada paso.

---

## 3. Arquitectura de roles

Tres roles colaboran en cada paso:

| Rol | Responsabilidad |
|-----|-----------------|
| **Operador** | Ejecuta comandos de consola, copia prompts al agente externo, pega evidencia al auditor. |
| **Auditor** | Revisa evidencia contra criterios, aprueba o rechaza, actualiza documentos, genera el prompt del siguiente paso. |
| **Agente externo** | Construye código siguiendo el prompt. Devuelve evidencia. **No commitea.** |

**Regla de oro:** el agente externo nunca commitea. El operador commitea solo después de la aprobación del auditor.

---

## 4. Flujo de trabajo por paso

```
1. AUDITOR indica el PRÓXIMO PASO del roadmap
2. AUDITOR entrega PROMPT para agente externo
3. OPERADOR copia el prompt y lo pasa al agente externo
4. AGENTE construye y devuelve EVIDENCIA
5. OPERADOR pasa la evidencia al AUDITOR
6. AUDITOR verifica:
   - Contrato del paso cumplido
   - Invariantes respetadas
   - Tests verdes
   - node --check
   - git status limpio
7. Si NO APROBADO:
   - AUDITOR da comandos de corrección exactos
   - OPERADOR los pasa al agente
   - vuelve al paso 4
8. Si APROBADO:
   - OPERADOR ejecuta el commit
   - AUDITOR actualiza ROADMAP.md y AUDITORIA.md
   - AUDITOR archiva el prompt en docs/roadmap/pasos/
   - Pasa al siguiente paso (1)
```

**Regla:** no se avanza al siguiente paso sin aprobación explícita del auditor.

---

## 5. Formato de prompt para agente externo

Cada prompt debe incluir:

1. **CONTEXTO:** proyecto, rama, stack, docs de referencia.
2. **Estado actual:** qué existe hoy, tests, archivos relevantes.
3. **OBJETIVO DEL PASO:** qué construir, con alcance explícito.
4. **ARCHIVOS A CREAR/MODIFICAR:** lista exacta.
5. **CONTRATOS:** firmas de métodos, interfaces, invariantes aplicables.
6. **TESTS ESPERADOS:** qué debe testearse.
7. **NO MODIFICAR:** archivos fuera del scope.
8. **NO HACER:** anti-patrones.
9. **CRITERIOS DE ACEPTACIÓN:** checklist verificable.
10. **EVIDENCIA A DEVOLVER:** formato estandarizado.
11. **FORMATO DE RESPUESTA:** estructura esperada.
12. **QUE NO HACER** (al final): reglas operativas.

Plantilla en `docs/roadmap/README.md`.

---

## 6. Formato de evidencia obligatorio

El agente externo debe devolver **siempre**:

1. `git diff --stat` (antes del commit)
2. Output completo de `npm test`
3. Output de `npm run test:integration` (si aplica)
4. Output de `node --check` por archivo modificado
5. Output de `git status --short` antes del commit
6. Contenido o diff de los archivos nuevos/modificados
7. Notas o decisiones tomadas
8. Bloqueos encontrados (si los hubo)

**Sin esta evidencia, no se audita.**

---

## 7. Criterios de auditoría

El auditor verifica, en este orden:

1. **Contrato del paso:** ¿se hizo lo que el prompt pedía?
2. **Invariantes:** ¿se respetan las del MASTER?
3. **Tests:** ¿pasan los nuevos? ¿no se rompió ninguno?
4. **Sintaxis:** `node --check` en todos los archivos tocados.
5. **Scope:** ¿solo se tocaron los archivos esperados?
6. **Consistencia:** ¿sigue el patrón de los pasos anteriores?
7. **Evidencia:** ¿es la real o un resumen?

**Resultados posibles:**
- ✅ **APROBADO:** commit directo.
- ⚠️ **APROBADO CON CORRECCIÓN:** el agente aplica correcciones antes del commit.
- ❌ **RECHAZADO:** rehacer el paso.

---

## 8. Reglas invariantes del proceso

Estas reglas aplican siempre:

| # | Regla |
|---|-------|
| 1 | **Nunca pegar contenido de archivos en la consola.** Usar `cat > archivo <<'EOF'` para archivos cortos, o `code archivo` (VS Code) para archivos largos. Guardar con Ctrl+S antes de cerrar. |
| 2 | **Nunca usar `node -e`.** Bash expande `!` y corrompe scripts. Usar archivos en `/tmp/` si hace falta. |
| 3 | **Heredoc con `<<'EOF'`** (delimitadores quoted). |
| 4 | **LF/CRLF:** los warnings de git en Windows son esperados, no son errores. |
| 5 | **El agente externo no commitea.** El operador commitea tras aprobación. |
| 6 | **Los commits son atómicos.** Un paso = un commit de código + un commit de docs. |
| 7 | **Verificar antes de commitear.** `git status --short`, `git diff --cached --stat`, `git diff --cached --check`. |
| 8 | **Verificar después de commitear.** `git status --short` debe quedar vacío. |
| 9 | **No avanzar sin aprobación.** El auditor es el cuello de botella. |
| 10 | **Los tests existentes no se rompen.** Si un cambio los rompe, se justifica o se rechaza. |

---

## 9. Cómo retomar el trabajo

Si retomás el proyecto (nueva sesión, nuevo asistente, nueva persona):

### Checklist

1. **Leer** este archivo completo.
2. **Leer** `docs/ROADMAP.md` → estado actual, bloque y paso.
3. **Leer** `docs/AUDITORIA.md` → última auditoría, deuda técnica.
4. **Verificar** el estado del repo:
   ```bash
   git status --short
   git log --oneline -10
   npm test 2>&1 | tail -5
   ```
5. **Identificar el próximo paso** en `ROADMAP.md`.
6. **Si hay un paso en progreso:**
   - Ver si tiene prompt archivado en `docs/roadmap/pasos/`.
   - Ver si el agente ya devolvió evidencia.
   - Continuar desde donde quedó.
7. **Si no hay paso en progreso:**
   - Generar el prompt del siguiente paso.
   - Entregarlo al operador.

### Preguntas frecuentes al retomar

**¿Dónde estoy?**
→ `ROADMAP.md`, sección "Estado global" + detalle del bloque actual.

**¿Qué se hizo?**
→ `ROADMAP.md`, sección "Historial de actualizaciones" + `AUDITORIA.md`, "Historial".

**¿Qué deuda técnica hay?**
→ `AUDITORIA.md`, sección "Deuda técnica acumulada".

**¿Cómo se escribe un prompt?**
→ Sección 5 de este archivo + `docs/roadmap/README.md`.

**¿Cómo se aprueba un paso?**
→ Sección 7 de este archivo.

**¿Qué no debo hacer?**
→ Sección 8 de este archivo (reglas invariantes).

### Estado al 2026-09-23

- **Bloques 0–5 cerrados.**
- **Bloque 6 (opcional, no iniciado).**
- **Unit tests:** 1749 (61 archivos).
- **E2E:** ~215 tests, todos con LocalAdapter.
- **Integration:** 99 tests contra Supabase Cloud.
- **Deudas pendientes:** #51 (AUDITORIA historial duplicado), #82–#86, #91–#93.

### Próximo paso al retomar

1. **Leer** `docs/ROADMAP.md` → sección "Bloque 6" (opcional).
2. **Decidir** si se hace Bloque 6 (migración e2e a Supabase) o se prioriza otra cosa.
3. **Si no se hace Bloque 6:** cerrar el proyecto o trabajar en deudas pendientes (#51, MASTER pendiente de integración).
---

## 10. Problemas comunes y cómo evitarlos

| Problema | Causa | Solución |
|----------|-------|----------|
| Archivo espurio `end` en el repo | Heredoc mal cerrado | Verificar `cat > archivo <<'EOF'` antes de ejecutar |
| Tests rotos tras un paso | Scope creep | El auditor verifica "no se rompió nada" antes de aprobar |
| Duplicación de filas en ROADMAP | `sed` con emoji falla | Usar `code` para editar archivos Markdown largos |
| Evidencia falsa (resumen) | El agente no devuelve output real | Exigir `git diff --stat`, `npm test` completo, no resúmenes |
| Commit antes de aprobación | Operador apurado | Regla 5 y 9: no commitear sin aprobación |
| Pérdida de contexto al retomar | No se leyó este archivo | Checklist de la sección 9 |

---

## 11. Documentos que se actualizan y cuándo

| Documento | Cuándo se actualiza | Quién |
|-----------|---------------------|-------|
| `ROADMAP.md` | Al cerrar cada paso | Auditor |
| `AUDITORIA.md` | Al cerrar cada paso | Auditor |
| `docs/roadmap/pasos/bloque-X-paso-Y.md` | Al cerrar cada paso | Auditor |
| `MASTER.md` | Al cerrar cada bloque o ante decisión arquitectónica | Auditor |
| `AC-VISUAL.md` | Al cerrar Bloque 2.1 (ya cerrado) o si cambian criterios | Auditor |
| `GAMES.md` | Si cambian reglas de juegos | Auditor |
| `CONTINUIDAD.md` | Al cerrar cada bloque o si cambia el flujo | Auditor |

**Regla:** `CONTINUIDAD.md` no se toca en cada paso. Se toca al cerrar bloque o si cambia el flujo de trabajo.

---

## 12. Definición corta del proyecto (para citar en prompts)

> **CUMPEO** es una aplicación personal para gestionar "Noches de Juegos". Tres interfaces: Conductor (controla), Pública (expone), Móvil (participa). Stack: JavaScript vanilla + IndexedDB (dev) + Supabase (prod). Arquitectura server-first, sin optimistic UI, con idempotencia vía `action_id` y lease de control. 17 entidades, 156+ invariantes. Roadmap por bloques y pasos pequeños, auditados uno por uno.

---

**Fin del prompt inicial de continuidad v1.0**