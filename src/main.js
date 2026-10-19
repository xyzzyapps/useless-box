import { UselessBoxApp } from './app/app.js';
import { createLogger } from './core/logger.js';

const params = new URLSearchParams(window.location.search);
const debug = params.get('debug') === '1';
const logger = createLogger('boot', debug);
const errorElement = document.getElementById('error');

function showFatalError(error) {
  document.documentElement.dataset.error = 'true';
  if (errorElement) errorElement.hidden = false;
  console.error('[useless-box:boot]', error);
}

function readStillTime() {
  if (params.has('preview')) return 1.95;
  if (!params.has('still')) return null;
  const raw = params.get('still');
  if (raw === 'idle' || raw === '0') return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1.95;
  return Math.min(3.8, Math.max(0, parsed));
}

try {
  const stillTime = readStillTime();
  const hideUi = params.get('ui') === '0' || params.has('preview');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.dataset.reducedMotion = String(reducedMotion);
  document.documentElement.dataset.busy = 'false';

  const app = new UselessBoxApp({
    canvas: document.getElementById('scene'),
    stage: document.getElementById('stage'),
    hint: document.getElementById('hint'),
    status: document.getElementById('status'),
    soundButton: document.getElementById('sound'),
    debug,
    stillTime,
    hideUi,
    reducedMotion,
  });

  window.__uselessBox = app;

  if (debug) {
    logger.info('query params', Object.fromEntries(params.entries()));
    logger.info('introspection available at window.__uselessBox');
  }
} catch (error) {
  showFatalError(error);
}

window.addEventListener('error', (event) => {
  if (!document.documentElement.dataset.ready) {
    showFatalError(event.error || new Error(event.message));
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (!document.documentElement.dataset.ready) {
    showFatalError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  }
});
