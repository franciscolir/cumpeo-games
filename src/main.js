import './styles/tailwind.css';
import './styles/theme.css';
import './styles/comic.css';

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
  const saved = localStorage.getItem('cumpeo.tema');
  if (saved) return;
  applyTheme(e.matches ? 'dark' : 'light');
});

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <main class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-surface-container-lowest border-2 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
        <div class="inline-block bg-primary text-on-primary font-display-hero text-5xl px-4 py-2 border-3 border-on-surface shadow-comic-sm -rotate-2 uppercase">
          CUMPEO
        </div>
        <p class="font-body-md text-on-surface-variant mt-4">
          Sistema inicializado. Esperando vertical slice…
        </p>
        <p class="font-label-md uppercase text-tertiary mt-2">
          H0 + H1 · OK
        </p>
      </div>
    </main>
  `;
}
