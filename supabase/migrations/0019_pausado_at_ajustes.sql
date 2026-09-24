-- =============================================================
-- 0019 — pausado_at + ajustes_globales.
-- Agrega:
--   juego_ejecutados.pausado_at TIMESTAMPTZ NULL
--   tabla ajustes_globales (singleton) + RLS
-- Reemplaza las RPC pausar_juego / reanudar_juego.
-- =============================================================

-- 1. pausado_at en juego_ejecutados
ALTER TABLE juego_ejecutados
  ADD COLUMN IF NOT EXISTS pausado_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN juego_ejecutados.pausado_at IS
  'Timestamp de inicio de pausa. NULL si no está pausado.';

-- 2. Tabla ajustes_globales (singleton)
CREATE TABLE IF NOT EXISTS ajustes_globales (
  id text PRIMARY KEY DEFAULT 'default',
  tiempo_max_pausa_seg integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ajustes_globales IS
  'Ajustes globales de la app. Fila única con id = ''default''.';

INSERT INTO ajustes_globales (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;

-- 3. RLS
ALTER TABLE ajustes_globales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ajustes_select_auth" ON ajustes_globales;
DROP POLICY IF EXISTS "ajustes_update_auth" ON ajustes_globales;

CREATE POLICY "ajustes_select_auth" ON ajustes_globales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ajustes_update_auth" ON ajustes_globales
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Reemplazar RPC pausar_juego
CREATE OR REPLACE FUNCTION pausar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_je record;
BEGIN
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'pausar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  SELECT * INTO v_control FROM control_partidas WHERE partida_id = p_partida_id;
  IF NOT FOUND OR v_control.session_id IS NULL THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;
  IF v_control.session_id != p_session_id THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;
  IF v_control.expires_at <= now() THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado != 'EN_CURSO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_en_curso');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'PAUSADO',
      pausado_at = now(),
      state_version = state_version + 1,
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE partidas SET last_activity_at = now() WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object('ok', true);
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

-- 5. Reemplazar RPC reanudar_juego
CREATE OR REPLACE FUNCTION reanudar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_je record;
BEGIN
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'reanudar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  SELECT * INTO v_control FROM control_partidas WHERE partida_id = p_partida_id;
  IF NOT FOUND OR v_control.session_id IS NULL THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;
  IF v_control.session_id != p_session_id THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;
  IF v_control.expires_at <= now() THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado != 'PAUSADO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_pausado');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'EN_CURSO',
      pausado_at = NULL,
      state_version = state_version + 1,
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE partidas SET last_activity_at = now() WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object('ok', true);
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;
