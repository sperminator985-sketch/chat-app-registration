import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { rooms, canEnterRoom } from '@/data/chat';

type FloorSwitcherProps = {
  activeRoom: string;
  onPick: (id: string) => void;
  className?: string;
};

const FloorSwitcher = ({ activeRoom, onPick, className }: FloorSwitcherProps) => {
  const { user } = useAuth();
  return (
    <div className={cn('flex items-center justify-center gap-1.5 md:gap-2', className)}>
      {rooms.map((r) => {
        const locked = Boolean(user) && !canEnterRoom(r.id, user?.uni, user?.isAdmin);
        return (
          <button
            key={r.id}
            onClick={() => onPick(r.id)}
            disabled={locked}
            aria-disabled={locked}
            title={
              locked
                ? user?.uni
                  ? `${r.title} — этаж другого вуза`
                  : `${r.title} — только для студентов`
                : r.title
            }
            className={cn(
              'h-7 w-7 shrink-0 border-2 font-mono text-[0.7rem] font-semibold transition-colors md:h-8 md:w-8 md:text-[0.76rem]',
              r.id === activeRoom
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : locked
                  ? 'cursor-not-allowed border-foreground/15 text-muted-foreground/35 opacity-50'
                  : 'border-foreground/35 text-muted-foreground hover:border-secondary hover:text-foreground',
            )}
          >
            {r.floor}
          </button>
        );
      })}
    </div>
  );
};

export default FloorSwitcher;
