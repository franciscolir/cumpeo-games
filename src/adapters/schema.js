/* =============================================================
   Esquema de IndexedDB  CUMPEO
   1 base, 17 object stores, 49 índices secundarios, 8 únicos.
   Nota: IndexedDB no admite boolean como clave de índice.
   Los campos "activo" se filtran en memoria desde los repositorios.
   ============================================================= */

export const DB_NAME = 'cumpeo';
export const DB_VERSION = 2;

export const STORES = [
  {
    nombre: 'juegos',
    keyPath: 'id',
    indexes: [
      { name: 'juego_codigo', keyPath: 'codigo', unique: true }
    ]
  },
  {
    nombre: 'sets',
    keyPath: 'id',
    indexes: [
      { name: 'set_juego_id', keyPath: 'juego_id', unique: false },
      { name: 'set_juego_id_orden', keyPath: ['juego_id', 'orden_catalogo'], unique: false }
    ]
  },
  {
    nombre: 'item_sets',
    keyPath: 'id',
    indexes: [
      { name: 'item_set_set_id', keyPath: 'set_id', unique: false },
      { name: 'item_set_set_id_orden', keyPath: ['set_id', 'orden'], unique: true }
    ]
  },
  {
    nombre: 'extras',
    keyPath: 'id',
    indexes: [
      { name: 'extra_codigo', keyPath: 'codigo', unique: true }
    ]
  },
  {
    nombre: 'equipos_guardados',
    keyPath: 'id',
    indexes: []
  },
  {
    nombre: 'circuitos',
    keyPath: 'id',
    indexes: [
      { name: 'circuito_estado', keyPath: 'estado', unique: false },
      { name: 'circuito_estado_es_plantilla', keyPath: ['estado', 'es_plantilla'], unique: false }
    ]
  },
  {
    nombre: 'circuito_juegos',
    keyPath: 'id',
    indexes: [
      { name: 'circuito_juego_circuito_id', keyPath: 'circuito_id', unique: false },
      { name: 'circuito_juego_juego_id', keyPath: 'juego_id', unique: false },
      { name: 'circuito_juego_snapshot_id', keyPath: 'snapshot_id', unique: false },
      { name: 'circuito_juego_circuito_id_orden', keyPath: ['circuito_id', 'orden'], unique: true }
    ]
  },
  {
    nombre: 'equipo_circuitos',
    keyPath: 'id',
    indexes: [
      { name: 'equipo_circuito_circuito_id', keyPath: 'circuito_id', unique: false },
      { name: 'equipo_circuito_equipo_guardado_id', keyPath: 'equipo_guardado_id', unique: false },
      { name: 'equipo_circuito_circuito_id_posicion', keyPath: ['circuito_id', 'posicion'], unique: true }
    ]
  },
  {
    nombre: 'set_snapshots',
    keyPath: 'id',
    indexes: [
      { name: 'set_snapshot_source_set_id', keyPath: 'source_set_id', unique: false },
      { name: 'set_snapshot_juego_id', keyPath: 'juego_id', unique: false },
      { name: 'set_snapshot_source_set_id_source_version', keyPath: ['source_set_id', 'source_version'], unique: false }
    ]
  },
  {
    nombre: 'partidas',
    keyPath: 'id',
    indexes: [
      { name: 'partida_estado', keyPath: 'estado', unique: false },
      { name: 'partida_circuito_id', keyPath: 'circuito_id', unique: false },
      { name: 'partida_last_activity_at', keyPath: 'last_activity_at', unique: false },
      { name: 'partida_estado_last_activity_at', keyPath: ['estado', 'last_activity_at'], unique: false },
      { name: 'partida_public_codigo', keyPath: 'public_codigo', unique: true }
    ]
  },
  {
    nombre: 'juego_ejecutados',
    keyPath: 'id',
    indexes: [
      { name: 'juego_ejecutado_partida_id', keyPath: 'partida_id', unique: false },
      { name: 'juego_ejecutado_estado', keyPath: 'estado', unique: false },
      { name: 'juego_ejecutado_partida_id_estado', keyPath: ['partida_id', 'estado'], unique: false },
      { name: 'juego_ejecutado_circuito_juego_id', keyPath: 'circuito_juego_id', unique: false },
      { name: 'juego_ejecutado_juego_id', keyPath: 'juego_id', unique: false },
      { name: 'juego_ejecutado_snapshot_id', keyPath: 'snapshot_id', unique: false },
      { name: 'juego_ejecutado_partida_id_orden', keyPath: ['partida_id', 'orden'], unique: true }
    ]
  },
  {
    nombre: 'equipo_partidas',
    keyPath: 'id',
    indexes: [
      { name: 'equipo_partida_partida_id', keyPath: 'partida_id', unique: false },
      { name: 'equipo_partida_equipo_circuito_id', keyPath: 'equipo_circuito_id', unique: false },
      { name: 'equipo_partida_partida_id_posicion', keyPath: ['partida_id', 'posicion'], unique: true }
    ]
  },
  {
    nombre: 'participante_partidas',
    keyPath: 'id',
    indexes: [
      { name: 'participante_partida_partida_id', keyPath: 'partida_id', unique: false },
      { name: 'participante_partida_equipo_partida_id', keyPath: 'equipo_partida_id', unique: false },
      { name: 'participante_partida_partida_id_nombre', keyPath: ['partida_id', 'nombre'], unique: false }
    ]
  },
  {
    nombre: 'extra_usos',
    keyPath: 'id',
    indexes: [
      { name: 'extra_uso_partida_id', keyPath: 'partida_id', unique: false },
      { name: 'extra_uso_extra_id', keyPath: 'extra_id', unique: false },
      { name: 'extra_uso_juego_ejecutado_id', keyPath: 'juego_ejecutado_id', unique: false }
    ]
  },
  {
    nombre: 'control_partidas',
    keyPath: 'partida_id',
    indexes: [
      { name: 'control_partida_session_id', keyPath: 'session_id', unique: false },
      { name: 'control_partida_expires_at', keyPath: 'expires_at', unique: false }
    ]
  },
  {
    nombre: 'accion_procesadas',
    keyPath: 'action_id',
    indexes: [
      { name: 'accion_procesada_partida_id', keyPath: 'partida_id', unique: false },
      { name: 'accion_procesada_created_at', keyPath: 'created_at', unique: false },
      { name: 'accion_procesada_tipo_accion', keyPath: 'tipo_accion', unique: false }
    ]
  },
  {
    nombre: 'evento_tecnicos',
    keyPath: 'id',
    indexes: [
      { name: 'evento_tecnico_event_type', keyPath: 'event_type', unique: false },
      { name: 'evento_tecnico_level', keyPath: 'level', unique: false },
      { name: 'evento_tecnico_created_at', keyPath: 'created_at', unique: false },
      { name: 'evento_tecnico_partida_id_created_at', keyPath: ['partida_id', 'created_at'], unique: false },
      { name: 'evento_tecnico_juego_ejecutado_id', keyPath: 'juego_ejecutado_id', unique: false }
    ]
  }
];

export function nombresDeStores() {
  return STORES.map((s) => s.nombre);
}
