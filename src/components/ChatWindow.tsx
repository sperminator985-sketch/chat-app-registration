import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { api, ApiMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { nickColorClass, roomMessages, rooms, onlineUsers as demoUsers } from '@/data/chat';
import { useDm } from '@/hooks/use-dm';
import { useCall } from '@/hooks/use-call';
import Avatar from '@/components/Avatar';
import EmojiPicker from '@/components/EmojiPicker';

type ChatWindowProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

type OnlineItem = { nick: string; color: number; status: string; avatar?: number; avatarUrl?: string | null };

const ChatWindow = ({ activeRoom, onPick }: ChatWindowProps) => {
  const { user, openAuth } = useAuth();
  const room = useMemo(() => rooms.find((r) => r.id === activeRoom) ?? rooms[0], [activeRoom]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [online, setOnline] = useState<OnlineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { unreadBy: unread, openDm } = useDm();
  const { startCall } = useCall();
  const feedRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.feed(room.id);
      setMessages(data.messages);
      setOnline(data.online);
    } catch {
      /* тихо: следующий опрос попробует снова */
    } finally {
      setLoaded(true);
    }
  }, [room.id]);

  useEffect(() => {
    setLoaded(false);
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
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

  const demoFeed = roomMessages[room.id] ?? [];
  const showDemo = loaded && messages.length === 0;
  const onlineList: OnlineItem[] = online.length ? online : demoUsers;

  return (
    <section id="chat" className="flex flex-col justify-center bg-card md:min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
        <h2 className="text-center text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          Окно переписки
        </h2>

        <div className="mt-10 grid gap-px border-2 border-foreground/35 bg-foreground/25 lg:grid-cols-[1fr_280px]">
          <div className="flex min-h-[400px] flex-col bg-background md:min-h-[540px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground/35 px-5 py-4">
              <div className="flex items-center gap-3">
                <Icon name={room.icon} size={20} className="text-secondary" />
                <span className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">
                  Этаж {room.floor} · {room.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
            </div>

            <div
              ref={feedRef}
              className="scrollbar-brut flex-1 space-y-3 overflow-y-auto px-5 py-5"
              style={{ maxHeight: 420 }}
            >
              {room.id === 'sex' && (
                <p className="flex items-start gap-2 border-2 border-primary bg-primary/10 px-3 py-2 text-[0.88rem] leading-[1.4] text-foreground">
                  <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0 text-primary" />
                  Этаж 18+. Только для совершеннолетних. Без имён и фото реальных людей, без несовершеннолетних,
                  без торговли услугами — за это выселяют сразу.
                </p>
              )}

              {!loaded && (
                <p className="font-mono text-[0.85rem] text-muted-foreground">соединяемся с этажом…</p>
              )}

              {showDemo && (
                <>
                  {demoFeed.map((m) => (
                    <div key={`demo-${m.id}`} className="leading-[1.45] opacity-60">
                      {m.system ? (
                        <p className="border-l-2 border-secondary bg-muted/60 px-3 py-1.5 font-mono text-[0.82rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {m.text}
                        </p>
                      ) : (
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-mono text-[0.78rem] text-muted-foreground">[{m.time}]</span>
                          <span className={cn('font-semibold', nickColorClass[m.color])}>&lt;{m.nick}&gt;</span>
                          <span className="text-[1.02rem] text-foreground/90">{m.text}</span>
                        </p>
                      )}
                    </div>
                  ))}
                  <p className="border-l-2 border-secondary bg-muted/60 px-3 py-1.5 font-mono text-[0.82rem] uppercase tracking-[0.08em] text-muted-foreground">
                    архив этажа. новые сообщения — ниже
                  </p>
                </>
              )}

              {messages.map((m) => (
                <div key={m.id} className="animate-fade-in leading-[1.45]">
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span className="font-mono text-[0.78rem] text-muted-foreground">[{m.time}]</span>
                    <Avatar avatar={m.avatar} avatarUrl={m.avatarUrl} color={m.color} size={40} />
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
                {user && <Avatar avatar={user.avatar} avatarUrl={user.avatarUrl} color={user.color} size={40} />}
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

          <aside className="bg-background">
            <div className="border-b-2 border-foreground/35 px-4 py-4">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Кто в чате · {onlineList.length}
              </h3>
              <p className="mt-1 text-[0.8rem] text-muted-foreground/80">Кликни по нику — откроется личка</p>
            </div>
            <ul className="scrollbar-brut divide-y divide-foreground/15 overflow-y-auto" style={{ maxHeight: 460 }}>
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
                      onClick={() => openDm(u.nick)}
                      disabled={isMe}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar avatar={u.avatar} avatarUrl={u.avatarUrl} color={u.color as 1} size={48} />
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
                      <p className="mt-1 pl-14 text-[0.88rem] text-muted-foreground">{u.status}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ChatWindow;