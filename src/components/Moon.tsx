import { cn } from '@/lib/utils';

const craters = [
  { cx: 34, cy: 30, r: 9, o: 0.3 },
  { cx: 62, cy: 44, r: 6, o: 0.24 },
  { cx: 42, cy: 62, r: 11, o: 0.27 },
  { cx: 68, cy: 72, r: 5, o: 0.2 },
  { cx: 24, cy: 50, r: 4.5, o: 0.22 },
  { cx: 55, cy: 22, r: 4, o: 0.18 },
  { cx: 30, cy: 76, r: 3.5, o: 0.19 },
];

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
        <radialGradient id="moon-face" cx="36%" cy="32%" r="72%">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.82" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="96" fill="url(#moon-halo)" />
      <circle cx="50" cy="50" r="38" fill="url(#moon-face)" />

      <g fill="hsl(var(--background))">
        {craters.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} opacity={c.o} />
        ))}
      </g>
    </svg>
  </div>
);

export default Moon;
