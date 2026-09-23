/* =============================================================
   Seed idempotente — sets predeterminados de Memoricé (7.2e).

   Crea 2 sets con es_predeterminado: true si no existen:
   - 'Memoricé — Emojis'  (12 emojis de animales)
   - 'Memoricé — Íconos'  (12 íconos/símbolos)

   Items: { imagen_url: 'emoji:X' } (sin contenido).
   ============================================================= */

const EMOJIS_ANIMALES = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'];

const ICONOS_SIMBOLOS = ['⭐', '❤️', '🔥', '⚡', '🌙', '☀️', '🌈', '⚽', '🎵', '🎨', '🎯', '🎁'];

const SETS_PREDETERMINADOS = [
  {
    nombre: 'Memoricé — Emojis',
    descripcion: 'Parejas de emojis de animales',
    emojis: EMOJIS_ANIMALES
  },
  {
    nombre: 'Memoricé — Íconos',
    descripcion: 'Parejas de íconos y símbolos',
    emojis: ICONOS_SIMBOLOS
  }
];

/**
 * Seed idempotente de sets predeterminados de Memoricé.
 * No-op si el juego MEMORIA no existe.
 * No duplica sets: busca por es_predeterminado: true + nombre exacto.
 *
 * @param {object} services - { juego, set, ... }
 * @param {import('../services/GameDefinitionRegistry.js').GameDefinitionRegistry} registry
 * @returns {Promise<object[]>} Sets creados en esta corrida (vacío si no creó nada).
 */
export async function seedMemoriaPredeterminados(services, registry) {
  const juegos = await services.juego.listarJuegos();
  const memoria = juegos.find((j) => j.codigo === 'MEMORIA');
  if (!memoria) return [];

  const existentes = await services.set.listarSetsPorJuego(memoria.id);
  const creados = [];

  for (const def of SETS_PREDETERMINADOS) {
    const yaExiste = existentes.some(
      (s) => s.es_predeterminado === true && s.nombre === def.nombre
    );
    if (yaExiste) continue;

    const set = await services.set.crearSet({
      juego_id: memoria.id,
      nombre: def.nombre,
      descripcion: def.descripcion,
      es_predeterminado: true
    });

    for (const emoji of def.emojis) {
      await services.set.agregarItem(set.id, { imagen_url: `emoji:${emoji}` });
    }

    creados.push(set);
  }

  return creados;
}
