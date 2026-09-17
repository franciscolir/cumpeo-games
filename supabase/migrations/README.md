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
| `0001_ejemplo_funciones.sql` | 5 funciones plpgsql de ejemplo (reservar_accion, tomar_control, iniciar_juego, finalizar_juego, crear_partida_ejemplo) | Ejemplo — no definitivo |

## Notas

- Estas funciones son **ejemplos** para validar el patrón del adapter con `rpc()`.
- Las funciones definitivas (~50) se escriben en **H7.3**.
- Cada función devuelve `jsonb` con estructura `{ ok: true/false, ... }`.
- La función `reservar_accion` implementa idempotencia: si el `action_id` ya existe, devuelve `yaProcesada: true`.
