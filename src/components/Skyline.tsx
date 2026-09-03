import { cn } from '@/lib/utils';

type Kind = 'flat' | 'roof' | 'church' | 'spire';

type Building = { x: number; w: number; h: number; kind: Kind };

const GROUND = 180;

const buildings: Building[] = [
  { x: -20, w: 150, h: 70, kind: 'roof' },
  { x: 135, w: 90, h: 96, kind: 'flat' },
  { x: 230, w: 150, h: 78, kind: 'roof' },
  { x: 388, w: 110, h: 130, kind: 'flat' },
  { x: 505, w: 120, h: 96, kind: 'church' },
  { x: 632, w: 96, h: 74, kind: 'roof' },
  { x: 735, w: 140, h: 112, kind: 'flat' },
  { x: 882, w: 104, h: 86, kind: 'roof' },
  { x: 993, w: 76, h: 150, kind: 'spire' },
  { x: 1076, w: 150, h: 100, kind: 'flat' },
  { x: 1233, w: 120, h: 76, kind: 'roof' },
  { x: 1360, w: 132, h: 120, kind: 'flat' },
  { x: 1499, w: 130, h: 92, kind: 'church' },
  { x: 1636, w: 100, h: 70, kind: 'roof' },
  { x: 1743, w: 160, h: 126, kind: 'flat' },
  { x: 1910, w: 110, h: 82, kind: 'roof' },
  { x: 2027, w: 88, h: 140, kind: 'spire' },
  { x: 2122, w: 150, h: 96, kind: 'flat' },
  { x: 2279, w: 141, h: 74, kind: 'roof' },
];

const dome = (cx: number, by: number, r: number, h: number) =>
  `M ${cx - r},${by} C ${cx - r},${by - h * 0.5} ${cx - r * 1.3},${by - h * 0.74} ${cx},${by - h} C ${cx + r * 1.3},${by - h * 0.74} ${cx + r},${by - h * 0.5} ${cx + r},${by} Z`;

const lit = (i: number, j: number, seed: number) => ((i * 13 + j * 29 + seed * 7) % 10) < 4;

const flickers = (i: number, j: number, seed: number) => (i * 7 + j * 11 + seed * 23) % 5 === 0;

const rndf = (i: number, j: number, seed: number, salt: number) =>
  ((i * 41 + j * 67 + seed * 19 + salt * 83) % 100) / 100;

const Skyline = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 2400 180"
    preserveAspectRatio="none"
    className={cn('block w-full text-foreground', className)}
  >
    {buildings.map((b, bi) => {
      const top = GROUND - b.h;
      const body = b.kind === 'roof' ? b.h * 0.66 : b.h;
      const bodyTop = GROUND - body;
      const cx = b.x + b.w / 2;

      const cols = Math.max(2, Math.round(b.w / 34));
      const rows = Math.max(2, Math.round(body / 30));
      const gapX = b.w / (cols * 2 + 1);
      const gapY = body / (rows * 2 + 1);

      return (
        <g key={bi}>
          <g fill="currentColor" fillOpacity="0.22">
            <rect x={b.x} y={bodyTop} width={b.w} height={body} />

            {b.kind === 'roof' && (
              <>
                <polygon
                  points={`${b.x - 8},${bodyTop} ${cx},${top} ${b.x + b.w + 8},${bodyTop}`}
                />
                <rect x={b.x + b.w * 0.68} y={top - 14} width={11} height={22} />
              </>
            )}

            {b.kind === 'church' && (
              <>
                <polygon
                  points={`${b.x - 6},${bodyTop} ${cx},${bodyTop - 20} ${b.x + b.w + 6},${bodyTop}`}
                />
                <rect x={cx - 16} y={bodyTop - 52} width={32} height={34} />
                <path d={dome(cx, bodyTop - 50, 17, 30)} />
                <rect x={cx - 2} y={bodyTop - 96} width={4} height={18} />
                <rect x={cx - 9} y={bodyTop - 90} width={18} height={4} />
                <rect x={b.x + 6} y={bodyTop - 26} width={22} height={28} />
                <path d={dome(b.x + 17, bodyTop - 24, 11, 19)} />
                <rect x={b.x + b.w - 28} y={bodyTop - 26} width={22} height={28} />
                <path d={dome(b.x + b.w - 17, bodyTop - 24, 11, 19)} />
              </>
            )}

            {b.kind === 'spire' && (
              <>
                <rect x={cx - b.w * 0.3} y={top - 26} width={b.w * 0.6} height={30} />
                <polygon
                  points={`${cx - b.w * 0.3},${top - 24} ${cx},${top - 62} ${cx + b.w * 0.3},${top - 24}`}
                />
                <rect x={cx - 2} y={top - 88} width={4} height={30} />
              </>
            )}
          </g>

          <g
            fill="hsl(var(--window-on))"
            fillOpacity="1"
            className="[.day_&]:fill-[hsl(var(--background))] [.day_&]:[fill-opacity:0.85]"
          >
            {Array.from({ length: rows }).map((_, ri) =>
              Array.from({ length: cols }).map((_, ci) =>
                lit(ri, ci, bi) ? (
                  <rect
                    key={`${ri}-${ci}`}
                    x={b.x + gapX * (ci * 2 + 1)}
                    y={bodyTop + gapY * (ri * 2 + 1)}
                    width={gapX}
                    height={gapY * 1.1}
                    className={
                      flickers(ri, ci, bi) ? 'animate-window-flicker [.day_&]:animate-none' : undefined
                    }
                    style={
                      flickers(ri, ci, bi)
                        ? {
                            animationDelay: `${(rndf(ri, ci, bi, 1) * 22).toFixed(2)}s`,
                            animationDuration: `${(16 + rndf(ri, ci, bi, 2) * 20).toFixed(2)}s`,
                          }
                        : undefined
                    }
                  />
                ) : null,
              ),
            )}
          </g>
        </g>
      );
    })}
  </svg>
);

export default Skyline;