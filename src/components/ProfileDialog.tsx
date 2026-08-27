import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { AvatarId, NickColor, nickBgClass, nickColorClass, nickColors, rooms } from '@/data/chat';
import { toast } from '@/hooks/use-toast';

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { user, saveProfile, signOut } = useAuth();
  const [status, setStatus] = useState('');
  const [color, setColor] = useState<NickColor>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && open) {
      setStatus(user.status);
      setColor(user.color);
    }
  }, [user, open]);

  if (!user) return null;

  const room = rooms.find((r) => r.id === user.room) ?? rooms[0];

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveProfile({
        status: status.trim() || 'молча наблюдает',
        color,
        avatar: (user.avatar ?? 1) as AvatarId,
      });
      toast({ title: 'Профиль обновлён', description: 'Соседи уже видят изменения.' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Не сохранилось',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-2 border-foreground/40 bg-card p-0 text-card-foreground">
        <div className="flex items-center gap-4 border-b-2 border-foreground/35 px-6 py-5">
          <div>
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Профиль жильца
            </p>
            <h3 className={cn('mt-1 font-display text-2xl font-extrabold', nickColorClass[color])}>{user.nick}</h3>
          </div>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-5">
          <div className="grid grid-cols-2 gap-px bg-foreground/25">
            <div className="bg-background px-4 py-3">
              <p className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">Этаж</p>
              <p className="mt-1 font-display text-lg font-extrabold">
                {room.floor} · {room.title}
              </p>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">В общаге с</p>
              <p className="mt-1 font-display text-lg font-extrabold">{user.since}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Статус
            </label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={40}
              placeholder="ушла за хлебом"
              className="w-full border-2 border-foreground/35 bg-input px-3 py-2.5 text-foreground outline-none transition-colors focus:border-secondary"
            />
          </div>

          <div>
            <span className="mb-2 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Цвет ника
            </span>
            <div className="flex flex-wrap gap-2">
              {nickColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                  className={cn(
                    'h-8 w-8 border-2 transition-transform',
                    nickBgClass[c],
                    color === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={save} disabled={busy} className="btn-brut flex-1 disabled:opacity-60">
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button
              onClick={() => {
                signOut();
                onOpenChange(false);
                toast({ title: 'Вышел из общаги', description: 'Свет на этаже мы не выключаем.' });
              }}
              className="btn-ghost-brut flex-1"
            >
              <Icon name="LogOut" size={16} />
              Выйти
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;