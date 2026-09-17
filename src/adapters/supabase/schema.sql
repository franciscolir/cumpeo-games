/* =============================================================
   CUMPEO — Schema Postgres para Supabase
   17 tablas migradas desde IndexedDB
   ============================================================= */

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. juegos
-- ============================================================
CREATE TABLE juegos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  requiere_set boolean NOT NULL DEFAULT false,
  orden_catalogo integer,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_juegos_activo ON juegos (activo);
CREATE INDEX idx_juegos_orden_catalogo ON juegos (orden_catalogo);

-- ============================================================
-- 2. sets
-- ============================================================
CREATE TABLE sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juego_id uuid NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  version integer NOT NULL DEFAULT 1,
  orden_catalogo integer,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sets_juego_id ON sets (juego_id);
CREATE INDEX idx_sets_juego_id_orden_catalogo ON sets (juego_id, orden_catalogo);
CREATE INDEX idx_sets_activo ON sets (activo);

-- ============================================================
-- 3. item_sets
-- ============================================================
CREATE TABLE item_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  orden integer NOT NULL,
  contenido jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, orden)
);

CREATE INDEX idx_item_sets_set_id ON item_sets (set_id);

-- ============================================================
-- 4. extras
-- ============================================================
CREATE TABLE extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  configuracion_default jsonb,
  orden_catalogo integer,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_extras_activo ON extras (activo);
CREATE INDEX idx_extras_orden_catalogo ON extras (orden_catalogo);

-- ============================================================
-- 5. equipos_guardados
-- ============================================================
CREATE TABLE equipos_guardados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. circuitos
-- ============================================================
CREATE TABLE circuitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  estado text NOT NULL CHECK (estado IN ('BORRADOR', 'LISTO')),
  es_plantilla boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_circuitos_estado ON circuitos (estado);
CREATE INDEX idx_circuitos_estado_es_plantilla ON circuitos (estado, es_plantilla);

-- ============================================================
-- 7. set_snapshots
-- ============================================================
CREATE TABLE set_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_set_id uuid REFERENCES sets(id) ON DELETE SET NULL,
  source_set_name text NOT NULL,
  source_version integer NOT NULL,
  juego_id uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  contenido jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_set_snapshots_source_set_id ON set_snapshots (source_set_id);
CREATE INDEX idx_set_snapshots_juego_id ON set_snapshots (juego_id);
CREATE INDEX idx_set_snapshots_source_set_id_source_version ON set_snapshots (source_set_id, source_version);

-- ============================================================
-- 8. circuito_juegos
-- ============================================================
CREATE TABLE circuito_juegos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuito_id uuid NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
  juego_id uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  orden integer NOT NULL,
  configuracion jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_id uuid REFERENCES set_snapshots(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circuito_id, orden)
);

CREATE INDEX idx_circuito_juegos_circuito_id ON circuito_juegos (circuito_id);
CREATE INDEX idx_circuito_juegos_juego_id ON circuito_juegos (juego_id);
CREATE INDEX idx_circuito_juegos_snapshot_id ON circuito_juegos (snapshot_id);

-- ============================================================
-- 9. equipo_circuitos
-- ============================================================
CREATE TABLE equipo_circuitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuito_id uuid NOT NULL REFERENCES circuitos(id) ON DELETE CASCADE,
  equipo_guardado_id uuid REFERENCES equipos_guardados(id) ON DELETE SET NULL,
  posicion integer NOT NULL,
  nombre text NOT NULL,
  color text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circuito_id, posicion)
);

CREATE INDEX idx_equipo_circuitos_circuito_id ON equipo_circuitos (circuito_id);
CREATE INDEX idx_equipo_circuitos_equipo_guardado_id ON equipo_circuitos (equipo_guardado_id);

-- ============================================================
-- 10. partidas
-- ============================================================
CREATE TABLE partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuito_id uuid REFERENCES circuitos(id) ON DELETE SET NULL,
  circuito_nombre text NOT NULL,
  public_codigo text NOT NULL UNIQUE,
  estado text NOT NULL CHECK (estado IN ('CONFIGURANDO', 'EN_CURSO', 'FINALIZADA', 'DESCARTADA', 'EXPIRADA')),
  version integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  finished_at timestamptz,
  finish_reason text,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_partidas_finish_reason_coherente CHECK (
    (estado IN ('FINALIZADA', 'DESCARTADA', 'EXPIRADA') AND finish_reason IS NOT NULL) OR
    (estado NOT IN ('FINALIZADA', 'DESCARTADA', 'EXPIRADA') AND finish_reason IS NULL)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partidas_estado ON partidas (estado);
CREATE INDEX idx_partidas_circuito_id ON partidas (circuito_id);
CREATE INDEX idx_partidas_last_activity_at ON partidas (last_activity_at);
CREATE INDEX idx_partidas_estado_last_activity_at ON partidas (estado, last_activity_at);

-- ============================================================
-- 11. juego_ejecutados
-- ============================================================
CREATE TABLE juego_ejecutados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  circuito_juego_id uuid NOT NULL REFERENCES circuito_juegos(id) ON DELETE RESTRICT,
  juego_id uuid NOT NULL REFERENCES juegos(id) ON DELETE RESTRICT,
  orden integer NOT NULL,
  snapshot_id uuid REFERENCES set_snapshots(id) ON DELETE RESTRICT,
  configuracion_congelada jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'PAUSADO', 'FINALIZADO', 'NO_JUGADO')),
  state_version integer NOT NULL DEFAULT 1,
  timer_actual integer,
  paused_at timestamptz,
  estado_juego jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado jsonb,
  finish_reason text,
  started_at timestamptz,
  finished_at timestamptz,
  CONSTRAINT chk_juego_ejecutados_finish_reason_coherente CHECK (
    (estado IN ('FINALIZADO', 'NO_JUGADO') AND finish_reason IS NOT NULL) OR
    (estado NOT IN ('FINALIZADO', 'NO_JUGADO') AND finish_reason IS NULL)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_id, orden)
);

CREATE INDEX idx_juego_ejecutados_partida_id ON juego_ejecutados (partida_id);
CREATE INDEX idx_juego_ejecutados_estado ON juego_ejecutados (estado);
CREATE INDEX idx_juego_ejecutados_partida_id_estado ON juego_ejecutados (partida_id, estado);
CREATE INDEX idx_juego_ejecutados_circuito_juego_id ON juego_ejecutados (circuito_juego_id);
CREATE INDEX idx_juego_ejecutados_juego_id ON juego_ejecutados (juego_id);
CREATE INDEX idx_juego_ejecutados_snapshot_id ON juego_ejecutados (snapshot_id);

-- ============================================================
-- 12. equipo_partidas
-- ============================================================
CREATE TABLE equipo_partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  equipo_circuito_id uuid REFERENCES equipo_circuitos(id) ON DELETE SET NULL,
  posicion integer NOT NULL,
  nombre text NOT NULL,
  color text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  puntaje integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_id, posicion)
);

CREATE INDEX idx_equipo_partidas_partida_id ON equipo_partidas (partida_id);
CREATE INDEX idx_equipo_partidas_equipo_circuito_id ON equipo_partidas (equipo_circuito_id);

-- ============================================================
-- 13. participante_partidas
-- ============================================================
CREATE TABLE participante_partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  equipo_partida_id uuid NOT NULL REFERENCES equipo_partidas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  ha_participado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_participante_partidas_partida_id ON participante_partidas (partida_id);
CREATE INDEX idx_participante_partidas_equipo_partida_id ON participante_partidas (equipo_partida_id);
CREATE UNIQUE INDEX idx_participante_partidas_partida_id_nombre ON participante_partidas (partida_id, nombre);

-- ============================================================
-- 14. extra_usos
-- ============================================================
CREATE TABLE extra_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES extras(id) ON DELETE RESTRICT,
  juego_ejecutado_id uuid REFERENCES juego_ejecutados(id) ON DELETE SET NULL,
  equipo_partida_id uuid REFERENCES equipo_partidas(id) ON DELETE SET NULL,
  participante_partida_id uuid REFERENCES participante_partidas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_extra_usos_partida_id ON extra_usos (partida_id);
CREATE INDEX idx_extra_usos_extra_id ON extra_usos (extra_id);
CREATE INDEX idx_extra_usos_juego_ejecutado_id ON extra_usos (juego_ejecutado_id);

-- ============================================================
-- 15. control_partidas
-- ============================================================
CREATE TABLE control_partidas (
  partida_id uuid PRIMARY KEY REFERENCES partidas(id) ON DELETE CASCADE,
  session_id text,
  usuario_id text,
  acquired_at timestamptz,
  expires_at timestamptz,
  heartbeat_at timestamptz
);

CREATE INDEX idx_control_partidas_session_id ON control_partidas (session_id);
CREATE INDEX idx_control_partidas_expires_at ON control_partidas (expires_at);

-- ============================================================
-- 16. accion_procesadas
-- ============================================================
CREATE TABLE accion_procesadas (
  action_id text PRIMARY KEY,
  partida_id uuid REFERENCES partidas(id) ON DELETE SET NULL,
  tipo_accion text NOT NULL,
  resultado jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accion_procesadas_partida_id ON accion_procesadas (partida_id);
CREATE INDEX idx_accion_procesadas_created_at ON accion_procesadas (created_at);
CREATE INDEX idx_accion_procesadas_tipo_accion ON accion_procesadas (tipo_accion);

-- ============================================================
-- 17. evento_tecnicos
-- ============================================================
CREATE TABLE evento_tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid REFERENCES partidas(id) ON DELETE SET NULL,
  circuito_id uuid REFERENCES circuitos(id) ON DELETE SET NULL,
  juego_id uuid REFERENCES juegos(id) ON DELETE SET NULL,
  juego_ejecutado_id uuid REFERENCES juego_ejecutados(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  level text NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evento_tecnicos_event_type ON evento_tecnicos (event_type);
CREATE INDEX idx_evento_tecnicos_level ON evento_tecnicos (level);
CREATE INDEX idx_evento_tecnicos_created_at ON evento_tecnicos (created_at);
CREATE INDEX idx_evento_tecnicos_partida_id_created_at ON evento_tecnicos (partida_id, created_at);
CREATE INDEX idx_evento_tecnicos_juego_ejecutado_id ON evento_tecnicos (juego_ejecutado_id);
