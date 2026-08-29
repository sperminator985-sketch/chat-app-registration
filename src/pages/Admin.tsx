import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { api, type AdminMessage, type AdminUser } from '@/lib/api';
import { nickColorClass, rooms } from '@/data/chat';
import { useToast } from '@/hooks/use-toast';

const seenText = (u: AdminUser) => {
  if (u.online) return 'в сети';
  if (u.seenAgo == null) return 'давно';
  const m = Math.floor(u.seenAgo / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
};

const AdminPanel = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<'users' | 'messages'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'banned' | 'online'>('all');
  const [denied, setDenied] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.adminUsers();
      setUsers(res.users);
      setDenied(false);
    } catch (e) {
      setDenied(true);
      toast({ title: (e as Error).message, variant: 'destructive' });
    }
  }, [toast]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.adminMessages(room || undefined);
      setMessages(res.messages);
      setDenied(false);
    } catch (e) {
      setDenied(true);
      toast({ title: (e as Error).message, variant: 'destructive' });
    }
  }, [room, toast]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (tab === 'users') loadUsers();
    else loadMessages();
  }, [user, loading, tab, room, navigate, loadUsers, loadMessages]);

  const hide = async (m: AdminMessage) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.adminHide(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      toast({ title: 'Сообщение удалено' });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleBan = async (u: AdminUser) => {
    if (busy) return;
    let reason = '';
    if (!u.banned) {
      const input = window.prompt(`За что выселяем «${u.nick}»?`, 'нарушение правил');
      if (input === null) return;
      reason = input;
    }
    setBusy(true);
    try {
      await api.adminBan({ id: u.id, ban: !u.banned, reason });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, banned: !u.banned, banReason: reason || null } : x)),
      );
      toast({ title: u.banned ? `${u.nick} снова в общаге` : `${u.nick} выселен` });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (u: AdminUser) => {
    if (busy) return;
    const input = window.prompt(
      `Полностью удалить «${u.nick}»? Пропадут все его сообщения и переписка, ник освободится.\n\nНапиши ник для подтверждения:`,
      '',
    );
    if (input === null) return;
    if (input.trim().toLowerCase() !== u.nick.toLowerCase()) {
      toast({ title: 'Ник не совпал — ничего не удалено', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await api.adminDelete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast({ title: `${u.nick} удалён без следа` });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const needle = search.trim().toLowerCase();
  const shownUsers = users
    .filter((u) => (filter === 'banned' ? u.banned : filter === 'online' ? u.online : true))
    .filter((u) =>
      needle ? u.nick.toLowerCase().includes(needle) || u.status.toLowerCase().includes(needle) : true,
    );
  const shownMessages = needle
    ? messages.filter((m) => m.nick.toLowerCase().includes(needle) || m.text.toLowerCase().includes(needle))
    : messages;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        загружаем…
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Icon name="Lock" size={40} className="text-primary" />
        <h1 className="font-display text-2xl font-extrabold uppercase">Комендантская закрыта</h1>
        <p className="max-w-sm text-muted-foreground">Эта страница только для владельца чата.</p>
        <button onClick={() => navigate('/')} className="btn-brut">
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b-2 border-foreground/35 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-4 py-3 md:px-8 md:py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-[0.04em] md:text-lg"
          >
            <Icon name="ChevronLeft" size={18} />
            Комендантская
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTab('users')}
              className={cn(
                'border-2 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] transition-colors',
                tab === 'users'
                  ? 'border-secondary bg-secondary text-secondary-foreground'
                  : 'border-foreground/35 text-muted-foreground hover:border-secondary',
              )}
            >
              Жильцы
            </button>
            <button
              onClick={() => setTab('messages')}
              className={cn(
                'border-2 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] transition-colors',
                tab === 'messages'
                  ? 'border-secondary bg-secondary text-secondary-foreground'
                  : 'border-foreground/35 text-muted-foreground hover:border-secondary',
              )}
            >
              Сообщения
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <div className="relative mb-5">
          <Icon
            name="Search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'users' ? 'Поиск по нику или статусу' : 'Поиск по нику или тексту'}
            className="w-full border-2 border-foreground/35 bg-card py-2.5 pl-9 pr-9 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Очистить"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon name="X" size={15} />
            </button>
          )}
        </div>
        {tab === 'users' ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {([
                ['all', `Все · ${users.length}`],
                ['online', `В сети · ${users.filter((u) => u.online).length}`],
                ['banned', `Выселенные · ${users.filter((u) => u.banned).length}`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={cn(
                    'border-2 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors',
                    filter === id
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-foreground/35 text-muted-foreground hover:border-secondary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-4 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Показано: {shownUsers.length} из {users.length}
            </p>
            <div className="grid gap-px bg-foreground/25 md:grid-cols-2">
              {shownUsers.length === 0 && (
                <p className="bg-card px-4 py-6 text-center text-muted-foreground md:col-span-2">
                  {filter === 'banned' ? 'Выселенных нет — в общаге тихо' : 'Никого не нашлось'}
                </p>
              )}
              {shownUsers.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    'flex items-center gap-3 bg-card p-4',
                    u.banned && 'opacity-60',
                  )}
                >
                  <Avatar avatar={u.avatar} avatarUrl={u.avatarUrl} color={u.color} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={cn('font-semibold', nickColorClass[u.color])}>{u.nick}</span>
                      {u.isAdmin && (
                        <span className="bg-secondary px-1.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase text-secondary-foreground">
                          владелец
                        </span>
                      )}
                      {u.banned && (
                        <span className="bg-primary px-1.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase text-primary-foreground">
                          выселен
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[0.78rem] text-muted-foreground">
                      {u.status} · {u.messages} сообщ. · с {u.since}
                    </p>
                    <p className="text-[0.72rem] uppercase tracking-[0.1em] text-muted-foreground/70">
                      <span className={u.online ? 'text-nick-3' : undefined}>{seenText(u)}</span>
                      {u.banReason ? ` · причина: ${u.banReason}` : ''}
                    </p>
                  </div>
                  {!u.isAdmin && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => toggleBan(u)}
                        disabled={busy}
                        title={u.banned ? 'Вернуть в общагу' : 'Выселить'}
                        className={cn(
                          'flex items-center gap-1.5 border-2 px-2.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors',
                          u.banned
                            ? 'border-nick-3 text-nick-3 hover:bg-nick-3 hover:text-background'
                            : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground',
                        )}
                      >
                        <Icon name={u.banned ? 'RotateCcw' : 'Ban'} size={14} />
                        <span className="hidden sm:inline">{u.banned ? 'Вернуть' : 'Выселить'}</span>
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        disabled={busy}
                        title="Удалить навсегда"
                        aria-label="Удалить навсегда"
                        className="flex h-[34px] w-[34px] items-center justify-center border-2 border-foreground/35 text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setRoom('')}
                className={cn(
                  'border-2 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors',
                  room === ''
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-foreground/35 text-muted-foreground hover:border-secondary',
                )}
              >
                Все этажи
              </button>
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoom(r.id)}
                  className={cn(
                    'border-2 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors',
                    room === r.id
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-foreground/35 text-muted-foreground hover:border-secondary',
                  )}
                >
                  {r.floor}
                </button>
              ))}
            </div>

            <div className="divide-y-2 divide-foreground/20 border-2 border-foreground/35 bg-card">
              {shownMessages.length === 0 && (
                <p className="px-4 py-6 text-center text-muted-foreground">
                  {needle ? 'Ничего не нашлось' : 'Сообщений нет'}
                </p>
              )}
              {shownMessages.map((m) => (
                <div key={m.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[0.72rem] text-muted-foreground">[{m.time}]</span>
                      <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-secondary">
                        {rooms.find((r) => r.id === m.room)?.title ?? m.room}
                      </span>
                      <span className={cn('font-semibold', nickColorClass[m.color])}>&lt;{m.nick}&gt;</span>
                    </p>
                    <p className="break-words text-[1rem] text-foreground/90">{m.text}</p>
                  </div>
                  <button
                    onClick={() => hide(m)}
                    disabled={busy}
                    title="Удалить сообщение"
                    className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Admin = () => (
  <AuthProvider>
    <AdminPanel />
  </AuthProvider>
);

export default Admin;