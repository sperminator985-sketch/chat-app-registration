import { cn } from '@/lib/utils';

type FacadeProps = {
  className?: string;
  cols?: number;
  rows?: number;
  seed?: number;
  cellAspect?: string;
};

const Facade = ({ className, cols = 10, rows = 3, seed = 7, cellAspect = '1/1.35' }: FacadeProps) => {
  const total = cols * rows;
  const cells = Array.from({ length: total }, (_, i) => {
    const n = (i * seed + 3) % 10;
    if (i % 17 === 6) return 'blink';
    if (i % 13 === 4) return 'blink';
    if (i % 7 === 2) return 'blink';
    if (n < 4) return 'on';
    return 'off';
  });

  const rnd = (i: number, salt: number) => ((i * 37 + seed * 11 + salt * 53) % 100) / 100;

  return (
    <div
      aria-hidden="true"
      className={cn('grid flex-none gap-[5px] bg-card p-[9px]', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {cells.map((kind, i) => (
        <span
          key={i}
          className={cn(
            'block',
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
  );
};

export default Facade;