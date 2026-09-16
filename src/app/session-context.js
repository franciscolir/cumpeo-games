/* =============================================================
   SessionContext
   - Identifica la pestaña actual del conductor.
   - Vive en sessionStorage: se pierde al cerrar la pestaña.
   - En prod, usuarioId vendrá de Supabase Auth.
   ============================================================= */

export class SessionContext {
  constructor({ storageKey = 'cumpeo.session' } = {}) {
    this.storageKey = storageKey;
    this.sessionId = this._cargarOCrearSessionId();
    this.usuarioId = null;
  }

  _cargarOCrearSessionId() {
    if (typeof sessionStorage === 'undefined') {
      return SessionContext._nuevoId();
    }
    let sid = sessionStorage.getItem(this.storageKey);
    if (!sid) {
      sid = SessionContext._nuevoId();
      sessionStorage.setItem(this.storageKey, sid);
    }
    return sid;
  }

  static _nuevoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  get() {
    return { sessionId: this.sessionId, usuarioId: this.usuarioId };
  }
}
