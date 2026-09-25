import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { api, Resident } from '@/lib/api';
import { nickColorClass, staffNickClass } from '@/data/chat';
import { lastSeenText } from '@/lib/last-seen';
import { CardPerson } from '@/components/UserCardDialog';
import { useCall } from '@/hooks/use-call';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCard: (p: CardPerson) => void;
  onWrite: (nick: string) => void;
  myNick?: string;
};

const ResidentsDialog = ({ open, onOpenChange, onCard, onWrite, myNick }: Props) => {
  const [list, setList] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [uni, setUni] = useState('all');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const { startCall } = useCall();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError('');
    api
      .residents()
      .then((r) => alive && setList(r.residents ?? []))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Не вышло загрузить список'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  const unis = useMemo(() => {
    const set = new Set<string>();
    list.forEach((r) => r.uni && set.add(r.uni));
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((r) => {
        if (q && !r.nick.toLowerCase().includes(q)) return false;
        if (onlyOnline && !r.online) return false;
        if (uni === 'all') return true;
        if (uni === 'none') return !r.uni;
        return r.uni === uni;
      })
      .sort((a, b) => {
        if (myNick) {
          if (a.nick === myNick) return -1;
          if (b.nick === myNick) return 1;
        }
        if (Boolean(a.online) !== Boolean(b.online)) return a.online ? -1 : 1;
        if (!a.online && !b.online) {
          const aAgo = a.seenAgo ?? Number.MAX_SAFE_INTEGER;
          const bAgo = b.seenAgo ?? Number.MAX_SAFE_INTEGER;
          if (aAgo !== bAgo) return aAgo - bAgo;
        }
        return a.nick.localeCompare(b.nick, 'ru', { sensitivity: 'base' });
      });
  }, [list, query, uni, onlyOnline, myNick]);

  const onlineCount = useMemo(() => list.filter((r) => r.online).length, [list]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-svh max-h-svh w-screen !max-w-none flex-col overflow-hidden border-0 bg-background p-0 sm:h-auto sm:max-h-[85dvh] sm:w-[calc(100%-1.5rem)] sm:!max-w-[520px] sm:border-2 sm:border-foreground/40 [&>button]:hidden">
        <div className="flex shrink-0 items-center gap-2 border-b-2 border-foreground/35 px-3 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
          <Icon name="BookUser" size={18} className="shrink-0 text-secondary" />
          <p className="min-w-0 flex-1 truncate font-display text-base font-extrabold uppercase leading-none tracking-[-0.02em] sm:text-lg">
            Кто зарегистрирован
          </p>
          <span className="shrink-0 border-2 border-foreground/25 px-1.5 font-mono text-[0.72rem] text-muted-foreground">
            {filtered.length}
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            title="Закрыть"
            aria-label="Закрыть"
            className="flex h-8 shrink-0 items-center gap-1.5 border-2 border-foreground/35 px-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:px-2.5"
          >
            <Icon name="LogOut" size={14} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>

        <div className="shrink-0 border-b-2 border-foreground/25 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2 border-2 border-foreground/30 px-2 focus-within:border-secondary">
            <Icon name="Search" size={15} className="shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти ник…"
              className="w-full bg-transparent py-2 text-[0.95rem] outline-none placeholder:text-muted-foreground/70"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Очистить поиск"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={15} />
              </button>
            )}
          </div>

          <div className="scrollbar-brut mt-2 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setOnlyOnline((v) => !v)}
              title="Показать только тех, кто сейчас в сети"
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-2 px-2 py-1 font-mono text-[0.68rem] uppercase tracking-[0.06em] transition-colors',
                onlyOnline
                  ? 'border-secondary bg-secondary text-secondary-foreground'
                  : 'border-foreground/25 text-muted-foreground hover:border-secondary',
              )}
            >
              <span
                className={cn('h-2 w-2 shrink-0', onlyOnline ? 'bg-secondary-foreground' : 'bg-secondary')}
              />
              В сети · {onlineCount}
            </button>
          </div>

          {unis.length > 0 && (
            <div className="scrollbar-brut mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `Все · ${list.length}` },
                ...unis.map((u) => ({ id: u, label: u })),
                { id: 'none', label: 'Без вуза' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setUni(t.id)}
                  className={cn(
                    'shrink-0 border-2 px-2 py-1 font-mono text-[0.68rem] uppercase tracking-[0.06em] transition-colors',
                    uni === t.id
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-foreground/25 text-muted-foreground hover:border-secondary',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="flex-1 px-5 py-8 text-center font-mono text-[0.85rem] text-muted-foreground">
            загружаем список жильцов…
          </p>
        ) : error ? (
          <p className="flex-1 px-5 py-8 text-center text-[0.9rem] text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="flex-1 px-5 py-8 text-center text-[0.92rem] leading-[1.5] text-muted-foreground">
            {query
              ? `По запросу «${query}» никого не нашли`
              : onlyOnline
                ? 'Сейчас в сети никого нет'
                : 'Список пока пуст'}
          </p>
        ) : (
          <ul className="scrollbar-brut min-h-0 flex-1 divide-y divide-foreground/15 overflow-y-auto overscroll-contain">
            {filtered.map((r) => {
              const isMe = Boolean(myNick && r.nick === myNick);
              return (
                <li key={r.nick} className={cn('relative', isMe && 'bg-muted/60')}>
                  <div className="absolute right-2.5 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onCard(r as CardPerson)}
                      title={isMe ? 'Моя анкета' : `Анкета: ${r.nick}`}
                      aria-label={isMe ? 'Моя анкета' : `Анкета: ${r.nick}`}
                      className="flex h-7 w-7 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
                    >
                      <Icon name="Info" size={13} />
                    </button>
                    {!isMe && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onWrite(r.nick);
                            onOpenChange(false);
                          }}
                          title={`Написать лично: ${r.nick}`}
                          aria-label={`Написать лично: ${r.nick}`}
                          className="flex h-7 w-7 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-sky-400 hover:text-sky-300"
                        >
                          <Icon name="Mail" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false);
                            startCall(r.nick);
                          }}
                          disabled={!r.online}
                          title={r.online ? `Видеозвонок: ${r.nick}` : `${r.nick} не в сети`}
                          aria-label={`Видеозвонок: ${r.nick}`}
                          className="flex h-7 w-7 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:border-foreground/15 disabled:text-muted-foreground/30 disabled:hover:border-foreground/15 disabled:hover:text-muted-foreground/30"
                        >
                          <Icon name="Video" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-2 py-3 pl-3 sm:pl-5', isMe ? 'pr-12' : 'pr-[7.5rem]')}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground/25 bg-muted">
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon name="User" size={15} className="text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0',
                            r.online ? 'bg-secondary' : 'bg-muted-foreground/40',
                          )}
                        />
                        <span
                          className={cn(
                            'min-w-0 truncate text-[0.95rem] font-semibold',
                            staffNickClass(r.nick, nickColorClass[r.color]),
                          )}
                        >
                          {r.nick}
                        </span>
                        {isMe && (
                          <span className="shrink-0 font-mono text-[0.66rem] uppercase text-secondary">это ты</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[0.66rem] uppercase tracking-[0.06em] text-muted-foreground">
                        {r.uni ? `${r.uni} · ` : ''}
                        {r.online ? 'в сети' : lastSeenText(r.seenAgo)}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResidentsDialog;