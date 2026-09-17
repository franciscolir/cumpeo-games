/* =============================================================
   0001 — Funciones plpgsql de ejemplo para H7.2.
   Estas NO son las definitivas (esas vienen en H7.3).
   Sirven para validar el patrón de adapter con rpc().
   ============================================================= */

-- ============================================================
-- 1. reservar_accion — registro idempotente de acciones
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
BEGIN
  IF p_action_id IS NULL OR p_action_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'action_id requerido');
  END IF;

  IF p_tipo_accion IS NULL OR p_tipo_accion = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipo_accion requerido');
  END IF;

  INSERT INTO accion_procesadas (action_id, partida_id, tipo_accion)
  VALUES (p_action_id, p_partida_id, p_tipo_accion);

  RETURN jsonb_build_object('ok', true, 'yaProcesada', false);
EXCEPTION
  WHEN unique_violation THEN
    SELECT true INTO v_existe
    FROM accion_procesadas
    WHERE action_id = p_action_id;

    RETURN jsonb_build_object(
      'ok', true,
      'yaProcesada', true,
      'resultado', (
        SELECT jsonb_build_object(
          'action_id', action_id,
          'tipo_accion', tipo_accion,
          'created_at', created_at
        )
        FROM accion_procesadas
        WHERE action_id = p_action_id
      )
    );
END;
$$;

COMMENT ON FUNCTION reservar_accion IS
  'Registra una acción idempotente. Devuelve { ok, yaProcesada, resultado }. H7.2 ejemplo.';

-- ============================================================
-- 2. tomar_control — adquiere lease de control atómicamente
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
    RETURN jsonb_build_object('ok', false, 'error', 'partida_id requerido');
  END IF;

  IF p_session_id IS NULL OR p_session_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_id requerido');
  END IF;

  SELECT * INTO v_actual
  FROM control_partidas
  WHERE partida_id = p_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_no_existe');
  END IF;

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

  RETURN jsonb_build_object('ok', true, 'session_id', p_session_id);
END;
$$;

COMMENT ON FUNCTION tomar_control IS
  'Adquiere el lease de control de una partida. Verifica disponibilidad. H7.2 ejemplo.';

-- ============================================================
-- 3. iniciar_juego — cambia JuegoEjecutado a EN_CURSO
-- ============================================================
CREATE OR REPLACE FUNCTION iniciar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_control record;
  v_je record;
  v_partida record;
BEGIN
  IF p_partida_id IS NULL OR p_juego_ejecutado_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametros_requeridos');
  END IF;

  IF p_session_id IS NULL OR p_session_id = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_id requerido');
  END IF;

  SELECT * INTO v_control
  FROM control_partidas
  WHERE partida_id = p_partida_id;

  IF NOT FOUND OR v_control.session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;

  IF v_control.session_id != p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;

  IF v_control.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  SELECT * INTO v_partida
  FROM partidas
  WHERE id = p_partida_id;

  IF NOT FOUND OR v_partida.estado != 'EN_CURSO' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_en_curso');
  END IF;

  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;

  IF v_je.estado != 'PENDIENTE' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'juego_no_pendiente');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'EN_CURSO',
      started_at = now(),
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE partidas
  SET last_activity_at = now(),
      updated_at = now()
  WHERE id = p_partida_id;

  RETURN jsonb_build_object(
    'ok', true,
    'juego_ejecutado_id', p_juego_ejecutado_id,
    'estado', 'EN_CURSO'
  );
END;
$$;

COMMENT ON FUNCTION iniciar_juego IS
  'Cambia un JuegoEjecutado de PENDIENTE a EN_CURSO. Verifica control activo. H7.2 ejemplo.';

-- ============================================================
-- 4. finalizar_juego — finaliza un juego y suma puntos
-- ============================================================
CREATE OR REPLACE FUNCTION finalizar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_resultado jsonb,
  p_puntos_equipo_1 integer,
  p_puntos_equipo_2 integer,
  p_finish_reason text,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_control record;
  v_je record;
  v_partida record;
  v_todos_terminales boolean;
BEGIN
  IF p_partida_id IS NULL OR p_juego_ejecutado_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametros_requeridos');
  END IF;

  SELECT * INTO v_control
  FROM control_partidas
  WHERE partida_id = p_partida_id;

  IF NOT FOUND OR v_control.session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;

  IF v_control.session_id != p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;

  IF v_control.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  SELECT * INTO v_partida
  FROM partidas
  WHERE id = p_partida_id;

  IF NOT FOUND OR v_partida.estado != 'EN_CURSO' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_en_curso');
  END IF;

  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;

  IF v_je.estado NOT IN ('EN_CURSO', 'PAUSADO') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'juego_no_activo');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'FINALIZADO',
      resultado = COALESCE(p_resultado, v_je.resultado),
      finish_reason = p_finish_reason,
      finished_at = now(),
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE equipo_partidas
  SET puntaje = CASE
        WHEN posicion = 1 THEN puntaje + COALESCE(p_puntos_equipo_1, 0)
        WHEN posicion = 2 THEN puntaje + COALESCE(p_puntos_equipo_2, 0)
        ELSE puntaje
      END,
      updated_at = now()
  WHERE partida_id = p_partida_id;

  SELECT bool_and(estado IN ('FINALIZADO', 'NO_JUGADO'))
  INTO v_todos_terminales
  FROM juego_ejecutados
  WHERE partida_id = p_partida_id;

  IF v_todos_terminales THEN
    UPDATE partidas
    SET estado = 'FINALIZADA',
        finish_reason = 'CIRCUITO_COMPLETO',
        finished_at = now(),
        last_activity_at = now(),
        version = version + 1,
        updated_at = now()
    WHERE id = p_partida_id;
  ELSE
    UPDATE partidas
    SET last_activity_at = now(),
        updated_at = now()
    WHERE id = p_partida_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'juego_ejecutado_id', p_juego_ejecutado_id,
    'estado', 'FINALIZADO',
    'todos_terminales', v_todos_terminales
  );
END;
$$;

COMMENT ON FUNCTION finalizar_juego IS
  'Finaliza un juego, suma puntos y posiblemente finaliza la partida. H7.2 ejemplo.';

-- ============================================================
-- 5. crear_partida_ejemplo — crea partida + hijos en 1 tx
-- ============================================================
CREATE OR REPLACE FUNCTION crear_partida_ejemplo(
  p_circuito_id uuid,
  p_public_codigo text,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_circuito record;
  v_partida_id uuid;
  v_ts timestamptz := now();
  v_equipos record;
BEGIN
  IF p_circuito_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_id requerido');
  END IF;

  IF p_public_codigo IS NULL OR p_public_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'public_codigo requerido');
  END IF;

  SELECT * INTO v_circuito
  FROM circuitos
  WHERE id = p_circuito_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_no_encontrado');
  END IF;

  IF v_circuito.estado != 'LISTO' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_no_listo');
  END IF;

  IF EXISTS (SELECT 1 FROM partidas WHERE public_codigo = p_public_codigo) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'public_codigo_duplicado');
  END IF;

  SELECT count(*) INTO v_equipos
  FROM equipo_circuitos
  WHERE circuito_id = p_circuito_id;

  IF v_equipos != 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_debe_tener_2_equipos');
  END IF;

  v_partida_id := gen_random_uuid();

  INSERT INTO partidas (id, circuito_id, circuito_nombre, public_codigo,
                        estado, version, last_activity_at)
  VALUES (v_partida_id, p_circuito_id, v_circuito.nombre, p_public_codigo,
          'CONFIGURANDO', 1, v_ts);

  INSERT INTO equipo_partidas (id, partida_id, equipo_circuito_id, posicion,
                               nombre, color, puntaje, version)
  SELECT gen_random_uuid(), v_partida_id, ec.id, ec.posicion,
         ec.nombre, ec.color, 0, 1
  FROM equipo_circuitos ec
  WHERE ec.circuito_id = p_circuito_id
  ORDER BY ec.posicion;

  INSERT INTO control_partidas (partida_id)
  VALUES (v_partida_id);

  RETURN jsonb_build_object(
    'ok', true,
    'partida_id', v_partida_id,
    'circuito_nombre', v_circuito.nombre,
    'public_codigo', p_public_codigo,
    'estado', 'CONFIGURANDO'
  );
END;
$$;

COMMENT ON FUNCTION crear_partida_ejemplo IS
  'Crea una partida + 2 equipo_partidas + 1 control_partida. Ejemplo H7.2.';
