/* =============================================================
   SupabaseAdapter — esqueleto.

   Este adapter reemplazará a LocalAdapter en producción.
   Por ahora, todos los métodos lanzan NotImplementedError.
   ============================================================= */

export class SupabaseAdapter {
  constructor() {
    this.client = null;
    this.canal = null;
  }

  async abrir() {
    throw new Error('SupabaseAdapter no implementado todavía (H7.2)');
  }

  async cerrar() {
    throw new Error('SupabaseAdapter no implementado todavía (H7.2)');
  }

  tx(stores, mode, fn) {
    throw new Error('SupabaseAdapter.tx no implementado todavía (H7.2)');
  }
}
