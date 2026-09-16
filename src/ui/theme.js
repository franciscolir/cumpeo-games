/* =============================================================
   Theme — lógica centralizada de cambio de tema.
   ============================================================= */

/**
 * Aplica el tema al documento.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  html.classList.toggle('dark', theme === 'dark');
}

/**
 * Resuelve el tema inicial según preferencia guardada o del sistema.
 * @returns {'light'|'dark'}
 */
export function resolveTheme() {
  const saved = localStorage.getItem('cumpeo.tema');
  if (saved === 'claro') return 'light';
  if (saved === 'oscuro') return 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Alterna entre light y dark. Guarda la preferencia.
 * @returns {'light'|'dark'} Nuevo tema.
 */
export function toggleTheme() {
  const html = document.documentElement;
  const actual = html.dataset.theme;
  const nuevo = actual === 'dark' ? 'light' : 'dark';
  applyTheme(nuevo);
  localStorage.setItem('cumpeo.tema', nuevo === 'dark' ? 'oscuro' : 'claro');
  return nuevo;
}
