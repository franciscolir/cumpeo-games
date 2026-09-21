/* Helper de e2e para Canción Incompleta */
import { waitForCumpeo } from '../../_helpers/auth.js';

export async function crearPartidaCancionIncompleta(page) {
  await page.goto('/');
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const ci = juegos.find(j => j.codigo === 'CANCION_INCOMPLETA');
    if (!ci) throw new Error('Juego CANCION_INCOMPLETA no encontrado');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Cancion Incompleta E2E ${uid}`,
      juegos: [{
        juego_id: ci.id,
        configuracion: {
          rondas: 1,
          segundos_por_cancion: 10,
          puntos_por_acierto: 10,
          penalizacion_puntos: 5
        }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Cancion Incompleta E2E ${uid}`,
        juegos: [{
          juego_id: ci.id,
          configuracion: {
            rondas: 1,
            segundos_por_cancion: 10,
            puntos_por_acierto: 10,
            penalizacion_puntos: 5
          }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `CI${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return partida.public_codigo;
  });
}

export async function irACOnductor(page, codigo) {
  await page.goto(`/#/partida/${codigo}`);
  await page.waitForLoadState('networkidle');
}

export async function irAPublica(page, codigo) {
  await page.goto(`/#/publica-nueva/${codigo}`);
  await page.waitForLoadState('networkidle');
}
