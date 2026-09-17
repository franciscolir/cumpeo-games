/* =============================================================
   0003 — Funciones plpgsql definitivas: Partida y Juego.
   Ciclo de vida completo de partidas y juegos ejecutados.
   ============================================================= */

-- ============================================================
-- 1. crear_partida — crea partida + 2 equipo_partidas + 1 control
-- ============================================================
CREATE OR REPLACE FUNCTION crear_partida(
  p_circuito_id uuid,
  p_public_codigo text,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_circuito record;
  v_partida_id uuid;
  v_ts timestamptz := now();
  v_count integer;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, NULL, 'crear_partida');
  IF (v_reserva->>'yaProcesada')::boolean THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validaciones
  IF p_circuito_id IS NULL THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_id_requerido');
  END IF;

  IF p_public_codigo IS NULL OR p_public_codigo = '' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'public_codigo_requerido');
  END IF;

  SELECT * INTO v_circuito
  FROM circuitos
  WHERE id = p_circuito_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_no_encontrado');
  END IF;

  IF v_circuito.estado != 'LISTO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_no_listo');
  END IF;

  IF EXISTS (SELECT 1 FROM partidas WHERE public_codigo = p_public_codigo) THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'public_codigo_duplicado');
  END IF;

  SELECT count(*) INTO v_count
  FROM equipo_circuitos
  WHERE circuito_id = p_circuito_id;

  IF v_count != 2 THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'circuito_debe_tener_2_equipos');
  END IF;

  -- Crear partida + hijos
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

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'partida_id', v_partida_id,
      'circuito_nombre', v_circuito.nombre,
      'public_codigo', p_public_codigo,
      'estado', 'CONFIGURANDO'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION crear_partida IS
  'Crea una partida + 2 equipo_partidas + 1 control_partida. Idempotente vía action_id.';

-- ============================================================
-- 2. comenzar_partida — CONFIGURANDO -> EN_CURSO
-- ============================================================
CREATE OR REPLACE FUNCTION comenzar_partida(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_partida record;
  v_juego_id uuid;
  v_orden integer;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'comenzar_partida');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar partida
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_encontrada');
  END IF;
  IF v_partida.estado != 'CONFIGURANDO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_configurando');
  END IF;

  -- Cambiar estado y crear juego_ejecutados pendientes
  UPDATE partidas
  SET estado = 'EN_CURSO',
      started_at = now(),
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  WHERE id = p_partida_id;

  FOR v_orden, v_juego_id IN
    SELECT cj.orden, cj.juego_id
    FROM circuito_juegos cj
    WHERE cj.circuito_id = v_partida.circuito_id
    ORDER BY cj.orden
  LOOP
    INSERT INTO juego_ejecutados (
      id, partida_id, circuito_juego_id, juego_id, orden,
      configuracion_congelada, estado, state_version, estado_juego
    )
    SELECT
      gen_random_uuid(), p_partida_id, cj.id, cj.juego_id, cj.orden,
      cj.configuracion, 'PENDIENTE', 1, '{}'::jsonb
    FROM circuito_juegos cj
    WHERE cj.circuito_id = v_partida.circuito_id AND cj.orden = v_orden;
  END LOOP;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'partida_id', p_partida_id,
      'estado', 'EN_CURSO',
      'started_at', now()
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION comenzar_partida IS
  'Cambia partida de CONFIGURANDO a EN_CURSO y crea juegos pendientes. Idempotente.';

-- ============================================================
-- 3. descartar_partida — -> DESCARTADA
-- ============================================================
CREATE OR REPLACE FUNCTION descartar_partida(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_partida record;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'descartar_partida');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar partida
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_encontrada');
  END IF;
  IF v_partida.estado NOT IN ('CONFIGURANDO', 'EN_CURSO') THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_descartable');
  END IF;

  -- Marcar juegos no terminales como NO_JUGADO
  UPDATE juego_ejecutados
  SET estado = 'NO_JUGADO',
      finish_reason = 'PARTIDA_DESCARTADA',
      finished_at = now(),
      updated_at = now()
  WHERE partida_id = p_partida_id
    AND estado NOT IN ('FINALIZADO', 'NO_JUGADO');

  -- Cambiar partida a DESCARTADA
  UPDATE partidas
  SET estado = 'DESCARTADA',
      finish_reason = 'DESCARTADA_POR_CONDUCTOR',
      finished_at = now(),
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'partida_id', p_partida_id,
      'estado', 'DESCARTADA'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION descartar_partida IS
  'Descarta una partida. Marca juegos no terminales como NO_JUGADO. Idempotente.';

-- ============================================================
-- 4. iniciar_juego — PENDIENTE -> EN_CURSO (definitiva)
-- ============================================================
CREATE OR REPLACE FUNCTION iniciar_juego(
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
  v_partida record;
  v_je record;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'iniciar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar partida
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND OR v_partida.estado != 'EN_CURSO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_en_curso');
  END IF;

  -- Validar juego ejecutado
  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado != 'PENDIENTE' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
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

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'juego_ejecutado_id', p_juego_ejecutado_id,
      'estado', 'EN_CURSO'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION iniciar_juego IS
  'Cambia un JuegoEjecutado de PENDIENTE a EN_CURSO. Verifica control activo. Idempotente.';

-- ============================================================
-- 5. pausar_juego — EN_CURSO -> PAUSADO
-- ============================================================
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
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'pausar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar juego ejecutado
  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado != 'EN_CURSO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_no_en_curso');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'PAUSADO',
      paused_at = now(),
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE partidas
  SET last_activity_at = now(),
      updated_at = now()
  WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'juego_ejecutado_id', p_juego_ejecutado_id,
      'estado', 'PAUSADO'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION pausar_juego IS
  'Cambia un JuegoEjecutado de EN_CURSO a PAUSADO. Idempotente.';

-- ============================================================
-- 6. reanudar_juego — PAUSADO -> EN_CURSO
-- ============================================================
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
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'reanudar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar juego ejecutado
  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado != 'PAUSADO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_no_pausado');
  END IF;

  UPDATE juego_ejecutados
  SET estado = 'EN_CURSO',
      paused_at = NULL,
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  UPDATE partidas
  SET last_activity_at = now(),
      updated_at = now()
  WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'juego_ejecutado_id', p_juego_ejecutado_id,
      'estado', 'EN_CURSO'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION reanudar_juego IS
  'Cambia un JuegoEjecutado de PAUSADO a EN_CURSO. Idempotente.';

-- ============================================================
-- 7. finalizar_juego — -> FINALIZADO + puntos + posible cierre
-- ============================================================
CREATE OR REPLACE FUNCTION finalizar_juego(
  p_partida_id uuid,
  p_juego_ejecutado_id uuid,
  p_resultado jsonb,
  p_puntos_equipo_1 integer,
  p_puntos_equipo_2 integer,
  p_finish_reason text,
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
  v_todos_terminales boolean;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'finalizar_juego');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar juego ejecutado
  SELECT * INTO v_je
  FROM juego_ejecutados
  WHERE id = p_juego_ejecutado_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_ejecutado_no_encontrado');
  END IF;
  IF v_je.estado NOT IN ('EN_CURSO', 'PAUSADO') THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_no_activo');
  END IF;

  -- Finalizar juego
  UPDATE juego_ejecutados
  SET estado = 'FINALIZADO',
      resultado = COALESCE(p_resultado, v_je.resultado),
      finish_reason = COALESCE(p_finish_reason, 'NORMAL'),
      finished_at = now(),
      updated_at = now()
  WHERE id = p_juego_ejecutado_id;

  -- Sumar puntos
  UPDATE equipo_partidas
  SET puntaje = CASE
        WHEN posicion = 1 THEN puntaje + COALESCE(p_puntos_equipo_1, 0)
        WHEN posicion = 2 THEN puntaje + COALESCE(p_puntos_equipo_2, 0)
        ELSE puntaje
      END,
      version = version + 1,
      updated_at = now()
  WHERE partida_id = p_partida_id;

  -- Verificar si todos los juegos son terminales
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

  DECLARE
    v_resultado_final jsonb := jsonb_build_object(
      'ok', true,
      'juego_ejecutado_id', p_juego_ejecutado_id,
      'estado', 'FINALIZADO',
      'todos_terminales', v_todos_terminales
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado_final);
    RETURN v_resultado_final;
  END;
END;
$$;

COMMENT ON FUNCTION finalizar_juego IS
  'Finaliza un juego, suma puntos y posiblemente finaliza la partida. Idempotente.';

-- ============================================================
-- 8. finalizar_circuito — finaliza forzadamente la partida
-- ============================================================
CREATE OR REPLACE FUNCTION finalizar_circuito(
  p_partida_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_partida record;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'finalizar_circuito');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
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

  -- Validar partida
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_encontrada');
  END IF;
  IF v_partida.estado != 'EN_CURSO' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_en_curso');
  END IF;

  -- Marcar juegos no terminales como NO_JUGADO
  UPDATE juego_ejecutados
  SET estado = 'NO_JUGADO',
      finish_reason = 'PARTIDA_FINALIZADA',
      finished_at = now(),
      updated_at = now()
  WHERE partida_id = p_partida_id
    AND estado NOT IN ('FINALIZADO', 'NO_JUGADO');

  -- Finalizar partida
  UPDATE partidas
  SET estado = 'FINALIZADA',
      finish_reason = 'CIRCUITO_COMPLETO',
      finished_at = now(),
      last_activity_at = now(),
      version = version + 1,
      updated_at = now()
  WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'partida_id', p_partida_id,
      'estado', 'FINALIZADA',
      'finish_reason', 'CIRCUITO_COMPLETO'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION finalizar_circuito IS
  'Finaliza una partida forzadamente. Marca juegos no terminales. Idempotente.';

-- ============================================================
-- 9. expirar_partidas_inactivas — job del sistema
-- ============================================================
CREATE OR REPLACE FUNCTION expirar_partidas_inactivas(
  p_horas integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
  v_partida record;
BEGIN
  FOR v_partida IN
    SELECT id FROM partidas
    WHERE estado IN ('CONFIGURANDO', 'EN_CURSO')
      AND last_activity_at < now() - (p_horas || ' hours')::interval
  LOOP
    -- Marcar juegos no terminales
    UPDATE juego_ejecutados
    SET estado = 'NO_JUGADO',
        finish_reason = 'PARTIDA_EXPIRADA',
        finished_at = now(),
        updated_at = now()
    WHERE partida_id = v_partida.id
      AND estado NOT IN ('FINALIZADO', 'NO_JUGADO');

    -- Marcar partida como EXPIRADA
    UPDATE partidas
    SET estado = 'EXPIRADA',
        finish_reason = 'EXPIRACION',
        finished_at = now(),
        last_activity_at = now(),
        version = version + 1,
        updated_at = now()
    WHERE id = v_partida.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'expiradas', v_count);
END;
$$;

COMMENT ON FUNCTION expirar_partidas_inactivas IS
  'Expira partidas inactivas. Job del sistema, sin verificación de lease.';
