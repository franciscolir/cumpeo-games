/* =============================================================
   0005 — Función de limpieza para tests de integración.
   Borra registros de accion_procesadas creados durante tests.
   ============================================================= */

-- ============================================================
-- limpiar_acciones_test — borra accion_procesadas de tests
-- ============================================================
CREATE OR REPLACE FUNCTION limpiar_acciones_test()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM accion_procesadas
  WHERE action_id LIKE 'TEST_%'
     OR action_id LIKE 'TC%'
     OR action_id LIKE 'CP%'
     OR action_id LIKE 'BP%'
     OR action_id LIKE 'DP%'
     OR action_id LIKE 'IJ%'
     OR action_id LIKE 'PJ%'
     OR action_id LIKE 'RJ%'
     OR action_id LIKE 'FJ%'
     OR action_id LIKE 'FC%'
     OR action_id LIKE 'AP%'
     OR action_id LIKE 'MP%'
     OR action_id LIKE 'TST_%'
     OR tipo_accion LIKE 'TEST%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'borradas', v_count);
END;
$$;

COMMENT ON FUNCTION limpiar_acciones_test IS
  'Limpia accion_procesadas de tests. Solo para integración.';
