import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { usePolling } from '@/hooks/use-polling';
import { lastSeenText } from '@/lib/last-seen';
import { useAuth } from '@/hooks/use-auth';
import { getToken, api, ApiMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { nickColorClass, rooms } from '@/data/chat';
import { useDm } from '@/hooks/use-dm';
import { useCall } from '@/hooks/use-call';
import EmojiPicker from '@/components/EmojiPicker';

type ChatWindowProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

type OnlineItem = {
  nick: string;
  color: number;
  status: string;
  avatar?: number;
  avatarUrl?: string | null;
  seenAgo?: number | null;
};

const ChatWindow = ({ activeRoom, onPick }: ChatWindowProps) => {
  const { user, openAuth, signOut } = useAuth();
  const room = useMemo(() => rooms.find((r) => r.id === activeRoom) ?? rooms[0], [activeRoom]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [online, setOnline] = useState<OnlineItem[]>([]);
  const [recent, setRecent] = useState<OnlineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const { unreadBy: unread, openDm } = useDm();
  const { startCall } = useCall();
  const feedRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.feed(room.id, true);
      setMessages(data.messages);
      setOnline(data.online);
      setRecent(data.recent ?? []);
    } catch {
      /* тихо: следующий опрос попробует снова */
    } finally {
      setLoaded(true);
    }
  }, [room.id]);

  useEffect(() => {
    setLoaded(false);
  }, [room.id]);

  usePolling(load, 15000);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && getToken()) {
        api.away().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

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
    setSending(true);
    try {
      const res = await api.send({ text, room: room.id });
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
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

  const isEmpty = loaded && messages.length === 0;
  const onlineList: OnlineItem[] = online;

  if (!user) return null;

  return (
    <section id="chat" className="flex min-h-[calc(100vh-var(--top-offset,4.5rem))] flex-col bg-card lg:h-[calc(100vh-var(--top-offset,4.5rem))] lg:min-h-0">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
        <div className="grid flex-1 gap-px border-2 border-foreground/35 bg-foreground/25 lg:grid-cols-[1fr_280px]">
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-foreground/35 px-4 py-3 md:px-5 md:py-4">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <Icon name={room.icon} size={20} className="shrink-0 text-secondary" />
                <span className="truncate font-display text-base font-extrabold uppercase tracking-[-0.02em] md:text-lg">
                  Этаж {room.floor} · {room.title}
                </span>
              </div>
              <div className="order-last flex w-full items-center justify-center gap-1.5 md:order-none md:mx-auto md:w-auto md:gap-2">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onPick(r.id)}
                    title={r.title}
                    className={cn(
                      'h-7 w-7 border-2 font-mono text-[0.7rem] font-semibold transition-colors',
                      r.id === room.id
                        ? 'border-secondary bg-secondary text-secondary-foreground'
                        : 'border-foreground/35 text-muted-foreground hover:border-secondary hover:text-foreground',
                    )}
                  >
                    {r.floor}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setWhoOpen((v) => !v)}
                  title="Кто в чате"
                  className={cn(
                    'flex items-center gap-1.5 border-2 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition-colors lg:hidden',
                    whoOpen
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-foreground/35 text-muted-foreground hover:border-secondary',
                  )}
                >
                  <Icon name="Users" size={14} />
                  {onlineList.length}
                </button>
                <button
                  onClick={signOut}
                  title="Выйти из общаги"
                  className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon name="LogOut" size={14} />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              </div>
            </div>

            <div
              ref={feedRef}
              className="scrollbar-brut min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5"
            >
              {!loaded && (
                <p className="font-mono text-[0.85rem] text-muted-foreground">соединяемся с этажом…</p>
              )}

              {isEmpty && (
                <p className="border-l-2 border-secondary bg-muted/60 px-3 py-1.5 font-mono text-[0.82rem] uppercase tracking-[0.08em] text-muted-foreground">
                  на этаже пока тихо — напиши первым
                </p>
              )}

              {messages.map((m) => (
                <div key={m.id} className="animate-fade-in leading-[1.45]">
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span className="font-mono text-[0.78rem] text-muted-foreground">[{m.time}]</span>
                    <button
                      type="button"
                      onClick={() => openDm(m.nick)}
                      title={`Написать в личку: ${m.nick}`}
                      className={cn('font-semibold hover:underline', nickColorClass[m.color])}
                    >
                      &lt;{m.nick}&gt;
                    </button>
                    <span
                      className={cn(
                        'text-[1.02rem]',
                        user && m.nick === user.nick ? 'text-foreground' : 'text-foreground/90',
                      )}
                    >
                      {m.text}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={send} className="flex flex-col gap-3 border-t-2 border-foreground/35 px-5 py-4 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 py-2 focus-within:border-secondary">
                <span className={cn('font-semibold', user ? nickColorClass[user.color] : 'text-muted-foreground')}>
                  &lt;{user ? user.nick : 'гость'}&gt;
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={480}
                  placeholder={user ? 'Напиши что-нибудь этажу…' : 'Займи ник, чтобы писать'}
                  className="w-full bg-transparent text-[1.02rem] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <EmojiPicker onPick={(e) => setDraft((prev) => (prev + e).slice(0, 480))} />
                <button type="submit" disabled={sending} className="btn-brut flex-1 disabled:opacity-60 sm:flex-none">
                  <Icon name="Send" size={16} />
                  {sending ? 'Шлём…' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>

          <aside className={cn('min-h-0 flex-col bg-background lg:flex', whoOpen ? 'flex' : 'hidden')}>
            <div className="border-b-2 border-foreground/35 px-4 py-4 text-center">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Кто в чате · {onlineList.length}
              </h3>
              <p className="mt-1 text-[0.8rem] text-muted-foreground/80">Кликни по нику — откроется личка</p>
            </div>
            <ul className="scrollbar-brut min-h-0 flex-1 divide-y divide-foreground/15 overflow-y-auto">
              {onlineList.length === 0 && (
                <li className="px-4 py-4 text-center text-[0.8rem] text-muted-foreground/80">
                  Пока никого — ты первый
                </li>
              )}
              {onlineList.map((u) => {
                const isMe = Boolean(user && u.nick === user.nick);
                return (
                  <li key={u.nick} className={cn('relative', isMe && 'bg-muted/60')}>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => startCall(u.nick)}
                        title={`Видеозвонок: ${u.nick}`}
                        aria-label={`Видеозвонок: ${u.nick}`}
                        className="absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
                      >
                        <Icon name="Video" size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setWhoOpen(false);
                        openDm(u.nick);
                      }}
                      disabled={isMe}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold', nickColorClass[u.color as 1])}>{u.nick}</span>
                        {isMe ? (
                          <span className="ml-auto font-mono text-[0.7rem] uppercase text-secondary">это ты</span>
                        ) : unread[u.nick] ? (
                          <span className="ml-auto border-2 border-secondary bg-secondary px-1.5 font-mono text-[0.7rem] font-bold text-secondary-foreground">
                            {unread[u.nick]}
                          </span>
                        ) : (
                          <Icon name="Mail" size={13} className="ml-auto text-muted-foreground/60" />
                        )}
                      </div>
                      <p className="mt-1 text-[0.88rem] text-muted-foreground">{u.status}</p>
                    </button>
                  </li>
                );
              })}

              {recent.length > 0 && (
                <>
                  <li className="bg-muted/40 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    Заходили недавно
                  </li>
                  {recent.map((u) => (
                    <li key={`recent-${u.nick}`} className="opacity-70">
                      <button
                        type="button"
                        onClick={() => {
                          setWhoOpen(false);
                          openDm(u.nick);
                        }}
                        disabled={Boolean(user && u.nick === user.nick)}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('font-semibold', nickColorClass[u.color as 1])}>{u.nick}</span>
                          {unread[u.nick] ? (
                            <span className="ml-auto border-2 border-secondary bg-secondary px-1.5 font-mono text-[0.7rem] font-bold text-secondary-foreground">
                              {unread[u.nick]}
                            </span>
                          ) : (
                            <Icon name="Mail" size={13} className="ml-auto text-muted-foreground/60" />
                          )}
                        </div>
                        <p className="mt-1 font-mono text-[0.75rem] uppercase tracking-[0.06em] text-muted-foreground/70">
                          {lastSeenText(u.seenAgo)}
                        </p>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ChatWindow;