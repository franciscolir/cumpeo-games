# CUMPEO — Documento Maestro de Construcción

**Versión:** 2.9
**Estado:** H4 · H5.1 · H6 · H7.1–H7.12 COMPLETOS · Bloques 0–5 COMPLETOS · ~99% proyecto completo
**Última actualización:** Post-commit `9b7dfdc` (cierre Bloque 5)
**HEAD:** `feature/vertical-slice` — `9b7dfdc`
**Tests:** 433 unit + 35 e2e + 99 integration
**Audiencia:** Desarrollador único / equipo reducido
**Propósito:** Guía única de referencia para construcción, consulta y auditoría del sistema.

---

## Índice

1. Visión General
2. Principios de Arquitectura
3. Modelo Conceptual Cerrado
4. Invariantes Globales
5. Reglas Transversales
6. Esquema de IndexedDB
7. Capa de Repositorios
8. Estado del Desarrollo
9. Roadmap de Fases
10. Convenciones de Trabajo
11. Glosario
12. Registro de Decisiones

---

## 1. Visión General

**CUMPEO** es una aplicación personal para gestionar eventos de juegos tipo "Noche de Juegos" o "Trivia". El sistema está diseñado para ser **rápido y confiable**.

### 1.1 Caso de uso principal

Un conductor (usuario único en el MVP) organiza una partida de juegos entre dos equipos. La partida se compone de un circuito (secuencia de juegos) y cada juego tiene su propia lógica. El conductor dirige la partida desde una consola. El público (audiencia) puede ver el estado en una pantalla secundaria.

### 1.2 Características clave

- **Agnóstico al juego**: la app soporta múltiples tipos de juegos (Trivia, Rosco, Pictionary, etc.) a través de un contrato común.
- **Historial inmutable**: cada partida conserva una copia congelada de la configuración que usó.
- **Un solo conductor activo**: garantizado por un lease de control a nivel de base de datos.
- **Idempotencia**: cada acción crítica está protegida contra doble ejecución.
- **Multi-tab**: solo una pestaña puede controlar la partida a la vez.
- **Server-first**: la UI refleja el estado persistido, nunca al revés.


---

## 2. Principios de Arquitectura

### 2.1 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | JavaScript vanilla (sin frameworks) |
| Base de datos (dev) | IndexedDB (vía adaptador propio) |
| Base de datos (prod) | Supabase (PostgreSQL + PostgREST + Realtime) |
| Backend | Ninguno propio (cliente → Supabase directo) |
| Testing | Vitest + fake-indexeddb |
| Control de versiones | Git |

### 2.2 Principios de diseño

1. **Server-first**: La UI nunca modifica estado localmente antes de que la operación haya sido persistida. Esto prohíbe *optimistic UI*.
2. **Congelación por copia**: Los datos históricos se copian en el momento de crear la partida, no se referencian dinámicamente.
3. **Idempotencia**: Toda acción crítica lleva un `action_id` único, generado por el cliente al iniciar la acción y preservado durante reintentos.
4. **Lease de control**: Solo una sesión (`session_id`) puede ejecutar acciones críticas sobre una partida en un momento dado.
5. **Transacciones atómicas**: Toda operación crítica que modifica múltiples entidades se ejecuta dentro de una única transacción.
6. **Inmutabilidad del snapshot**: Un `SetSnapshot` nunca cambia después de creado.
7. **Versionado optimista**: Las entidades editables llevan `version` para detectar escrituras concurrentes.

### 2.3 Separación de capas

Cliente (navegador)
|
+-- Repositorios (acceso a datos)
| |
| +-- LocalAdapter (IndexedDB dev) / SupabaseAdapter (prod)
|
+-- Servicios (lógica de negocio, orquestación)
|
+-- GameDefinitions (lógica específica por juego)
|
+-- UI (presentación, no lógica)

---

## 3. Modelo Conceptual Cerrado

### 3.1 Entidades (17)

#### Catálogo (5)

| Entidad | Propósito |
|---------|-----------|
| **Juego** | Tipo de juego (Trivia, Rosco, etc.). Catálogo, no ejecución. |
| **Set** | Contenido reutilizable con versionado propio. |
| **ItemSet** | Elemento individual dentro de un Set. |
| **Extra** | Herramienta auxiliar (Tómbola, Dados, Dinamita). |
| **EquipoGuardado** | Plantilla reutilizable de nombre + color. |

#### Configuración (3)

| Entidad | Propósito |
|---------|-----------|
| **Circuito** | Definición reutilizable de una secuencia de juegos. |
| **CircuitoJuego** | Instancia de un juego dentro de un circuito. |
| **EquipoCircuito** | Equipo definido dentro de un circuito. |

#### Partida (5)

| Entidad | Propósito |
|---------|-----------|
| **Partida** | Sesión completa de juego. Unidad histórica. |
| **JuegoEjecutado** | Instancia de un juego dentro de una partida. |
| **EquipoPartida** | Equipo dentro de una partida con su puntaje. |
| **ParticipantePartida** | Persona que participa en una partida. |
| **ExtraUso** | Registro funcional del uso de un Extra. |

#### Inmutable (1)

| Entidad | Propósito |
|---------|-----------|
| **SetSnapshot** | Copia inmutable de una versión de Set. Compartible. |

#### Técnica (3)

| Entidad | Propósito |
|---------|-----------|
| **AccionProcesada** | Registro de `action_id` ya procesados (idempotencia). |
| **ControlPartida** | Lease de control de una partida. |
| **EventoTecnico** | Log de diagnóstico append-only. |

### 3.2 Máquinas de estado

#### Partida.estado
CONFIGURANDO -> EN_CURSO -> { FINALIZADA, DESCARTADA, EXPIRADA }

#### Circuito.estado
BORRADOR <-> LISTO

`es_plantilla = true` solo es válido con `estado = LISTO`.

#### JuegoEjecutado.estado
PENDIENTE -> EN_CURSO <-> PAUSADO -> FINALIZADO
-> NO_JUGADO


---

## 4. Invariantes Globales

**Total: 156 invariantes · 19 categorías**

### 4.1 Identidad y UUID

- **INV-001**: Todas las entidades usan UUID v4 como PK, generado por el cliente.
- **INV-002**: SetSnapshot tiene id propio.
- **INV-003**: AccionProcesada.action_id es único globalmente.
- **INV-004**: ControlPartida comparte PK con Partida.

### 4.2 Catálogo

- **INV-005**: Juego es catálogo, no ejecución.
- **INV-006**: Extra es catálogo, no ejecución.
- **INV-007**: EquipoGuardado es plantilla pura.

### 4.3 Sets e ItemSet

- **INV-008**: Set requiere Juego.
- **INV-009**: ItemSet requiere Set.
- **INV-010**: ItemSet pertenece a un solo Set.
- **INV-011**: Set.version incrementa en cada modificación persistida.
- **INV-012**: Modificación sin incremento de versión es imposible.

### 4.4 Snapshots

- **INV-013**: SetSnapshot es inmutable.
- **INV-014**: source_version y source_set_name congelados.
- **INV-015**: source_set_id nullable.
- **INV-016**: Creación solo por confirmación explícita.
- **INV-017**: Snapshot compartible por N consumidores.
- **INV-018**: CircuitoJuego.snapshot_id opcional pero requerido si el Juego lo requiere.
- **INV-019**: JuegoEjecutado.snapshot_id heredado al crear.
- **INV-020**: JuegoEjecutado.snapshot_id inmutable una vez iniciado.
- **INV-021**: Estado "desactualizado" es derivado.
- **INV-022**: JuegoEjecutado no tiene "desactualizado".
- **INV-023**: Set eliminado no elimina snapshot.
- **INV-024**: [ACTUALIZAR SNAPSHOT] solo en PENDIENTE.

### 4.5 Circuitos

- **INV-025**: Circuito.estado en { BORRADOR, LISTO }.
- **INV-026**: es_plantilla = true -> estado = LISTO.
- **INV-027**: Circuito tiene exactamente 2 EquipoCircuito.
- **INV-028**: CircuitoJuego referencia 1 Circuito y 1 Juego.
- **INV-029**: Modificación de Circuito no afecta Partida.
- **INV-030**: Circuito no se elimina si tiene Partida activa.
- **INV-031**: Eliminación de Circuito no elimina Partida.
- **INV-032**: Reutilización por copia, no por re-ejecución.

### 4.6 Equipos

- **INV-033**: EquipoCircuito copia nombre y color.
- **INV-034**: Modificar EquipoGuardado no modifica EquipoCircuito.
- **INV-035**: EquipoPartida copia nombre y color al crear la Partida.
- **INV-036**: EquipoPartida inmutable en nombre y color.
- **INV-037**: Modificar EquipoCircuito no modifica EquipoPartida.
- **INV-038**: EquipoPartida.equipo_circuito_id opcional.
- **INV-039**: EquipoPartida tiene exactamente 2 por Partida.
- **INV-040**: EquipoPartida.puntaje es entero (puede ser negativo).

### 4.7 Partidas

- **INV-041**: Partida.estado en { CONFIGURANDO, EN_CURSO, FINALIZADA, DESCARTADA, EXPIRADA }. No existe estado BORRADOR para Partida (solo para Circuito).
- **INV-042**: Progresión unidireccional.
- **INV-043**: Estados terminales inmutables.
- **INV-044**: Partida.circuito_id nullable.
- **INV-045**: Partida.circuito_nombre copiado al crear.
- **INV-046**: Partida individual = circuito de 1 juego.
- **INV-047**: Partida tiene exactamente 1 ControlPartida.
- **INV-048**: Partida.circuito_id obligatorio al crear.
- **INV-049**: Expiración por inactividad (>24h).
- **INV-050**: Pausa no evita expiración.
- **INV-051**: last_activity_at se actualiza con actividad significativa.

### 4.8 Juegos ejecutados

- **INV-052**: JuegoEjecutado.estado en dominio cerrado.
- **INV-053**: Progresión unidireccional.
- **INV-054**: FINALIZADO y NO_JUGADO terminales.
- **INV-055**: Solo un JuegoEjecutado activo por Partida.
- **INV-056**: JuegoEjecutado = EN_CURSO requiere Partida = EN_CURSO.
- **INV-057**: JuegoEjecutado = PAUSADO requiere Partida = EN_CURSO.
- **INV-058**: juego_id, orden, snapshot_id congelados.
- **INV-059**: configuracion_congelada inmutable.
- **INV-060**: state_version incrementa en cada modificación.
- **INV-061**: timer_actual opcional.
- **INV-062**: paused_at solo válido en PAUSADO.
- **INV-063**: resultado no-null si y solo si estado = FINALIZADO.
- **INV-064**: finish_reason no-null en FINALIZADO y NO_JUGADO.
- **INV-065**: NO_JUGADO -> started_at IS NULL.
- **INV-066**: TIME_UP determinista (contrato).
- **INV-067**: TIME_UP acotado (MAX 100 iteraciones).
- **INV-068**: Finalización y marcador atómicos.

### 4.9 Participantes

- **INV-069**: ParticipantePartida requiere Partida y EquipoPartida.
- **INV-070**: ParticipantePartida.equipo_partida_id de la misma partida.
- **INV-071**: Una fila por participante por partida.
- **INV-072**: Equipo fijo durante la partida.
- **INV-073**: Participante puede existir sin haber jugado.
- **INV-074**: Sin catálogo global de personas.

### 4.10 Extras

- **INV-075**: ExtraUso requiere Extra y Partida.
- **INV-076**: ExtraUso copia extra_codigo y extra_nombre.
- **INV-077**: ExtraUso solo durante Partida EN_CURSO.
- **INV-078**: ExtraUso se crea al cerrar el extra.
- **INV-079**: Estado interno del extra es efímero.
- **INV-080**: ExtraUso actualiza last_activity_at.
- **INV-081**: Referencias opcionales de ExtraUso en la misma partida.
- **INV-082**: Extra no se elimina si tiene ExtraUso.

### 4.11 Acciones idempotentes

- **INV-083**: Acciones críticas requieren action_id.
- **INV-084**: action_id generado una sola vez por acción lógica.
- **INV-085**: AccionProcesada insertada al inicio de la transacción.
- **INV-086**: Rollback elimina AccionProcesada.
- **INV-087**: Reintento con action_id ya procesado devuelve el resultado anterior.
- **INV-088**: partida_id de AccionProcesada es nullable.

### 4.12 Control de partida

- **INV-089**: ControlPartida.session_id nullable.
- **INV-090**: Solo una sesión con el control.
- **INV-091**: Adquisición atómica.
- **INV-092**: Acciones críticas requieren control activo.
- **INV-093**: Lease de 30s, heartbeat cada 10s (parámetro operativo).
- **INV-094**: ControlPartida no es historial.
- **INV-095**: ControlPartida se elimina en cascada con Partida.

### 4.13 Eventos técnicos

- **INV-097**: event_type controlado por código.
- **INV-098**: level en { INFO, WARN, ERROR, FATAL }.
- **INV-099**: metadata JSON libre.
- **INV-100**: Referencias opcionales e independientes.
- **INV-101**: No es historial funcional.
- **INV-102**: Retención 30 días.
- **INV-125**: Coherencia contextual de referencias técnicas.
- **INV-150**: EventoTecnico es append-only.

### 4.14 Concurrencia

- **INV-103**: Toda acción crítica es transaccional.
- **INV-104**: Conflictos de version no se reintentan automáticamente.
- **INV-105**: Sin doble ejecución por doble clic o reintento.
- **INV-106**: Multi-tab: solo una sesión controla.

### 4.15 Versionado

- **INV-107**: version en entidades editables.
- **INV-108**: Entidades sin version.
- **INV-109**: state_version controlado por persistencia.
- **INV-126**: Circuito.version obligatoria.

### 4.16 Ciclos de vida

- **INV-110**: Expiración de partidas.
- **INV-111**: Cierre por descarte.
- **INV-112**: Cierre por finalización anticipada.
- **INV-113**: Cierre normal.

### 4.17 Historial

- **INV-114**: Historial no es entidad.
- **INV-115**: Historial nunca se elimina automáticamente.
- **INV-116**: Resultado es propiedad de Partida.

### 4.18 Integridad entre entidades

- **INV-117**: Congelación por copia, no por referencia.
- **INV-118**: Modificar catálogo no afecta partida histórica.
- **INV-119**: Integridad referencial entre Partida y sus dependientes.
- **INV-120**: Snapshot único por JuegoEjecutado heredado.

### 4.19 Reglas de eliminación

- **INV-121**: Sin CASCADE hacia historial.
- **INV-122**: ControlPartida única excepción de CASCADE.
- **INV-123**: SetSnapshot no se elimina por CASCADE.
- **INV-124**: Partida no se elimina físicamente.

### Invariantes de cierre

- **INV-127**: Juego.codigo único e inmutable.
- **INV-128**: Extra.codigo único e inmutable.
- **INV-129**: ItemSet.orden único y sin gaps dentro de un Set.
- **INV-130**: Juego.requiere_set determina obligatoriedad de snapshot.
- **INV-131**: Circuito puede volver de LISTO a BORRADOR.
- **INV-132**: CircuitoJuego.configuracion con contrato por Juego.
- **INV-133**: EquipoCircuito.posicion único 1 o 2.
- **INV-134**: SetSnapshot.juego_id obligatorio, ON DELETE RESTRICT.
- **INV-135**: Snapshot_id RESTRICT desde CircuitoJuego y JuegoEjecutado.
- **INV-136**: SetSnapshot no modificable (refuerzo de INV-013).
- **INV-137**: SetSnapshot.contenido JSON con contrato por Juego.
- **INV-138**: Partida.finish_reason en { CIRCUITO_COMPLETO, EXPIRACION, DESCARTADA_POR_CONDUCTOR }. Es null en estados no terminales (CONFIGURANDO, EN_CURSO). Es no-null en estados terminales (FINALIZADA, DESCARTADA, EXPIRADA).
- **INV-139**: finish_reason obligatorio si y solo si estado IN (FINALIZADA, DESCARTADA, EXPIRADA).
- **INV-140**: started_at null si estado = CONFIGURANDO.
- **INV-141**: EquipoPartida.posicion único 1 o 2.
- **INV-142**: JuegoEjecutado.orden único por Partida.
- **INV-143**: timer_actual estructura JSON definida.
- **INV-144**: ParticipantePartida.nombre obligatorio.
- **INV-145**: ExtraUso.configuracion y resultado opcionales.
- **INV-146**: ControlPartida sin id propio.
- **INV-147**: ControlPartida creado con session_id = NULL.
- **INV-148**: AccionProcesada.tipo_accion string libre.
- **INV-149**: AccionProcesada inmutable tras inserción.
- **INV-151**: Todas las FKs de EventoTecnico son SET NULL.
- **INV-153**: Partida.started_at null en CONFIGURANDO.
- **INV-154**: Partida.finished_at null en no-terminal, no-null en terminal.
- **INV-155**: JuegoEjecutado.finished_at null en no-terminal, no-null en terminal.
- **INV-156**: Partida -> FINALIZADA cuando todos los JuegoEjecutado son terminales.
- **INV-157**: Partida -> DESCARTADA solo por acción explícita.
- **INV-158**: Partida -> EXPIRADA solo por evaluación de inactividad.
- **INV-159**: ParticipantePartida.ha_participado -> true después de jugar; no se elimina si ya participó.

### 4.8.1 Finish reason de JuegoEjecutado

- **INV-160**: JuegoEjecutado.finish_reason en { NORMAL, PARTIDA_DESCARTADA, PARTIDA_FINALIZADA, PARTIDA_EXPIRADA }. Es null en estados no terminales. NORMAL cuando el juego terminó por su cuenta. Los valores PARTIDA_* indican que el juego se cerró por arrastre de una acción sobre la Partida.


---

## 5. Reglas Transversales

### 5.1 Convenciones de naming

- **DB / almacenes**: `snake_case`.
- **JS cliente**: `camelCase`.
- **Mapper**: en el adaptador, no en la UI.

### 5.2 Timestamps

- `created_at` en todas las entidades.
- `updated_at` solo en mutables.
- Formato: ISO 8601 UTC (`.toISOString()`).
- Actualización automática: dentro de la operación que modifica.

### 5.3 Campos copia

Regla: **todo dato que deba sobrevivir a una modificación del origen se copia, no se referencia.**

| Entidad | Campo | Origen |
|---------|-------|--------|
| Partida | circuito_nombre | Circuito.nombre |
| JuegoEjecutado | juego_id | CircuitoJuego.juego_id |
| JuegoEjecutado | orden | CircuitoJuego.orden |
| EquipoPartida | nombre, color | EquipoCircuito.nombre, .color |
| SetSnapshot | source_set_name, source_version | Set.nombre, .version |
| ExtraUso | extra_codigo, extra_nombre | Extra.codigo, .nombre |

### 5.4 Orden

- Enteros 1-based, sin gaps.
- Reasignables tras altas/bajas.
- Únicos por contenedor.

### 5.5 Identificadores visibles


- No persistidos en el MVP.
- UI muestra nombres, no números.

### 5.6 Versionado

- `version` en entidades editables.
- `state_version` en JuegoEjecutado.
- Incremento manual (repositorio), no trigger en IndexedDB.
- En PostgreSQL, trigger como refuerzo.

### 5.7 Action ID

- UUID v4 generado por el cliente.
- Preservado durante reintentos.
- Persistido en `accion_procesadas` al inicio de la transacción.
- Rollback limpia el registro.

### 5.8 Lease de control

- Duración: 30s.
- Heartbeat: cada 10s.
- Renovable por la misma sesión.
- Adquisición atómica.
- Verificación dentro de la transacción de la acción crítica.

---

## 6. Esquema de IndexedDB

### 6.1 Base de datos

- **Nombre**: `cumpeo-db` (constante `DB_NAME`).
- **Versión actual**: 2.
- **Migraciones**: declaradas en `src/adapters/migrations.js`.

### 6.2 Object stores

| Store | KeyPath | Notas |
|-------|---------|-------|
| `juegos` | id | Catálogo |
| `sets` | id | Catálogo con version |
| `item_sets` | id | Contenido de Set |
| `extras` | id | Catálogo |
| `equipos_guardados` | id | Plantillas |
| `circuitos` | id | Config |
| `circuito_juegos` | id | Config |
| `equipo_circuitos` | id | Config |
| `set_snapshots` | id | Inmutable |
| `partidas` | id | Historial |
| `juego_ejecutados` | id | Ejecución |
| `equipo_partidas` | id | Puntajes |
| `participante_partidas` | id | Participantes |
| `extra_usos` | id | Registros |
| `control_partidas` | partida_id | Lease |
| `accion_procesadas` | action_id | Idempotencia |
| `evento_tecnicos` | id | Log |

### 6.3 Notas

- `evento_tecnicos` usa `evento_tecnico_*` como prefijo.
- Los índices únicos compuestos permiten garantizar unicidad lógica.
- Índices simples coexisten con compuestos para permitir consultas de prefijo sin sorpresas.

---

## 7. Capa de Repositorios

### 7.1 Jerarquía
BaseRepository (genérico)
+-- JuegoRepository
+-- ExtraRepository
+-- EquipoRepository
+-- SetRepository
+-- CircuitoRepository
+-- SnapshotRepository
+-- ControlRepository
+-- ParticipanteRepository
+-- PartidaRepository (agregado)
+-- AccionProcesadaRepository (idempotencia)

text

### 7.2 BaseRepository

Métodos genéricos: `agregar`, `insertarOActualizar`, `obtener`, `listar`, `listarPorIndice`, `eliminar`.

### 7.3 Contratos por repositorio

- **JuegoRepository** (7 ops)
- **ExtraRepository** (7 ops)
- **EquipoRepository** (5 ops)
- **SetRepository** (14 ops)
- **CircuitoRepository** (7 ops)
- **SnapshotRepository** (5 ops)
- **ControlRepository** (6 ops)
- **ParticipanteRepository** (5 ops)
- **PartidaRepository** (agregado grande)
- **AccionProcesadaRepository** (4 ops)

### 7.4 Convenciones de retorno

- `crear*` -> entidad creada.
- `actualizar*` -> entidad actualizada.
- `eliminar*` -> void.
- `obtener*` -> entidad o `undefined`/`null`.
- `listar*` -> array.
- `reordenar*` -> void.

### 7.5 Errores personalizados

`NoEncontradoError`, `ValidacionError`, `ConflictoVersionError`, `CircuitoNoEditableError`, `SinControlError`, `OperacionInvalidaError`, `PublicCodigoDuplicadoError`, `SnapshotReferenciadoError`, `YaExisteError`.

### 7.6 Patrón de resolución de errores

- **Antes de escribir**: `resolver({ error })` sin `tx.abort()`.
- **Después de escribir**: `tx.abort()` para revertir.


---

## 8. Estado del Desarrollo

### 8.1 Resumen de progreso

| Métrica | Valor |
|---------|-------|
| Progreso global | ~99% |
| Bloques cerrados | 6 (Bloques 0–5) |
| Juegos implementados | 9 (QPEP, Trivia, Rosco, Canción Incompleta, Pictionary, Historia Enredada, Memoricé, Anti-Trivia, Enlaces) |
| Tests unit | 1749 (61 archivos) |
| Tests e2e | ~215 |
| Tests integration | 99 (contra Supabase Cloud) |
| Commits totales (rama) | 100+ |

### 8.2 Fases cerradas

| Fase | Contenido | Estado |
|------|-----------|--------|
| Diseño conceptual | 17 entidades, 156 invariantes, ciclo de vida | Cerrado |
| Arquitectura | Server-first, RPC, Realtime, adaptador | Cerrado |
| Capa de repositorios (H3) | 14 repositorios + adaptador | Cerrado |
| H7.1 — Fundaciones de Supabase | Schema, client, esqueleto adapter | Cerrado (c66fbc2) |
| H7.2 — SupabaseAdapter query/rpc | Adapter CRUD + rpc contra Supabase | Cerrado (dabce6c) |
| H7.2a — Fixes críticos de H7.2 | Validación de filtros + single null | Cerrado (54be9a6) |
| H7.3 — RPC transaccionales | 15 funciones plpgsql definitivas | Cerrado (0c7dfcd) |
| H7.4 — Repos de catálogo migrados | BaseRepository polimórfico + Juego/Extra/Equipo repos | Cerrado (8dfba1e) |
| H7.5 — Fix modo + Control/Participante | modo instance property + 2 repos migrados | Cerrado (d36aa7a, 7b321c8) |
| H7.5a — Fix 3 bugs de Control/Participante | idField partida_id + paths Supabase | Cerrado (ff5e60a) |
| H7.6 — Circuito + Snapshot migrados | RPC crear_circuito_completo + 2 repos | Cerrado (29dbd98, fc6b46d) |
| H7.7 — Set + AccionProcesada migrados | RPC crear_set_completo + 2 repos | Cerrado (5efe5dd, e05b9f2) |
| H7.8 — PartidaRepository migrado | RPC transaccionales + 8 tests | Cerrado (b11437d, 2df33c5) |
| H7.9b.1 — RLS permisivo | 17 tablas + 34 políticas | Cerrado (44fc12e) |
| H7.10 — Realtime | SupabaseAdapter.suscribir + UI | Cerrado (e06e480, 0cd1512, 2067d48) |
| H7.12a — Auth Magic Link | Login/logout con Supabase Auth | Cerrado (145772e) |
| H7.12b — RLS restrictivo | Políticas específicas + revocación de anon | Cerrado (08e760c) |
| Bloque 0 — Cierre documental | 5 decisiones cerradas + invariantes | Cerrado (2026-09-18) |
| Bloque 1 — Modelo de datos extendido | MensajePublico, FotoPublica, StorageAdapter | Cerrado (7c3288f) |
| Bloque 2 — Shell de partida | ShellPartida + ShellPublica + GameUI contract | Cerrado (5e32d5b) |
| Bloque 3 — Móvil + moderación | Ruta #/movil, mensajes, fotos, moderación | Cerrado (9ca4e7a) |
| Bloque 4 — "¿Qué piensa el público?" | Primer juego completo. ★ MVP alcanzado ★ | Cerrado (2e19767) |
| Bloque 5 — Juegos restantes | 9 juegos implementados end-to-end | Cerrado (9b7dfdc) |

### 8.3 H4 — Servicios de dominio (CERRADA)

#### Estado de servicios

| Servicio | Estado | Commit | Tests | Notas |
|----------|--------|--------|-------|-------|
| ControlService | ✅ Cerrado | `414cd2e` | 12 | Lease de control, heartbeat |
| PartidaService | ✅ Cerrado | `61862e3` | 24 | Fachada sobre PartidaRepository + ControlService |
| CircuitoService | ✅ Cerrado | `3d413ba` | 8 | Fachada sobre CircuitoRepository |
| SetService | ✅ Cerrado | `6294d75` | 16 | Fachada sobre SetRepository |
| GameDefinitionRegistry | ✅ Cerrado | `d8e07ec` | 18 | Registro de contratos de juegos |

#### PartidaService — Métodos refactorizados

| Método | Grupo | Estado | Commit |
|--------|-------|--------|--------|
| `crearPartida` | A (helpers compartidos) | ✅ | `c2962fa` |
| `pausarJuego` | A (vía `_cambiarEstadoJuego`) | ✅ | `3df8390` |
| `reanudarJuego` | A (vía `_cambiarEstadoJuego`) | ✅ | `3df8390` |
| `descartarPartida` | A (vía `_terminarPartida`) | ✅ | `295e596` |
| `finalizarCircuito` | A (vía `_terminarPartida`) | ✅ | `295e596` |
| `iniciarJuego` | B (lógica intermedia) | ✅ | `ae649ca` |
| `comenzarPartida` | B (lógica intermedia) | ✅ | `ebd19dd` |
| `actualizarEstadoJuego` | C (lógica compleja) | ✅ | `8f40765` |
| `finalizarJuego` | C (lógica compleja) | ✅ | `c425013` |

#### Modelo de trabajo por sub-bloques

- **Grupo A (✅ cerrado):** Métodos con helpers compartidos (`_cambiarEstadoJuego`, `_terminarPartida`). El wrapper público maneja idempotencia; el helper interno hace el trabajo real.
- **Grupo B (✅ cerrado):** Métodos con lógica intermedia. Requieren orquestación de múltiples repositorios.
- **Grupo C (✅ cerrado):** Métodos con lógica compleja. Transacciones de alto riesgo.

#### Estado final de idempotencia

**9/9 métodos críticos idempotentes. 252 tests pasando.**

Cada método sigue el mismo patrón:
1. Wrapper público con `actionId` como último argumento.
2. `STORE_ACCIONES` agregado a la tx.
3. `reservarEnTx` al inicio de la tx.
4. Si `yaProcesada` → devolver cache.
5. Si no → llamar a `_<metodo>EnTx` y luego `actualizarResultadoEnTx`.
6. Helper interno `_<metodo>EnTx` con la lógica real y JSDoc.

### 8.3.2 Contrato GameDefinition

Cada `GameDefinition` es un objeto que declara el comportamiento de un juego concreto. El `GameDefinitionRegistry` valida este contrato al registrar.

**Estructura:**

```js
{
  codigo: 'TRIVIA',                       // string, único, inmutable
  nombre: 'Trivia',                       // string, legible
  requiere_set: true,                     // boolean (INV-130)

  validarConfiguracion(config),           // (config) => boolean | throws
  validarContenidoSet(contenido),         // (contenido) => boolean | throws
  validarEstadoJuego(estado),             // (estado) => boolean | throws
  calcularResultado(estadoJuego),         // (estado) => { puntos_equipo_1, puntos_equipo_2 }
  aplicarTimeUp(estadoJuego)              // (estado) => nuevoEstadoJuego (o null si no aplica)
}
```

**Métodos obligatorios:** `validarConfiguracion`, `validarContenidoSet`, `validarEstadoJuego`, `calcularResultado`, `aplicarTimeUp`.

El registry **no invoca** estos métodos. Solo verifica que existan. La invocación la hace cada juego concreto o la UI cuando corresponda.

### 8.3.3 TriviaGameDefinition (H5.1)

Implementación concreta del contrato `GameDefinition` para el juego Trivia.

**Ubicación:** `src/games/trivia/TriviaGameDefinition.js` (commit `24a72dc`).

**Contrato implementado:**

| Campo | Valor |
|-------|-------|
| `codigo` | `'TRIVIA'` |
| `nombre` | `'Trivia'` |
| `requiere_set` | `true` |

**Métodos:**

1. **`validarConfiguracion(config)`** — valida `rondas`, `preguntas_por_ronda`, `puntos_por_acierto`, `penalizacion_activa`, `penalizacion_puntos`, `tiempo_por_pregunta_seg`. Regla cross-field: si `penalizacion_activa === true`, entonces `penalizacion_puntos > 0`.

2. **`validarContenidoSet(contenido)`** — valida `items` array no vacío. Cada item: `pregunta` (string), `opciones` (2-6 elementos), `respuesta_correcta_index` (entero en rango), `dificultad` (opcional, 1-3).

3. **`validarEstadoJuego(estado)`** — valida `ronda_actual`, `pregunta_actual_index`, `fase`, `respuestas`, `puntos_equipo_1`, `puntos_equipo_2`.

4. **`calcularResultado(estadoJuego)`** — devuelve `{ puntos_equipo_1, puntos_equipo_2 }`. Asume 0 si faltan.

5. **`aplicarTimeUp(estadoJuego)`** — determinista (INV-066). Fase terminal → null. Fase activa → pasa a `MOSTRANDO_RESULTADO` con respuesta `equipo: 0`. No penaliza.

**Fases del juego:**

- `MOSTRANDO_PREGUNTA`
- `SELECCIONANDO_RESPUESTA`
- `MOSTRANDO_RESULTADO`
- `FIN_DE_RONDA`
- `FIN_DE_JUEGO`

**Estado del juego:**

```js
{
  ronda_actual: 1,
  pregunta_actual_index: 0,
  fase: 'MOSTRANDO_PREGUNTA',
  respuestas: [{ equipo: 1, opcion_index: 2, correcta: true, puntos: 10 }],
  puntos_equipo_1: 0,
  puntos_equipo_2: 0
}
```

**35 tests.** Cubre validaciones, cálculo de resultado, time-up, e integración con `GameDefinitionRegistry`.

### 8.3.4 Bootstrap + Dashboard (H6.1, H6.2)

**H6.1 — Bootstrap** (commit `240964e`):

- `src/app/bootstrap.js` — orquesta la inicialización:
  - Instancia los 5 services.
  - Instancia `SessionContext`.
  - Registra los juegos disponibles.
  - Expone `window.cumpeo`.
  - Retorna `{ adapter, session, services, registry }`.
- `src/games/registro.js` — `registrarTodos(registry)` con la lista de juegos.
- `src/main.js` — llama a `bootstrap(adapter)` después de abrir IndexedDB.

**H6.2 — Dashboard** (commit `3fbd526`):

- `src/ui/dashboard.js` — `renderDashboard(container, app)`:
  - Card de Sesión (sessionId).
  - Card de Circuitos (listado o empty state).
  - Card de Juegos disponibles (registry).
  - Botón de toggle de tema.
- `src/ui/components/card.js` — componente `Card({ titulo, contenido, color, clase })` que devuelve HTML.

**Testing de UI:**

- Sin tests unitarios de UI (no hay `jsdom` ni `happy-dom`).
- Testing exclusivamente con Playwright (e2e).
- **7 tests e2e** en `tests/e2e/boot.spec.js` + `tests/e2e/indexeddb-smoke.spec.js`.

**Convención de UI adoptada:**

- JavaScript vanilla. Template strings + `innerHTML`.
- Componentes como funciones puras que devuelven HTML.
- Sin frameworks, sin router todavía.
- Estética cómic consistente con Tailwind custom.

### 8.3.5 CRUD de Circuitos (H6.3)

Implementación del primer CRUD completo con router y componentes reutilizables.

**Archivos nuevos:**

- `src/ui/theme.js` — lógica de tema centralizada (`applyTheme`, `resolveTheme`, `toggleTheme`).
- `src/ui/router.js` — hash router con soporte de parámetros (`:id`).
- `src/ui/components/boton.js` — botón cómic con 4 variantes (`primary`, `secondary`, `danger`, `ghost`).
- `src/ui/components/input.js` — input cómic.
- `src/ui/components/header.js` — header común con botón de tema y botón volver.
- `src/ui/circuitos/lista.js` — pantalla de listado con eliminar.
- `src/ui/circuitos/formulario.js` — formulario de crear/editar.

**Rutas registradas:**

| Hash | Handler |
|------|---------|
| `#/` | `renderDashboard` |
| `#/circuitos` | `renderListaCircuitos` |
| `#/circuitos/nuevo` | `renderFormularioCircuito` (crear) |
| `#/circuitos/:id` | `renderFormularioCircuito` (editar) |

**Bug del router arreglado:**

El handler de `hashchange` llamaba `this._resolver()` sin `container` ni `app`. La navegación posterior al primer render fallaba silenciosamente. Fix: guardar `container` y `app` como instance variables en `iniciar()`.

**Testing e2e (6 tests nuevos):**

- Navegar de dashboard a circuitos.
- Empty state inicial.
- Crear circuito.
- Eliminar circuito (con `window.confirm`).
- Editar circuito.
- Ruta 404.

**Total: 362 unit + 13 e2e.**

### 8.3.6 Infraestructura de Juegos + CRUD de Sets + Consola (H6.4a, H6.4b, H6.5)

**H6.4a — JuegoService + seed** (commit `c812b1f`):

- `src/services/JuegoService.js` — fachada sobre `JuegoRepository` (6 métodos).
- `src/app/seed.js` — `seedJuegos(services, registry)`, idempotente.
- `src/app/bootstrap.js` — instancia `JuegoService` y llama a `seedJuegos`.
- `src/ui/circuitos/formulario.js` — usa UUIDs reales de juegos.
- **Fix crítico:** la desconexión entre el registry (códigos) y la DB (UUIDs) queda resuelta. Al arrancar, cada `GameDefinition` registrada se persiste como fila `Juego`.

**H6.4b — CRUD de Sets** (commit `84164d8`):

- `src/ui/sets/lista.js` — pantalla `#/sets` con filtro por juego vía URL query.
- `src/ui/sets/formulario.js` — crear/editar sets (sin items).
- `src/ui/router.js` — ignora query string en el matching.
- `src/main.js` — 3 rutas nuevas.
- `src/ui/dashboard.js` — card "Sets".
- **6 tests e2e.**

**H6.5 — Consola del conductor** (commit `db0fe46`, fixup `c908bb5`):

- `src/ui/partidas/utils.js` — helpers (`generarPublicCodigo`, `nuevoActionId`, `fmtPuntos`).
- `src/ui/partidas/lista.js` — lista partidas recuperables.
- `src/ui/partidas/nueva.js` — crear partida desde circuito LISTO, retry ×3 para colisión de `public_codigo`.
- `src/ui/partidas/consola.js` — consola con auto-refresh 2s, 4 cards (Control, Equipos, Juego, Acciones), limpieza de interval al desmontar.
- **Acciones:** tomar control, comenzar, iniciar juego, pausar, reanudar, finalizar circuito, descartar.
- `src/main.js` — 3 rutas nuevas.
- `src/ui/dashboard.js` — card "Partidas".
- **8 tests e2e + 1 en boot.spec.**
- **Fixup:** la detección de "tengo el control" usa `ControlPartida` (no un campo inexistente en `Partida`).

**Total: 376 unit + 29 e2e.**

### 8.3.7 Pantalla Pública (H6.6)

Vista de solo lectura para el público. Cierra la fase H6.

**Archivos:**

- `src/ui/publica/pantalla.js` — `renderPantallaPublica(container, app, params)`:
  - Acceso vía `#/publica/:codigo` (código público).
  - Auto-refresh cada 2s con limpieza estricta del interval.
  - Header custom sin `Header` compartido (no hay botón de tema para el público).
  - Cards de equipos con color de borde real (`style="border-color: ..."`).
  - Puntajes con `font-comic-score text-7xl`.
  - Estado del juego activo (o "Esperando el inicio del juego…").
  - **Sin botones de control.**
- `src/main.js` — ruta `#/publica/:codigo`.
- `src/ui/partidas/consola.js` — link "Ver pantalla pública ↗" con `target="_blank"`.
- `tests/e2e/publica.spec.js` — 5 tests (código inválido, código válido, sin botones, puntajes grandes, link desde consola).

**Ajuste no reportado:**

- `tests/e2e/partidas.spec.js` — el test "ir a la consola" se reescribió para crear la partida vía API (evita flakiness).

**Total: 376 unit + 34 e2e.**

### 8.3.8 H7.1 — Fundaciones de Supabase

**Archivos nuevos:**
- `src/adapters/supabase/client.js` — Singleton del cliente Supabase con validación de env vars.
- `src/adapters/supabase/schema.sql` — Schema Postgres completo (17 tablas) traducido desde IndexedDB.
- `src/adapters/supabase/README.md` — Instrucciones de setup y aplicación del schema.
- `src/adapters/SupabaseAdapter.js` — Esqueleto con NotImplementedError.
- `.env.example` — Plantilla de variables de entorno.
- `tests/e2e/adapter-switch.spec.js` — 1 test (verifica que con VITE_SUPABASE_ADAPTER=false usa LocalAdapter).

**Archivos modificados:**
- `package.json` — Agregado `@supabase/supabase-js` a dependencies.
- `.gitignore` — Agregado `.env`, `.env.local`, `.env.*.local`.
- `src/main.js` — `crearAdapter()` con flag `VITE_SUPABASE_ADAPTER`. Manejo de error en `boot()`.

**Schema Postgres:**
- 17 tablas, orden de creación respeta FKs.
- `pgcrypto` habilitado para `gen_random_uuid()`.
- CHECKs de enums: partidas.estado, circuitos.estado, juego_ejecutados.estado, evento_tecnicos.level.
- UNIQUEs compuestos: item_sets(set_id, orden), circuito_juegos(circuito_id, orden), equipo_circuitos(circuito_id, posicion), juego_ejecutados(partida_id, orden), equipo_partidas(partida_id, posicion).
- Índices sobre booleanos (juegos.activo, sets.activo, extras.activo).

**Decisión de adapter:**
- Flag estático en build time (`import.meta.env.VITE_SUPABASE_ADAPTER`).
- Sin flag → LocalAdapter (default). Con flag → SupabaseAdapter (que lanza NotImplementedError en `abrir()`).
- El error se muestra en la UI con `err.message`.

**Tests:**
- 376 unit (sin cambios).
- 35 e2e (+1 respecto a H6.6, todos activos).

### 8.3.9 H7.2 — SupabaseAdapter con query/rpc

**Archivos nuevos:**
- `src/adapters/supabase/queries.js` — Helpers puros para PostgREST (aplicarFiltros, aplicarOpciones, normalizarRespuesta).
- `src/adapters/supabase/errors.js` — Traducción de códigos Postgres/PgREST a errores del dominio.
- `supabase/migrations/0001_ejemplo_funciones.sql` — 5 funciones plpgsql de ejemplo.
- `supabase/migrations/README.md` — Instrucciones para aplicar migraciones.
- `tests/unit/adapters/supabase/queries.test.js` — 25 tests.
- `tests/unit/adapters/SupabaseAdapter.test.js` — 21 tests.
- `tests/integration/adapters/SupabaseAdapter.test.js` — 12 tests de integración.
- `vitest.config.integration.js` — Config separada para tests de integración.

**Archivos modificados:**
- `src/adapters/SupabaseAdapter.js` — Implementación completa de query/insert/update/delete/rpc. tx/suscribir siguen como stubs.
- `package.json` — Agregado `test:integration` script.
- `vitest.config.js` — Excluye `tests/integration/**`.

**Interfaz del adapter:**
- `query(tabla, opciones)` — CRUD lectura con filtros eq/neq/in, order, limit, single.
- `insert(tabla, filas, opciones)` — Inserción simple o múltiple.
- `update(tabla, filtros, cambios, opciones)` — Update con filtros obligatorios.
- `delete(tabla, filtros)` — Delete con filtros obligatorios.
- `rpc(nombre, params)` — Llamada a funciones plpgsql.
- `tx()` — NO implementado (H7.3+).
- `suscribir()` — NO implementado (H7.9).

**Validaciones (H7.2a):**
- `update`/`delete` requieren filtros no vacíos (previene borrar/actualizar toda la tabla).
- `query`/`insert`/`update`/`delete` validan tabla no vacía.
- `insert` valida filas no vacío.
- `update` valida cambios no vacío.
- `rpc` valida nombre no vacío.
- `single: true` + sin filas (PGRST116) devuelve `null`, no lanza.

**Tests de integración:**
- 12 tests contra Supabase Cloud real.
- Skipeables si no hay credenciales (`describe.skip`).
- `describe.sequential` para evitar race conditions.
- Requieren: RLS deshabilitado, GRANTs aplicados, funciones plpgsql aplicadas.

**Total: 433 unit + 35 e2e + 12 integration.**

### 8.3.10 H7.3 — RPC transaccionales definitivas

15 funciones plpgsql definitivas en 3 archivos de migración, reemplazando las 5 funciones de ejemplo de H7.2.

**Archivos nuevos:**
- `supabase/migrations/0002_funciones_control.sql` — 3 funciones: `reservar_accion` (definitiva), `tomar_control` (definitiva), `actualizar_resultado_accion` (auxiliar).
- `supabase/migrations/0003_funciones_partida.sql` — 9 funciones: `crear_partida`, `comenzar_partida`, `descartar_partida`, `iniciar_juego`, `pausar_juego`, `reanudar_juego`, `finalizar_juego`, `finalizar_circuito`, `expirar_partidas_inactivas`.
- `supabase/migrations/0004_funciones_dominio.sql` — 4 funciones: `crear_snapshot`, `registrar_uso_extra`, `agregar_participante`, `marcar_participacion`.
- `supabase/migrations/README.md` — Instrucciones actualizadas y tabla de archivos.

**Archivos modificados:**
- `tests/integration/adapters/SupabaseAdapter.test.js` — Expandido de 12 a 28 tests (15 tests nuevos para funciones plpgsql).

**Funciones de control:**
- `reservar_accion(p_action_id, p_partida_id, p_tipo_accion)` — Inserta en `accion_procesadas` si no existe. Retorna `{ ok, yaProcesada, resultado }`.
- `tomar_control(p_partida_id, p_session_id)` — Lease atómico de 30s. Rechaza si ocupado por otra sesión. Permite renovación de la misma sesión.
- `actualizar_resultado_accion(p_action_id, p_resultado)` — Guarda resultado JSON en `accion_procesadas`.

**Funciones de partida (ciclo de vida):**
- `crear_partida(p_circuito_id, p_public_codigo, p_session_id, p_action_id)` — Crea partida + equipo_partidas + control_partidas en transacción atómica. Idempotente.
- `comenzar_partida(p_partida_id, p_session_id, p_action_id)` — Cambia a EN_CURSO, crea juego_ejecutados desde circuito_juegos. Requiere control activo.
- `descartar_partida(p_partida_id, p_session_id, p_action_id)` — Marca como DESCARTADA, cierra juegos como NO_JUGADO. Requiere control activo.

**Funciones de juego:**
- `iniciar_juego(p_partida_id, p_juego_ejecutado_id, p_session_id, p_action_id)` — Cambia juego_ejecutado a EN_CURSO. Requiere control activo.
- `pausar_juego(p_partida_id, p_juego_ejecutado_id, p_session_id, p_action_id)` — Cambia a PAUSADO. Requiere control activo.
- `reanudar_juego(p_partida_id, p_juego_ejecutado_id, p_session_id, p_action_id)` — Cambia a EN_CURSO. Requiere control activo.
- `finalizar_juego(...)` — Actualiza resultado, puntos, finish_reason. Si todos terminales, finaliza la partida.
- `finalizar_circuito(...)` — Cierra todos los juegos como NO_JUGADO, finaliza la partida.

**Funciones de dominio:**
- `crear_snapshot(p_set_id, p_action_id)` — Copia items de un set en set_snapshots (inmutable). Idempotente.
- `registrar_uso_extra(p_partida_id, p_extra_codigo, p_extra_nombre, p_configuracion, p_session_id, p_action_id)` — Registra uso de un extra.
- `agregar_participante(p_partida_id, p_equipo_partida_id, p_nombre, p_session_id, p_action_id)` — Crea participante. Rechaza duplicado.
- `marcar_participacion(p_participante_partida_id, p_session_id, p_action_id)` — Marca `ha_participado = true`. Idempotente.

**Convenciones de las funciones:**
- Retorno `jsonb` con `{ ok: boolean, ... }`.
- Las funciones críticas verifican lease de control antes de actuar.
- Idempotencia vía `reservar_accion`.
- Parámetros nombrados (p_*) para evitar ambigüedad con orden alfabético de Supabase.

**Tests de integración (28 totales):**
- Grupo 1: Control (7 tests) — reservar_accion, tomar_control, actualizar_resultado_accion.
- Grupo 2: Partida (6 tests) — crear, comenzar, descartar.
- Grupo 3: Juego (5 tests) — iniciar, pausar, reanudar.
- Grupo 4: Cierre (3 tests) — finalizar_juego, finalizar_circuito.
- Grupo 5: Expiración (1 test).
- Grupo 6: Snapshots (2 tests).
- Grupo 7: Participantes (4 tests).

**Pendiente:** Las funciones 0002-0004 deben aplicarse manualmente en Supabase SQL Editor antes de ejecutar tests de integración.

**Total: 433 unit + 35 e2e + 28 integration.**

### 8.3.11 H7.4 — Repositorios de catálogo migrados a Supabase

**BaseRepository polimórfico:**
- Soporta dos modos: `indexeddb` (LocalAdapter) y `supabase` (SupabaseAdapter).
- Detección vía `this.adapter.constructor.modo` (static property en cada adapter).
- Métodos base: `obtener`, `listar`, `listarPorIndice`, `contarTodos`, `agregarRegistro`, `agregarMuchos`, `actualizarRegistro`, `eliminarRegistro`.
- Helpers de transacción (`leer`, `leerTodos`, `leerPorIndice`, `contar`, `agregar`, `insertarOActualizar`, `eliminar`) se mantienen públicos para compatibilidad con tests unitarios existentes.

**Repos migrados (3):**
- JuegoRepository: CRUD básico + filtro activo + reordenar + inmutabilidad de código.
- ExtraRepository: CRUD básico + filtro activo + reordenar + inmutabilidad de código.
- EquipoRepository: CRUD básico + validación de color hex.

**Adaptadores modificados:**
- LocalAdapter: agregado `static modo = 'indexeddb'`.
- SupabaseAdapter: agregado `static modo = 'supabase'`.

**Tests de integración nuevos (15):**
- JuegoRepository: 5 tests (agregar+obtener, obtenerPorCodigo, listarTodos, filtrarActivos, eliminar).
- ExtraRepository: 5 tests.
- EquipoRepository: 5 tests.
- Todos usan `uniqueId()` con Date.now + random.
- `afterAll` limpia los datos creados.

**Total: 433 unit + 35 e2e + 43 integration.**

### 8.3.12 H7.5 + H7.5a — Migración de Control y Participante

**Cambio estructural (H7.5):**
- `LocalAdapter.modo` y `SupabaseAdapter.modo` pasan de `static` a instance property.
- `BaseRepository.modo` lee `this.adapter.modo` (no más `this.adapter.constructor.modo`).

**Repos migrados (2):**
- `ControlRepository`: idField = 'partida_id' (PK custom). Métodos con path Supabase: tomarControl, renovarControl, liberarControl, verificarControl, listarControlesPorSesion, crearControlParaPartida.
- `ParticipanteRepository`: métodos con path Supabase: agregarParticipante, eliminarParticipante, marcarParticipacion, listarParticipantesDePartida, listarParticipantesDeEquipo.

**Tests de integración nuevos (10):**
- ControlRepository: 5 tests (obtener, null, tomar, renovar, liberar).
- ParticipanteRepository: 5 tests (agregar, null, listar, marcar, eliminar).

**Bugs corregidos en H7.5a:**
- Bug #1: ControlRepository usaba idField = 'id' por defecto, pero control_partidas tiene PK = partida_id.
- Bug #2: ParticipanteRepository.listarParticipantesDePartida/DeEquipo usaba índices IndexedDB (participante_partida_partida_id) como si fueran columnas Supabase (partida_id).
- Bug #3: ControlRepository.listarControlesPorSesion tenía el mismo problema con 'control_partida_session_id'.

**Sobrecarga documentada:**
- `crearControlParaPartida(txOrPartidaId, partidaIdMaybe)` tiene firma sobrecargada:
  - Modo Supabase: `crearControlParaPartida(partidaId)`
  - Modo IndexedDB: `crearControlParaPartida(tx, partidaId)`
- La sobrecarga existe porque IndexedDB requiere tx externa para atomicidad.

**Total: 433 unit + 35 e2e + 53 integration.**

### 8.3.13 H7.6 — Circuito y Snapshot migrados

**Función SQL nueva (0006):**
- `crear_circuito_completo(p_nombre, p_descripcion, p_juegos, p_equipos, p_action_id)` — Crea circuito + circuito_juegos + equipo_circuitos atómicamente. Idempotente.
- Validaciones: nombre, al menos 1 juego, exactamente 2 equipos.
- DELETE de accion_procesadas en errores de validación.

**Repos migrados (2):**
- `CircuitoRepository`: crearCircuito via RPC, obtenerCircuitoCompleto con 3 queries, listarCircuitos, listarPlantillas, actualizarCircuito con optimistic locking, eliminarCircuito con validación.
- `SnapshotRepository`: crearSnapshot via RPC crear_snapshot, crearSnapshotDesdeSet, listarSnapshotsPorSet, actualizarSnapshotDeCircuitoJuego con reutilización, _eliminarSiNoReferenciado con conteo de refs.

**Tests de integración nuevos (12):**
- CircuitoRepository: 7 tests (crear via RPC, obtener, listar, plantillas, completo, null).
- SnapshotRepository: 5 tests (crear via RPC, null, crearDesdeSet, listar, vacío).

**Total: 433 unit + 35 e2e + 65 integration.**

### 8.3.14 H7.7 — Set y AccionProcesada migrados

**Función SQL nueva (0007):**
- `crear_set_completo(p_juego_id, p_nombre, p_descripcion, p_items, p_action_id)` — Crea set + item_sets atómicamente. Idempotente.
- Validaciones: juego_id, nombre, al menos 1 item.
- DELETE de accion_procesadas en errores de validación.

**Repos migrados (2):**
- `SetRepository`: crearSet, crearSetCompleto via RPC, listarSetsPorJuego, listarSetsActivosPorJuego, actualizarSet, desactivarSet, eliminarSet, agregarItem (fix H7.7a), actualizarItem, eliminarItem, reordenarItems.
- `AccionProcesadaRepository`: reservar via RPC, actualizarResultado via RPC, obtenerPorActionId, listarPorPartida. idField = action_id.

**Tests de integración nuevos (13):**
- SetRepository: 7 tests (crear, obtener, null, listar, actualizar, agregar item, eliminar).
- AccionProcesadaRepository: 6 tests (reservar, obtener, null, idempotente, con partida, listar).

**Bug corregido en H7.7a:**
- SetRepository.agregarItem usaba this.agregarRegistro() (que inserta en sets) en vez de adapter.insert(STORE_ITEMS, ...).

**Total: 433 unit + 35 e2e + 78 integration.**

### 8.3.15 H7.8 — PartidaRepository migrado

**PartidaRepository (10 métodos migrados):**
- Métodos con RPC: crearPartida, comenzarPartida, iniciarJuego, pausarJuego, reanudarJuego, finalizarJuego, descartarPartida, finalizarCircuito.
- Métodos con query directo: obtenerPartida, obtenerPartidaPorCodigo, listarPartidasPorEstado, listarPartidasEnCurso, listarPartidasExpirables, listarPartidasRecuperables, obtenerContextoEspera, actualizarEstadoJuego, expirarPartida.

**Bug corregido en H7.8a:**
- La RPC crear_partida validaba p_session_id como requerido. El repo pasa null.
- Fix: eliminada la validación de session_id en crear_partida.
- Decisión: crear partida y tomar control son operaciones distintas.

**Tests de integración nuevos (8):**
- Crear partida, obtener por id, obtener por codigo, listar, contexto de espera, idempotencia.

**Deuda técnica identificada:**
- actualizarEstadoJuego en Supabase no es atómico (2 updates sin transacción).
- expirarPartida en Supabase no es atómico (múltiples updates sin transacción).
- Ambos podrían requerir RPC nuevas en el futuro.

**Total: 433 unit + 35 e2e + 86 integration.**

### 8.3.16 H7.9b.1 + H7.10 — RLS permisivo + Realtime

**H7.9b.1 — RLS permisivo (Fase 1 de 3):**
- 17 tablas con RLS habilitado.
- 34 políticas permisivas (17 anon + 17 auth).
- Se restringirán en H7.9b.3 (después de Auth).
- Archivo: supabase/migrations/0008_rls_permisivo.sql

**H7.10 — Realtime:**
- SupabaseAdapter.suscribir(tabla, filtros, callback) implementado.
- Retorna Promise que resuelve con cleanup cuando status === SUBSCRIBED.
- LocalAdapter.suscribir() lanza NotImplementedError.
- consola.js y pantalla.js detectan el adapter y usan Realtime o setInterval.
- pantalla.js resuelve partida_id desde public_codigo antes de suscribir.
- Tablas suscritas: partidas, juego_ejecutados, equipo_partidas, control_partidas (consola); partidas, juego_ejecutados, equipo_partidas (pantalla pública).
- Realtime solo funciona con VITE_SUPABASE_ADAPTER=true. LocalAdapter sigue con setInterval + BroadcastChannel.

**Correcciones:**
- Bug de timing: suscribir retornaba el cleanup antes de que el canal estuviera conectado.
- Fix: retorna Promise que espera status === SUBSCRIBED.

**Tests de integración nuevos (8):**
- 5 RLS (anon puede hacer SELECT en 5 tablas).
- 3 Realtime (recibir UPDATE, desuscribir, cleanup doble).

**Total: 433 unit + 35 e2e + 94 integration.**

### 8.3.17 H7.12 — Auth + RLS restrictivo

**H7.12a — Auth Magic Link:**
- src/app/auth.js con 5 funciones: obtenerUsuarioActual, obtenerSesion, loginConMagicLink, logout, suscribirCambiosDeAuth.
- src/ui/login.js: pantalla de login con input email + botón enviar.
- session-context.js acepta usuarioId.
- bootstrap.js acepta usuarioId.
- main.js detecta adapter Supabase y muestra login si no hay sesión.
- dashboard.js muestra usuario logueado + botón logout.
- Magic Link probado manualmente: pantalla login → email → link → dashboard → logout.

**H7.12b — RLS restrictivo:**
- supabase/migrations/0009_rls_estricto.sql: revocar 34 políticas permisivas + crear políticas específicas.
- Catálogo (9 tablas): anon SELECT, authenticated ALL.
- Partida (5 tablas): anon SELECT, authenticated ALL.
- Control (2 tablas): solo authenticated ALL.
- Técnica (1 tabla): solo authenticated SELECT/INSERT.
- Revocado SELECT a anon en control_partidas, accion_procesadas, evento_tecnicos.

**H7.12b-fix — Adaptación de tests:**
- tests/integration/_helpers/auth.js: crearAdapterAutenticado() con signInWithPassword + abrir().
- 7 archivos de repositorios usan crearAdapterAutenticado() en vez de new SupabaseAdapter().
- rls.test.js: cliente anon aislado con persistSession: false. Tests verifican rejects.toThrow() para anon.
- SupabaseAdapter.suscribir.test.js: usa crearAdapterAutenticado + retry: 3.

**Configuración Supabase Cloud:**
- Realtime habilitado para 5 tablas en publicación supabase_realtime.
- Realtime RLS evalúa políticas: authenticated recibe eventos, anon solo de tablas públicas.
- Test user: test@cumpeo.local (con password).

**Total: 433 unit + 35 e2e + 99 integration.**

### 8.3.18 Enlaces (Bloque 5, pasos 5.9-pre a 5.9d)

**Cierre documental de mecánica (5.9-pre):**
- `docs/GAMES.md` §12 actualizado.
- Juego de asociación 1:1. Columna A fija + columna B desordenada.
- 9 fases: INICIO_RONDA, SELECCIONANDO_SET, PREPARANDO_TABLERO, ORDENANDO, ESPERA_VALIDACION, MOSTRANDO_RESULTADO, CAMBIO_TURNO, FIN_DE_RONDA, FIN_DE_JUEGO.
- Drag-and-drop real (HTML5 nativo).

**GameDefinition (5.9a, commit 53f29e9):**
- `src/games/enlaces/EnlacesGameDefinition.js` (717 líneas).
- 11 reducers puros.
- 135 tests unit.
- Registro/bootstrap/seed actualizados.

**UI Conductor (5.9b, commit acc423f):**
- `src/ui/games/enlaces/EnlacesGameUI.js` (495 líneas).
- Drag-and-drop HTML5 nativo (`dragstart`/`dragover`/`drop`/`dragend`).
- 67 tests unit.
- Shell actions en `shell-partida.js`.

**UI Pública (5.9c, commit d5e0694):**
- `src/ui/publica/shell-publica.js` extendido (+224 líneas).
- `_renderEscenarioEnlaces`, `_iniciarTimerEnlacesPublico`, `_limpiarTimerEnlacesPublico`.
- Columna A + columna B en vivo + timer + marcador.
- 50 tests unit.
- Leak de `pares_correctos` y `movimientos` controlado.

**e2e (5.9d, commit 9b7dfdc):**
- 6 archivos, 19 tests.
- `drag-drop.spec.js` (5), `flujo-completo.spec.js` (5), `puntuacion.spec.js` (3), `timer.spec.js` (3), `validacion.spec.js` (3).
- Helper `_helpers/enlaces.js` con polling robusto.
- Deuda #61 respetada (output crudo).

### 8.4 Commits clave

```
2a825ab  feat: implement IndexedDB vertical slice and repositories
414cd2e  feat(services): add ControlService with lease management
ea5f67e  fix(adapters): correct accion_procesadas keyPath and add migration v2
f8dc2da  feat(repositories): add AccionProcesadaRepository for idempotency
c2962fa  refactor(partida): add idempotency to crearPartida via actionId
3df8390  refactor(partida): add idempotency to pausar/reanudar via _cambiarEstadoJuego
295e596  refactor(partida): add idempotency to descartarPartida/finalizarCircuito via _terminarPartida
ae649ca  refactor(partida): add idempotency to iniciarJuego
ebd19dd  refactor(partida): add idempotency to comenzarPartida
8f40765  refactor(partida): add idempotency to actualizarEstadoJuego
c425013  refactor(partida): add idempotency to finalizarJuego
61862e3  feat(services): add PartidaService as facade over PartidaRepository and ControlService
3d413ba  feat(services): add CircuitoService as facade over CircuitoRepository
6294d75  feat(services): add SetService as facade over SetRepository
d8e07ec  feat(services): add GameDefinitionRegistry for game contracts
24a72dc  feat(games): add TriviaGameDefinition implementing GameDefinition contract
240964e  feat(app): add bootstrap initializing services and games
747a164  fix(games): restore comment in registro and export registrarTodos
3fbd526  feat(ui): add dashboard as first screen
97f816f  feat(ui): add circuitos CRUD with router and shared components
c812b1f  feat(services): add JuegoService and seed juegos from registry
84164d8  feat(ui): add sets CRUD with URL filter
db0fe46  feat(ui): add conductor console for partidas
c908bb5  fix(ui): use ControlPartida entity for control check
6164386  docs: add games manual (GAMES.md)
256c2b5  docs: update master with H6.4 and H6.5 completion
a0a7f07  feat(ui): add public screen for partidas
c66fbc2  feat(adapters): add Supabase infrastructure and schema
dabce6c  feat(adapters): implement SupabaseAdapter with query and rpc
54be9a6  fix(adapters): validate filters and fix single-row response handling
ee5fbda  docs: update master with H7.2 completion
0c7dfcd  feat(migrations): add critical plpgsql functions for atomic operations
0c849d7  fix(migrations): correct finish_reason constraint and idempotency tests
e0fd65a  fix(migrations): clear accion_procesadas on validation errors
1bf23a9  test(integration): use unique action_ids and clear test data
8dfba1e  feat(repositories): migrate catalog repositories to Supabase
d36aa7a  refactor(adapters): make modo an instance property
7b321c8  feat(repositories): migrate control and participante repos to Supabase
ff5e60a  fix(repositories): correct control and participante repos for Supabase mode
29dbd98  feat(migrations): add crear_circuito_completo RPC
fc6b46d  feat(repositories): migrate circuito and snapshot repos to Supabase
5efe5dd  feat(migrations): add crear_set_completo RPC
e05b9f2  feat(repositories): migrate set and accion_procesada repos to Supabase
154d878  docs: update OPENSPEC to H7.6
b11437d  fix(migrations): remove session_id validation from crear_partida
2df33c5  feat(repositories): migrate partida repository to Supabase
6b10aae  chore(env): update .env.example with new variable names
2ed1b25  fix(env): remove real credentials from .env.example
44fc12e  feat(security): enable RLS with permissive policies
e06e480  feat(adapters): await Realtime subscription before returning cleanup
0cd1512  feat(ui): use Realtime for console and public screen
2067d48  test(integration): add Realtime subscription tests
44fc12e  feat(security): enable RLS with permissive policies
145772e  feat(auth): add Magic Link authentication
08e760c  feat(security): restrict RLS policies and adapt tests
25b3ec6  chore: remove accidentally committed .bak file
```

### 8.5 Estructura del repositorio
/
+-- docs/
| +-- MASTER.md (este archivo)
+-- package.json
+-- package-lock.json
+-- vitest.config.js
+-- src/
| +-- main.js
| +-- adapters/
| | +-- LocalAdapter.js
| | +-- schema.js
| | +-- migrations.js
| | +-- errors.js
| +-- app/
| | +-- session-context.js
| +-- infrastructure/
| | +-- broadcast.js
| +-- services/
| | +-- index.js
| | +-- ControlService.js
| +-- repositories/
| +-- index.js
| +-- BaseRepository.js
| +-- JuegoRepository.js
| +-- ExtraRepository.js
| +-- EquipoRepository.js
| +-- SetRepository.js
| +-- CircuitoRepository.js
| +-- SnapshotRepository.js
| +-- ControlRepository.js
| +-- ParticipanteRepository.js
| +-- PartidaRepository.js
| +-- AccionProcesadaRepository.js
| +-- errors.js
| +-- utils.js
+-- tests/
+-- e2e/
| +-- boot.spec.js
| +-- indexeddb-smoke.spec.js
+-- unit/
+-- adapters/
| +-- LocalAdapter.test.js
+-- services/
| +-- ControlService.test.js
+-- repositories/
+-- BaseRepository.test.js
+-- JuegoRepository.test.js
+-- ExtraRepository.test.js
+-- EquipoRepository.test.js
+-- SetRepository.test.js
+-- CircuitoRepository.test.js
+-- SnapshotRepository.test.js
+-- ControlRepository.test.js
+-- ParticipanteRepository.test.js
+-- PartidaRepository.test.js
+-- AccionProcesadaRepository.test.js
+-- utils.test.js

---

## 9. Roadmap de Fases

### Fase H3 - Repositorios (CERRADA)

### Fase H4 - Servicios de dominio (CERRADA 100%)

5/5 servicios implementados, testeados y commiteados:

1. **ControlService** — ✅ Cerrado (`414cd2e`).
2. **PartidaService** — ✅ Cerrado (`61862e3`).
3. **CircuitoService** — ✅ Cerrado (`3d413ba`).
4. **SetService** — ✅ Cerrado (`6294d75`).
5. **GameDefinitionRegistry** — ✅ Cerrado (`d8e07ec`).

**Sub-bloques de PartidaService:**
- Grupo A (helpers compartidos): ✅ Cerrado — crearPartida, pausar/reanudar, descartar/finalizarCircuito
- Grupo B (lógica intermedia): ✅ Cerrado — iniciarJuego, comenzarPartida
- Grupo C (lógica compleja): ✅ Cerrado — actualizarEstadoJuego, finalizarJuego

**PartidaRepository completó su ciclo de idempotencia. 9/9 métodos críticos idempotentes. Siguiente: crear PartidaService como wrapper fino sobre el repo.**

### Fase H5 - GameDefinition Trivia (CERRADA 100% — H5.1)

**H5.1 cerrado** (commit `24a72dc`):

`TriviaGameDefinition` implementa el contrato `GameDefinition` con los 5 métodos obligatorios. 35 tests.

**H5.2 (opcional, pospuesto):** implementación de un segundo juego (Rosco, Pictionary) para validar el contrato. Pospuesto hasta que la UI lo requiera.

### Fase H6 - Interfaz de Usuario (CERRADA 100%)

**Sub-bloques:**

1. **H6.1 — Bootstrap** ✅ Cerrado (`240964e`).
2. **H6.2 — Dashboard** ✅ Cerrado (`3fbd526`).
3. **H6.3 — CRUD de circuitos** ✅ Cerrado (`97f816f`).
4. **H6.4a — JuegoService + seed** ✅ Cerrado (`c812b1f`).
5. **H6.4b — CRUD de sets** ✅ Cerrado (`84164d8`).
6. **H6.4c — Editor de items** ⬜ Pospuesto. Editor específico por juego.
7. **H6.5 — Consola del conductor** ✅ Cerrado (`db0fe46`, fixup `c908bb5`).
8. **H6.6 — Pantalla pública** ✅ Cerrado (`a0a7f07`).

### Fase H7 - Producción (EN PROGRESO — H7.1, H7.2 cerrados)

Migrar a Supabase. Sub-bloques:

1. **H7.1 — Fundaciones de Supabase** ✅ Cerrado (`c66fbc2`).
   - Instalación de `@supabase/supabase-js`.
   - Schema Postgres (17 tablas).
   - `SupabaseAdapter` esqueleto.
   - Flag `VITE_SUPABASE_ADAPTER`.

2. **H7.2 — SupabaseAdapter con query/rpc** ✅ Cerrado (`dabce6c`).
   - Adapter con query/insert/update/delete/rpc.
   - Helpers de queries y traducción de errores.
   - 5 funciones plpgsql de ejemplo.
   - 12 tests de integración contra Supabase Cloud.

3. **H7.2a — Fixes críticos de H7.2** ✅ Cerrado (`54be9a6`).
   - Validación de filtros en update/delete.
   - `single: true` + PGRST116 devuelve null.
   - 25 tests unitarios nuevos.
   - Validación manual end-to-end.

4. **H7.3 — RPC transaccionales definitivas** ✅ Cerrado (`0c7dfcd`).
   - 15 funciones plpgsql definitivas en 3 archivos de migración.
   - Reemplazan las 5 funciones de ejemplo de H7.2.
   - 28 tests de integración (15 nuevos).

5. **H7.4 — Migrar repos: catálogo (3)** ✅ Cerrado (`8dfba1e`).
   - BaseRepository polimórfico.
   - JuegoRepository, ExtraRepository, EquipoRepository migrados.
   - 15 tests de integración.

6. **H7.5 — Migrar repos: config (3)** ✅ Cerrado (`7b321c8`, `ff5e60a`).
   - CircuitoRepository, ParticipanteRepository, ControlRepository.

7. **H7.6 — Migrar repos: circuito + snapshot** ✅ Cerrado (`29dbd98`, `fc6b46d`).
   - CircuitoRepository, SnapshotRepository migrados.

8. **H7.7 — Migrar repos: set + accion_procesada** ✅ Cerrado (`5efe5dd`, `e05b9f2`).
   - SetRepository, AccionProcesadaRepository migrados.

9. **H7.8 — PartidaRepository migrado** ✅ Cerrado (`b11437d`, `2df33c5`).

10. **H7.9b.1 — RLS permisivo** ✅ Cerrado (`44fc12e`).
    - 17 tablas + 34 políticas permisivas.

11. **H7.10 — Realtime** ✅ Cerrado (`e06e480`, `0cd1512`, `2067d48`).
    - SupabaseAdapter.suscribir con Promise.
    - consola.js y pantalla.js usan Realtime si el adapter lo soporta.

12. **H7.11 — Migración de e2e a Supabase** ⬜ Pendiente (opcional).
    - Los tests e2e siguen con LocalAdapter.

13. **H7.12 — Auth + RLS restrictivo** ✅ Cerrado (`145772e`, `08e760c`, `25b3ec6`).
    - Magic Link Auth + RLS restrictivo por tipo de tabla.
    - 99 integration tests passing.

### Bloque 5 - Juegos restantes (CERRADA 11/11)

9 juegos implementados end-to-end:

1. **QPEP** (Bloque 4) — cerrado `2e19767`.
2. **Trivia** (5.1, 5.6) — cerrado `afba7a0`.
3. **Rosco** (5.2) — cerrado `94a89d1`.
4. **Canción Incompleta** (5.3) — cerrado `a9d76d5`.
5. **Pictionary** (5.4) — cerrado `3eb742d`.
6. **Historia Enredada** (5.5) — cerrado `dc9d34e`.
7. **Memoricé** (5.7) — cerrado `d1ff93d`.
8. **Anti-Trivia** (5.8) — cerrado `1d865dd`.
9. **Enlaces** (5.9) — cerrado `9b7dfdc`.

### Bloque 6 - Migración e2e a Supabase (OPCIONAL)

**Estado:** No iniciado. Decisión pendiente.

**Objetivo:** Migrar los ~215 tests e2e de LocalAdapter a Supabase.

**Recomendación:** Posponer. Los integration tests (99) ya cubren Supabase. Migrar e2e puede introducir flakiness (rate limiting, RLS, latencia).

## 10. Convenciones de Trabajo

### 10.1 Flujo git

- Rama principal: `main`.
- Rama de desarrollo: `feature/vertical-slice`.
- Prefijos de commit: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Auditoría antes de commit: `git status --short`, `git diff --cached --stat`, `git diff --cached --check`.

### 10.2 Testing

- **Unit**: por repositorio, por servicio. Framework: **Vitest**.
- **E2E**: UI, navegación, bootstrap. Framework: **Playwright**.
- **Mock IndexedDB**: `fake-indexeddb` en unit.
- **Testing de UI**: solo e2e. **Sin `jsdom` ni `happy-dom`.**
- **Regla**: todo repositorio y servicio tiene tests antes de commitear.
- **Regla UI**: toda pantalla nueva requiere al menos 1 test e2e que verifique que renderiza.

### 10.3 Scripts

- `npm test` — tests unit (Vitest).
- `npm run test:watch` — modo watch.
- `npm run test:e2e` — tests e2e (Playwright).
- `npm run test:all` — unit + e2e.
- `npm run dev` — servidor de desarrollo (Vite).
- `npm run build` — build de producción.
- `npm run coverage` — cobertura.

### 10.4 Notas importantes

- **Heredoc en Git Bash**: usar `<<'EOF'`.
- **LF/CRLF**: advertencias esperadas en Windows. No son errores.
- **Índices compuestos en IndexedDB**: no hacen prefix matching. Usar índice simple + filtro en memoria.
- **Colisiones de índice único**: al reordenar, procesar de mayor a menor o usar offset temporal.

---

## 11. Glosario

| Término | Definición |
|---------|------------|
| **Catálogo** | Entidad de definición (Juego, Set, Extra, EquipoGuardado). |
| **Circuito** | Secuencia de juegos configurada. |
| **CircuitoJuego** | Instancia de un juego dentro de un circuito. |
| **Conductor** | Usuario que dirige la partida. |
| **Configuración (config)** | Circuito, CircuitoJuego, EquipoCircuito. |
| **Extra** | Herramienta auxiliar. |
| **Juego** | Tipo de juego. Catálogo. |
| **JuegoEjecutado** | Instancia de un juego dentro de una partida. |
| **Lease** | Contrato temporal de control de una partida. |
| **Partida** | Sesión completa de juego. Unidad histórica. |
| **ParticipantePartida** | Persona que participa en una partida. |
| **Plantilla** | Circuito marcado con `es_plantilla = true`. |
| **Public código** | Código corto que da acceso a la pantalla pública. |
| **Server-first** | La UI refleja el estado persistido. |
| **Set** | Contenido reutilizable. |
| **SetSnapshot** | Copia inmutable de una versión de Set. |
| **state_version** | Versión de un JuegoEjecutado. |
| **version** | Versión de una entidad editable. |

---

## 12. Registro de Decisiones

| # | Decisión| Justificación |
|---|----------|---------------|
| 1 | Server-first estricto, sin optimistic UI | Confiabilidad en app personal. |
| 2 | SetSnapshot compartible entre CircuitoJuego | Evita duplicación. Inmutabilidad garantizada. |
| 3 | ParticipantePartida: modelo mixto | Encaja con la mecánica real. |
| 4 | Partida copia metadata del Circuito | Preserva historia. |
| 5 | es_plantilla booleano independiente | Permite combinaciones claras. |
| 6 | EventoTecnico.partida_id nullable | Permite eventos fuera de partida. |
| 7 | ExtraUso.juego_ejecutado_id nullable | Permite extras fuera de juego. |
| 8 | Snapshot_id RESTRICT | Fuerza eliminación explícita. |
| 9 | Índice simple + filtro en memoria | IndexedDB no hace prefix matching. |
| 10 | Reordenar con offset temporal | Evita colisiones de índice único. |
| 11 | `tx.abort()` solo si ya se escribió | Transacción vacía no es problema. |
| 12 | Heredoc con `<<'EOF'` | Delimitadores custom fallan en Git Bash. |
| 13 | Opción B: cliente genera `action_id` | Cumple INV-084. Idempotencia real en reintentos. |
| 14 | Opción 1: repo absorbe `action_id` | Una sola transacción. Atómico. |
| 15 | `actionId` como último argumento en toda API crítica | Firma consistente, facilita testing y composición. |
| 16 | Helpers internos en repo con patrón `_<metodo>EnTx` | El wrapper público maneja idempotencia; el helper interno hace el trabajo real. Una sola transacción. |
| 17 | Scripts de Node en `/tmp/*.js` ejecutados con `node /tmp/script.js` | Nunca `node -e` — bash expande `!` y corrompe scripts silenciosamente. |
| 18 | `node --check` después de cada refactor, antes de `npm test` | Detecta sintaxis rota en segundos, ahorra minutos de test fallido. |
| 19 | Contrato de cierre de bloque (7 verificaciones) | Garantiza calidad antes de avanzar. Ver abajo. |
| 20 | Helper interno monolítico por método (`_<metodo>EnTx`) | Consistencia de patrón. No dividir en sub-ayudas. |
| 21 | Cache del objeto completo, retorno de la parte pública | API estable hacia el exterior, cache completo hacia adentro. |
| 22 | `ahora()` calculado dentro del helper (una vez por operación) | Consistencia temporal entre entidades actualizadas. |
| 23 | `GameDefinitionRegistry` instanciable con `Map` interno | Consistencia con otros services. Sin estado global. |
| 24 | Contrato `GameDefinition` definido en E.3 | H5 solo implementa el contrato para Trivia, sin decidir estructura. |
| 25 | Registry síncrono, sin `adapter` | En memoria pura, sin persistencia. No necesita I/O. |
| 26 | Contrato de Trivia: contenido + configuración + estado definidos en H5.1 | H5.2 reutilizará el mismo contrato con otros juegos. |
| 27 | `aplicarTimeUp` no penaliza (agrega respuesta con equipo: 0) | Determinista e idempotente (INV-066). La penalización solo aplica a respuestas incorrectas. |
| 28 | Registro explícito de juegos en `main.js` (Opción B) | No auto-registro al importar. Más explícito y testeable. |
| 29 | `bootstrap(adapter)` recibe adapter ya creado y retorna `{ adapter, session, services, registry }` | Flexibilidad + testing. `main.js` maneja errores. |
| 30 | Dashboard como primera pantalla de la consola del conductor | Punto de entrada a todas las operaciones. |
| 31 | Sin tests unitarios de UI, solo e2e con Playwright | Evita dependencias frágiles (jsdom). Verifica UI real. |
| 32 | Componentes de UI como funciones puras que devuelven HTML | Consistencia con vanilla JS. Sin frameworks. |
| 33 | Hash router propio con soporte de parámetros (`:id`) | Sin dependencias. URLs compartibles. Back/forward nativo. |
| 34 | `window.confirm()` para acciones destructivas (MVP) | Pragmático. Modal propio después si es necesario. |
| 35 | Formulario con estado en DOM, no en memoria JS | Simple y suficiente para el MVP. |
| 36 | `Juego.id` es UUID; `codigo` es el identificador lógico compartido registry ↔ DB | Seed automático al arrancar. Rompe la desconexión entre registry y DB. |
| 37 | `public_codigo` auto-generado, 6 chars alfanuméricos mayúsculas (sin 0/O/1/I) | Fácil de compartir con el público. Retry ×3 si colisiona. |
| 38 | Auto-refresh 2s en consola y pantalla pública (hasta H7 Realtime) | Solución pragmática hasta Supabase Realtime. Limpieza estricta de interval. |
| 39 | Schema Postgres traducido de IndexedDB en H7.1 | Base para toda la migración a Supabase. |
| 40 | SupabaseAdapter es esqueleto en H7.1 (NotImplementedError) | Infraestructura primero, implementación en H7.2. |
| 41 | Flag de adapter: variable de entorno VITE_SUPABASE_ADAPTER | Estático en build time. No soporta cambio en runtime. |
| 42 | Tests unitarios siguen con LocalAdapter | Los 376 tests no se tocan durante la migración. |
| 43 | Partida NO tiene estado BORRADOR | Solo Circuito tiene BORRADOR. El modelo real de Partida arranca en CONFIGURANDO. Corregido en H7.1b. |
| 44 | Partida.finish_reason = null en DESCARTADA | INV-138 solo exige finish_reason no-null en FINALIZADA. DESCARTADA no lo requiere. |
| 45 | JuegoEjecutado.finish_reason puede ser NORMAL o PARTIDA_* | NORMAL si el juego cerró por su cuenta. PARTIDA_DESCARTADA/PARTIDA_FINALIZADA/PARTIDA_EXPIRADA si cerró por arrastre. |
| 46 | Estrategia de migración: query para CRUD simple, rpc para operaciones atómicas | PostgREST no soporta transacciones multi-tabla. RPC las soporta nativamente. |
| 47 | No implementar tx() en el SupabaseAdapter | tx() es la interfaz de IndexedDB. Supabase usa query/rpc. Los repos migran a la nueva interfaz en H7.4+. |
| 48 | `single: true` devuelve null si no hay filas (PGRST116) | Más útil que lanzar NoEncontradoError. El repo decide si lanzar. |
| 49 | update/delete requieren filtros no vacíos | Previene pérdida de datos por bugs en repos. |
| 50 | Traducción de errores Postgres/PgREST a errores del dominio en el adapter | Aísla a los repos del código Postgres. |
| 51 | Tests de integración separados de los unitarios (vitest.config.integration.js) | Los unitarios usan mocks (rápidos, sin red). Los de integración van contra Supabase Cloud (lentos, requieren credenciales). |
| 52 | GRANTs manuales a anon/authenticated (no automáticos) | Supabase cambió el default: con "Automatically expose new tables" deshabilitado, hay que otorgar permisos explícitamente. |
| 53 | RLS deshabilitado temporalmente, se implementa en H7.8 | RLS sin políticas bloquea todo. Se difiere a H7.8 donde se implementa bien con Supabase Auth. |
| 54 | GRANTs y RLS son capas ortogonales | GRANT = "¿puede tocar la tabla?". RLS = "¿qué filas puede ver/tocar?". Ambas necesarias en producción. |
| 55 | Funciones plpgsql retornan `jsonb` con `{ ok: boolean, ... }` | Consistencia con la interfaz del adapter. Facilita parsing en el cliente. |
| 56 | Parámetros nombrados (p_*) en funciones plpgsql | Supabase ordena parámetros alfabéticamente. Sin p_*, los parámetros se mezclan. |
| 57 | Funciones de control verifican lease antes de actuar | Garantiza que solo la sesión con control puede ejecutar acciones críticas. |
| 58 | `crear_snapshot` es idempotente por `action_id` | Permite reintentos seguros sin duplicar snapshots. |
| 59 | Estados terminales (FINALIZADA, DESCARTADA, EXPIRADA) tienen finish_reason no-null | Todos los estados terminales documentan por qué terminó la partida. Actualización de INV-138/INV-139. |
| 60 | Idempotencia vía action_id devuelve el mismo resultado en reintentos, no un resultado actualizado | El cache de reservar_accion preserva el resultado original, no el estado actual. |
| 61 | Funciones plpgsql limpian accion_procesadas en errores de validación post-reserva | Sin esto, el siguiente intento con el mismo action_id devuelve un resultado vacío. |
| 62 | Tests de integración usan `uniqueActionId()` con Date.now + random | Evita colisiones de action_id entre corridas consecutivas. |
| 63 | `limpiar_acciones_test()` existe en el repo pero NO se aplica en Supabase Cloud | Los tests pasan sin ella. Menos superficie de ataque. |
| 64 | BaseRepository polimórfico vía `adapter.modo` (actualizado en H7.5) | Los repos concretos no saben qué adapter tienen. |
| 65 | 3 repos de catálogo migrados en H7.4 | Juego, Extra, Equipo. Los demás en H7.5+. |
| 66 | Tests de integración de repos usan `uniqueId()` + `afterAll` cleanup | Evita colisiones y limpia datos. |
| 67 | `modo` como instance property en adapters | Static no permite inyección ni instancias con modo distinto. |
| 68 | `ControlRepository` con `idField = 'partida_id'` | PK custom: control_partidas no tiene columna id. |
| 69 | Índices de IndexedDB y columnas Supabase son nombres distintos | En Supabase se usa el nombre plano (partida_id, no participante_partida_partida_id). |
| 70 | RPC `crear_circuito_completo` para creación atómica | Circuito + circuito_juegos + equipo_circuitos en una sola transacción. |
| 71 | SnapshotRepository usa RPC `crear_snapshot` existente | La RPC ya existía desde H7.3. Solo se conecta desde el repo. |
| 72 | Tests de CircuitoRepository dependen de al menos 1 juego en la BD | Frágil pero funcional: si no hay juegos, el test pasa silenciosamente. Mejora pendiente para H7.7+. |
| 73 | RPC `crear_set_completo` para creación atómica de sets | Set + item_sets en una transacción. |
| 74 | `AccionProcesadaRepository` con idField = 'action_id' | PK custom (text, no uuid). |
| 75 | Test de AccionProcesada crea partida real para FKs | El UUID hardcodeado no existe en partidas. |
| 76 | crear_partida sin validación de session_id | Crear partida y tomar control son operaciones distintas. |
| 77 | PartidaRepository usa 8 RPC transaccionales | Los métodos críticos son atómicos vía plpgsql. |
| 78 | .env.example con placeholders, no credenciales reales | Las credenciales van en .env (gitignored). |
| 79 | RLS habilitado con políticas permisivas (Fase 1) | Prepara infraestructura. Restricción en Fase 3. |
| 80 | RLS estructural se verifica desde SQL Editor, no desde tests JS | exec_sql no está expuesto a anon. |
| 81 | SupabaseAdapter.suscribir retorna Promise<cleanup> | Espera status === SUBSCRIBED antes de resolver. |
| 82 | Realtime solo en modo Supabase. LocalAdapter usa setInterval. | LocalAdapter.suscribir lanza NotImplementedError. |
| 83 | Auth Magic Link con Supabase | Sin password. Apropiado para single-user. |
| 84 | RLS restrictivo: políticas por tipo de tabla (catálogo/partida/control/técnica) | anon solo SELECT en catálogo y partida. |
| 85 | Revocado SELECT a anon en control_partidas, accion_procesadas, evento_tecnicos | Esas tablas no se exponen al público. |
| 86 | Tests de integración usan test user (test@cumpeo.local) | Permite testear RLS real con authenticated. |
| 87 | rls.test.js usa cliente anon aislado con persistSession: false | El cliente singleton mantiene sesión; el test necesita un cliente limpio. |
| 88 | Test de Realtime con retry: 3 | Acepta flakiness de WebSocket. |

### 12.1 Contrato de cierre de bloque

Cada bloque de desarrollo debe cumplir estas 7 verificaciones antes de ser considerado completo:

| # | Verificación | Comando |
|---|-------------|---------|
| 1 | Sintaxis válida | `node --check` en cada archivo JS modificado |
| 2 | Llaves balanceadas | Revisión manual o `eslint --rule 'no-unbalanced-...` |
| 3 | Tests verdes | `npm test` |
| 4 | Sin warnings de git | `git diff --check` |
| 5 | Status pre-commit limpio | `git status --short` solo muestra archivos esperados |
| 6 | Commit atómico | Un solo commit por bloque funcional |
| 7 | Status post-commit limpio | `git status --short` sin salida después del push |

**Regla:** No avanzar al siguiente bloque sin recibir autorización del auditor externo.

---

## 13. Notas de infraestructura Supabase

### 13.1 GRANTs y RLS son capas distintas

Cuando se configure RLS en H7.8, recordar:

1. **GRANT** otorga el permiso base para tocar la tabla:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tabla TO authenticated;
   ```
   Sin GRANT, el rol no puede acceder aunque RLS esté deshabilitado.

2. **RLS** filtra qué filas puede ver/tocar el rol una vez que tiene GRANT:
   ```sql
   ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "policy_name" ON tabla FOR ... USING (...) WITH CHECK (...);
   ```

Ambas son necesarias en producción. Sin GRANT, no hay acceso. Sin política, RLS bloquea todo.

### 13.2 Estado actual de Supabase Cloud (post-H7.2)

- **Schema**: aplicado con 17 tablas, FKs, CHECKs, UNIQUEs, índices.
- **RLS**: deshabilitado temporalmente en las 17 tablas.
- **GRANTs**: SELECT, INSERT, UPDATE, DELETE otorgados a `anon` y `authenticated` sobre todas las tablas.
- **Funciones plpgsql**: 5 de ejemplo aplicadas (reservar_accion, tomar_control, iniciar_juego, finalizar_juego, crear_partida_ejemplo).
- **Variables de entorno**: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_ADAPTER=false.

Las 16 funciones plpgsql están aplicadas en Supabase Cloud. Los 28 tests de integración de adapters pasan contra la base real.

### 13.3 Aplicar migraciones

Ver `supabase/migrations/README.md`. Cada archivo `.sql` se pega en el SQL Editor de Supabase y se ejecuta.

### 13.4 Funciones plpgsql definitivas (H7.3) — APLICADAS

Las 16 funciones plpgsql están aplicadas en Supabase Cloud. Los 65 tests de integración pasan contra la base real.

### 13.5 Migración 0006 — Circuito completo

La migración `0006_funciones_circuito.sql` agrega la RPC `crear_circuito_completo`.
Aplicada en Supabase Cloud.
Verificación: `SELECT proname FROM pg_proc WHERE proname = 'crear_circuito_completo';`


### 13.6 Aprendizaje para H7.8

Cuando se implemente RLS + Auth:

- Los GRANTs actuales (todo a `anon`) se van a reemplazar por GRANTs más restrictivos.
- `anon` probablemente solo tenga SELECT sobre catálogos.
- `authenticated` tenga CRUD según políticas.
- `service_role` mantenga todos los permisos para tareas admin.

---

**Fin del Documento Maestro v2.4**

Este documento debe actualizarse con cada decisión relevante.
