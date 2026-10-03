import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { rooms, canEnterRoom } from '@/data/chat';
import { ChatRoom, ChatUser } from '@/components/chat/types';

type ChatHeaderProps = {
  room: ChatRoom;
  user: ChatUser;
  onPick: (id: string) => void;
  whoOpen: boolean;
  onToggleWho: () => void;
  onlineCount: number;
  onOpenResidents: () => void;
  onlyPrivate: boolean;
  onToggleOnlyPrivate: () => void;
  onClear: () => void;
  onSignOut: () => void;
};

const ChatHeader = ({
  room,
  user,
  onPick,
  whoOpen,
  onToggleWho,
  onlineCount,
  onOpenResidents,
  onlyPrivate,
  onToggleOnlyPrivate,
  onClear,
  onSignOut,
}: ChatHeaderProps) => (
  <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-foreground/35 px-4 py-3 md:px-5 md:py-4 lg:h-[68px]">
    <div className="flex min-w-0 shrink items-center gap-1.5 md:max-w-[34%] md:gap-3">
      <Icon name={room.icon} size={16} className="shrink-0 text-secondary md:h-5 md:w-5" />
      <span className="truncate font-display text-[0.58rem] font-extrabold uppercase tracking-[-0.03em] sm:text-base md:text-lg">
        Этаж {room.floor} · {room.title}
      </span>
    </div>
    <div className="order-last flex w-full items-center justify-center gap-1.5 md:pointer-events-none md:absolute md:inset-x-0 md:order-none md:w-full md:gap-2">
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
              'pointer-events-auto h-7 w-7 shrink-0 border-2 font-mono text-[0.7rem] font-semibold transition-colors',
              r.id === room.id
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
    <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
      <button
        onClick={onToggleWho}
        title="Кто в чате"
        className={cn(
          'flex items-center gap-1.5 border-2 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition-colors lg:hidden',
          whoOpen
            ? 'border-secondary bg-secondary text-secondary-foreground'
            : 'border-foreground/35 text-muted-foreground hover:border-secondary',
        )}
      >
        <Icon name="Users" size={14} />
        {onlineCount}
      </button>
      <button
        onClick={onOpenResidents}
        title="Кто зарегистрирован"
        className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
      >
        <Icon name="BookUser" size={14} />
        <span className="hidden sm:inline">Жильцы</span>
      </button>
      <button
        onClick={onToggleOnlyPrivate}
        title="Показывать только личные сообщения"
        className={cn(
          'flex items-center gap-1.5 border-2 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition-colors',
          onlyPrivate
            ? 'border-sky-400 bg-sky-400 text-background'
            : 'border-foreground/35 text-muted-foreground hover:border-sky-400 hover:text-sky-300',
        )}
      >
        <Icon name="Lock" size={14} />
        <span className="hidden sm:inline">Личные</span>
      </button>
      <button
        onClick={onClear}
        title="Очистить поле сообщений"
        className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
      >
        <Icon name="Eraser" size={14} />
        <span className="hidden sm:inline">Очистить</span>
      </button>
      <button
        onClick={onSignOut}
        title="Выйти из общаги"
        className="hidden items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary md:flex"
      >
        <Icon name="LogOut" size={14} />
        <span className="hidden sm:inline">Выйти</span>
      </button>
    </div>
  </div>
);

export default ChatHeader;
