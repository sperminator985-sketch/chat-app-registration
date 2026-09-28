import type { RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { ApiMessage } from '@/lib/api';
import { nickColorClass, isStaffNick } from '@/data/chat';
import type { Account } from '@/hooks/use-auth';

export type VisibleMessage = ApiMessage & {
  key: string;
  private: boolean;
  peer: string;
  outgoing: boolean;
};

type ChatFeedProps = {
  feedRef: RefObject<HTMLDivElement>;
  loaded: boolean;
  isEmpty: boolean;
  onlyPrivate: boolean;
  visibleMessages: VisibleMessage[];
  user: Account | null;
  busyNicks: Set<string>;
  onPrivateTo: (nick: string) => void;
};

const ChatFeed = ({
  feedRef,
  loaded,
  isEmpty,
  onlyPrivate,
  visibleMessages,
  user,
  busyNicks,
  onPrivateTo,
}: ChatFeedProps) => (
  <div
    ref={feedRef}
    className="scrollbar-brut min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-5"
  >
    {!loaded && (
      <p className="font-mono text-[0.85rem] text-muted-foreground">соединяемся с этажом…</p>
    )}

    {isEmpty && onlyPrivate && (
      <p className="whitespace-nowrap border-l-2 border-secondary bg-muted/60 px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.04em] text-muted-foreground sm:text-[0.82rem] sm:tracking-[0.08em]">
        личных сообщений пока нет
      </p>
    )}

    {visibleMessages.map((m) => (
      <div
        key={m.key}
        className={cn(
          'animate-fade-in leading-[1.3]',
          m.private &&
            'border-l-4 border-sky-400 bg-sky-400/25 px-2 py-1 [.day_&]:border-sky-600 [.day_&]:bg-sky-500/20',
        )}
      >
        <p className="chat-font flex flex-wrap items-baseline gap-x-1.5">
          {m.private && (
            <button
              type="button"
              onClick={() => onPrivateTo(m.peer)}
              className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] text-sky-200 hover:underline sm:text-[0.7rem] [.day_&]:text-sky-800"
            >
              {m.outgoing ? `лично → ${m.peer}` : `лично от ${m.peer}`}
            </button>
          )}
          <span className="font-mono text-[0.66rem] text-muted-foreground sm:text-[0.78rem]">[{m.time}]</span>
          <button
            type="button"
            onClick={() => user && m.nick !== user.nick && !busyNicks.has(m.nick) && onPrivateTo(m.nick)}
            disabled={busyNicks.has(m.nick)}
            title={busyNicks.has(m.nick) ? `${m.nick} сейчас в привате` : `Написать лично: ${m.nick}`}
            className={cn(
              'text-[0.82rem] font-normal hover:underline sm:text-[0.92rem]',
              isStaffNick(m.nick) ? 'font-bold text-red-500 [.day_&]:text-red-600' : nickColorClass[m.color],
              busyNicks.has(m.nick) && 'opacity-40 hover:no-underline',
            )}
          >
            &lt;{m.nick}&gt;
          </button>
          <span
            className={cn(
              'text-[0.95rem] leading-[1.35] sm:text-[0.94rem]',
              m.private
                ? 'font-medium text-foreground'
                : user && m.nick === user.nick
                  ? 'text-foreground'
                  : 'text-foreground/90',
            )}
          >
            {m.text}
          </span>
        </p>
      </div>
    ))}
  </div>
);

export default ChatFeed;