import { cn } from '@/lib/utils';

type FacadeProps = {
  className?: string;
  cols?: number;
  rows?: number;
  seed?: number;
  cellAspect?: string;
  entrance?: boolean;
  floorCounts?: number[];
};

const shuffledCols = (cols: number, row: number, seed: number) => {
  const order = Array.from({ length: cols }, (_, i) => i);
  for (let i = cols - 1; i > 0; i -= 1) {
    const j = (row * 31 + seed * 17 + i * 7) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

const Facade = ({
  className,
  cols = 10,
  rows = 3,
  seed = 7,
  cellAspect = '1/1.35',
  entrance = true,
  floorCounts,
}: FacadeProps) => {
  const total = cols * rows;

  const live = new Set<number>();
  if (floorCounts) {
    for (let row = 0; row < rows; row += 1) {
      const floor = rows - 1 - row;
      const count = Math.min(floorCounts[floor] ?? 0, cols);
      const order = shuffledCols(cols, row, seed);
      for (let k = 0; k < count; k += 1) live.add(row * cols + order[k]);
    }
  }

  const cells = Array.from({ length: total }, (_, i) => {
    if (floorCounts) return live.has(i) ? 'on' : 'off';
    const n = (i * seed + 3) % 10;
    if (i % 17 === 6) return 'blink';
    if (i % 13 === 4) return 'blink';
    if (i % 7 === 2) return 'blink';
    if (n < 4) return 'on';
    return 'off';
  });

  const rnd = (i: number, salt: number) => ((i * 37 + seed * 11 + salt * 53) % 100) / 100;

  return (
    <div aria-hidden="true" className={cn('flex-none', className)}>
      <div className="mx-[6%] h-[10px] border-2 border-b-0 border-foreground/45 bg-window-off md:h-[14px]" />
      <div className="mx-[3%] h-[7px] border-2 border-b-0 border-foreground/45 bg-card md:h-[9px]" />

      <div className="border-2 border-foreground/45 bg-card">
        <div
          className="grid gap-[5px] p-[9px]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cells.map((kind, i) => (
            <span
              key={i}
              className={cn(
                'block border border-foreground/25 transition-colors duration-700',
                kind === 'off' && 'bg-window-off',
                kind === 'on' && 'bg-window-on',
                kind === 'blink' && 'animate-blink bg-window-on',
              )}
              style={{
                aspectRatio: cellAspect,
                ...(kind === 'blink'
                  ? {
                      animationDelay: `${(rnd(i, 1) * 14).toFixed(2)}s`,
                      animationDuration: `${(11 + rnd(i, 2) * 12).toFixed(2)}s`,
                    }
                  : {}),
              }}
            />
          ))}
        </div>

        {entrance && (
          <div className="flex items-end justify-center gap-[5px] border-t-2 border-foreground/35 px-[9px] pb-0 pt-[7px]">
            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-on md:h-[20px]" />
            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-on md:h-[20px]" />

            <span className="flex w-[26%] flex-col items-center">
              <span className="h-[5px] w-full bg-primary" />
              <span className="flex w-[62%] flex-col items-center border-2 border-t-0 border-foreground/45 bg-window-off px-[3px] pb-0 pt-[3px]">
                <span className="h-[5px] w-[70%] bg-window-on" />
                <span className="mt-[3px] h-[16px] w-full bg-foreground/70 md:h-[22px]" />
              </span>
              <span className="h-[3px] w-[80%] bg-foreground/45" />
              <span className="h-[3px] w-[92%] bg-foreground/35" />
              <span className="h-[3px] w-full bg-foreground/25" />
            </span>

            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-on md:h-[20px]" />
            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-on md:h-[20px]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Facade;
