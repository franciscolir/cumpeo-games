-- =============================================================
-- 0013 — RLS para el móvil anónimo.
-- El móvil no usa Supabase Auth. Necesita crear participantes,
-- mensajes y fotos desde anon.
--
-- NOTA: estas políticas ya están aplicadas en Supabase Cloud
-- (creadas manualmente durante el desarrollo). Este archivo
-- documenta el estado final para recrear desde cero.
-- =============================================================

-- participante_partidas: anon INSERT (SELECT ya existe)
CREATE POLICY "anon puede insertar participante_partidas"
ON participante_partidas FOR INSERT
TO anon
WITH CHECK (true);

-- mensajes_publicos: anon INSERT (SELECT ya existe)
CREATE POLICY "anon puede insertar mensajes_publicos"
ON mensajes_publicos FOR INSERT
TO anon
WITH CHECK (true);

-- fotos_publicas: anon INSERT (SELECT ya existe)
CREATE POLICY "anon puede insertar fotos_publicas"
ON fotos_publicas FOR INSERT
TO anon
WITH CHECK (true);
