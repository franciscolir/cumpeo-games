-- Migración 0017 — Configuración de juego + submodo de set.
-- Agrega:
--   juegos.configuracion JSONB default '{}'
--   sets.submodo TEXT nullable
--
-- Las filas existentes quedan con configuracion = {} y submodo = NULL.

ALTER TABLE juegos
  ADD COLUMN IF NOT EXISTS configuracion JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS submodo TEXT NULL;

COMMENT ON COLUMN juegos.configuracion IS
  'Configuración específica del juego (JSONB). Default {}. '
  'Cada juego define su propia estructura.';

COMMENT ON COLUMN sets.submodo IS
  'Submodo del set. Solo Pictionary lo usa: '
  'PALABRAS | GESTOS | PREGUNTAS | DIBUJO. NULL en el resto.';
