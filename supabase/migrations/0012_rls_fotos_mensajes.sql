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
