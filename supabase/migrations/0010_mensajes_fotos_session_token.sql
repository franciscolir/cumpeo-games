/* =============================================================
   0010 — Mensajes públicos, fotos públicas, session_token.
   Extiende el modelo para contenido generado por el móvil.
   - Tabla mensajes_publicos (INV-161 a INV-165).
   - Tabla fotos_publicas (INV-166 a INV-170).
   - Columna session_token en participante_partidas (INV-171 a INV-174).
   ============================================================= */

-- Tabla mensajes_publicos
CREATE TABLE IF NOT EXISTS mensajes_publicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES participante_partidas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL CHECK (length(trim(texto)) > 0),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','APROBADO','RECHAZADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderado_at TIMESTAMPTZ,
  moderado_por TEXT
);

-- Tabla fotos_publicas
CREATE TABLE IF NOT EXISTS fotos_publicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES participante_partidas(id) ON DELETE CASCADE,
  storage_ref TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type LIKE 'image/%'),
  tamano_bytes INTEGER NOT NULL CHECK (tamano_bytes > 0),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','APROBADO','RECHAZADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moderado_at TIMESTAMPTZ,
  moderado_por TEXT
);

-- session_token en participante_partidas
ALTER TABLE participante_partidas
  ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_mensajes_partida ON mensajes_publicos(partida_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_estado  ON mensajes_publicos(estado);
CREATE INDEX IF NOT EXISTS idx_fotos_partida    ON fotos_publicas(partida_id);
CREATE INDEX IF NOT EXISTS idx_fotos_estado     ON fotos_publicas(estado);

-- Comentarios
COMMENT ON TABLE mensajes_publicos IS
  'Mensajes del público. INV-161 a INV-165.';
COMMENT ON TABLE fotos_publicas IS
  'Fotos del público. INV-166 a INV-170. storage_ref apunta a Supabase Storage.';
COMMENT ON COLUMN participante_partidas.session_token IS
  'Token técnico de participación móvil. INV-171 a INV-174.';
