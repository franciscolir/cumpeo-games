CREATE TABLE respuestas_encuesta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  juego_ejecutado_id UUID NOT NULL REFERENCES juego_ejecutados(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES participante_partidas(id) ON DELETE CASCADE,
  pregunta_index INTEGER NOT NULL,
  opcion TEXT NOT NULL CHECK (opcion IN ('A', 'B')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (juego_ejecutado_id, participante_id, pregunta_index)
);

CREATE INDEX idx_respuestas_encuesta_partida ON respuestas_encuesta(partida_id);
CREATE INDEX idx_respuestas_encuesta_juego ON respuestas_encuesta(juego_ejecutado_id);

-- RLS
ALTER TABLE respuestas_encuesta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon puede insertar respuestas_encuesta"
ON respuestas_encuesta FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon puede leer respuestas_encuesta"
ON respuestas_encuesta FOR SELECT
TO anon
USING (true);

CREATE POLICY "authenticated puede CRUD respuestas_encuesta"
ON respuestas_encuesta FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT ON TABLE respuestas_encuesta TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE respuestas_encuesta TO authenticated;

-- Invariantes:
-- INV-189: respuestas_encuesta.opcion ∈ { A, B }.
-- INV-190: UNIQUE (juego_ejecutado_id, participante_id, pregunta_index).
