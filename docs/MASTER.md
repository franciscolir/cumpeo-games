# CUMPEO — Documento Maestro de Construcción

**Versión:** 1.1
**Estado:** H4 en progreso · ~35-40% proyecto completo · ~15-20% H4
**Última actualización:** Post-commit `295e596`
**HEAD:** `feature/vertical-slice` — `295e596`
**Tests:** 248 pasando (15 archivos de test)
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
BORRADOR -> CONFIGURANDO -> EN_CURSO -> { FINALIZADA, DESCARTADA, EXPIRADA }

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

- **INV-041**: Partida.estado en dominio cerrado.
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
- **INV-138**: Partida.finish_reason en { NORMAL, CIRCUITO_COMPLETO, TERMINADA_POR_CONDUCTOR }.
- **INV-139**: finish_reason obligatorio si y solo si estado = FINALIZADA.
- **INV-140**: started_at null si estado en { BORRADOR, CONFIGURANDO }.
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
- **INV-153**: Partida.started_at null en BORRADOR/CONFIGURANDO.
- **INV-154**: Partida.finished_at null en no-terminal, no-null en terminal.
- **INV-155**: JuegoEjecutado.finished_at null en no-terminal, no-null en terminal.
- **INV-156**: Partida -> FINALIZADA cuando todos los JuegoEjecutado son terminales.
- **INV-157**: Partida -> DESCARTADA solo por acción explícita.
- **INV-158**: Partida -> EXPIRADA solo por evaluación de inactividad.
- **INV-159**: ParticipantePartida.ha_participado -> true después de jugar; no se elimina si ya participó.


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
| Progreso global | ~35-40% |
| H4 completado | ~15-20% |
| Tests pasando | 248 (15 archivos) |
| Commits totales (rama) | 30+ |

### 8.2 Fases cerradas

| Fase | Contenido | Estado |
|------|-----------|--------|
| Diseño conceptual | 17 entidades, 156 invariantes, ciclo de vida | Cerrado |
| Arquitectura | Server-first, RPC, Realtime, adaptador | Cerrado |
| Capa de repositorios (H3) | 14 repositorios + adaptador | Cerrado |

### 8.3 H4 — Servicios de dominio (EN PROGRESO)

#### Estado de servicios

| Servicio | Estado | Notas |
|----------|--------|-------|
| ControlService | ✅ Cerrado | Lease de control, heartbeat |
| PartidaService | 🟡 En progreso | Absorbió idempotencia en PartidaRepository |
| CircuitoService | ⬜ Pendiente | |
| SetService | ⬜ Pendiente | |
| GameDefinitionRegistry | ⬜ Pendiente | |

#### PartidaService — Métodos refactorizados

| Método | Grupo | Estado | Commit |
|--------|-------|--------|--------|
| `crearPartida` | A (helpers compartidos) | ✅ | `c2962fa` |
| `pausarJuego` | A (vía `_cambiarEstadoJuego`) | ✅ | `3df8390` |
| `reanudarJuego` | A (vía `_cambiarEstadoJuego`) | ✅ | `3df8390` |
| `descartarPartida` | A (vía `_terminarPartida`) | ✅ | `295e596` |
| `finalizarCircuito` | A (vía `_terminarPartida`) | ✅ | `295e596` |
| `iniciarJuego` | B (lógica intermedia) | ⬜ Siguiente — Bloque B.1 | |
| `comenzarPartida` | B (lógica intermedia) | ⬜ Bloque B.2 | |
| `actualizarEstadoJuego` | C (lógica compleja) | ⬜ Bloque C.1 | |
| `finalizarJuego` | C (lógica compleja) | ⬜ Bloque C.2 | |

#### Modelo de trabajo por sub-bloques

- **Grupo A (✅ cerrado):** Métodos con helpers compartidos (`_cambiarEstadoJuego`, `_terminarPartida`). El wrapper público maneja idempotencia; el helper interno hace el trabajo real.
- **Grupo B (siguiente):** Métodos con lógica intermedia. Requieren orquestación de múltiples repositorios.
- **Grupo C:** Métodos con lógica compleja. Transacciones de alto riesgo.

### 8.4 Commits clave

```
2a825ab  feat: implement IndexedDB vertical slice and repositories
414cd2e  feat(services): add ControlService with lease management
ea5f67e  fix(adapters): correct accion_procesadas keyPath and add migration v2
f8dc2da  feat(repositories): add AccionProcesadaRepository for idempotency
c2962fa  refactor(partida): add idempotency to crearPartida via actionId
3df8390  refactor(partida): add idempotency to pausar/reanudar via _cambiarEstadoJuego
295e596  refactor(partida): add idempotency to descartarPartida/finalizarCircuito via _terminarPartida
```

### 8.3 Estructura del repositorio
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

### Fase H4 - Servicios de dominio (EN PROGRESO ~15-20%)

Servicios a implementar:

1. **ControlService** — ✅ Cerrado.
2. **PartidaService** — 🟡 En progreso. Ver sección 8.3 para detalle de métodos.
3. **CircuitoService** — ⬜ Pendiente.
4. **SetService** — ⬜ Pendiente.
5. **GameDefinitionRegistry** — ⬜ Pendiente.

**Sub-bloques de PartidaService:**
- Grupo A (helpers compartidos): ✅ Cerrado — crearPartida, pausar/reanudar, descartar/finalizarCircuito
- Grupo B (lógica intermedia): ⬜ Siguiente — iniciarJuego, comenzarPartida
- Grupo C (lógica compleja): ⬜ Pendiente — actualizarEstadoJuego, finalizarJuego

### Fase H5 - GameDefinition Trivia

`TriviaGameDefinition` con contratos y `aplicarTimeUp`.

### Fase H6 - Interfaz de Usuario

Consola del conductor + pantalla pública.

### Fase H7 - Producción

Migrar a Supabase, RPC, RLS, Realtime.

---

## 10. Convenciones de Trabajo

### 10.1 Flujo git

- Rama principal: `main`.
- Rama de desarrollo: `feature/vertical-slice`.
- Prefijos de commit: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Auditoría antes de commit: `git status --short`, `git diff --cached --stat`, `git diff --cached --check`.

### 10.2 Testing

- **Unit**: por repositorio, por servicio.
- **E2E**: boot, smoke test de IndexedDB.
- **Framework**: Vitest.
- **Mock**: `fake-indexeddb`.
- **Regla**: todo repositorio y servicio tiene tests antes de commitear.

### 10.3 Scripts

- `npm test` - ejecuta todos los tests.
- `npm run test:watch` - modo watch.
- `npm run dev` - servidor de desarrollo (cuando aplique).

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

**Fin del Documento Maestro v1.0**

Este documento debe actualizarse con cada decisión relevante.
