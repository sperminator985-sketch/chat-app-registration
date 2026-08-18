import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  autoReplies,
  Message,
  nickColorClass,
  onlineUsers,
  roomMessages,
  rooms,
} from '@/data/chat';

type ChatWindowProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

const ChatWindow = ({ activeRoom, onPick }: ChatWindowProps) => {
  const { user, openAuth } = useAuth();
  const room = useMemo(() => rooms.find((r) => r.id === activeRoom) ?? rooms[0], [activeRoom]);
  const [extra, setExtra] = useState<Record<string, Message[]>>({});
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => [...(roomMessages[room.id] ?? []), ...(extra[room.id] ?? [])],
    [room.id, extra],
  );

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (!user) {
      openAuth('register');
      return;
    }

    const mine: Message = {
      id: Date.now(),
      nick: user.nick,
      color: user.color,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      text,
      me: true,
    };
    setExtra((prev) => ({ ...prev, [room.id]: [...(prev[room.id] ?? []), mine] }));
    setDraft('');

    const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    setTyping(reply.nick);
    window.setTimeout(() => {
      setTyping(null);
      setExtra((prev) => ({
        ...prev,
        [room.id]: [
          ...(prev[room.id] ?? []),
          {
            id: Date.now() + 1,
            nick: reply.nick,
            color: reply.color,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            text: reply.text,
          },
        ],
      }));
    }, 1400);
  };

  return (
    <section id="chat" className="bg-card">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            Окно переписки
          </h2>
          <p className="max-w-[420px] text-[1.02rem] leading-[1.45] text-muted-foreground">
            Так это выглядит внутри: лента этажа, цветные ники и список тех, кто прямо сейчас в комнате.
          </p>
        </div>

        <div className="mt-10 grid gap-px border-2 border-foreground/35 bg-foreground/25 lg:grid-cols-[1fr_280px]">
          {/* лента */}
          <div className="flex min-h-[540px] flex-col bg-background">
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

            <div ref={feedRef} className="scrollbar-brut flex-1 space-y-3 overflow-y-auto px-5 py-5" style={{ maxHeight: 420 }}>
              {messages.map((m) => (
                <div key={m.id} className="animate-fade-in leading-[1.45]">
                  {m.system ? (
                    <p className="border-l-2 border-secondary bg-muted/60 px-3 py-1.5 font-mono text-[0.82rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {m.text}
                    </p>
                  ) : (
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[0.78rem] text-muted-foreground">[{m.time}]</span>
                      <span className={cn('font-semibold', nickColorClass[m.color])}>&lt;{m.nick}&gt;</span>
                      <span className={cn('text-[1.02rem]', m.me ? 'text-foreground' : 'text-foreground/90')}>
                        {m.text}
                      </span>
                    </p>
                  )}
                </div>
              ))}

              {typing && (
                <p className="animate-fade-in font-mono text-[0.85rem] text-muted-foreground">
                  {typing} печатает<span className="animate-caret">_</span>
                </p>
              )}
            </div>

            <form onSubmit={send} className="flex flex-col gap-3 border-t-2 border-foreground/35 px-5 py-4 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 py-2 focus-within:border-secondary">
                <span className={cn('font-semibold', user ? nickColorClass[user.color] : 'text-muted-foreground')}>
                  &lt;{user ? user.nick : 'гость'}&gt;
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={220}
                  placeholder={user ? 'Напиши что-нибудь этажу…' : 'Займи ник, чтобы писать'}
                  className="w-full bg-transparent text-[1.02rem] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </div>
              <button type="submit" className="btn-brut shrink-0">
                <Icon name="Send" size={16} />
                Отправить
              </button>
            </form>
          </div>

          {/* кто в чате */}
          <aside className="bg-background">
            <div className="border-b-2 border-foreground/35 px-4 py-4">
              <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Кто в чате · {onlineUsers.length + (user ? 1 : 0)}
              </h3>
            </div>
            <ul className="scrollbar-brut divide-y divide-foreground/15 overflow-y-auto" style={{ maxHeight: 460 }}>
              {user && (
                <li className="bg-muted/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-nick-3" />
                    <span className={cn('font-semibold', nickColorClass[user.color])}>{user.nick}</span>
                    <span className="ml-auto font-mono text-[0.7rem] uppercase text-secondary">это ты</span>
                  </div>
                  <p className="mt-1 pl-4 text-[0.88rem] text-muted-foreground">{user.status}</p>
                </li>
              )}
              {onlineUsers.map((u) => (
                <li key={u.nick} className="px-4 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-nick-3" />
                    <span className={cn('font-semibold', nickColorClass[u.color])}>{u.nick}</span>
                  </div>
                  <p className="mt-1 pl-4 text-[0.88rem] text-muted-foreground">{u.status}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ChatWindow;
