# Supabase Migrations

## Instrucciones

1. Abrir el SQL Editor de tu proyecto en https://supabase.com.
2. Copiar el contenido del archivo `.sql` que quieras aplicar.
3. Pegar en el SQL Editor y ejecutar.
4. Verificar con:
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   ORDER BY routine_name;
   ```

## Archivos

| Archivo | Contenido | Estado |
|---------|-----------|--------|
| `0001_ejemplo_funciones.sql` | 5 funciones plpgsql de ejemplo (reservar_accion, tomar_control, iniciar_juego, finalizar_juego, crear_partida_ejemplo) | Ejemplo — reemplazado por 0002-0004 |
| `0002_funciones_control.sql` | 3 funciones: reservar_accion (definitiva), tomar_control (definitiva), actualizar_resultado_accion (auxiliar) | Definitivo |
| `0003_funciones_partida.sql` | 9 funciones: crear_partida, comenzar_partida, descartar_partida, iniciar_juego, pausar_juego, reanudar_juego, finalizar_juego, finalizar_circuito, expirar_partidas_inactivas | Definitivo |
| `0004_funciones_dominio.sql` | 4 funciones: crear_snapshot, registrar_uso_extra, agregar_participante, marcar_participacion | Definitivo |
| `0005_limpieza_test.sql` | 1 función: limpiar_acciones_test (limpia accion_procesadas de tests) | Utilidad |
| `0006_funciones_circuito.sql` | 1 función: crear_circuito_completo (crea circuito + hijos atómicamente) | Definitivo |
| `0007_funciones_set.sql` | 1 función: crear_set_completo (crea set + item_sets atómicamente) | Definitivo |
| `0008_rls_permisivo.sql` | Habilita RLS en 17 tablas + 34 políticas permisivas (anon + authenticated) | Definitivo |
| `0009_rls_estricto.sql` | Revoca 34 políticas permisivas, crea políticas específicas por tipo de tabla | Definitivo |

## Notas

- Las funciones de 0001 son **ejemplos** reemplazados por las definitivas en 0002-0004.
- Las funciones definitivas (15 en total) implementan idempotencia vía `reservar_accion`.
- Cada función devuelve `jsonb` con estructura `{ ok: true/false, ... }`.
- Todas las funciones críticas verifican lease de control (excepto `expirar_partidas_inactivas` y `crear_snapshot`).
- Los archivos se aplican en orden: 0002 → 0003 → 0004 → 0005 → 0006.
- `0005_limpieza_test.sql` es opcional pero recomendado para tests de integración.
- **IMPORTANTE**: antes de aplicar 0002-0004, eliminar las funciones de ejemplo de 0001 (o aplicar en orden, ya que CREATE OR REPLACE sobreescribe).
