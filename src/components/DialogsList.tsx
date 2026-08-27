import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useDm } from '@/hooks/use-dm';
import { nickColorClass } from '@/data/chat';

const DialogsList = () => {
  const { listOpen, closeList, dialogs, openDm } = useDm();

  return (
    <Dialog open={listOpen} onOpenChange={(open) => !open && closeList()}>
      <DialogContent className="max-w-[460px] border-2 border-foreground/40 bg-background p-0">
        <div className="flex items-center gap-3 border-b-2 border-foreground/35 px-5 py-4">
          <Icon name="Mail" size={18} className="text-secondary" />
          <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[-0.02em]">
            Личные сообщения
          </p>
        </div>

        {dialogs.length === 0 ? (
          <p className="px-5 py-8 text-center text-[0.95rem] leading-[1.5] text-muted-foreground">
            Пока тишина. Кликни по нику соседа в чате — и завяжется переписка.
          </p>
        ) : (
          <ul className="scrollbar-brut divide-y divide-foreground/15 overflow-y-auto" style={{ maxHeight: 380 }}>
            {dialogs.map((d) => (
              <li key={d.nick}>
                <button
                  type="button"
                  onClick={() => openDm(d.nick)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/50"
                >
                  <Icon name="MessageSquare" size={16} className="shrink-0 text-muted-foreground" />
                  <span className={cn('font-semibold', nickColorClass[d.color])}>{d.nick}</span>
                  {d.unread > 0 && (
                    <span className="ml-auto border-2 border-secondary bg-secondary px-1.5 font-mono text-[0.72rem] font-bold text-secondary-foreground">
                      {d.unread}
                    </span>
                  )}
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
