/* =============================================================
   crearTimer — timer reutilizable para juegos.

   Uso:
     const timer = crearTimer({
       duracionSeg: 30,
       onTick: (restante) => { ... },
       onCierre: () => { ... }
     });

     timer.iniciarSiCambio('juego1:0');  // inicia si la key cambió
     timer.iniciarSiCambio('juego1:0');  // no hace nada (misma key)
     timer.iniciarSiCambio('juego1:1');  // reinicia con nueva key
     timer.cancelar();
     timer.reset();
     timer.estaActivo();
     timer.restanteActual();
   ============================================================= */

export function crearTimer({ duracionSeg, onTick, onCierre }) {
  let intervalId = null;
  let restante = duracionSeg;
  let activo = false;
  let currentKey = null;

  function _emitirTick() {
    if (typeof onTick === 'function') onTick(restante);
  }

  function iniciar() {
    if (activo) return;
    activo = true;
    restante = duracionSeg;
    _emitirTick();

    intervalId = setInterval(() => {
      restante--;
      _emitirTick();
      if (restante <= 0) {
        cancelar();
        if (typeof onCierre === 'function') onCierre();
      }
    }, 1000);
  }

  function iniciarSiCambio(key) {
    if (currentKey === key && activo) return;
    currentKey = key;
    cancelar();
    iniciar();
  }

  function cancelar() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    activo = false;
  }

  function reset() {
    cancelar();
    restante = duracionSeg;
    _emitirTick();
  }

  function estaActivo() {
    return activo;
  }

  function restanteActual() {
    return restante;
  }

  return { iniciar, iniciarSiCambio, cancelar, reset, estaActivo, restanteActual };
}
