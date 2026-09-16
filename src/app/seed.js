/* =============================================================
   seed — seed idempotente de la tabla `juegos`.

   Crea un Juego por cada definición registrada en el registry.
   Si un juego con ese código ya existe, lo omite.
   ============================================================= */

/**
 * Seed idempotente de la tabla `juegos`.
 * Crea un Juego por cada definición registrada en el registry.
 * Si un juego con ese código ya existe, lo omite.
 *
 * @param {object} services - { juego, ... } (los services ya instanciados).
 * @param {import('../services/GameDefinitionRegistry.js').GameDefinitionRegistry} registry
 * @returns {Promise<object[]>} Lista de Juegos existentes o creados.
 */
export async function seedJuegos(services, registry) {
  const codigos = registry.listarCodigos();
  const juegos = [];

  for (const codigo of codigos) {
    let juego = await services.juego.obtenerJuegoPorCodigo(codigo);
    if (!juego) {
      const def = registry.obtener(codigo);
      juego = await services.juego.crearJuego({
        codigo,
        nombre: def.nombre,
        requiere_set: def.requiere_set
      });
    }
    juegos.push(juego);
  }

  return juegos;
}
