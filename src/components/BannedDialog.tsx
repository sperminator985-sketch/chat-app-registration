import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { clearBanned, getBanned, onBanned } from '@/lib/api';

const BannedDialog = () => {
  const [message, setMessage] = useState<string | null>(getBanned());

  useEffect(() => {
    const off = onBanned(setMessage);
    return () => {
      off();
    };
  }, []);

  const reason = message?.replace(/^Ты выселен из общаги:\s*/i, '').trim();

  return (
    <Dialog open={Boolean(message)} onOpenChange={(v) => (v ? undefined : clearBanned())}>
      <DialogContent className="max-w-[440px] border-2 border-primary bg-card p-0 text-card-foreground [&>button]:hidden">
        <div className="border-b-2 border-primary bg-primary px-6 py-4 text-primary-foreground">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold uppercase tracking-[0.02em]">
            <Icon name="DoorClosed" size={20} />
            Ключ не подошёл
          </p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          <p className="text-[1.05rem] leading-[1.45]">
            Ты выселен из общаги за нарушение правил.
          </p>

          {reason && (
            <p className="border-l-2 border-primary bg-muted/60 px-3 py-2 text-[0.92rem] text-muted-foreground">
              Причина: {reason}
            </p>
          )}

          <p className="text-[0.9rem] text-muted-foreground">
            Вход в чат закрыт. Если считаешь, что это ошибка — напиши коменданту.
          </p>

          <button onClick={clearBanned} className="btn-brut w-full">
            Понятно
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BannedDialog;
