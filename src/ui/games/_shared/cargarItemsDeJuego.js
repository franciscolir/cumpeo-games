/* =============================================================
   cargarItemsDeJuego — helper compartido (móvil + conductor + pública).

   Lee los items del set activo para un juego:
   1. Si tiene snapshot_id → lee set_snapshots → source_set_id.
   2. Fallback: busca sets activos del juego, toma el más reciente.
   3. Lee items del set, ordena por orden, devuelve contenidos.
   ============================================================= */

export async function cargarItemsDeJuego(app, juegoActivo) {
  if (!juegoActivo) return null;
  try {
    let setId = null;

    if (juegoActivo.snapshot_id) {
      const snapshots = await app.adapter.query('set_snapshots', {
        eq: { id: juegoActivo.snapshot_id }
      });
      const snapshot = Array.isArray(snapshots) ? snapshots[0] : snapshots;
      if (snapshot?.source_set_id) {
        setId = snapshot.source_set_id;
      }
    }

    if (!setId) {
      const sets = await app.services.set.listarSetsActivosPorJuego(juegoActivo.juego_id);
      if (!sets.length) return null;
      sets.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setId = sets[0].id;
    }

    const items = await app.services.set.listarItemsDeSet(setId);
    return items.sort((a, b) => a.orden - b.orden).map((it) => it.contenido || it);
  } catch (_) {
    return null;
  }
}
