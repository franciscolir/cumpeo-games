/* =============================================================
   0004 — Funciones plpgsql definitivas: Dominio.
   Snapshots, Extras, Participantes.
   ============================================================= */

-- ============================================================
-- 1. crear_snapshot — crea SetSnapshot inmutable desde un Set
-- ============================================================
CREATE OR REPLACE FUNCTION crear_snapshot(
  p_set_id uuid,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_set record;
  v_snapshot_id uuid;
  v_contenido jsonb;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, NULL, 'crear_snapshot');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  IF p_set_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'set_id_requerido');
  END IF;

  -- Verificar que el Set exista
  SELECT * INTO v_set FROM sets WHERE id = p_set_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'set_no_encontrado');
  END IF;

  -- Copiar contenido de item_sets
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('orden', is2.orden, 'contenido', is2.contenido)
    ORDER BY is2.orden
  ), '[]'::jsonb)
  INTO v_contenido
  FROM item_sets is2
  WHERE is2.set_id = p_set_id;

  -- Crear snapshot
  v_snapshot_id := gen_random_uuid();

  INSERT INTO set_snapshots (
    id, source_set_id, source_set_name, source_version,
    juego_id, contenido
  )
  VALUES (
    v_snapshot_id, v_set.id, v_set.nombre, v_set.version,
    v_set.juego_id, v_contenido
  );

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'snapshot_id', v_snapshot_id,
      'source_set_name', v_set.nombre,
      'source_version', v_set.version,
      'juego_id', v_set.juego_id,
      'items_count', jsonb_array_length(v_contenido)
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION crear_snapshot IS
  'Crea un SetSnapshot inmutable a partir de un Set. Copia contenido e items. Idempotente.';

-- ============================================================
-- 2. registrar_uso_extra — crea un ExtraUso
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_uso_extra(
  p_partida_id uuid,
  p_extra_id uuid,
  p_juego_ejecutado_id uuid,
  p_equipo_partida_id uuid,
  p_participante_partida_id uuid,
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
  v_extra record;
  v_uso_id uuid;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'registrar_uso_extra');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
  SELECT * INTO v_control FROM control_partidas WHERE partida_id = p_partida_id;
  IF NOT FOUND OR v_control.session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;
  IF v_control.session_id != p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;
  IF v_control.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  -- Validar partida
  SELECT * INTO v_partida FROM partidas WHERE id = p_partida_id;
  IF NOT FOUND OR v_partida.estado != 'EN_CURSO' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partida_no_en_curso');
  END IF;

  -- Validar extra
  SELECT * INTO v_extra FROM extras WHERE id = p_extra_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_no_encontrado');
  END IF;

  -- Crear extra_uso
  v_uso_id := gen_random_uuid();

  INSERT INTO extra_usos (
    id, partida_id, extra_id, juego_ejecutado_id,
    equipo_partida_id, participante_partida_id
  )
  VALUES (
    v_uso_id, p_partida_id, p_extra_id, p_juego_ejecutado_id,
    p_equipo_partida_id, p_participante_partida_id
  );

  -- Actualizar last_activity_at
  UPDATE partidas
  SET last_activity_at = now(),
      updated_at = now()
  WHERE id = p_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'extra_uso_id', v_uso_id,
      'extra_codigo', v_extra.codigo,
      'extra_nombre', v_extra.nombre
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION registrar_uso_extra IS
  'Registra el uso de un Extra en una partida. Actualiza last_activity_at. Idempotente.';

-- ============================================================
-- 3. agregar_participante — crea ParticipantePartida
-- ============================================================
CREATE OR REPLACE FUNCTION agregar_participante(
  p_partida_id uuid,
  p_equipo_partida_id uuid,
  p_nombre text,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_control record;
  v_ep record;
  v_pp_id uuid;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, p_partida_id, 'agregar_participante');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar control
  SELECT * INTO v_control FROM control_partidas WHERE partida_id = p_partida_id;
  IF NOT FOUND OR v_control.session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;
  IF v_control.session_id != p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;
  IF v_control.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  -- Validar nombre
  IF p_nombre IS NULL OR p_nombre = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  END IF;

  -- Validar que el equipo pertenezca a la partida
  SELECT * INTO v_ep
  FROM equipo_partidas
  WHERE id = p_equipo_partida_id AND partida_id = p_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'equipo_no_pertenece_a_partida');
  END IF;

  -- Verificar duplicado
  IF EXISTS (
    SELECT 1 FROM participante_partidas
    WHERE partida_id = p_partida_id AND nombre = p_nombre
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'participante_duplicado');
  END IF;

  -- Crear participante
  v_pp_id := gen_random_uuid();

  INSERT INTO participante_partidas (
    id, partida_id, equipo_partida_id, nombre, ha_participado
  )
  VALUES (
    v_pp_id, p_partida_id, p_equipo_partida_id, p_nombre, false
  );

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'participante_partida_id', v_pp_id,
      'nombre', p_nombre,
      'equipo_partida_id', p_equipo_partida_id
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION agregar_participante IS
  'Agrega un participante a un equipo de la partida. Verifica unicidad. Idempotente.';

-- ============================================================
-- 4. marcar_participacion — cambia ha_participado a true
-- ============================================================
CREATE OR REPLACE FUNCTION marcar_participacion(
  p_participante_partida_id uuid,
  p_session_id text,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_pp record;
  v_control record;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, NULL, 'marcar_participacion');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validar participante
  SELECT * INTO v_pp
  FROM participante_partidas
  WHERE id = p_participante_partida_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'participante_no_encontrado');
  END IF;

  -- Validar control de la partida
  SELECT * INTO v_control FROM control_partidas WHERE partida_id = v_pp.partida_id;
  IF NOT FOUND OR v_control.session_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_control');
  END IF;
  IF v_control.session_id != p_session_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_perteneciente_otra_sesion');
  END IF;
  IF v_control.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'control_expirado');
  END IF;

  -- Si ya participó, idempotente
  IF v_pp.ha_participado THEN
    DECLARE
      v_resultado jsonb := jsonb_build_object(
        'ok', true,
        'participante_partida_id', p_participante_partida_id,
        'ha_participado', true,
        'ya_marcado', true
      );
    BEGIN
      PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
      RETURN v_resultado;
    END;
  END IF;

  -- Marcar participación (una vez true, no se puede revertir)
  UPDATE participante_partidas
  SET ha_participado = true
  WHERE id = p_participante_partida_id;

  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'participante_partida_id', p_participante_partida_id,
      'ha_participado', true,
      'ya_marcado', false
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION marcar_participacion IS
  'Marca ha_participado = true. Una vez marcado, no se revierte. Idempotente.';
