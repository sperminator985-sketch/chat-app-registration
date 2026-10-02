import * as React from 'react';
import { createRoot } from 'react-dom/client'
import { startPointerGuard } from '@/lib/unstick-pointer'
import App from './App'
import './index.css'

startPointerGuard();
createRoot(document.getElementById("root")!).render(<App />);

const splash = document.getElementById('app-splash');
if (splash && document.documentElement.classList.contains('app-launch')) {
  const started = performance.now();
  let done = false;
  const hide = () => {
    if (done) return;
    done = true;
    const wait = Math.max(0, 1200 - (performance.now() - started));
    window.setTimeout(() => {
      splash.classList.add('hide');
      window.setTimeout(() => {
        splash.remove();
        document.documentElement.classList.remove('app-launch');
      }, 500);
    }, wait);
  };
  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide, { once: true });
  window.setTimeout(hide, 6000);
} else {
  splash?.remove();
}

const isPreview =
  import.meta.env.DEV || /preview|localhost|127\.0\.0\.1/.test(window.location.hostname);

if ('serviceWorker' in navigator) {
  if (isPreview) {
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => undefined);
    if (window.caches) {
      caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => undefined);
    }
  } else if (window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}