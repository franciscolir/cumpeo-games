/* =============================================================
   Editor de Items — Pictionary — DIBUJO (re-export parametrizado).
   ============================================================= */

import { renderEditorItemsConceptoPictionary } from '../_shared/editor-concepto.js';

/**
 * Renderiza el editor de DIBUJO de Pictionary.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export function renderEditorItemsPictionaryDibujo(container, app, setId) {
  return renderEditorItemsConceptoPictionary(container, app, setId, {
    submodo: 'DIBUJO',
    instruccion: 'El representante dibuja en pizarra física.',
    idPrefix: 'pictionary-dibujo',
    titulo: 'Conceptos del set — Dibujo'
  });
}
