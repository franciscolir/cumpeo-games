# Supabase Adapter

## Setup

1. Crear un proyecto en https://supabase.com.
2. Copiar `.env.example` a `.env`.
3. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con las credenciales del proyecto.
4. Ir al SQL Editor de Supabase.
5. Copiar el contenido de `schema.sql` y ejecutarlo.
6. Verificar que las 17 tablas se crearon: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

## Uso

### Modo LocalAdapter (default)

```
VITE_SUPABASE_ADAPTER=false
```

La app usa IndexedDB. Útil para desarrollo sin conexión.

### Modo SupabaseAdapter

```
VITE_SUPABASE_ADAPTER=true
```

La app usa Supabase Cloud.

**Nota:** el `SupabaseAdapter` todavía no está implementado. Al activarlo, la app muestra "no implementado".
