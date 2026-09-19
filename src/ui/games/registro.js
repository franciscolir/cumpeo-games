/* =============================================================
   Registro de GameUIs disponibles.
   Se llama una vez desde bootstrap().
   ============================================================= */

import { TriviaGameUI } from './trivia/TriviaGameUI.js';

/**
 * Registra todos los GameUIs disponibles en el registry.
 * @param {GameUIRegistry} uiRegistry
 * @returns {string[]} Lista de códigos registrados.
 */
export function registrarGameUIs(uiRegistry) {
  const gameUIs = [
    TriviaGameUI
  ];

  for (const ui of gameUIs) {
    uiRegistry.registrar(ui);
  }

  return uiRegistry.listarCodigos();
}
