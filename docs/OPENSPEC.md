# CUMPEO — OpenSpec (Especificación Abierta)

**Versión:** 1.0
**Fecha:** 2026-09-17
**Estado:** Especificación del sistema actual (fase H7)
**Propósito:** Referencia única para desarrollo, auditoría e integraciones.

---

## Índice

1. [Identidad del Sistema](#1-identidad-del-sistema)
2. [Modelo de Dominio](#2-modelo-de-dominio)
3. [Máquinas de Estado](#3-máquinas-de-estado)
4. [Invariantes](#4-invariantes)
5. [Superficie de API (plpgsql)](#5-superficie-de-api-plpgsql)
6. [Esquema de Datos](#6-esquema-de-datos)
7. [Contratos de Juego](#7-contratos-de-juego)
8. [Reglas de Negocio](#8-reglas-de-negocio)
9. [Decisiones de Diseño](#9-decisiones-de-diseño)

---

## 1. Identidad del Sistema

### 1.1 Definición

**CUMPEO** es una aplicación personal para gestionar eventos de juegos tipo "Noche de Juegos" o "Trivia". Un conductor (host) dirige partidas entre dos equipos desde una consola. El público puede ver el estado en una pantalla secundaria.

### 1.2 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | JavaScript vanilla (sin frameworks) |
| CSS | Tailwind CSS 3.4 + PostCSS |
| Build | Vite 5 |
| Base de datos (dev) | IndexedDB (adaptador propio) |
| Base de datos (prod) | Supabase (PostgreSQL + PostgREST + Realtime) |
| Testing (unit) | Vitest + fake-indexeddb |
| Testing (e2e) | Playwright |
| Control de versiones | Git |

### 1.3 Arquitectura

```
Cliente (navegador)
│
├── Repositorios (acceso a datos)
│   └── LocalAdapter (IndexedDB) / SupabaseAdapter (Supabase)
│
├── Servicios (lógica de negocio)
│   ├── ControlService (lease)
│   ├── PartidaService (orquestación)
│   ├── CircuitoService
│   ├── SetService
│   └── GameDefinitionRegistry
│
├── GameDefinitions (lógica por juego)
│   └── TriviaGameDefinition
│
└── UI (presentación, vanilla JS)
```

### 1.4 Principios Clave

| Principio | Descripción |
|-----------|-------------|
| **Server-first** | La UI refleja el estado persistido. Sin optimistic UI. |
| **Idempotencia** | Acciones críticas con `action_id` único (UUID v4). |
| **Lease de control** | Solo una sesión controla una partida (30s lease, 10s heartbeat). |
| **Congelación por copia** | Datos históricos se copian, no se referencian. |
| **Inmutabilidad** | `SetSnapshot` nunca cambia después de creado. |

---

## 2. Modelo de Dominio

### 2.1 Entidades (17)

#### Catálogo (5)

| Entidad | PK | Campos clave | Propósito |
|---------|-----|--------------|-----------|
| **Juego** | `id` (uuid) | `codigo`, `nombre`, `requiere_set`, `activo` | Tipo de juego. Catálogo, no ejecución. |
| **Set** | `id` (uuid) | `juego_id`, `nombre`, `version`, `activo` | Contenido reutilizable con versionado. |
| **ItemSet** | `id` (uuid) | `set_id`, `orden`, `contenido` (jsonb) | Elemento individual dentro de un Set. |
| **Extra** | `id` (uuid) | `codigo`, `nombre`, `configuracion_default` | Herramienta auxiliar (Tómbola, Dados). |
| **EquipoGuardado** | `id` (uuid) | `nombre`, `color` (hex) | Plantilla reutilizable de equipo. |

#### Configuración (3)

| Entidad | PK | Campos clave | Propósito |
|---------|-----|--------------|-----------|
| **Circuito** | `id` (uuid) | `nombre`, `estado`, `es_plantilla`, `version` | Secuencia de juegos configurada. |
| **CircuitoJuego** | `id` (uuid) | `circuito_id`, `juego_id`, `orden`, `configuracion` (jsonb), `snapshot_id` | Juego dentro de un circuito. |
| **EquipoCircuito** | `id` (uuid) | `circuito_id`, `posicion`, `nombre`, `color` | Equipo definido dentro de un circuito. |

#### Partida (5)

| Entidad | PK | Campos clave | Propósito |
|---------|-----|--------------|-----------|
| **Partida** | `id` (uuid) | `circuito_id`, `circuito_nombre`, `public_codigo`, `estado`, `version`, `finish_reason` | Sesión completa de juego. Unidad histórica. |
| **JuegoEjecutado** | `id` (uuid) | `partida_id`, `circuito_juego_id`, `juego_id`, `orden`, `snapshot_id`, `estado`, `state_version`, `resultado`, `finish_reason` | Juego dentro de una partida. |
| **EquipoPartida** | `id` (uuid) | `partida_id`, `posicion`, `nombre`, `color`, `puntaje`, `version` | Equipo con puntaje en la partida. |
| **ParticipantePartida** | `id` (uuid) | `partida_id`, `equipo_partida_id`, `nombre`, `ha_participado` | Persona que participa. |
| **ExtraUso** | `id` (uuid) | `partida_id`, `extra_id`, `juego_ejecutado_id` | Registro de uso de un Extra. |

#### Inmutable (1)

| Entidad | PK | Campos clave | Propósito |
|---------|-----|--------------|-----------|
| **SetSnapshot** | `id` (uuid) | `source_set_id`, `source_set_name`, `source_version`, `juego_id`, `contenido` (jsonb) | Copia inmutable de un Set. |

#### Técnica (3)

| Entidad | PK | Campos clave | Propósito |
|---------|-----|--------------|-----------|
| **AccionProcesada** | `action_id` (text) | `partida_id`, `tipo_accion`, `resultado` (jsonb) | Registro de acciones procesadas (idempotencia). |
| **ControlPartida** | `partida_id` (uuid) | `session_id`, `acquired_at`, `expires_at`, `heartbeat_at` | Lease de control de una partida. |
| **EventoTecnico** | `id` (uuid) | `partida_id`, `event_type`, `level`, `message` | Log de diagnóstico append-only. |

### 2.2 Relaciones

```
Juego ──1:N── Set ──1:N── ItemSet
  │
  └──1:N── CircuitoJuego ──N:1── Circuito ──1:N── EquipoCircuito
                │
                └──N:1── SetSnapshot (opcional)

Circuito ──1:N── Partida ──1:N── JuegoEjecutado
  │               │                  │
  │               ├──1:N── EquipoPartida ──1:N── ParticipantePartida
  │               │
  │               ├──1:1── ControlPartida
  │               │
  │               └──1:N── ExtraUso ──N:1── Extra
  │
  └──1:N── EquipoCircuito ──N:1── EquipoGuardado (opcional)

SetSnapshot ──N:1── Juego (ON DELETE RESTRICT)
JuegoEjecutado ──N:1── SetSnapshot (ON DELETE RESTRICT)
CircuitoJuego ──N:1── SetSnapshot (ON DELETE RESTRICT)
```

### 2.3 Cascada de Eliminación

| Origen | Destino | Acción |
|--------|---------|--------|
| Circuito | CircuitoJuego | CASCADE |
| Circuito | EquipoCircuito | CASCADE |
| Partida | JuegoEjecutado | CASCADE |
| Partida | EquipoPartida | CASCADE |
| Partida | ControlPartida | CASCADE |
| Partida | ExtraUso | CASCADE |
| Partida | ParticipantePartida | CASCADE |
| Set | ItemSet | CASCADE |
| Partida | AccionProcesada | SET NULL |
| EquipoPartida | ParticipantePartida | CASCADE |
| Set | SetSnapshot | SET NULL |
| Juego | SetSnapshot | RESTRICT |

---

## 3. Máquinas de Estado

### 3.1 Partida.estado

```
CONFIGURANDO ──→ EN_CURSO ──→ FINALIZADA
                     │
                     ├──→ DESCARTADA
                     │
                     └──→ EXPIRADA
```

| Estado | Transiciones válidas | Finish reason |
|--------|---------------------|---------------|
| `CONFIGURANDO` | → EN_CURSO, → DESCARTADA | null |
| `EN_CURSO` | → FINALIZADA, → DESCARTADA, → EXPIRADA | null |
| `FINALIZADA` | Terminal | `CIRCUITO_COMPLETO` |
| `DESCARTADA` | Terminal | `DESCARTADA_POR_CONDUCTOR` |
| `EXPIRADA` | Terminal | `EXPIRACION` |

**Reglas:**
- `finish_reason` es **null** en estados no terminales.
- `finish_reason` es **no-null** en estados terminales.
- `started_at` es **null** en `CONFIGURANDO`.
- `finished_at` es **null** en no terminales, **no-null** en terminales.

### 3.2 Circuito.estado

```
BORRADOR ←──→ LISTO
```

| Estado | Transiciones |
|--------|-------------|
| `BORRADOR` | → LISTO |
| `LISTO` | → BORRADOR |

**Regla:** `es_plantilla = true` solo es válido con `estado = LISTO`.

### 3.3 JuegoEjecutado.estado

```
PENDIENTE ──→ EN_CURSO ←──→ PAUSADO ──→ FINALIZADO
    │
    └──→ NO_JUGADO
```

| Estado | Transiciones |
|--------|-------------|
| `PENDIENTE` | → EN_CURSO, → NO_JUGADO |
| `EN_CURSO` | → PAUSADO, → FINALIZADO |
| `PAUSADO` | → EN_CURSO, → FINALIZADO |
| `FINALIZADO` | Terminal |
| `NO_JUGADO` | Terminal |

**Reglas:**
- Solo un JuegoEjecutado activo por Partida.
- `FINALIZADO` y `NO_JUGADO` son terminales.
- `resultado` no-null si y solo si `estado = FINALIZADO`.
- `finish_reason` no-null en `FINALIZADO` y `NO_JUGADO`.
- `timer_actual` opcional.
- `paused_at` solo válido en `PAUSADO`.

### 3.4 Finish Reasons

**Partida:**
- `CIRCUITO_COMPLETO` — todos los juegos terminaron normalmente.
- `DESCARTADA_POR_CONDUCTOR` — acción explícita del conductor.
- `EXPIRACION` — inactividad >24h.

**JuegoEjecutado:**
- `NORMAL` — el juego terminó por su cuenta.
- `PARTIDA_DESCARTADA` — arrastre por descarte de partida.
- `PARTIDA_FINALIZADA` — arrastre por finalización de circuito.
- `PARTIDA_EXPIRADA` — arrastre por expiración de partida.

---

## 4. Invariantes

**Total: 156 invariantes · 19 categorías**

### 4.1 Identidad y UUID

| # | Invariante |
|---|-----------|
| INV-001 | Todas las entidades usan UUID v4 como PK, generado por el cliente. |
| INV-002 | SetSnapshot tiene id propio. |
| INV-003 | AccionProcesada.action_id es único globalmente. |
| INV-004 | ControlPartida comparte PK con Partida. |

### 4.2 Catálogo

| # | Invariante |
|---|-----------|
| INV-005 | Juego es catálogo, no ejecución. |
| INV-006 | Extra es catálogo, no ejecución. |
| INV-007 | EquipoGuardado es plantilla pura. |

### 4.3 Sets e ItemSet

| # | Invariante |
|---|-----------|
| INV-008 | Set requiere Juego. |
| INV-009 | ItemSet requiere Set. |
| INV-010 | ItemSet pertenece a un solo Set. |
| INV-011 | Set.version incrementa en cada modificación persistida. |
| INV-012 | Modificación sin incremento de versión es imposible. |

### 4.4 Snapshots

| # | Invariante |
|---|-----------|
| INV-013 | SetSnapshot es inmutable. |
| INV-014 | source_version y source_set_name congelados. |
| INV-015 | source_set_id nullable. |
| INV-016 | Creación solo por confirmación explícita. |
| INV-017 | Snapshot compartible por N consumidores. |
| INV-018 | CircuitoJuego.snapshot_id opcional pero requerido si el Juego lo requiere. |
| INV-019 | JuegoEjecutado.snapshot_id heredado al crear. |
| INV-020 | JuegoEjecutado.snapshot_id inmutable una vez iniciado. |
| INV-021 | Estado "desactualizado" es derivado. |
| INV-022 | JuegoEjecutado no tiene "desactualizado". |
| INV-023 | Set eliminado no elimina snapshot. |
| INV-024 | [ACTUALIZAR SNAPSHOT] solo en PENDIENTE. |

### 4.5 Circuitos

| # | Invariante |
|---|-----------|
| INV-025 | Circuito.estado en { BORRADOR, LISTO }. |
| INV-026 | es_plantilla = true → estado = LISTO. |
| INV-027 | Circuito tiene exactamente 2 EquipoCircuito. |
| INV-028 | CircuitoJuego referencia 1 Circuito y 1 Juego. |
| INV-029 | Modificación de Circuito no afecta Partida. |
| INV-030 | Circuito no se elimina si tiene Partida activa. |
| INV-031 | Eliminación de Circuito no elimina Partida. |
| INV-032 | Reutilización por copia, no por re-ejecución. |

### 4.6 Equipos

| # | Invariante |
|---|-----------|
| INV-033 | EquipoCircuito copia nombre y color. |
| INV-034 | Modificar EquipoGuardado no modifica EquipoCircuito. |
| INV-035 | EquipoPartida copia nombre y color al crear la Partida. |
| INV-036 | EquipoPartida inmutable en nombre y color. |
| INV-037 | Modificar EquipoCircuito no modifica EquipoPartida. |
| INV-038 | EquipoPartida.equipo_circuito_id opcional. |
| INV-039 | EquipoPartida tiene exactamente 2 por Partida. |
| INV-040 | EquipoPartida.puntaje es entero (puede ser negativo). |

### 4.7 Partidas

| # | Invariante |
|---|-----------|
| INV-041 | Partida.estado en { CONFIGURANDO, EN_CURSO, FINALIZADA, DESCARTADA, EXPIRADA }. |
| INV-042 | Progresión unidireccional. |
| INV-043 | Estados terminales inmutables. |
| INV-044 | Partida.circuito_id nullable. |
| INV-045 | Partida.circuito_nombre copiado al crear. |
| INV-046 | Partida individual = circuito de 1 juego. |
| INV-047 | Partida tiene exactamente 1 ControlPartida. |
| INV-048 | Partida.circuito_id obligatorio al crear. |
| INV-049 | Expiración por inactividad (>24h). |
| INV-050 | Pausa no evita expiración. |
| INV-051 | last_activity_at se actualiza con actividad significativa. |

### 4.8 Juegos ejecutados

| # | Invariante |
|---|-----------|
| INV-052 | JuegoEjecutado.estado en dominio cerrado. |
| INV-053 | Progresión unidireccional. |
| INV-054 | FINALIZADO y NO_JUGADO terminales. |
| INV-055 | Solo un JuegoEjecutado activo por Partida. |
| INV-056 | JuegoEjecutado = EN_CURSO requiere Partida = EN_CURSO. |
| INV-057 | JuegoEjecutado = PAUSADO requiere Partida = EN_CURSO. |
| INV-058 | juego_id, orden, snapshot_id congelados. |
| INV-059 | configuracion_congelada inmutable. |
| INV-060 | state_version incrementa en cada modificación. |
| INV-061 | timer_actual opcional. |
| INV-062 | paused_at solo válido en PAUSADO. |
| INV-063 | resultado no-null si y solo si estado = FINALIZADO. |
| INV-064 | finish_reason no-null en FINALIZADO y NO_JUGADO. |
| INV-065 | NO_JUGADO → started_at IS NULL. |
| INV-066 | TIME_UP determinista (contrato). |
| INV-067 | TIME_UP acotado (MAX 100 iteraciones). |
| INV-068 | Finalización y marcador atómicos. |

### 4.9 Participantes

| # | Invariante |
|---|-----------|
| INV-069 | ParticipantePartida requiere Partida y EquipoPartida. |
| INV-070 | ParticipantePartida.equipo_partida_id de la misma partida. |
| INV-071 | Una fila por participante por partida. |
| INV-072 | Equipo fijo durante la partida. |
| INV-073 | Participante puede existir sin haber jugado. |
| INV-074 | Sin catálogo global de personas. |

### 4.10 Extras

| # | Invariante |
|---|-----------|
| INV-075 | ExtraUso requiere Extra y Partida. |
| INV-076 | ExtraUso copia extra_codigo y extra_nombre. |
| INV-077 | ExtraUso solo durante Partida EN_CURSO. |
| INV-078 | ExtraUso se crea al cerrar el extra. |
| INV-079 | Estado interno del extra es efímero. |
| INV-080 | ExtraUso actualiza last_activity_at. |
| INV-081 | Referencias opcionales de ExtraUso en la misma partida. |
| INV-082 | Extra no se elimina si tiene ExtraUso. |

### 4.11 Acciones idempotentes

| # | Invariante |
|---|-----------|
| INV-083 | Acciones críticas requieren action_id. |
| INV-084 | action_id generado una sola vez por acción lógica. |
| INV-085 | AccionProcesada insertada al inicio de la transacción. |
| INV-086 | Rollback elimina AccionProcesada. |
| INV-087 | Reintento con action_id ya procesado devuelve el resultado anterior. |
| INV-088 | partida_id de AccionProcesada es nullable. |

### 4.12 Control de partida

| # | Invariante |
|---|-----------|
| INV-089 | ControlPartida.session_id nullable. |
| INV-090 | Solo una sesión con el control. |
| INV-091 | Adquisición atómica. |
| INV-092 | Acciones críticas requieren control activo. |
| INV-093 | Lease de 30s, heartbeat cada 10s. |
| INV-094 | ControlPartida no es historial. |
| INV-095 | ControlPartida se elimina en cascada con Partida. |

### 4.13 Eventos técnicos

| # | Invariante |
|---|-----------|
| INV-097 | event_type controlado por código. |
| INV-098 | level en { INFO, WARN, ERROR, FATAL }. |
| INV-099 | metadata JSON libre. |
| INV-100 | Referencias opcionales e independientes. |
| INV-101 | No es historial funcional. |
| INV-102 | Retención 30 días. |
| INV-125 | Coherencia contextual de referencias técnicas. |
| INV-150 | EventoTecnico es append-only. |

### 4.14 Concurrencia

| # | Invariante |
|---|-----------|
| INV-103 | Toda acción crítica es transaccional. |
| INV-104 | Conflictos de versión no se reintentan automáticamente. |
| INV-105 | Sin doble ejecución por doble clic o reintento. |
| INV-106 | Multi-tab: solo una sesión controla. |

### 4.15 Versionado

| # | Invariante |
|---|-----------|
| INV-107 | version en entidades editables. |
| INV-108 | Entidades sin version. |
| INV-109 | state_version controlado por persistencia. |
| INV-126 | Circuito.version obligatoria. |

### 4.16 Ciclos de vida

| # | Invariante |
|---|-----------|
| INV-110 | Expiración de partidas. |
| INV-111 | Cierre por descarte. |
| INV-112 | Cierre por finalización anticipada. |
| INV-113 | Cierre normal. |

### 4.17 Historial

| # | Invariante |
|---|-----------|
| INV-114 | Historial no es entidad. |
| INV-115 | Historial nunca se elimina automáticamente. |
| INV-116 | Resultado es propiedad de Partida. |

### 4.18 Integridad entre entidades

| # | Invariante |
|---|-----------|
| INV-117 | Congelación por copia, no por referencia. |
| INV-118 | Modificar catálogo no afecta partida histórica. |
| INV-119 | Integridad referencial entre Partida y sus dependientes. |
| INV-120 | Snapshot único por JuegoEjecutado heredado. |

### 4.19 Reglas de eliminación

| # | Invariante |
|---|-----------|
| INV-121 | Sin CASCADE hacia historial. |
| INV-122 | ControlPartida única excepción de CASCADE. |
| INV-123 | SetSnapshot no se elimina por CASCADE. |
| INV-124 | Partida no se elimina físicamente. |

### Invariantes de cierre

| # | Invariante |
|---|-----------|
| INV-127 | Juego.codigo único e inmutable. |
| INV-128 | Extra.codigo único e inmutable. |
| INV-129 | ItemSet.orden único y sin gaps dentro de un Set. |
| INV-130 | Juego.requiere_set determina obligatoriedad de snapshot. |
| INV-131 | Circuito puede volver de LISTO a BORRADOR. |
| INV-132 | CircuitoJuego.configuracion con contrato por Juego. |
| INV-133 | EquipoCircuito.posicion único 1 o 2. |
| INV-134 | SetSnapshot.juego_id obligatorio, ON DELETE RESTRICT. |
| INV-135 | Snapshot_id RESTRICT desde CircuitoJuego y JuegoEjecutado. |
| INV-136 | SetSnapshot no modificable (refuerzo de INV-013). |
| INV-137 | SetSnapshot.contenido JSON con contrato por Juego. |
| INV-138 | Partida.finish_reason en { CIRCUITO_COMPLETO, EXPIRACION, DESCARTADA_POR_CONDUCTOR }. |
| INV-139 | finish_reason obligatorio si y solo si estado IN (FINALIZADA, DESCARTADA, EXPIRADA). |
| INV-140 | started_at null si estado = CONFIGURANDO. |
| INV-141 | EquipoPartida.posicion único 1 o 2. |
| INV-142 | JuegoEjecutado.orden único por Partida. |
| INV-143 | timer_actual estructura JSON definida. |
| INV-144 | ParticipantePartida.nombre obligatorio. |
| INV-145 | ExtraUso.configuracion y resultado opcionales. |
| INV-146 | ControlPartida sin id propio. |
| INV-147 | ControlPartida creado con session_id = NULL. |
| INV-148 | AccionProcesada.tipo_accion string libre. |
| INV-149 | AccionProcesada inmutable tras inserción. |
| INV-151 | Todas las FKs de EventoTecnico son SET NULL. |
| INV-153 | Partida.started_at null en CONFIGURANDO. |
| INV-154 | Partida.finished_at null en no-terminal, no-null en terminal. |
| INV-155 | JuegoEjecutado.finished_at null en no-terminal, no-null en terminal. |
| INV-156 | Partida → FINALIZADA cuando todos los JuegoEjecutado son terminales. |
| INV-157 | Partida → DESCARTADA solo por acción explícita. |
| INV-158 | Partida → EXPIRADA solo por evaluación de inactividad. |
| INV-159 | ParticipantePartida.ha_participado → true después de jugar. |
| INV-160 | JuegoEjecutado.finish_reason en { NORMAL, PARTIDA_DESCARTADA, PARTIDA_FINALIZADA, PARTIDA_EXPIRADA }. |

---

## 5. Superficie de API (plpgsql)

Todas las funciones retornan `jsonb` con estructura `{ ok: boolean, ... }`.

### 5.1 Funciones de Control

#### `reservar_accion`

Registra una acción idempotente. Si ya existe, devuelve el resultado guardado.

```sql
reservar_accion(
  p_action_id text,
  p_partida_id uuid,
  p_tipo_accion text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "yaProcesada": false }
```

**Retorno si ya existe:**
```json
{ "ok": true, "yaProcesada": true, "resultado": { ... } }
```

**Errores:**
- `action_id_requerido`
- `tipo_accion_requerido`

---

#### `tomar_control`

Adquiere lease de control atómicamente. Verifica disponibilidad, renueva, o rechaza.

```sql
tomar_control(
  p_partida_id uuid,
  p_session_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "session_id": "...", "renewed": false }
```

**Errores:**
- `partida_id_requerido`
- `session_id_requerido`
- `control_no_existe`
- `control_ocupado`

**Lógica:**
- Si no hay sesión activa o expirada → toma control.
- Si es la misma sesión → renueva.
- Si es otra sesión activa → rechaza.

---

#### `actualizar_resultado_accion`

Auxiliar interno. Guarda el resultado de una acción procesada.

```sql
actualizar_resultado_accion(
  p_action_id text,
  p_resultado jsonb
) RETURNS void
```

---

### 5.2 Funciones de Partida

#### `crear_partida`

Crea partida + 2 equipo_partidas + 1 control_partida. Idempotente.

```sql
crear_partida(
  p_circuito_id uuid,
  p_public_codigo text,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{
  "ok": true,
  "partida_id": "uuid",
  "circuito_nombre": "...",
  "public_codigo": "...",
  "estado": "CONFIGURANDO"
}
```

**Errores:**
- `circuito_id_requerido`
- `public_codigo_requerido`
- `session_id_requerido`
- `circuito_no_encontrado`
- `circuito_no_listo`
- `public_codigo_duplicado`
- `circuito_debe_tener_2_equipos`

---

#### `comenzar_partida`

Cambia CONFIGURANDO → EN_CURSO. Crea juego_ejecutados pendientes.

```sql
comenzar_partida(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "partida_id": "uuid", "estado": "EN_CURSO", "started_at": "..." }
```

**Errores:**
- `sin_control`
- `control_perteneciente_otra_sesion`
- `control_expirado`
- `partida_no_encontrada`
- `partida_no_configurando`

---

#### `descartar_partida`

Marca partida como DESCARTADA. Juegos no terminales → NO_JUGADO.

```sql
descartar_partida(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "partida_id": "uuid", "estado": "DESCARTADA" }
```

**Errores:** Mismos que `comenzar_partida` + `partida_no_descartable`.

---

#### `finalizar_circuito`

Finaliza forzadamente la partida. Marca juegos no terminales como NO_JUGADO.

```sql
finalizar_circuito(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "partida_id": "uuid", "estado": "FINALIZADA", "finish_reason": "CIRCUITO_COMPLETO" }
```

---

#### `expirar_partidas_inactivas`

Job del sistema. Expira partidas inactivas (>24h). Sin verificación de lease.

```sql
expirar_partidas_inactivas(
  p_horas integer DEFAULT 24
) RETURNS jsonb
```

**Retorno:**
```json
{ "ok": true, "expiradas": 3 }
```

---

### 5.3 Funciones de Juego

#### `iniciar_juego`

PENDIENTE → EN_CURSO.

```sql
iniciar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "juego_ejecutado_id": "uuid", "estado": "EN_CURSO" }
```

**Errores:**
- `sin_control`, `control_perteneciente_otra_sesion`, `control_expirado`
- `partida_no_en_curso`
- `juego_ejecutado_no_encontrado`
- `juego_no_pendiente`

---

#### `pausar_juego`

EN_CURSO → PAUSADO.

```sql
pausar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Errores adicionales:** `juego_no_en_curso`.

---

#### `reanudar_juego`

PAUSADO → EN_CURSO.

```sql
reanudar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Errores adicionales:** `juego_no_pausado`.

---

#### `finalizar_juego`

EN_CURSO/PAUSADO → FINALIZADO. Suma puntos. Si todos terminales, finaliza partida.

```sql
finalizar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_resultado jsonb,
  p_puntos_equipo_1 integer,
  p_puntos_equipo_2 integer,
  p_finish_reason text,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{
  "ok": true,
  "juego_ejecutado_id": "uuid",
  "estado": "FINALIZADO",
  "todos_terminales": false
}
```

**Errores adicionales:** `juego_no_activo`.

---

### 5.4 Funciones de Dominio

#### `crear_snapshot`

Crea SetSnapshot inmutable desde un Set. Copia items.

```sql
crear_snapshot(
  p_set_id uuid,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{
  "ok": true,
  "snapshot_id": "uuid",
  "source_set_name": "...",
  "source_version": 1,
  "juego_id": "uuid",
  "items_count": 10
}
```

**Errores:** `set_id_requerido`, `set_no_encontrado`.

---

#### `registrar_uso_extra`

Registra uso de un Extra. Actualiza last_activity_at.

```sql
registrar_uso_extra(
  p_partida_id uuid,
  p_extra_id uuid,
  p_juego_ejecutado_id uuid,
  p_equipo_partida_id uuid,
  p_participante_partida_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "extra_uso_id": "uuid", "extra_codigo": "...", "extra_nombre": "..." }
```

---

#### `agregar_participante`

Crea ParticipantePartida. Verifica unicidad por nombre en la partida.

```sql
agregar_participante(
  p_partida_id uuid,
  p_equipo_partida_id uuid,
  p_nombre text,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "participante_partida_id": "uuid", "nombre": "...", "equipo_partida_id": "uuid" }
```

**Errores:** `nombre_requerido`, `equipo_no_pertenece_a_partida`, `participante_duplicado`.

---

#### `marcar_participacion`

Marca `ha_participado = true`. Una vez marcado, no se revierte.

```sql
marcar_participacion(
  p_participante_partida_id uuid,
  p_session_id text,
  p_action_id text
) RETURNS jsonb
```

**Retorno exitoso:**
```json
{ "ok": true, "participante_partida_id": "uuid", "ha_participado": true, "ya_marcado": false }
```

---

### 5.5 Errores Comunes

Todos los errores de control aparecen en múltiples funciones:

| Error | Significado |
|-------|-------------|
| `sin_control` | No hay sesión con el control |
| `control_perteneciente_otra_sesion` | El control pertenece a otra sesión |
| `control_expirado` | El lease ha expirado |
| `partida_no_encontrada` | La partida no existe |
| `partida_no_en_curso` | La partida no está en EN_CURSO |

---

## 6. Esquema de Datos

### 6.1 Tablas

| # | Tabla | PK | Descripción |
|---|-------|-----|-------------|
| 1 | `juegos` | `id` (uuid) | Catálogo de juegos |
| 2 | `sets` | `id` (uuid) | Contenido reutilizable |
| 3 | `item_sets` | `id` (uuid) | Items de un Set |
| 4 | `extras` | `id` (uuid) | Herramientas auxiliares |
| 5 | `equipos_guardados` | `id` (uuid) | Plantillas de equipo |
| 6 | `circuitos` | `id` (uuid) | Secuencias de juegos |
| 7 | `set_snapshots` | `id` (uuid) | Copias inmutables |
| 8 | `circuito_juegos` | `id` (uuid) | Juegos en circuito |
| 9 | `equipo_circuitos` | `id` (uuid) | Equipos en circuito |
| 10 | `partidas` | `id` (uuid) | Sesiones de juego |
| 11 | `juego_ejecutados` | `id` (uuid) | Juegos en partida |
| 12 | `equipo_partidas` | `id` (uuid) | Equipos con puntaje |
| 13 | `participante_partidas` | `id` (uuid) | Participantes |
| 14 | `extra_usos` | `id` (uuid) | Registro de extras |
| 15 | `control_partidas` | `partida_id` (uuid) | Lease de control |
| 16 | `accion_procesadas` | `action_id` (text) | Idempotencia |
| 17 | `evento_tecnicos` | `id` (uuid) | Logs técnicos |

### 6.2 Índices

| Tabla | Índice | Columnas |
|-------|--------|----------|
| `juegos` | `idx_juegos_activo` | `activo` |
| `juegos` | `idx_juegos_orden_catalogo` | `orden_catalogo` |
| `sets` | `idx_sets_juego_id` | `juego_id` |
| `sets` | `idx_sets_activo` | `activo` |
| `item_sets` | `idx_item_sets_set_id` | `set_id` |
| `extras` | `idx_extras_activo` | `activo` |
| `circuitos` | `idx_circuitos_estado` | `estado` |
| `circuito_juegos` | `idx_circuito_juegos_circuito_id` | `circuito_id` |
| `equipo_circuitos` | `idx_equipo_circuitos_circuito_id` | `circuito_id` |
| `partidas` | `idx_partidas_estado` | `estado` |
| `partidas` | `idx_partidas_last_activity_at` | `last_activity_at` |
| `juego_ejecutados` | `idx_juego_ejecutados_partida_id` | `partida_id` |
| `juego_ejecutados` | `idx_juego_ejecutados_estado` | `estado` |
| `equipo_partidas` | `idx_equipo_partidas_partida_id` | `partida_id` |
| `participante_partidas` | `idx_participante_partidas_partida_id` | `partida_id` |
| `control_partidas` | `idx_control_partidas_session_id` | `session_id` |
| `control_partidas` | `idx_control_partidas_expires_at` | `expires_at` |
| `accion_procesadas` | `idx_accion_procesadas_partida_id` | `partida_id` |
| `evento_tecnicos` | `idx_evento_tecnicos_event_type` | `event_type` |

### 6.3 UNIQUE Constraints

| Tabla | Columnas |
|-------|----------|
| `juegos` | `codigo` |
| `extras` | `codigo` |
| `item_sets` | `(set_id, orden)` |
| `circuito_juegos` | `(circuito_id, orden)` |
| `equipo_circuitos` | `(circuito_id, posicion)` |
| `partidas` | `public_codigo` |
| `juego_ejecutados` | `(partida_id, orden)` |
| `equipo_partidas` | `(partida_id, posicion)` |
| `participante_partidas` | `(partida_id, nombre)` |

### 6.4 CHECK Constraints

| Tabla | Constraint | Valores |
|-------|-----------|---------|
| `partidas.estado` | `chk_partidas_estado` | `CONFIGURANDO`, `EN_CURSO`, `FINALIZADA`, `DESCARTADA`, `EXPIRADA` |
| `juego_ejecutados.estado` | `chk_juego_ejecutados_estado` | `PENDIENTE`, `EN_CURSO`, `PAUSADO`, `FINALIZADO`, `NO_JUGADO` |
| `circuitos.estado` | `chk_circuitos_estado` | `BORRADOR`, `LISTO` |
| `evento_tecnicos.level` | `chk_evento_tecnicos_level` | `INFO`, `WARN`, `ERROR`, `FATAL` |
| `partidas.finish_reason` | `chk_partidas_finish_reason_coherente` | Coherente con estado terminal |
| `juego_ejecutados.finish_reason` | `chk_juego_ejecutados_finish_reason_coherente` | Coherente con estado terminal |
| `equipos_guardados.color` | `chk_color_hex` | Regex `^#[0-9A-Fa-f]{6}$` |
| `equipo_circuitos.color` | `chk_color_hex` | Regex `^#[0-9A-Fa-f]{6}$` |
| `equipo_partidas.color` | `chk_color_hex` | Regex `^#[0-9A-Fa-f]{6}$` |

---

## 7. Contratos de Juego

### 7.1 GameDefinition (Interfaz)

Cada `GameDefinition` es un objeto que declara el comportamiento de un juego concreto.

```js
{
  codigo: 'TRIVIA',                       // string, único, inmutable
  nombre: 'Trivia',                       // string, legible
  requiere_set: true,                     // boolean (INV-130)

  validarConfiguracion(config),           // (config) => boolean | throws
  validarContenidoSet(contenido),         // (contenido) => boolean | throws
  validarEstadoJuego(estado),             // (estado) => boolean | throws
  calcularResultado(estadoJuego),         // (estado) => { puntos_equipo_1, puntos_equipo_2 }
  aplicarTimeUp(estadoJuego)              // (estado) => nuevoEstadoJuego | null
}
```

**Métodos obligatorios:** 5 (`validarConfiguracion`, `validarContenidoSet`, `validarEstadoJuego`, `calcularResultado`, `aplicarTimeUp`).

El `GameDefinitionRegistry` valida que existan al registrar. No los invoca.

### 7.2 TriviaGameDefinition

Implementación concreta para el juego Trivia.

| Campo | Valor |
|-------|-------|
| `codigo` | `'TRIVIA'` |
| `nombre` | `'Trivia'` |
| `requiere_set` | `true` |

**Métodos:**

1. **`validarConfiguracion(config)`** — valida `rondas`, `preguntas_por_ronda`, `puntos_por_acierto`, `penalizacion_activa`, `penalizacion_puntos`, `tiempo_por_pregunta_seg`. Cross-field: si `penalizacion_activa === true`, entonces `penalizacion_puntos > 0`.

2. **`validarContenidoSet(contenido)`** — valida `items` array no vacío. Cada item: `pregunta` (string), `opciones` (2-6), `respuesta_correcta_index` (entero en rango), `dificultad` (opcional, 1-3).

3. **`validarEstadoJuego(estado)`** — valida `ronda_actual`, `pregunta_actual_index`, `fase`, `respuestas`, `puntos_equipo_1`, `puntos_equipo_2`.

4. **`calcularResultado(estadoJuego)`** — devuelve `{ puntos_equipo_1, puntos_equipo_2 }`. Asume 0 si faltan.

5. **`aplicarTimeUp(estadoJuego)`** — determinista (INV-066). Fase terminal → null. Fase activa → pasa a `MOSTRANDO_RESULTADO` con respuesta `equipo: 0`. No penaliza.

**Fases del juego:**
- `MOSTRANDO_PREGUNTA`
- `SELECCIONANDO_RESPUESTA`
- `MOSTRANDO_RESULTADO`
- `FIN_DE_RONDA`
- `FIN_DE_JUEGO`

**Estructura de estado:**
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

---

## 8. Reglas de Negocio

### 8.1 Sets y Snapshots

- Un Set contiene items ordenados (1-based, sin gaps).
- La versión del Set incrementa con cada modificación de contenido.
- Cambiar solo `activo` no incrementa la versión.
- Un SetSnapshot congela el contenido en el momento de creación.
- Los snapshots son compartibles por múltiples consumidores.
- `Juego.requiere_set` determina si el snapshot es obligatorio.
- Un Set eliminado no elimina sus snapshots (SET NULL).

### 8.2 Control y Lease

- Duración del lease: 30 segundos.
- Heartbeat: cada 10 segundos.
- Solo una sesión puede tener el control.
- La misma sesión puede renovar su lease.
- Las acciones críticas verifican el lease antes de ejecutar.
- El control se crea con `session_id = NULL` al crear la partida.

### 8.3 Idempotencia

- Toda acción crítica lleva un `action_id` único (UUID v4).
- El `action_id` se genera una sola vez por acción lógica.
- Se persiste al inicio de la transacción.
- Si la transacción falla, se limpia el `action_id`.
- En reintentos, se devuelve el resultado cacheado.
- El `partida_id` en `AccionProcesada` es nullable (acciones sin partida).

### 8.4 Eliminación

- **Catálogo → Historial:** No hay CASCADE hacia historial.
- **ControlPartida:** Única excepción de CASCADE (se elimina con la partida).
- **SetSnapshot:** No se elimina por CASCADE (ON DELETE RESTRICT).
- **Partida:** No se elimina físicamente (solo estado terminal).
- **EventoTecnico:** Todas las FKs son SET NULL.

### 8.5 Equipos

- Un circuito tiene exactamente 2 equipos.
- Una partida tiene exactamente 2 equipos.
- Los equipos se copian al crear la partida (nombre, color).
- Modificar el circuito no modifica la partida histórica.
- Modificar `EquipoGuardado` no modifica `EquipoCircuito`.
- `EquipoPartida.puntaje` puede ser negativo.

### 8.6 Participantes

- Una fila por participante por partida (unicidad por nombre).
- El equipo es fijo durante la partida.
- No existe catálogo global de personas.
- `ha_participado` se marca en `true` después de jugar y no se revierte.

### 8.7 Extras

- No son juegos, son herramientas auxiliares.
- Se ejecutan durante un juego (modal de pantalla completa).
- El estado interno del extra es efímero.
- `ExtraUso` se crea al cerrar el extra.
- Actualiza `last_activity_at` de la partida.

---

## 9. Decisiones de Diseño

| # | Decisión | Justificación |
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
| 13 | Cliente genera `action_id` | Cumple INV-084. Idempotencia real. |
| 14 | Repo absorbe `action_id` | Una sola transacción. Atómico. |
| 15 | `actionId` como último argumento | Firma consistente, facilita testing. |
| 16 | Helpers internos `_<metodo>EnTx` | Wrapper maneja idempotencia; helper hace el trabajo. |
| 27 | `aplicarTimeUp` no penaliza | Determinista e idempotente (INV-066). |
| 36 | `Juego.id` es UUID; `codigo` es identificador lógico | Seed automático al arrancar. |
| 37 | `public_codigo` 6 chars alfanuméricos mayúsculas | Fácil de compartir. Retry ×3 si colisiona. |
| 38 | Auto-refresh 2s (hasta H7 Realtime) | Solución pragmática. |
| 46 | query para CRUD simple, rpc para operaciones atómicas | PostgREST no soporta transacciones multi-tabla. |
| 48 | `single: true` devuelve null si no hay filas | Más útil que lanzar error. |
| 55 | Funciones plpgsql retornan `jsonb` con `{ ok: boolean }` | Consistencia con interfaz del adapter. |
| 56 | Parámetros nombrados (p_*) en funciones | Supabase ordena alfabéticamente. |

---

## Referencias

- **MASTER.md:** Documento maestro de construcción (historial completo).
- **GAMES.md:** Manual de juegos e instrucciones.
- **schema.sql:** Esquema PostgreSQL completo.
- **0002-0004_funciones_*.sql:** Funciones plpgsql definitivas.

---

**Fin del OpenSpec v1.0**
