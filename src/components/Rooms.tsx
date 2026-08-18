import Icon from '@/components/ui/icon';
import { rooms } from '@/data/chat';
import { cn } from '@/lib/utils';

type RoomsProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

const Rooms = ({ activeRoom, onPick }: RoomsProps) => (
  <section id="etazhi" className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <h2 className="text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
        Шесть этажей
        <span className="block text-primary">— выбирай свой</span>
      </h2>
      <p className="max-w-[420px] text-[1.02rem] leading-[1.45] text-muted-foreground">
        Каждая комната — отдельная лента сообщений. Заходи куда хочешь, сиди сразу на нескольких этажах, никто не выгонит.
      </p>
    </div>

    <div className="mt-10 grid gap-px bg-foreground/25 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room, i) => {
        const active = room.id === activeRoom;
        return (
          <button
            key={room.id}
            onClick={() => onPick(room.id)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              'group animate-fade-in flex flex-col items-start gap-3 p-6 text-left transition-colors duration-200',
              active ? 'bg-secondary text-secondary-foreground' : 'bg-card text-card-foreground hover:bg-muted',
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span
                className={cn(
                  'font-display text-3xl font-extrabold leading-none tracking-[-0.04em]',
                  active ? 'text-secondary-foreground' : 'text-primary',
                )}
              >
                {room.floor}
              </span>
              <Icon name={room.icon} size={22} className={active ? 'opacity-70' : 'text-muted-foreground'} />
            </div>

            <h3 className="font-display text-xl font-extrabold uppercase tracking-[-0.02em]">{room.title}</h3>
            <p className={cn('text-[0.98rem] leading-[1.4]', active ? 'opacity-80' : 'text-muted-foreground')}>
              {room.about}
            </p>

            <span
              className={cn(
                'mt-2 inline-flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em]',
                active ? 'text-secondary-foreground' : 'text-secondary',
              )}
            >
              <span className={cn('h-2 w-2', active ? 'bg-secondary-foreground' : 'bg-nick-3')} />
              {room.online} в сети
              <span className="ml-1 opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

export default Rooms;
