import Icon from '@/components/ui/icon';
import { rooms } from '@/data/chat';
import { cn } from '@/lib/utils';
import { useLiveStats } from '@/hooks/use-live-stats';

type RoomsProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

const Rooms = ({ activeRoom, onPick }: RoomsProps) => {
  const live = useLiveStats();

  const hottest = (() => {
    if (!live) return null;
    let best: string | null = null;
    let max = 0;
    rooms.forEach((r) => {
      const c = live.roomCounts[r.id] ?? 0;
      if (c > max) {
        max = c;
        best = r.id;
      }
    });
    return max >= 2 ? best : null;
  })();

  return (
  <section
    id="etazhi"
    className="mx-auto flex max-w-[1400px] flex-col justify-center px-5 py-16 md:min-h-screen md:px-10 md:py-20"
  >
    <h2 className="mt-10 text-center text-[clamp(1.15rem,3.6vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em] sm:whitespace-nowrap md:mt-16">
      Девять этажей <span className="text-primary">— выбирай свой</span>
    </h2>

    <div className="mt-10 grid gap-px bg-foreground/25 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room, i) => {
        const active = room.id === activeRoom;
        const count = live ? (live.roomCounts[room.id] ?? 0) : null;
        const hot = room.id === hottest;
        return (
          <button
            key={room.id}
            onClick={() => onPick(room.id)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              'group animate-fade-in relative flex h-full flex-col items-start gap-3 p-6 text-left transition-colors duration-200',
              active
                ? 'bg-secondary text-secondary-foreground'
                : hot
                  ? 'bg-card text-card-foreground ring-2 ring-inset ring-primary hover:bg-muted'
                  : 'bg-card text-card-foreground hover:bg-muted',
            )}
          >
            {hot && !active && (
              <span className="absolute right-0 top-0 flex items-center gap-1 bg-primary px-2 py-1 font-mono text-[0.66rem] font-bold uppercase tracking-[0.1em] text-primary-foreground">
                <Icon name="Flame" size={11} />
                Тут жизнь
              </span>
            )}
            <div className="flex w-full items-center justify-between">
              <span
                className={cn(
                  'font-display text-3xl font-extrabold leading-none tracking-[-0.04em]',
                  active ? 'text-secondary-foreground' : 'text-primary',
                )}
              >
                {room.floor}
              </span>
              <Icon
                name={room.icon}
                size={22}
                className={cn(active ? 'opacity-70' : 'text-muted-foreground', hot && !active && 'opacity-0')}
              />
            </div>

            <h3 className="font-display text-xl font-extrabold uppercase tracking-[-0.02em]">{room.title}</h3>
            <p className={cn('flex-1 text-[0.98rem] leading-[1.4]', active ? 'opacity-80' : 'text-muted-foreground')}>
              {room.about}
            </p>

            <span
              className={cn(
                'mt-auto inline-flex items-center gap-2 pt-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em]',
                active ? 'text-secondary-foreground' : 'text-secondary',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2',
                  active ? 'bg-secondary-foreground' : count === 0 ? 'bg-muted-foreground/50' : 'bg-nick-3',
                )}
              />
              {count === null ? '…' : count === 0 ? 'пусто' : `${count} в сети`}
              <span className="ml-1 opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
  );
};

export default Rooms;