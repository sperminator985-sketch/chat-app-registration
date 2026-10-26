import { useMemo, useRef, useState } from 'react';
import { PopoverAnchor } from '@radix-ui/react-popover';
import { useIsMobile } from '@/hooks/use-mobile';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { rooms, canEnterRoom } from '@/data/chat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type FloorMenuProps = {
  room: { id: string; floor: string | number; title: string; icon: string };
  onPick: (id: string) => void;
  className?: string;
};

const FloorMenu = ({ room, onPick, className }: FloorMenuProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const btnRef = useRef<HTMLButtonElement>(null);
  const barRef = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const bar = btnRef.current?.closest('.rule-bottom') ?? btnRef.current;
          return bar ? bar.getBoundingClientRect() : new DOMRect();
        },
      },
    }),
    [],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {isMobile && <PopoverAnchor virtualRef={barRef} />}
      <PopoverTrigger asChild>
        <button
          ref={btnRef}
          type="button"
          aria-label="Выбрать этаж"
          className={cn('flex min-w-0 flex-1 items-center gap-2 text-left [-webkit-tap-highlight-color:transparent]', className)}
        >
          <Icon name={room.icon} size={20} className="shrink-0 text-secondary" />
          <span className="truncate font-display text-[0.95rem] font-extrabold uppercase leading-tight tracking-[-0.03em]">
            Этаж {room.floor} · {room.title}
          </span>
          <Icon
            name="ChevronDown"
            size={18}
            className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={isMobile ? 'center' : 'start'}
        sideOffset={isMobile ? -2 : 12}
        avoidCollisions={!isMobile}
        className={cn(
          'w-[min(20rem,calc(100vw-1.25rem))] rounded-none border-2 border-foreground/40 bg-card p-1',
          !isMobile && 'max-h-[70dvh] overflow-y-auto overscroll-contain',
        )}
      >
        <ul className="flex flex-col">
          {rooms.map((r) => {
            const locked = Boolean(user) && !canEnterRoom(r.id, user?.uni, user?.isAdmin);
            const current = r.id === room.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onPick(r.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors md:py-2.5',
                    current
                      ? 'bg-secondary text-secondary-foreground'
                      : locked
                        ? 'cursor-not-allowed opacity-40'
                        : 'text-foreground active:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center border-2 font-mono text-[0.72rem] font-semibold',
                      current ? 'border-secondary-foreground/60' : 'border-foreground/35',
                    )}
                  >
                    {r.floor}
                  </span>
                  <Icon name={r.icon} size={16} className={cn('shrink-0', current ? '' : 'text-secondary')} />
                  <span className="min-w-0 flex-1 truncate text-[0.88rem] font-semibold">{r.title}</span>
                  {locked && <Icon name="Lock" size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default FloorMenu;
