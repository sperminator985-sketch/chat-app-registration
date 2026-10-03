import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const CallMaintenance = () => {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .adminCallMaintenance()
      .then((r) => setOn(r.on))
      .catch(() => setOn(null));
  }, []);

  const toggle = async () => {
    if (busy || on === null) return;
    setBusy(true);
    try {
      const r = await api.adminCallMaintenanceSet(!on);
      setOn(r.on);
      toast({
        title: r.on ? 'Технические работы включены' : 'Видеосвязь снова работает',
        description: r.on
          ? 'В течение 5 секунд у всех на звонке появится заставка, новые звонки не начнутся'
          : 'Жильцы снова могут звонить друг другу',
      });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('mt-6 border-2 bg-card px-3 py-3', on ? 'border-secondary' : 'border-foreground/35')}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="Wrench" size={16} className="text-secondary" />
        <span className="font-display text-[0.85rem] font-extrabold uppercase tracking-[0.04em]">
          Технические работы
        </span>
        <button
          onClick={toggle}
          disabled={busy || on === null}
          className={cn(
            'ml-auto flex items-center gap-1.5 border-2 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-60',
            on
              ? 'border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black'
              : 'border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground',
          )}
        >
          <Icon name={busy ? 'Loader2' : on ? 'Power' : 'Wrench'} size={13} className={cn(busy && 'animate-spin')} />
          {on ? 'Завершить работы' : 'Начать работы'}
        </button>
      </div>
      <p className="mt-2 text-[0.8rem] text-muted-foreground">
        {on === null
          ? 'Не удалось узнать состояние. Возможно, на хостинге старый api.php — обнови его.'
          : on
            ? 'Сейчас идут работы: у всех на видеосвязи вместо картинки заставка «Технические работы на сервере», новые звонки не проходят.'
            : 'Включи перед тем, как выключать сервер звонков: у всех на видеосвязи вместо картинки появится заставка, новые звонки начинаться не будут.'}
      </p>
    </div>
  );
};

export default CallMaintenance;
