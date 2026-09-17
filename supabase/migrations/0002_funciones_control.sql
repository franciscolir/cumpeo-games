/* =============================================================
   0002 — Funciones plpgsql definitivas: Idempotencia y Control.
   Reemplaza las funciones de ejemplo de 0001.
   ============================================================= */

-- ============================================================
-- actualizar_resultado_accion — auxiliar interno
-- Guarda el resultado de una acción ya procesada.
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_resultado_accion(
  p_action_id text,
  p_resultado jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE accion_procesadas
  SET resultado = p_resultado
  WHERE action_id = p_action_id;
END;
$$;

COMMENT ON FUNCTION actualizar_resultado_accion IS
  'Guarda el resultado de una acción procesada. Auxiliar interno de funciones críticas.';

-- ============================================================
-- reservar_accion — registro idempotente de acciones (definitiva)
-- Si el action_id ya existe, devuelve el resultado guardado.
-- ============================================================
CREATE OR REPLACE FUNCTION reservar_accion(
  p_action_id text,
  p_partida_id uuid,
  p_tipo_accion text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_existe boolean;
  v_resultado jsonb;
BEGIN
  IF p_action_id IS NULL OR p_action_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'action_id_requerido');
  END IF;

  IF p_tipo_accion IS NULL OR p_tipo_accion = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipo_accion_requerido');
  END IF;

  INSERT INTO accion_procesadas (action_id, partida_id, tipo_accion)
  VALUES (p_action_id, p_partida_id, p_tipo_accion);

  RETURN jsonb_build_object('ok', true, 'yaProcesada', false);
EXCEPTION
  WHEN unique_violation THEN
    SELECT resultado INTO v_resultado
    FROM accion_procesadas
    WHERE action_id = p_action_id;

    RETURN jsonb_build_object(
      'ok', true,
      'yaProcesada', true,
      'resultado', COALESCE(v_resultado, '{}'::jsonb)
    );
END;
$$;

COMMENT ON FUNCTION reservar_accion IS
  'Registra una acción idempotente. Si ya existe, devuelve el resultado guardado.';

-- ============================================================
-- tomar_control — adquiere lease de control atómicamente (definitiva)
-- Si el control está libre o expirado, lo toma.
-- Si está ocupado por otra sesión activa, rechaza.
-- Si es la misma sesión, renueva.
-- ============================================================
CREATE OR REPLACE FUNCTION tomar_control(
  p_partida_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_actual record;
BEGIN
  IF p_partida_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partida_id_requerido');
  END IF;

  IF p_session_id IS NULL OR p_session_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_id_requerido');
  END IF;

  SELECT * INTO v_actual
  FROM control_partidas
  WHERE partida_id = p_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_no_existe');
  END IF;

  -- Si hay sesión activa y no es la misma, rechazar
  IF v_actual.session_id IS NOT NULL
     AND v_actual.session_id != p_session_id
     AND v_actual.expires_at > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_ocupado');
  END IF;

  UPDATE control_partidas
  SET session_id = p_session_id,
      acquired_at = now(),
      expires_at = now() + interval '30 seconds',
      heartbeat_at = now()
  WHERE partida_id = p_partida_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', p_session_id,
    'renewed', v_actual.session_id = p_session_id
  );
END;
$$;

COMMENT ON FUNCTION tomar_control IS
  'Adquiere el lease de control de una partida. Verifica disponibilidad y renueva.';
