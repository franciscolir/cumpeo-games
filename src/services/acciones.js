/* =============================================================
   Constantes de tipos de acción.

   Se usan como valor de `tipo_accion` en `AccionProcesada`.
   Son strings libres a nivel de schema, pero a nivel de código
   deben salir siempre de aquí. Evita typos y facilita refactor.

   INV-148: AccionProcesada.tipo_accion es un string libre con
            valores controlados por código.
   ============================================================= */

export const TIPO_ACCION = Object.freeze({
  CREAR_PARTIDA: 'CREAR_PARTIDA',
  COMENZAR_PARTIDA: 'COMENZAR_PARTIDA',
  INICIAR_JUEGO: 'INICIAR_JUEGO',
  ACTUALIZAR_ESTADO_JUEGO: 'ACTUALIZAR_ESTADO_JUEGO',
  PAUSAR_JUEGO: 'PAUSAR_JUEGO',
  REANUDAR_JUEGO: 'REANUDAR_JUEGO',
  FINALIZAR_JUEGO: 'FINALIZAR_JUEGO',
  DESCARTAR_PARTIDA: 'DESCARTAR_PARTIDA',
  FINALIZAR_CIRCUITO: 'FINALIZAR_CIRCUITO'
});
