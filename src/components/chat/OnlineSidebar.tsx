import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { nickColorClass, staffNickClass } from '@/data/chat';
import { CardPerson } from '@/components/UserCardDialog';
import { ChatUser, OnlineItem } from '@/components/chat/types';

type OnlineSidebarProps = {
  whoOpen: boolean;
  setWhoOpen: (v: boolean) => void;
  onlineList: OnlineItem[];
  user: ChatUser;
  pendingNick: string | null | undefined;
  unread: Record<string, number>;
  setPrivateTo: (nick: string | null) => void;
  setCardPerson: (p: CardPerson | null) => void;
  invitePeer: (nick: string) => void;
  startCall: (nick: string) => void;
};

const OnlineSidebar = ({
  whoOpen,
  setWhoOpen,
  onlineList,
  user,
  pendingNick,
  unread,
  setPrivateTo,
  setCardPerson,
  invitePeer,
  startCall,
}: OnlineSidebarProps) => (
  <aside
    className={cn(
      'min-h-0 flex-col overflow-hidden bg-background lg:static lg:z-auto lg:flex',
      whoOpen ? 'absolute inset-0 z-30 flex' : 'hidden',
    )}
  >
    <div className="relative flex shrink-0 flex-col items-center justify-center border-b-2 border-foreground/35 px-2 py-4 text-center sm:px-4 lg:h-[68px] lg:py-3">
      <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Кто в чате · {onlineList.length}
      </h3>
      <p className="mt-1 text-[0.8rem] leading-tight text-muted-foreground/80">Кликни по нику — появятся действия</p>
      <button
        type="button"
        onClick={() => setWhoOpen(false)}
        title="Закрыть"
        aria-label="Закрыть"
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-destructive text-destructive outline-none transition-colors duration-150 lg:hidden"
      >
        <Icon name="X" size={18} />
      </button>
    </div>
    <ul className="scrollbar-brut min-h-0 flex-1 divide-y divide-foreground/15 overflow-y-auto overscroll-contain">
      {onlineList.length === 0 && (
        <li className="px-4 py-4 text-center text-[0.8rem] text-muted-foreground/80">
          Пока никого — ты первый
        </li>
      )}
      {onlineList.map((u) => {
        const isMe = Boolean(user && u.nick === user.nick);
        const busy = Boolean(u.inPrivate);
        const waiting = pendingNick === u.nick;
        return (
          <li
            key={u.nick}
            className={cn(
              'flex items-center gap-1.5 pr-2 transition-colors hover:bg-muted/50 sm:pr-4',
              isMe && 'bg-muted/60',
              busy && !isMe && 'opacity-45',
            )}
          >
            <button
              type="button"
              onClick={() => {
                setWhoOpen(false);
                setPrivateTo(u.nick);
              }}
              disabled={isMe || busy}
              title={isMe ? undefined : busy ? `${u.nick} сейчас в привате` : `Написать: ${u.nick}`}
              className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-2 text-left disabled:cursor-default sm:pl-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground/25 bg-muted">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="User" size={14} className="text-muted-foreground" />
                )}
              </span>
              <span className={cn('min-w-0 flex-1 break-all font-normal leading-tight', staffNickClass(u.nick, nickColorClass[u.color as 1]))}>
                {u.nick}
              </span>
              {isMe ? (
                <span className="shrink-0 whitespace-nowrap font-mono text-[0.7rem] uppercase text-secondary">это ты</span>
              ) : busy ? (
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[0.66rem] uppercase text-sky-300/70">
                  <Icon name="Lock" size={11} />
                  приват
                </span>
              ) : unread[u.nick] ? (
                <span className="shrink-0 border-2 border-secondary bg-secondary px-1.5 font-mono text-[0.7rem] font-bold text-secondary-foreground">
                  {unread[u.nick]}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setCardPerson(u as CardPerson)}
              title={isMe ? 'Моя анкета' : `Анкета: ${u.nick}`}
              aria-label={isMe ? 'Моя анкета' : `Анкета: ${u.nick}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
            >
              <Icon name="Info" size={13} />
            </button>
            {!isMe && (
              <>
                <button
                  type="button"
                  onClick={() => invitePeer(u.nick)}
                  disabled={busy || waiting}
                  title={
                    busy
                      ? `${u.nick} сейчас в привате`
                      : waiting
                        ? 'Ждём ответа'
                        : `Позвать в приват: ${u.nick}`
                  }
                  aria-label={`Позвать в приват: ${u.nick}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:border-foreground/15 disabled:text-muted-foreground/40 disabled:hover:border-foreground/15 disabled:hover:text-muted-foreground/40"
                >
                  <Icon name={waiting ? 'Hourglass' : 'Lock'} size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => startCall(u.nick)}
                  disabled={busy}
                  title={busy ? `${u.nick} сейчас в привате` : `Видеозвонок: ${u.nick}`}
                  aria-label={`Видеозвонок: ${u.nick}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:border-foreground/15 disabled:text-muted-foreground/40 disabled:hover:border-foreground/15 disabled:hover:text-muted-foreground/40"
                >
                  <Icon name="Video" size={13} />
                </button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  </aside>
);

export default OnlineSidebar;
