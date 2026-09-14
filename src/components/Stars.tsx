import { useEffect, useMemo, useRef, useState } from 'react';
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
  still: boolean;
};

const COUNT = 64;

const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const buildStars = (): Star[] =>
  Array.from({ length: COUNT * 2 }, (_, i) => {
    const still = i >= COUNT;
    const s = still ? i + 1013 : i;
    const big = rnd(s + 91) > 0.78;
    return {
      left: +(rnd(s + 1) * 100).toFixed(2),
      top: +(rnd(s + 37) * 96).toFixed(2),
      size: big ? 3 : rnd(s + 53) > 0.5 ? 2 : 1.5,
      dur: +(2.6 + rnd(s + 17) * 4.8).toFixed(2),
      delay: +(rnd(s + 71) * 6).toFixed(2),
      dim: +(0.28 + rnd(s + 23) * 0.16).toFixed(2),
      lit: +(0.82 + rnd(s + 11) * 0.18).toFixed(2),
      big,
      still,
    };
  });

type Shot = {
  id: number;
  left: number;
  top: number;
  len: number;
  dist: number;
  dur: number;
  angle: number;
};

const makeShot = (id: number, box: { w: number; h: number }): Shot => {
  const angle = 22 + Math.random() * 30;
  const left = Math.random() * 62;
  const top = Math.random() * 36;
  const rad = (angle * Math.PI) / 180;

  const startX = (left / 100) * box.w;
  const startY = (top / 100) * box.h;
  const toBottom = (box.h - startY + 40) / Math.sin(rad);
  const toRight = (box.w - startX + 40) / Math.cos(rad);

  return {
    id,
    left,
    top,
    len: 70 + Math.random() * 60,
    dist: +Math.min(toBottom, toRight).toFixed(1),
    dur: +(0.9 + Math.random() * 0.7).toFixed(2),
    angle: +angle.toFixed(2),
  };
};

const Stars = ({ className }: { className?: string }) => {
  const stars = useMemo(buildStars, []);
  const [shots, setShots] = useState<Shot[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let seq = 0;

    const launch = () => {
      if (document.hidden) return;
      const box = {
        w: boxRef.current?.offsetWidth || window.innerWidth,
        h: boxRef.current?.offsetHeight || window.innerHeight,
      };
      const shot = makeShot(++seq, box);
      setShots((prev) => [...prev, shot]);
      setTimeout(
        () => setShots((prev) => prev.filter((s) => s.id !== shot.id)),
        shot.dur * 1000 + 120,
      );
    };

    const timer = setInterval(launch, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={cn('stars-layer pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className={cn('absolute rounded-full bg-secondary', !s.still && 'animate-twinkle')}
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.still ? s.lit : undefined,
              animationDelay: s.still ? undefined : `${s.delay}s`,
              boxShadow: s.big
                ? '0 0 8px hsl(var(--secondary)), 0 0 18px hsl(var(--secondary) / .65)'
                : '0 0 6px hsl(var(--secondary) / .75)',
              '--star-dur': `${s.dur}s`,
              '--star-dim': s.dim,
              '--star-lit': s.lit,
            } as React.CSSProperties
          }
        />
      ))}

      {shots.map((s) => (
        <span
          key={s.id}
          className="absolute animate-shoot"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.len}px`,
              height: '2px',
              transformOrigin: 'left center',
              rotate: `${s.angle}deg`,
              borderRadius: '999px',
              background:
                'linear-gradient(90deg, hsl(var(--secondary) / 0) 0%, hsl(var(--secondary) / .55) 55%, hsl(var(--secondary)) 100%)',
              boxShadow: '0 0 8px hsl(var(--secondary) / .8)',
              '--shoot-x': `${s.dist}px`,
              '--shoot-y': '0px',
              '--shoot-dur': `${s.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default Stars;