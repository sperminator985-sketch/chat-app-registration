import { useEffect, useRef } from 'react';

export const isPageVisible = () =>
  typeof document === 'undefined' || document.visibilityState !== 'hidden';

export const usePolling = (fn: () => void, delay: number, enabled = true) => {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => saved.current(), delay);
    };

    const onVisibility = () => {
      if (isPageVisible()) {
        saved.current();
        start();
      } else {
        stop();
      }
    };

    saved.current();
    if (isPageVisible()) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delay, enabled]);
};
