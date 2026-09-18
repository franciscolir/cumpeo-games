/* =============================================================
   Registro de GameUIs disponibles.
   Se llama una vez desde bootstrap().
   ============================================================= */

/**
 * Registra todos los GameUIs disponibles en el registry.
 * @param {GameUIRegistry} uiRegistry
 * @returns {string[]} Lista de códigos registrados.
 */
export function registrarGameUIs(uiRegistry) {
  const gameUIs = [
    // Agregar aquí los GameUIs (paso 2.6: TriviaGameUI)
  ];

  for (const ui of gameUIs) {
    uiRegistry.registrar(ui);
  }

  return uiRegistry.listarCodigos();
}
