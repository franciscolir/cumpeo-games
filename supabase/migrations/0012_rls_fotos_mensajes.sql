-- =============================================================
-- 0012 — Políticas RLS para fotos_publicas y mensajes_publicos.
-- La migración 0010 las creó pero no definió políticas.
-- Sigue el patrón de 0009_rls_estricto.sql (partida).
-- =============================================================

-- fotos_publicas: anon SELECT, authenticated ALL
CREATE POLICY "anon puede leer fotos_publicas"
ON fotos_publicas FOR SELECT
TO anon
USING (true);

CREATE POLICY "authenticated puede CRUD fotos_publicas"
ON fotos_publicas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- mensajes_publicos: anon SELECT, authenticated ALL
CREATE POLICY "anon puede leer mensajes_publicos"
ON mensajes_publicos FOR SELECT
TO anon
USING (true);

CREATE POLICY "authenticated puede CRUD mensajes_publicos"
ON mensajes_publicos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================================
-- GRANTs (necesarios además de RLS).
-- Las tablas nuevas no los recibieron automáticamente.
-- =============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fotos_publicas TO authenticated;
GRANT SELECT ON TABLE fotos_publicas TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mensajes_publicos TO authenticated;
GRANT SELECT ON TABLE mensajes_publicos TO anon;
