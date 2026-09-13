import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { nickColorClass, staffNickClass } from '@/data/chat';
import { usePrivate } from '@/hooks/use-private';
import { startPrivateRinging } from '@/lib/notify-sound';

const PrivateInvite = () => {
  const { invite, answer } = usePrivate();

  useEffect(() => {
    if (!invite) return;
    const stop = startPrivateRinging();
    return () => stop();
  }, [invite]);

  useEffect(() => {
    if (!invite) return;
    const base = document.title.replace(/^Приват: .*? · /, '');
    document.title = `Приват: ${invite.nick} · ${base}`;
    return () => {
      document.title = document.title.replace(/^Приват: .*? · /, '');
    };
  }, [invite]);

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(open) => !open && answer(false)}>
      <DialogContent className="max-w-[420px] border-2 border-sky-400 bg-background p-0">
        <div className="flex items-center gap-3 border-b-2 border-sky-400 bg-sky-400/10 px-5 py-4">
          <Icon name="Lock" size={18} className="shrink-0 text-sky-300" />
          <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[-0.02em]">
            Зовут в приват
          </p>
        </div>
        <div className="px-5 py-5">
          <p className="text-[0.95rem] text-foreground">
            <span
              className={cn(
                'font-bold',
                invite ? staffNickClass(invite.nick, nickColorClass[invite.color as 1]) : '',
              )}
            >
              {invite?.nick}
            </span>{' '}
            зовёт тебя в закрытую комнату на двоих.
          </p>
          <p className="mt-2 text-[0.85rem] text-muted-foreground">
            Переписку не увидит никто, кроме вас двоих. Пока вы там — остальные не смогут вас позвать.
          </p>
          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={() => answer(true)}
              className="flex flex-1 items-center justify-center gap-1.5 border-2 border-sky-400 bg-sky-400 px-3 py-2 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-background transition-colors hover:bg-sky-300"
            >
              <Icon name="Check" size={15} />
              Зайти
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              className="flex flex-1 items-center justify-center gap-1.5 border-2 border-foreground/35 px-3 py-2 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name="X" size={15} />
              Отказаться
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateInvite;