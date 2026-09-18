/* =============================================================
   0009 — RLS: Revocar permisivo, crear políticas específicas.
   
   Modelo single-user. Autenticación via Supabase Auth.
   - Catálogo: anon SELECT, authenticated ALL.
   - Partida: anon SELECT, authenticated ALL.
   - Control: authenticated ALL (anon nada).
   - Técnica: authenticated SELECT/INSERT (anon nada).
   ============================================================= */

-- ============================================================
-- 1. Revocar las 34 políticas permisivas
-- ============================================================

-- Catálogo
DROP POLICY IF EXISTS "permisivo_anon_juegos" ON juegos;
DROP POLICY IF EXISTS "permisivo_auth_juegos" ON juegos;
DROP POLICY IF EXISTS "permisivo_anon_sets" ON sets;
DROP POLICY IF EXISTS "permisivo_auth_sets" ON sets;
DROP POLICY IF EXISTS "permisivo_anon_item_sets" ON item_sets;
DROP POLICY IF EXISTS "permisivo_auth_item_sets" ON item_sets;
DROP POLICY IF EXISTS "permisivo_anon_extras" ON extras;
DROP POLICY IF EXISTS "permisivo_auth_extras" ON extras;
DROP POLICY IF EXISTS "permisivo_anon_equipos_guardados" ON equipos_guardados;
DROP POLICY IF EXISTS "permisivo_auth_equipos_guardados" ON equipos_guardados;
DROP POLICY IF EXISTS "permisivo_anon_circuitos" ON circuitos;
DROP POLICY IF EXISTS "permisivo_auth_circuitos" ON circuitos;
DROP POLICY IF EXISTS "permisivo_anon_circuito_juegos" ON circuito_juegos;
DROP POLICY IF EXISTS "permisivo_auth_circuito_juegos" ON circuito_juegos;
DROP POLICY IF EXISTS "permisivo_anon_equipo_circuitos" ON equipo_circuitos;
DROP POLICY IF EXISTS "permisivo_auth_equipo_circuitos" ON equipo_circuitos;
DROP POLICY IF EXISTS "permisivo_anon_set_snapshots" ON set_snapshots;
DROP POLICY IF EXISTS "permisivo_auth_set_snapshots" ON set_snapshots;

-- Partida
DROP POLICY IF EXISTS "permisivo_anon_partidas" ON partidas;
DROP POLICY IF EXISTS "permisivo_auth_partidas" ON partidas;
DROP POLICY IF EXISTS "permisivo_anon_juego_ejecutados" ON juego_ejecutados;
DROP POLICY IF EXISTS "permisivo_auth_juego_ejecutados" ON juego_ejecutados;
DROP POLICY IF EXISTS "permisivo_anon_equipo_partidas" ON equipo_partidas;
DROP POLICY IF EXISTS "permisivo_auth_equipo_partidas" ON equipo_partidas;
DROP POLICY IF EXISTS "permisivo_anon_participante_partidas" ON participante_partidas;
DROP POLICY IF EXISTS "permisivo_auth_participante_partidas" ON participante_partidas;
DROP POLICY IF EXISTS "permisivo_anon_extra_usos" ON extra_usos;
DROP POLICY IF EXISTS "permisivo_auth_extra_usos" ON extra_usos;

-- Control
DROP POLICY IF EXISTS "permisivo_anon_control_partidas" ON control_partidas;
DROP POLICY IF EXISTS "permisivo_auth_control_partidas" ON control_partidas;
DROP POLICY IF EXISTS "permisivo_anon_accion_procesadas" ON accion_procesadas;
DROP POLICY IF EXISTS "permisivo_auth_accion_procesadas" ON accion_procesadas;

-- Técnica
DROP POLICY IF EXISTS "permisivo_anon_evento_tecnicos" ON evento_tecnicos;
DROP POLICY IF EXISTS "permisivo_auth_evento_tecnicos" ON evento_tecnicos;

-- ============================================================
-- 2. Políticas CATÁLOGO (anon: SELECT, authenticated: ALL)
-- ============================================================

-- juegos
CREATE POLICY "catalogo_select_anon" ON juegos FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON juegos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sets
CREATE POLICY "catalogo_select_anon" ON sets FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- item_sets
CREATE POLICY "catalogo_select_anon" ON item_sets FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON item_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- extras
CREATE POLICY "catalogo_select_anon" ON extras FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON extras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- equipos_guardados
CREATE POLICY "catalogo_select_anon" ON equipos_guardados FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON equipos_guardados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- circuitos
CREATE POLICY "catalogo_select_anon" ON circuitos FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON circuitos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- circuito_juegos
CREATE POLICY "catalogo_select_anon" ON circuito_juegos FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON circuito_juegos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- equipo_circuitos
CREATE POLICY "catalogo_select_anon" ON equipo_circuitos FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON equipo_circuitos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- set_snapshots
CREATE POLICY "catalogo_select_anon" ON set_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "catalogo_all_auth" ON set_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Políticas PARTIDA (anon: SELECT, authenticated: ALL)
-- ============================================================

-- partidas
CREATE POLICY "partida_select_anon" ON partidas FOR SELECT TO anon USING (true);
CREATE POLICY "partida_all_auth" ON partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- juego_ejecutados
CREATE POLICY "partida_select_anon" ON juego_ejecutados FOR SELECT TO anon USING (true);
CREATE POLICY "partida_all_auth" ON juego_ejecutados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- equipo_partidas
CREATE POLICY "partida_select_anon" ON equipo_partidas FOR SELECT TO anon USING (true);
CREATE POLICY "partida_all_auth" ON equipo_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- participante_partidas
CREATE POLICY "partida_select_anon" ON participante_partidas FOR SELECT TO anon USING (true);
CREATE POLICY "partida_all_auth" ON participante_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- extra_usos
CREATE POLICY "partida_select_anon" ON extra_usos FOR SELECT TO anon USING (true);
CREATE POLICY "partida_all_auth" ON extra_usos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Políticas CONTROL (authenticated: ALL, anon: nada)
-- ============================================================

CREATE POLICY "control_all_auth" ON control_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "control_all_auth" ON accion_procesadas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Políticas TÉCNICA (authenticated: SELECT/INSERT, anon: nada)
-- ============================================================

CREATE POLICY "tecnica_select_auth" ON evento_tecnicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "tecnica_insert_auth" ON evento_tecnicos FOR INSERT TO authenticated WITH CHECK (true);
