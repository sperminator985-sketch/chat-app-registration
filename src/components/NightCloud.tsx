import { cn } from '@/lib/utils';

const puffs = [
  { cx: 20, cy: 30, rx: 20, ry: 9, o: 0.5 },
  { cx: 42, cy: 24, rx: 26, ry: 11, o: 0.62 },
  { cx: 66, cy: 30, rx: 22, ry: 9, o: 0.52 },
  { cx: 34, cy: 38, rx: 30, ry: 8, o: 0.45 },
  { cx: 58, cy: 40, rx: 24, ry: 7, o: 0.4 },
  { cx: 78, cy: 36, rx: 14, ry: 6, o: 0.34 },
];

const NightCloud = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn('cloud-layer pointer-events-none absolute', className)}
    style={{ animation: 'cloud-drift 150s linear infinite' }}
  >
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <filter id="cloud-blur" x="-25%" y="-60%" width="150%" height="220%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>
      <g fill="hsl(var(--secondary))" filter="url(#cloud-blur)">
        {puffs.map((p, i) => (
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} opacity={p.o} />
        ))}
      </g>
    </svg>
  </div>
);

export default NightCloud;
