/* =============================================================
   0006 — Funciones plpgsql: Circuito.
   Creación completa de circuitos con hijos atómicos.
   ============================================================= */

-- ============================================================
-- crear_circuito_completo — crea circuito + circuito_juegos + equipo_circuitos
-- ============================================================
CREATE OR REPLACE FUNCTION crear_circuito_completo(
  p_nombre text,
  p_descripcion text,
  p_juegos jsonb,
  p_equipos jsonb,
  p_action_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reserva jsonb;
  v_circuito_id uuid;
  v_juego jsonb;
  v_equipo jsonb;
BEGIN
  -- Idempotencia
  v_reserva := reservar_accion(p_action_id, NULL, 'crear_circuito_completo');
  IF (v_reserva->'resultado' IS NOT NULL) THEN
    RETURN v_reserva->'resultado';
  END IF;

  -- Validaciones
  IF p_nombre IS NULL OR p_nombre = '' THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  END IF;

  IF p_juegos IS NULL OR jsonb_array_length(p_juegos) = 0 THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'al_menos_un_juego_requerido');
  END IF;

  IF p_equipos IS NULL OR jsonb_array_length(p_equipos) != 2 THEN
    DELETE FROM accion_procesadas WHERE action_id = p_action_id;
    RETURN jsonb_build_object('ok', false, 'error', 'exactamente_2_equipos_requeridos');
  END IF;

  -- Crear circuito
  v_circuito_id := gen_random_uuid();

  INSERT INTO circuitos (id, nombre, descripcion, estado, version)
  VALUES (v_circuito_id, p_nombre, p_descripcion, 'BORRADOR', 1);

  -- Crear circuito_juegos
  FOR v_juego IN SELECT * FROM jsonb_array_elements(p_juegos)
  LOOP
    INSERT INTO circuito_juegos (
      id, circuito_id, juego_id, orden, configuracion, snapshot_id
    ) VALUES (
      gen_random_uuid(),
      v_circuito_id,
      (v_juego->>'juego_id')::uuid,
      (v_juego->>'orden')::integer,
      COALESCE(v_juego->'configuracion', '{}'::jsonb),
      NULLIF(v_juego->>'snapshot_id', '')::uuid
    );
  END LOOP;

  -- Crear equipo_circuitos
  FOR v_equipo IN SELECT * FROM jsonb_array_elements(p_equipos)
  LOOP
    INSERT INTO equipo_circuitos (
      id, circuito_id, posicion, nombre, color, equipo_guardado_id
    ) VALUES (
      gen_random_uuid(),
      v_circuito_id,
      (v_equipo->>'posicion')::integer,
      v_equipo->>'nombre',
      v_equipo->>'color',
      NULLIF(v_equipo->>'equipo_guardado_id', '')::uuid
    );
  END LOOP;

  -- Actualizar resultado
  DECLARE
    v_resultado jsonb := jsonb_build_object(
      'ok', true,
      'circuito_id', v_circuito_id,
      'estado', 'BORRADOR'
    );
  BEGIN
    PERFORM actualizar_resultado_accion(p_action_id, v_resultado);
    RETURN v_resultado;
  END;
END;
$$;

COMMENT ON FUNCTION crear_circuito_completo IS
  'Crea circuito + circuito_juegos + equipo_circuitos atómicamente. Idempotente.';
