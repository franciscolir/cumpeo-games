/* Helper de e2e para Canción Incompleta */
export async function crearPartidaCancionIncompleta(page, appHelper) {
  const codigo = await appHelper.crearPartidaConJuego({
    juegoCodigo: 'CANCION_INCOMPLETA',
    equipos: ['Rojo', 'Azul'],
    configuracion: { rondas: 1, segundos_por_cancion: 10, puntos_por_acierto: 10, penalizacion_puntos: 5 }
  });
  return codigo;
}

export async function irACOnductor(page, codigo) {
  await page.goto(`/#/partida/${codigo}`);
  await page.waitForSelector('text=Canción Incompleta', { timeout: 10000 });
}

export async function irAPublica(page, codigo) {
  await page.goto(`/#/publica-nueva/${codigo}`);
  await page.waitForSelector('text=Canción Incompleta', { timeout: 10000 });
}
