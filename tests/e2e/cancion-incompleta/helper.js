import { CancionIncompletaGameDefinition } from '../../../src/games/cancion-incompleta/CancionIncompletaGameDefinition.js';

export async function crearPartidaCancionIncompleta(app) {
  const { crearPartidaConTematica } = await import('../../utils/partidaFactory.js');
  const partida = await crearPartidaConTematica(app, {
    equipos: ['Rojo', 'Azul'],
    codigoJuego: 'CANCION_INCOMPLETA',
    configuracion: { segundos_por_cancion: 10, puntos_por_acierto: 1, penalizacion_por_error: 1 }
  });
  return partida;
}

export function obtenerEstadoCancionIncompleta(partida) {
  return partida.juegos.find(j => j.juego_codigo === 'CANCION_INCOMPLETA')?.estado_juego;
}

export { CancionIncompletaGameDefinition };
