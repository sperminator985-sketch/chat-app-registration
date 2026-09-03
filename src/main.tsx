import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

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