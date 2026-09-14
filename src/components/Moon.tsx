import { cn } from '@/lib/utils';

const maria = [
  { d: 'M26 30 q-7 14 -4 28 q3 14 9 18 q6 -6 4 -20 q-2 -16 -9 -26 Z', o: 0.3 },
  { cx: 38, cy: 32, rx: 11.5, ry: 10, rot: -18, o: 0.34 },
  { cx: 56, cy: 32, rx: 8, ry: 7.2, rot: 10, o: 0.32 },
  { cx: 66, cy: 45, rx: 9, ry: 8, rot: -25, o: 0.33 },
  { cx: 77, cy: 36, rx: 4.6, ry: 4, rot: 0, o: 0.29 },
  { cx: 73, cy: 55, rx: 5.4, ry: 6.4, rot: 12, o: 0.28 },
  { cx: 66, cy: 62, rx: 3.6, ry: 3.2, rot: 0, o: 0.24 },
  { cx: 45, cy: 65, rx: 8, ry: 5, rot: -8, o: 0.27 },
  { cx: 33, cy: 68, rx: 4.4, ry: 4, rot: 0, o: 0.25 },
  { cx: 50, cy: 20, rx: 16, ry: 2.6, rot: -6, o: 0.2 },
];

const craters = [
  { cx: 46, cy: 76, r: 2.6, o: 0.3 },
  { cx: 42, cy: 47, r: 2.2, o: 0.24 },
  { cx: 34, cy: 44, r: 1.5, o: 0.2 },
  { cx: 58, cy: 72, r: 2, o: 0.22 },
  { cx: 62, cy: 24, r: 1.4, o: 0.18 },
  { cx: 30, cy: 57, r: 1.6, o: 0.19 },
  { cx: 52, cy: 84, r: 1.8, o: 0.21 },
  { cx: 71, cy: 67, r: 1.5, o: 0.18 },
  { cx: 24, cy: 40, r: 1.3, o: 0.17 },
];

const rays = [10, 48, 96, 140, 196, 250, 300, 330];

const Moon = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn('moon-layer pointer-events-none absolute', className)}
    style={{ animation: 'moon-glow 7s ease-in-out infinite' }}
  >
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
      <defs>
        <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="hsl(var(--secondary))" stopOpacity="0.34" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="moon-face" cx="38%" cy="33%" r="76%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="1" />
          <stop offset="72%" stopColor="hsl(var(--secondary))" stopOpacity="0.93" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.74" />
        </radialGradient>

        <radialGradient id="moon-limb" cx="50%" cy="50%" r="50%">
          <stop offset="76%" stopColor="hsl(var(--background))" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.3" />
        </radialGradient>

        <clipPath id="moon-clip">
          <circle cx="50" cy="50" r="38" />
        </clipPath>

        <filter id="moon-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        <filter id="moon-soft-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      <circle cx="50" cy="50" r="96" fill="url(#moon-halo)" />
      <circle cx="50" cy="50" r="38" fill="url(#moon-face)" />

      <g clipPath="url(#moon-clip)">
        <g fill="hsl(var(--background))" stroke="none" filter="url(#moon-soft)">
          {maria.map((m, i) =>
            'd' in m ? (
              <path key={i} d={m.d} opacity={m.o} />
            ) : (
              <ellipse
                key={i}
                cx={m.cx}
                cy={m.cy}
                rx={m.rx}
                ry={m.ry}
                opacity={m.o}
                transform={`rotate(${m.rot} ${m.cx} ${m.cy})`}
              />
            ),
          )}
        </g>

        <g
          stroke="hsl(var(--secondary))"
          strokeWidth="1.4"
          opacity="0.28"
          strokeLinecap="round"
          filter="url(#moon-soft-sm)"
        >
          {rays.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={46 + Math.cos(rad) * 4}
                y1={76 + Math.sin(rad) * 4}
                x2={46 + Math.cos(rad) * (13 + (i % 3) * 6)}
                y2={76 + Math.sin(rad) * (13 + (i % 3) * 6)}
              />
            );
          })}
        </g>

        <g fill="hsl(var(--background))" filter="url(#moon-soft-sm)">
          {craters.map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} opacity={c.o} />
          ))}
        </g>

        <g
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="0.45"
          opacity="0.4"
          filter="url(#moon-soft-sm)"
        >
          {craters.map((c, i) => (
            <circle key={i} cx={c.cx - c.r * 0.18} cy={c.cy - c.r * 0.22} r={c.r} />
          ))}
        </g>

        <circle cx="50" cy="50" r="38" fill="url(#moon-limb)" />
      </g>
    </svg>
  </div>
);

export default Moon;