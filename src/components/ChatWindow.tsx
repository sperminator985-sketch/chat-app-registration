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
  const [clearedAt, setClearedAt] = useState(0);
  const [clearedDm, setClearedDm] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ nick: string; color: number }[]>([]);
  const [privateTo, setPrivateTo] = useState<string | null>(null);
  const [onlyPrivate, setOnlyPrivate] = useState(false);
  const [privateMsgs, setPrivateMsgs] = useState<(ApiMessage & { peer: string; outgoing: boolean })[]>([]);
  const typingSentAt = useRef(0);
  const { unreadBy: unread } = useDm();
  const { startCall } = useCall();
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.feed(room.id, true);
      setMessages(data.messages);
      setOnline(data.online);
      setRecent(data.recent ?? []);
      setTypingUsers(data.typing ?? []);
      const dm = await api.dmAll();
      setPrivateMsgs(dm.messages);
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
    setClearedDm(Number(localStorage.getItem('chat-cleared-dm') || 0));
  }, [room.id]);

  const clearFeed = useCallback(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : 0;
    localStorage.setItem(`chat-cleared-${room.id}`, String(lastId));
    setClearedAt(lastId);

    const lastDm = privateMsgs.reduce((max, m) => (m.id > max ? m.id : max), 0);
    localStorage.setItem('chat-cleared-dm', String(lastDm));
    setClearedDm(lastDm);
  }, [messages, privateMsgs, room.id]);

  usePolling(load, 5000);

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
      if (privateTo) {
        const res = await api.dmSend({ nick: privateTo, text });
        setPrivateMsgs((prev) => [...prev, { ...res.message, peer: privateTo, outgoing: true }]);
        setDraft('');
        inputRef.current?.focus();
        return;
      }
      const res = await api.send({ text, room: room.id });
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      inputRef.current?.focus();
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

  const visibleMessages = useMemo(() => {
    const openList = messages
      .filter((m) => m.id > clearedAt)
      .map((m) => ({ ...m, key: `p-${m.id}`, private: false, peer: '', outgoing: false }));
    const privList = privateMsgs
      .filter((m) => m.id > clearedDm)
      .map((m) => ({ ...m, key: `d-${m.id}`, private: true }));
    const rank = (t: string) => {
      const match = /(\d{2}):(\d{2})$/.exec(t || '');
      if (!match) return 0;
      const day = t.includes('вчера') ? -1 : 0;
      return day * 10000 + Number(match[1]) * 60 + Number(match[2]);
    };
    const all = onlyPrivate ? privList : [...openList, ...privList];
    return all.sort((a, b) => rank(a.time) - rank(b.time));
  }, [messages, clearedAt, privateMsgs, clearedDm, onlyPrivate]);
  const isEmpty = loaded && visibleMessages.length === 0;
  const othersTyping = useMemo(
    () => typingUsers.filter((t) => !user || t.nick !== user.nick),
    [typingUsers, user],
  );

  const onlineList: OnlineItem[] = online;

  if (!user) return null;

  return (
    <section id="chat" className="flex h-[calc(100svh-var(--top-offset,4.5rem))] min-h-0 flex-col overflow-hidden bg-card lg:h-[calc(100vh-var(--top-offset,4.5rem))]">
      <div className="mx-auto flex w-full min-h-0 max-w-[1400px] flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
        <div className="grid min-h-0 flex-1 gap-px overflow-hidden border-2 border-foreground/35 bg-foreground/25 lg:grid-cols-[1fr_280px]">
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-foreground/35 px-4 py-3 md:px-5 md:py-4 lg:h-[68px]">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <Icon name={room.icon} size={20} className="shrink-0 text-secondary" />
                <span className="truncate font-display text-[0.72rem] font-extrabold uppercase tracking-[-0.02em] sm:text-base md:text-lg">
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
                  onClick={() => setOnlyPrivate((v) => !v)}
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
                  onClick={clearFeed}
                  title="Очистить поле сообщений"
                  className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
                >
                  <Icon name="Eraser" size={14} />
                  <span className="hidden sm:inline">Очистить</span>
                </button>
                <button
                  onClick={signOut}
                  title="Выйти из общаги"
                  className="hidden items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary md:flex"
                >
                  <Icon name="LogOut" size={14} />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              </div>
            </div>

            <div
              ref={feedRef}
              className="scrollbar-brut min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5"
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
                    'animate-fade-in leading-[1.45]',
                    m.private && 'border-l-4 border-sky-400 bg-sky-400/15 px-2 py-1',
                  )}
                >
                  <p className="flex flex-wrap items-center gap-x-2">
                    {m.private && (
                      <button
                        type="button"
                        onClick={() => setPrivateTo(m.peer)}
                        className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-sky-300 hover:underline sm:text-[0.68rem]"
                      >
                        {m.outgoing ? `лично → ${m.peer}` : `лично от ${m.peer}`}
                      </button>
                    )}
                    <span className="font-mono text-[0.66rem] text-muted-foreground sm:text-[0.78rem]">[{m.time}]</span>
                    <button
                      type="button"
                      onClick={() => user && m.nick !== user.nick && setPrivateTo(m.nick)}
                      title={`Написать лично: ${m.nick}`}
                      className={cn('text-[0.84rem] font-semibold hover:underline sm:text-[1rem]', nickColorClass[m.color])}
                    >
                      &lt;{m.nick}&gt;
                    </button>
                    <span
                      className={cn(
                        'text-[0.86rem] sm:text-[1.02rem]',
                        user && m.nick === user.nick ? 'text-foreground' : 'text-foreground/90',
                      )}
                    >
                      {m.text}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {privateTo && (
              <div className="flex items-center gap-2 border-t-2 border-sky-400 bg-sky-400/15 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-sky-200 sm:px-5 sm:text-[0.78rem]">
                <Icon name="Lock" size={13} />
                <span className="truncate">Личное сообщение для {privateTo}</span>
                <button
                  type="button"
                  onClick={() => setPrivateTo(null)}
                  className="ml-auto shrink-0 border-2 border-sky-400 px-2 py-0.5 text-[0.66rem] uppercase text-sky-200 transition-colors hover:bg-sky-400 hover:text-background"
                >
                  Отмена
                </button>
              </div>
            )}

            {othersTyping.length > 0 && (
              <div className="border-t-2 border-foreground/20 px-4 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.06em] text-secondary sm:px-5 sm:text-[0.72rem]">
                <span className="animate-pulse">
                  {othersTyping.map((t) => t.nick).join(', ')}{' '}
                  {othersTyping.length > 1 ? 'печатают…' : 'печатает…'}
                </span>
              </div>
            )}

            <form onSubmit={send} className="flex flex-row items-center gap-2 border-t-2 border-foreground/35 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-2.5">
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
                      : privateTo
                        ? `Лично для ${privateTo}…`
                        : 'Напиши что-нибудь…'
                  }
                  className="w-full min-w-0 bg-transparent text-[0.82rem] text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-[0.92rem]"
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

          <aside className={cn('min-h-0 flex-col overflow-hidden bg-background lg:flex', whoOpen ? 'flex' : 'hidden')}>
            <div className="flex shrink-0 flex-col items-center justify-center border-b-2 border-foreground/35 px-4 py-4 text-center lg:h-[68px] lg:py-3">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Кто в чате · {onlineList.length}
              </h3>
              <p className="mt-1 text-[0.8rem] leading-tight text-muted-foreground/80">Кликни по нику — откроется личка</p>
            </div>
            <ul className="scrollbar-brut min-h-0 flex-1 divide-y divide-foreground/15 overflow-y-auto overscroll-contain">
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
                        setPrivateTo(u.nick);
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
                          setPrivateTo(u.nick);
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