let lastPointer: string | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPointer = e.pointerType;
    },
    true,
  );
  window.addEventListener(
    'touchstart',
    () => {
      lastPointer = 'touch';
    },
    { capture: true, passive: true },
  );
}

const hasTouchScreen = () =>
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window ||
    window.matchMedia('(hover: none), (pointer: coarse), (any-pointer: coarse)').matches);

export const isTouchInput = () => {
  if (lastPointer === 'touch' || lastPointer === 'pen') return true;
  if (lastPointer === 'mouse') return false;
  return hasTouchScreen();
};

export default isTouchInput;
