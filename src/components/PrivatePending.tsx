import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { usePrivate } from '@/hooks/use-private';

const WAIT_SEC = 60;

const PrivatePending = () => {
  const { pendingNick, active, cancelInvite } = usePrivate();
  const [left, setLeft] = useState(WAIT_SEC);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pendingNick) return;
    setLeft(WAIT_SEC);
    const started = Date.now();
    const t = window.setInterval(() => {
      setLeft(Math.max(0, WAIT_SEC - Math.floor((Date.now() - started) / 1000)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [pendingNick]);

  if (!pendingNick || active) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full max-w-[420px] items-center gap-3 border-2 border-sky-400 bg-background px-4 py-3 shadow-[6px_6px_0_0_hsl(var(--foreground)/0.2)]">
        <Icon name="Hourglass" size={18} className="shrink-0 animate-pulse text-sky-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.88rem] text-foreground">
            Зовём в приват <span className="font-bold">{pendingNick}</span>
          </p>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.06em] text-muted-foreground">
            ждём ответа · {left} сек
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await cancelInvite();
            setBusy(false);
          }}
          className="flex shrink-0 items-center gap-1.5 border-2 border-foreground/35 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary hover:text-primary active:border-primary active:text-primary disabled:opacity-60"
        >
          <Icon name="X" size={14} />
          Отменить
        </button>
      </div>
    </div>
  );
};

export default PrivatePending;
