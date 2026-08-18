import { cn } from '@/lib/utils';

type FacadeProps = {
  className?: string;
  cols?: number;
  rows?: number;
  seed?: number;
};

const Facade = ({ className, cols = 10, rows = 3, seed = 7 }: FacadeProps) => {
  const total = cols * rows;
  const cells = Array.from({ length: total }, (_, i) => {
    const n = (i * seed + 3) % 10;
    if (i % 17 === 6) return 'hot';
    if (i % 13 === 4) return 'blink';
    if (n < 4) return 'on';
    return 'off';
  });

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
            'block aspect-[1/1.35]',
            kind === 'off' && 'bg-window-off',
            kind === 'on' && 'bg-window-on',
            kind === 'hot' && 'bg-primary',
            kind === 'blink' && 'animate-blink bg-window-on',
          )}
          style={kind === 'blink' ? { animationDelay: `${(i % 5) * 0.7}s` } : undefined}
        />
      ))}
    </div>
  );
};

export default Facade;