ALTER TABLE sets ADD COLUMN IF NOT EXISTS es_predeterminado boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sets_es_predeterminado ON sets (es_predeterminado);
