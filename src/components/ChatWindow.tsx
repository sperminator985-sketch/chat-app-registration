import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTouchInput } from '@/lib/touch';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { usePolling } from '@/hooks/use-polling';
import { useAuth } from '@/hooks/use-auth';
import { getToken, api, ApiMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { nickColorClass, rooms, isStaffNick, staffNickClass } from '@/data/chat';
import { usePrivate } from '@/hooks/use-private';
import { useCall } from '@/hooks/use-call';
import EmojiPicker from '@/components/EmojiPicker';
import { useTicker } from '@/hooks/use-ticker';
import UserCardDialog, { CardPerson } from '@/components/UserCardDialog';
import ResidentsDialog from '@/components/ResidentsDialog';

type ChatWindowProps = {
  activeRoom: string;
};

type OnlineItem = {
  nick: string;
  color: number;
  status: string;
  avatar?: number;
  avatarUrl?: string | null;
  seenAgo?: number | null;
  inPrivate?: boolean;
  away?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  gender?: 'm' | 'f' | null;
  since?: string | null;
};

const ChatWindow = ({ activeRoom }: ChatWindowProps) => {
  const { user, openAuth } = useAuth();
  const room = useMemo(() => rooms.find((r) => r.id === activeRoom) ?? rooms[0], [activeRoom]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [online, setOnline] = useState<OnlineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [residentsOpen, setResidentsOpen] = useState(false);
  const [cardPerson, setCardPerson] = useState<CardPerson | null>(null);

  const [clearedAt, setClearedAt] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ nick: string; color: number }[]>([]);
  const typingSentAt = useRef(0);
  const { invitePeer, pendingNick } = usePrivate();
  const { startCall } = useCall();
  const { setPending: setTickerPending } = useTicker();
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.feed(room.id, true);
      setMessages(data.messages);
      setOnline(data.online);
      setTypingUsers(data.typing ?? []);
      setTickerPending(data.tickerPending ?? 0);
    } catch {
      /* тихо: следующий опрос попробует снова */
    } finally {
      setLoaded(true);
    }
  }, [room.id]);

  useEffect(() => {
    setLoaded(false);
    const saved = Number(localStorage.getItem(`chat-cleared-${room.id}`) || 0);
    setClearedAt(saved);
  }, [room.id]);

  const clearFeed = useCallback(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : 0;
    localStorage.setItem(`chat-cleared-${room.id}`, String(lastId));
    setClearedAt(lastId);
  }, [messages, room.id]);

  usePolling(load, 5000);

  useEffect(() => {
    const onClear = () => clearFeed();
    const onResidents = () => setResidentsOpen(true);
    const onWho = () => setWhoOpen(true);
    window.addEventListener('chat:clear', onClear);
    window.addEventListener('chat:residents', onResidents);
    window.addEventListener('chat:who', onWho);
    return () => {
      window.removeEventListener('chat:clear', onClear);
      window.removeEventListener('chat:residents', onResidents);
      window.removeEventListener('chat:who', onWho);
    };
  }, [clearFeed]);

  useEffect(() => {
    const onLeave = () => {
      if (getToken()) api.away().catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
      else onLeave();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
    };
  }, [load]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!user) {
      openAuth('register');
      return;
    }
    const isTouch = isTouchInput();
    const afterSend = () => {
      setDraft('');
      if (isTouch) inputRef.current?.blur();
      else inputRef.current?.focus();
    };
    setSending(true);
    try {
      const res = await api.send({ text, room: room.id });
      setMessages((prev) => [...prev, res.message]);
      afterSend();
    } catch (err) {
      toast({
        title: 'Сообщение не ушло',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.id > clearedAt).map((m) => ({ ...m, key: `p-${m.id}` })),
    [messages, clearedAt],
  );
  const othersTyping = useMemo(
    () => typingUsers.filter((t) => !user || t.nick !== user.nick),
    [typingUsers, user],
  );

  const onlineList: OnlineItem[] = useMemo(
    () =>
      [...online].sort((a, b) => {
        if (user) {
          if (a.nick === user.nick) return -1;
          if (b.nick === user.nick) return 1;
        }
        return a.nick.localeCompare(b.nick, 'ru', { sensitivity: 'base' });
      }),
    [online, user],
  );
  const busyNicks = useMemo(
    () => new Set(online.filter((u) => u.inPrivate).map((u) => u.nick)),
    [online],
  );

  if (!user) return null;

  return (
    <section
      id="chat"
      style={{ height: 'calc(var(--app-h, 100svh) - var(--top-offset, 4.5rem))' }}
      className="flex min-h-0 flex-col overflow-hidden bg-card"
    >
      <div className="flex w-full min-h-0 flex-1 flex-col px-0 pb-0 pt-0 md:px-0 md:py-0">
        <div className="relative grid min-h-0 w-full flex-1 grid-rows-[minmax(0,1fr)_auto] gap-[2px] overflow-hidden bg-foreground/35 md:border-2 md:border-foreground/35 lg:mr-[278px]">
          <div className="flex min-h-0 min-w-0 flex-col bg-background lg:col-start-1 lg:row-start-1">
            <div
              ref={feedRef}
              onPointerDown={() => {
                if (isTouchInput() && document.activeElement === inputRef.current) inputRef.current?.blur();
              }}
              className="scrollbar-brut min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-5"
            >
              {!loaded && (
                <p className="font-mono text-[0.85rem] text-muted-foreground">соединяемся с этажом…</p>
              )}

              {visibleMessages.map((m) => (
                <div
                  key={m.key}
                  className="animate-fade-in leading-[1.3]"
                >
                  <p className="chat-font break-words [overflow-wrap:anywhere]">
                    <span className="mr-1.5 font-mono text-[0.66rem] text-muted-foreground sm:text-[0.78rem]">[{m.time}]</span>
                    <span
                      className={cn(
                        'mr-1.5 inline text-[0.82rem] font-normal sm:text-[0.92rem]',
                        isStaffNick(m.nick) ? 'font-bold text-red-500 [.day_&]:text-red-600' : nickColorClass[m.color],
                        busyNicks.has(m.nick) && 'opacity-40',
                      )}
                    >
                      &lt;{m.nick}&gt;
                    </span>
                    <span
                      className={cn(
                        'text-[0.95rem] leading-[1.35] sm:text-[0.94rem]',
                        user && m.nick === user.nick
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

          </div>

          <aside
            className={cn(
              'min-h-0 flex-col overflow-hidden bg-background lg:fixed lg:inset-y-0 lg:left-auto lg:right-0 lg:z-40 lg:flex lg:w-[280px] lg:border-2 lg:border-foreground/35',
              whoOpen ? 'absolute inset-0 z-30 flex' : 'hidden',
            )}
          >
            <div className="relative flex shrink-0 flex-col items-center justify-center border-b-2 border-foreground/35 px-2 py-4 text-center sm:px-4 md:py-3 lg:h-[var(--top-offset,68px)] lg:py-0">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Кто в чате · {onlineList.length}
              </h3>
              <button
                type="button"
                onClick={() => setWhoOpen(false)}
                title="Закрыть"
                aria-label="Закрыть"
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center outline-none lg:hidden"
              >
                <span className="flex h-10 w-10 items-center justify-center border-2 border-destructive text-destructive md:hidden">
                  <Icon name="X" size={18} />
                </span>
                <span className="hidden h-8 shrink-0 items-center gap-1.5 border-2 border-foreground/35 px-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary md:flex">
                  <Icon name="LogOut" size={14} />
                  Выйти
                </span>
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
                      onClick={() => setCardPerson(u as CardPerson)}
                      title={isMe ? 'Моя анкета' : `Анкета: ${u.nick}`}
                      className="flex min-w-0 flex-1 items-center gap-2 py-3 pl-2 text-left disabled:cursor-default sm:pl-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground/25 bg-muted">
                        {!isMe && !busy && u.away ? (
                          <span className="h-full w-full bg-destructive" title="Отошёл" />
                        ) : u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="User" size={18} className="text-muted-foreground" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn('break-all font-normal leading-tight', staffNickClass(u.nick, nickColorClass[u.color as 1]))}>
                          {u.nick}
                        </span>
                        {!isMe && !busy && u.away && (
                          <span className="mt-0.5 whitespace-nowrap font-mono text-[0.62rem] uppercase leading-none text-destructive">
                            отошёл
                          </span>
                        )}
                      </span>
                      {isMe ? (
                        <span className="shrink-0 whitespace-nowrap font-mono text-[0.7rem] uppercase text-secondary">это ты</span>
                      ) : busy ? (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[0.66rem] uppercase text-sky-300/70">
                          <Icon name="Lock" size={11} />
                          приват
                        </span>
                      ) : null}
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
          <div className="min-w-0 shrink-0 bg-background lg:col-start-1 lg:row-start-2">
            {othersTyping.length > 0 && (
              <div className="border-b-2 border-foreground/20 px-4 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.06em] text-secondary sm:px-5 sm:text-[0.72rem]">
                <span className="animate-pulse">
                  {othersTyping.map((t) => t.nick).join(', ')}{' '}
                  {othersTyping.length > 1 ? 'печатают…' : 'печатает…'}
                </span>
              </div>
            )}

            <form onSubmit={send} className="flex flex-row items-center gap-2 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-2.5">
              <div className="flex flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 py-1.5 focus-within:border-secondary">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    const now = Date.now();
                    if (user && e.target.value && now - typingSentAt.current > 4000) {
                      typingSentAt.current = now;
                      api.typing(room.id).catch(() => undefined);
                    }
                  }}
                  maxLength={480}
                  placeholder={
                    !user
                      ? 'Займи ник, чтобы писать'
                      : 'Напиши что-нибудь…'
                  }
                  className="chat-font w-full min-w-0 bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-[0.94rem]"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                <EmojiPicker onPick={(e) => setDraft((prev) => (prev + e).slice(0, 480))} />
                <button
                  type="submit"
                  disabled={sending}
                  aria-label="Отправить"
                  className="btn-brut !gap-1.5 !px-2.5 !py-2 !text-xs disabled:opacity-60 sm:!px-3"
                >
                  <Icon name="Send" size={14} />
                  <span className="hidden sm:inline">{sending ? 'Шлём…' : 'Отправить'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ResidentsDialog
        open={residentsOpen}
        onOpenChange={setResidentsOpen}
        onCard={setCardPerson}
        myNick={user?.nick}
      />

      <UserCardDialog person={cardPerson} onOpenChange={(v) => !v && setCardPerson(null)} />
    </section>
  );
};

export default ChatWindow;