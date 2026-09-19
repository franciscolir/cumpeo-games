-- =============================================================
-- 0014 — Políticas de Storage para el móvil anónimo.
--
-- NOTA: estas políticas YA ESTÁN APLICADAS en Supabase Cloud
-- (creadas manualmente al configurar el bucket).
-- Este archivo documenta el estado final.
--
-- Si se recrea Supabase desde cero, ejecutar estas políticas.
-- =============================================================

CREATE POLICY "anon puede subir fotos a cumpeo-publico"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'cumpeo-publico');

CREATE POLICY "anon puede leer fotos de cumpeo-publico"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'cumpeo-publico');
