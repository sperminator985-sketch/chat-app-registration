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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister()))
    .catch(() => undefined);
  if (window.caches) {
    caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => undefined);
  }
}
