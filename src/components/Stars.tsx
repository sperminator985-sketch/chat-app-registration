import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Star = {
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  dim: number;
  lit: number;
  big: boolean;
};

const COUNT = 64;

const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const buildStars = (): Star[] =>
  Array.from({ length: COUNT }, (_, i) => {
    const big = rnd(i + 91) > 0.86;
    return {
      left: +(rnd(i + 1) * 100).toFixed(2),
      top: +(rnd(i + 37) * 78).toFixed(2),
      size: big ? 3 : rnd(i + 53) > 0.5 ? 2 : 1.5,
      dur: +(2.6 + rnd(i + 17) * 4.8).toFixed(2),
      delay: +(rnd(i + 71) * 6).toFixed(2),
      dim: +(0.1 + rnd(i + 23) * 0.16).toFixed(2),
      lit: +(0.65 + rnd(i + 11) * 0.35).toFixed(2),
      big,
    };
  });

const Stars = ({ className }: { className?: string }) => {
  const stars = useMemo(buildStars, []);

  return (
    <div
      aria-hidden
      className={cn('stars-layer pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-secondary"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              boxShadow: s.big ? '0 0 6px hsl(var(--secondary) / .7)' : undefined,
              '--star-dur': `${s.dur}s`,
              '--star-dim': s.dim,
              '--star-lit': s.lit,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default Stars;
