import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, isServerDown, onServerStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const ServerDownBanner = () => {
  const [down, setDown] = useState(isServerDown());
  const [checking, setChecking] = useState(false);

  useEffect(() => onServerStatus(setDown), []);

  useEffect(() => {
    if (!down) return;
    const timer = window.setInterval(() => {
      api
        .feed('kurilka')
        .then(() => window.location.reload())
        .catch(() => undefined);
    }, 30000);
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

  if (!down) return null;

  return (
    <div className="border-b-2 border-foreground/35 bg-primary px-5 py-3 text-primary-foreground">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2">
        <Icon name="TriangleAlert" size={18} className="shrink-0" />
        <p className="min-w-0 flex-1 text-[0.78rem] font-semibold uppercase tracking-[0.08em] md:text-[0.85rem]">
          Свет в общаге мигает: сервер временно не отвечает. Чат и вход недоступны — скоро починим.
        </p>
        <button
          onClick={retry}
          disabled={checking}
          className={cn(
            'flex shrink-0 items-center gap-2 border-2 border-primary-foreground px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] transition-colors',
            checking ? 'opacity-70' : 'hover:bg-primary-foreground hover:text-primary',
          )}
        >
          <Icon name="RefreshCw" size={14} className={checking ? 'animate-spin' : undefined} />
          {checking ? 'Проверяю' : 'Обновить'}
        </button>
      </div>
    </div>
  );
};

export default ServerDownBanner;