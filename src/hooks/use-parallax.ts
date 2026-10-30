import { useEffect } from 'react';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export const useParallax = () => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let base: { b: number; g: number } | null = null;

    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      root.style.setProperty('--px', x.toFixed(4));
      root.style.setProperty('--py', y.toFixed(4));
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = clamp((e.clientX / window.innerWidth) * 2 - 1);
      ty = clamp((e.clientY / window.innerHeight) * 2 - 1);
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      tx = clamp((e.gamma - base.g) / 20);
      ty = clamp((e.beta - base.b) / 20);
      kick();
    };

    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    const ask = () => {
      DOE?.requestPermission?.().catch(() => undefined);
      window.removeEventListener('touchend', ask);
    };
    if (DOE?.requestPermission) window.addEventListener('touchend', ask, { once: true });

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('deviceorientation', onTilt);
      window.removeEventListener('touchend', ask);
      cancelAnimationFrame(frame);
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
    };
  }, []);
};

export default useParallax;
