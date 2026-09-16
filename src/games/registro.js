/* =============================================================
   Registro de juegos disponibles.
   Se llama una vez desde bootstrap().
   ============================================================= */

import { TriviaGameDefinition } from './trivia/TriviaGameDefinition.js';

/**
 * Registra todos los juegos disponibles en el registry.
 * @param {GameDefinitionRegistry} registry
 * @returns {string[]} Lista de códigos registrados.
 */
export function registrarTodos(registry) {
  const definiciones = [
    TriviaGameDefinition
  ];

  for (const def of definiciones) {
    registry.registrar(def);
  }

  return registry.listarCodigos();
}
