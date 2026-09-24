-- =============================================================
-- 0018 — RPC crear_set_completo con submodo.
-- Agrega p_submodo (text nullable). Default NULL.
-- Reemplaza la función creada en 0007.
-- =============================================================

CREATE OR REPLACE FUNCTION crear_set_completo(
  p_juego_id uuid,
  p_nombre text,
  p_descripcion text,
  p_items jsonb,
  p_action_id text,
  p_submodo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_set_id uuid;
  v_item jsonb;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, NULL, 'crear_set_completo');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validaciones
  IF p_juego_id IS NULL THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'juego_id_requerido');
  END IF;

  IF p_nombre IS NULL OR p_nombre = '' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'al_menos_un_item_requerido');
  END IF;

  -- Crear set
  v_set_id := gen_random_uuid();

  INSERT INTO sets (id, juego_id, nombre, descripcion, version, activo, submodo)
  VALUES (v_set_id, p_juego_id, p_nombre, p_descripcion, 1, true, p_submodo);

  -- Crear item_sets
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO item_sets (id, set_id, orden, contenido)
    VALUES (
      gen_random_uuid(),
      v_set_id,
      (v_item->>'orden')::integer,
      COALESCE(v_item->'contenido', '{}'::jsonb)
    );
  END LOOP;

  -- Actualizar resultado
  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'set_id', v_set_id,
      'items_count', jsonb_array_length(p_items)
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION crear_set_completo IS
  'Crea set + item_sets atómicamente. Idempotente vía action_id. '
  'Acepta p_submodo (text nullable) para Pictionary.';
