import type React from 'react';

let lastFired = 0;

export const press = (fn: () => void) => ({
  onPointerDown: (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    lastFired = Date.now();
    fn();
  },
  onClick: () => {
    if (Date.now() - lastFired < 700) return;
    fn();
  },
});
