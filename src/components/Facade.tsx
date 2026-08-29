import { cn } from '@/lib/utils';

type FacadeProps = {
  className?: string;
  cols?: number;
  rows?: number;
  seed?: number;
  cellAspect?: string;
  entrance?: boolean;
};

const Facade = ({
  className,
  cols = 10,
  rows = 3,
  seed = 7,
  cellAspect = '1/1.35',
  entrance = true,
}: FacadeProps) => {
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
                'block border border-foreground/25',
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
            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-off md:h-[20px]" />
            <span className="mb-[9px] h-[16px] flex-1 animate-blink border border-foreground/25 bg-window-on md:h-[20px]" />

            <span className="flex w-[26%] flex-col items-center">
              <span className="h-[5px] w-full bg-primary" />
              <span className="flex w-[62%] flex-col items-center border-2 border-t-0 border-foreground/45 bg-window-off px-[3px] pb-0 pt-[3px]">
                <span className="h-[5px] w-[70%] animate-blink bg-window-on" />
                <span className="mt-[3px] h-[16px] w-full bg-foreground/70 md:h-[22px]" />
              </span>
              <span className="h-[3px] w-[80%] bg-foreground/45" />
              <span className="h-[3px] w-[92%] bg-foreground/35" />
              <span className="h-[3px] w-full bg-foreground/25" />
            </span>

            <span className="mb-[9px] h-[16px] flex-1 animate-blink border border-foreground/25 bg-window-on md:h-[20px]" />
            <span className="mb-[9px] h-[16px] flex-1 border border-foreground/25 bg-window-off md:h-[20px]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Facade;
