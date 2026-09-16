import './styles/tailwind.css';
import './styles/theme.css';
import './styles/comic.css';

import { LocalAdapter } from './adapters/LocalAdapter.js';
import { bootstrap } from './app/bootstrap.js';
import { renderDashboard } from './ui/dashboard.js';

/* =============================================================
   Tema
   ============================================================= */
function resolveTheme() {
  const saved = localStorage.getItem('cumpeo.tema');
  if (saved === 'claro') return 'light';
  if (saved === 'oscuro') return 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}
function applyTheme(theme) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  html.classList.toggle('dark', theme === 'dark');
}
applyTheme(resolveTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('cumpeo.tema')) return;
  applyTheme(e.matches ? 'dark' : 'light');
});

/* =============================================================
   Boot
   ============================================================= */
const app = document.getElementById('app');

async function boot() {
  app.innerHTML = `
    <main class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
        <div class="inline-block bg-primary text-on-primary font-display-hero text-5xl px-4 py-2 border-3 border-on-surface shadow-comic-sm -rotate-2 uppercase">
          CUMPEO
        </div>
        <p class="font-body-md text-on-surface-variant mt-4" id="boot-status">
          Abriendo base de datos…
        </p>
      </div>
    </main>
  `;

  const status = document.getElementById('boot-status');
  const adapter = new LocalAdapter();

  try {
    await adapter.abrir();
    const cumpeoApp = await bootstrap(adapter);
    await renderDashboard(app, cumpeoApp);
  } catch (err) {
    console.error('[boot] Error:', err);
    status.innerHTML = `
      <span class="font-label-md uppercase text-error">ERROR</span><br>
      ${err.message || 'Error inicializando'}
    `;
  }
}

boot();
