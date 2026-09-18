-- El constraint UNIQUE ya existe en migration 0010.
-- Esta migración agrega un índice explícito para queries rápidas.
CREATE INDEX IF NOT EXISTS idx_participante_session_token
  ON participante_partidas(session_token);

COMMENT ON INDEX idx_participante_session_token IS
  'Índice para búsqueda por session_token (INV-171).';
