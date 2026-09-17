/* =============================================================
   0008 — RLS: Habilitar con políticas permisivas.
   Fase 1 de H7.9. Prepara infraestructura sin restringir acceso.
   ============================================================= */

-- ============================================================
-- 1. Habilitar RLS en las 17 tablas
-- ============================================================
ALTER TABLE juegos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos_guardados ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuito_juegos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_circuitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE juego_ejecutados ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE participante_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_usos ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE accion_procesadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_tecnicos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Políticas permisivas para anon (temporal)
--    Se eliminarán o reemplazarán en H7.9b.3.
-- ============================================================
CREATE POLICY "permisivo_anon_juegos" ON juegos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_sets" ON sets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_item_sets" ON item_sets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_extras" ON extras FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_equipos_guardados" ON equipos_guardados FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_circuitos" ON circuitos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_set_snapshots" ON set_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_circuito_juegos" ON circuito_juegos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_equipo_circuitos" ON equipo_circuitos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_partidas" ON partidas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_juego_ejecutados" ON juego_ejecutados FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_equipo_partidas" ON equipo_partidas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_participante_partidas" ON participante_partidas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_extra_usos" ON extra_usos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_control_partidas" ON control_partidas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_accion_procesadas" ON accion_procesadas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_anon_evento_tecnicos" ON evento_tecnicos FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Políticas permisivas para authenticated (temporal)
-- ============================================================
CREATE POLICY "permisivo_auth_juegos" ON juegos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_sets" ON sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_item_sets" ON item_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_extras" ON extras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_equipos_guardados" ON equipos_guardados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_circuitos" ON circuitos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_set_snapshots" ON set_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_circuito_juegos" ON circuito_juegos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_equipo_circuitos" ON equipo_circuitos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_partidas" ON partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_juego_ejecutados" ON juego_ejecutados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_equipo_partidas" ON equipo_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_participante_partidas" ON participante_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_extra_usos" ON extra_usos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_control_partidas" ON control_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_accion_procesadas" ON accion_procesadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permisivo_auth_evento_tecnicos" ON evento_tecnicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
