import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, isServerDown, onServerStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const ServerDownBanner = () => {
  const [down, setDown] = useState(isServerDown());
  const [checking, setChecking] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() =>
    onServerStatus((v) => {
      setDown(v);
      if (!v) setHidden(false);
    }),
  []);

  useEffect(() => {
    if (!down) return;
    const timer = window.setInterval(() => {
      api
        .feed('kurilka')
        .then(() => window.location.reload())
        .catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [down]);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await api.feed('kurilka');
      window.location.reload();
    } catch {
      setTimeout(() => setChecking(false), 800);
    }
  };

  if (!down || hidden) return null;

  return (
    <div className="border-b-2 border-foreground/35 bg-primary px-4 py-1.5 text-primary-foreground md:px-5 md:py-3">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 md:gap-3">
        <Icon name="TriangleAlert" size={16} className="shrink-0 md:h-[18px] md:w-[18px]" />
        <p className="min-w-0 flex-1 text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.06em] md:text-[0.85rem] md:tracking-[0.08em]">
          <span className="md:hidden">Сервер не отвечает — чат недоступен</span>
          <span className="hidden md:inline">
            Свет в общаге мигает: сервер временно не отвечает. Чат и вход недоступны — скоро починим.
          </span>
        </p>
        <button
          onClick={retry}
          disabled={checking}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-2 border-primary-foreground px-2 py-1 text-[0.66rem] font-bold uppercase tracking-[0.1em] transition-colors md:gap-2 md:px-3 md:py-1.5 md:text-[0.72rem] md:tracking-[0.12em]',
            checking ? 'opacity-70' : 'hover:bg-primary-foreground hover:text-primary',
          )}
        >
          <Icon name="RefreshCw" size={13} className={checking ? 'animate-spin' : undefined} />
          <span className="hidden sm:inline">{checking ? 'Проверяю' : 'Обновить'}</span>
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="Закрыть"
          title="Закрыть"
          className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-primary-foreground/60 transition-colors hover:bg-primary-foreground hover:text-primary md:h-8 md:w-8"
        >
          <Icon name="X" size={14} />
        </button>
      </div>
    </div>
  );
};

export default ServerDownBanner;