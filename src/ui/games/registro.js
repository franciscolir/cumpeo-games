/* =============================================================
   Registro de GameUIs disponibles.
   Se llama una vez desde bootstrap().
   ============================================================= */

import { TriviaGameUI } from './trivia/TriviaGameUI.js';
import { QuePiensaElPublicoGameUI } from './que-piensa-el-publico/QuePiensaElPublicoGameUI.js';
import { RoscoGameUI } from './rosco/RoscoGameUI.js';
import { CancionIncompletaGameUI } from './cancion-incompleta/CancionIncompletaGameUI.js';
import { PictionaryGameUI } from './pictionary/PictionaryGameUI.js';

/**
 * Registra todos los GameUIs disponibles en el registry.
 * @param {GameUIRegistry} uiRegistry
 * @returns {string[]} Lista de códigos registrados.
 */
export function registrarGameUIs(uiRegistry) {
  const gameUIs = [
    TriviaGameUI,
    QuePiensaElPublicoGameUI,
    RoscoGameUI,
    CancionIncompletaGameUI,
    PictionaryGameUI
  ];

  for (const ui of gameUIs) {
    uiRegistry.registrar(ui);
  }

  return uiRegistry.listarCodigos();
}
