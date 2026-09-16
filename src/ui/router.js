/* =============================================================
   Router — hash router simple con parámetros.
   ============================================================= */

/**
 * Convierte un patrón con :param en regex y extrae params.
 * @param {string} pattern - ej: '#/circuitos/:id'
 * @param {string} hash - ej: '#/circuitos/123'
 * @returns {object|null} - { id: '123' } o null si no matchea.
 */
function matchRoute(pattern, hash) {
  const patternParts = pattern.replace(/^#/, '').split('/').filter(Boolean);
  const hashParts = hash.replace(/^#/, '').split('/').filter(Boolean);

  if (patternParts.length !== hashParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const h = hashParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(h);
    } else if (p !== h) {
      return null;
    }
  }
  return params;
}

/**
 * Router simple.
 */
export class Router {
  constructor() {
    this.rutas = [];
    this.notFound = null;
    this.onChange = null;
    this._container = null;
    this._app = null;
    this._handler = () => this._resolver(this._container, this._app);
  }

  /**
   * Registra una ruta.
   * @param {string} pattern - ej: '#/circuitos/:id'
   * @param {Function} handler - async (container, app, params) => {}
   */
  registrar(pattern, handler) {
    this.rutas.push({ pattern, handler });
  }

  /**
   * Define el handler para rutas no encontradas.
   * @param {Function} handler
   */
  setNotFound(handler) {
    this.notFound = handler;
  }

  /**
   * Notifica cambios de ruta.
   * @param {Function} fn
   */
  setOnChange(fn) {
    this.onChange = fn;
  }

  /**
   * Navega a un hash.
   * @param {string} hash
   */
  navegar(hash) {
    window.location.hash = hash;
  }

  /**
   * Inicia el router y resuelve la ruta actual.
   * @param {HTMLElement} container
   * @param {object} app
   */
  async iniciar(container, app) {
    this._container = container;
    this._app = app;
    window.addEventListener('hashchange', this._handler);
    await this._resolver(container, app);
  }

  async _resolver(container, app) {
    const hash = window.location.hash || '#/';
    for (const ruta of this.rutas) {
      const params = matchRoute(ruta.pattern, hash);
      if (params !== null) {
        if (this.onChange) this.onChange(hash);
        await ruta.handler(container, app, params);
        return;
      }
    }
    if (this.notFound) {
      await this.notFound(container, app);
    }
  }
}
