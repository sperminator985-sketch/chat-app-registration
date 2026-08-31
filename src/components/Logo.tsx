import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: { box: 'h-9 w-9', chat: 'text-[1.05rem]', plate: 'text-[0.95rem]' },
  md: { box: 'h-11 w-11', chat: 'text-[1.35rem]', plate: 'text-[1.2rem]' },
  lg: { box: 'h-16 w-16', chat: 'text-[2.1rem]', plate: 'text-[1.85rem]' },
};

const windows = [1, 0, 1, 1, 1, 0, 1, 0, 1];

const Logo = ({ className, size = 'md' }: LogoProps) => {
  const s = sizes[size];
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative flex shrink-0 flex-col items-center justify-end border-2 border-foreground bg-window-off p-[3px]',
          s.box,
        )}
      >
        <span className="grid w-full flex-1 grid-cols-3 gap-[2px]">
          {windows.map((on, i) => (
            <span
              key={i}
              className={cn('w-full', on ? 'bg-window-on' : 'bg-foreground/45')}
            />
          ))}
        </span>
      </span>

      <span className="flex min-w-0 items-center gap-x-1.5 font-display font-extrabold uppercase tracking-[-0.035em]">
        <span className={cn('whitespace-nowrap leading-[.92] text-foreground', s.chat)}>
          ЧАТ<b className="text-primary">—</b>
        </span>
        <span className="plate relative inline-block w-fit origin-center -rotate-[1.5deg] px-2 pb-[5px] pt-[3px]">
          <span className={cn('block whitespace-nowrap leading-[.9] tracking-[-0.045em]', s.plate)}>
            ОБЩАГА
          </span>
          <span className="absolute -bottom-[6px] left-3 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-secondary" />
        </span>
      </span>
    </span>
  );
};

export default Logo;
