import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = 'pwa-install-hidden';

const InstallPrompt = () => {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const close = () => {
    setShow(false);
    localStorage.setItem(KEY, '1');
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    close();
  };

  if (!show || !evt) return null;

  return (
    <div className="animate-fade-in fixed bottom-4 left-1/2 z-[100] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 border-2 border-foreground/40 bg-card p-4 shadow-[6px_6px_0_hsl(var(--foreground)/0.35)]">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 border-2 border-foreground/30" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.95rem] font-extrabold uppercase leading-tight">
            Установить общагу
          </p>
          <p className="mt-1 text-[0.82rem] text-muted-foreground">
            Иконка на экране телефона, запуск без браузера.
          </p>
        </div>
        <button onClick={close} aria-label="Закрыть" className="shrink-0 text-muted-foreground hover:text-primary">
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={install} className="btn-brut flex-1 py-2 text-[0.78rem]">
          Установить
        </button>
        <button
          onClick={close}
          className="border-2 border-foreground/35 px-4 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary"
        >
          Позже
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
