/* =============================================================
   Wrapper sobre BroadcastChannel.
   Rol: notificar "algo cambió". Nunca transporta semántica de dominio.
   ============================================================= */

const CANAL = 'cumpeo';

export function crearCanal({ nombre = CANAL } = {}) {
  let canal = null;

  function _asegurar() {
    if (canal) return canal;
    if (typeof BroadcastChannel === 'undefined') return null;
    canal = new BroadcastChannel(nombre);
    return canal;
  }

  return {
    emitir(mensaje) {
      const c = _asegurar();
      if (!c) return;
      c.postMessage(mensaje);
    },

    escuchar(handler) {
      const c = _asegurar();
      if (!c) return () => {};
      const listener = (event) => handler(event.data);
      c.addEventListener('message', listener);
      return () => c.removeEventListener('message', listener);
    },

    cerrar() {
      if (!canal) return;
      canal.close();
      canal = null;
    }
  };
}
