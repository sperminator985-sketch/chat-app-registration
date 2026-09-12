import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { api, type TickerPost } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

type TickerDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const statusLabel: Record<TickerPost['status'], string> = {
  pending: 'на модерации',
  approved: 'в эфире',
  rejected: 'отклонено',
};

const statusClass: Record<TickerPost['status'], string> = {
  pending: 'border-amber-400 text-amber-400',
  approved: 'border-secondary text-secondary',
  rejected: 'border-primary text-primary',
};

const TickerDialog = ({ open, onOpenChange }: TickerDialogProps) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<TickerPost[]>([]);

  const load = useCallback(() => {
    api
      .tickerMy()
      .then((res) => setPosts(res.posts))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 3 || busy) return;
    setBusy(true);
    try {
      await api.tickerSend(value);
      setText('');
      toast({
        title: 'Отправлено коменданту',
        description: 'Появится в бегущей строке после проверки',
      });
      load();
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-2 border-foreground/40 bg-card p-0 text-card-foreground">
        <div className="border-b-2 border-foreground/35 px-5 py-4">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[0.06em]">
            Объявление в бегущую строку
          </h2>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            Комендант проверит текст, и он поедет по строке на главной.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 120))}
            placeholder="Например: ищу соседа по комнате на 3 этаже"
            className="w-full border-2 border-foreground/35 bg-input px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[0.75rem] text-muted-foreground">{text.length}/120</span>
            <button
              type="submit"
              disabled={busy || text.trim().length < 3}
              className="flex items-center gap-2 border-2 border-secondary bg-secondary px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-secondary-foreground transition-opacity disabled:opacity-40"
            >
              <Icon name="Send" size={14} />
              Отправить
            </button>
          </div>
        </form>

        {posts.length > 0 && (
          <div className="max-h-[40vh] overflow-y-auto border-t-2 border-foreground/35 px-5 py-4">
            <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Мои объявления
            </p>
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} className="border-2 border-foreground/25 px-3 py-2">
                  <p className="text-[0.9rem] leading-snug">{p.text}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'border px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.08em]',
                        statusClass[p.status],
                      )}
                    >
                      {statusLabel[p.status]}
                    </span>
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{p.time}</span>
                  </div>
                  {p.status === 'rejected' && p.reason && (
                    <p className="mt-1.5 text-[0.8rem] text-muted-foreground">Причина: {p.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TickerDialog;
