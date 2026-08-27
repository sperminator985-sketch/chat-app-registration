import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useDm } from '@/hooks/use-dm';
import { useCall } from '@/hooks/use-call';
import { nickColorClass } from '@/data/chat';
import { lastSeenText } from '@/lib/last-seen';

const DialogsList = () => {
  const { listOpen, closeList, dialogs, openDm, soundOn, toggleSound } = useDm();
  const { startCall } = useCall();

  return (
    <Dialog open={listOpen} onOpenChange={(open) => !open && closeList()}>
      <DialogContent className="max-w-[460px] border-2 border-foreground/40 bg-background p-0 [&>button]:hidden">
        <div className="flex items-center gap-2 border-b-2 border-foreground/35 px-4 py-4 sm:gap-3 sm:px-5">
          <Icon name="Mail" size={18} className="shrink-0 text-secondary" />
          <p className="font-display text-base font-extrabold uppercase leading-none tracking-[-0.02em] sm:text-lg">
            Личные сообщения
          </p>
          <button
            type="button"
            onClick={toggleSound}
            title={soundOn ? 'Выключить звук уведомлений' : 'Включить звук уведомлений'}
            className={cn(
              'ml-auto flex shrink-0 items-center gap-1.5 border-2 px-2 py-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:px-2.5',
              soundOn
                ? 'border-secondary text-secondary'
                : 'border-foreground/30 text-muted-foreground hover:border-secondary',
            )}
          >
            <Icon name={soundOn ? 'Volume2' : 'VolumeX'} size={14} />
            {soundOn ? 'Звук' : 'Тихо'}
          </button>
          <button
            type="button"
            onClick={closeList}
            aria-label="Закрыть"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        {dialogs.length === 0 ? (
          <p className="px-5 py-8 text-center text-[0.95rem] leading-[1.5] text-muted-foreground">
            Пока тишина. Кликни по нику соседа в чате — и завяжется переписка.
          </p>
        ) : (
          <ul className="scrollbar-brut divide-y divide-foreground/15 overflow-y-auto" style={{ maxHeight: 380 }}>
            {dialogs.map((d) => (
              <li key={d.nick} className="relative">
                <button
                  type="button"
                  onClick={() => openDm(d.nick)}
                  className="flex w-full items-center gap-3 py-3.5 pl-5 pr-16 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 shrink-0',
                      d.online ? 'bg-secondary' : 'bg-muted-foreground/50',
                    )}
                  />
                  <span className="min-w-0">
                    <span className={cn('block truncate font-semibold', nickColorClass[d.color])}>{d.nick}</span>
                    <span className="block font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {d.online ? 'в сети' : lastSeenText(d.seenAgo)}
                    </span>
                  </span>
                  {d.unread > 0 && (
                    <span className="ml-auto shrink-0 border-2 border-secondary bg-secondary px-1.5 font-mono text-[0.72rem] font-bold text-secondary-foreground">
                      {d.unread}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => startCall(d.nick)}
                  disabled={!d.online}
                  title={d.online ? `Видеозвонок: ${d.nick}` : `${d.nick} не в сети`}
                  aria-label={`Видеозвонок: ${d.nick}`}
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-2 border-foreground/30 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:border-foreground/15 disabled:text-muted-foreground/30 disabled:hover:border-foreground/15 disabled:hover:text-muted-foreground/30"
                >
                  <Icon name="Video" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DialogsList;