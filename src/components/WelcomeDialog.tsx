import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { nickColorClass, rooms } from '@/data/chat';
import Avatar from '@/components/Avatar';

const points = [
  { icon: 'UserCheck', text: 'Ник теперь твой навсегда — по нему тебя узнают на всех этажах.' },
  { icon: 'VolumeX', text: 'После 23:00 капсом не орут. КРИК вахтёрша Зина мутит на час.' },
  { icon: 'Tag', text: 'Объявления и продажи — только на этаже 03, Барахолка.' },
  { icon: 'Mail', text: 'Кликни по нику соседа — откроется личка. Разборки решают там.' },
  { icon: 'TriangleAlert', text: 'Этаж 08 — только 18+. Без имён и фото реальных людей.' },
];

const WelcomeDialog = () => {
  const { welcomeOpen, closeWelcome, user } = useAuth();
  if (!user) return null;

  const room = rooms.find((r) => r.id === user.room) ?? rooms[0];

  return (
    <Dialog open={welcomeOpen} onOpenChange={(open) => !open && closeWelcome()}>
      <DialogContent className="max-w-[520px] border-2 border-foreground/40 bg-background p-0">
        <div className="border-b-2 border-foreground/35 bg-secondary px-6 py-5 text-secondary-foreground">
          <p className="font-mono text-[0.74rem] font-semibold uppercase tracking-[0.18em] opacity-80">
            Комната {room.floor} · {room.title}
          </p>
          <p className="mt-2 flex items-center gap-3 font-display text-[1.7rem] font-extrabold leading-none tracking-[-0.03em]">
            <Avatar avatar={user.avatar} avatarUrl={user.avatarUrl} color={user.color} size={38} />
            Заселили, <span className={cn(nickColorClass[user.color], 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.35)]')}>{user.nick}</span>
          </p>
          <p className="mt-2 text-[0.95rem] leading-[1.4] opacity-90">
            Ключи выданы, свет включён. Пара правил, чтобы соседи были рады.
          </p>
        </div>

        <ul className="divide-y divide-foreground/15 px-6">
          {points.map((p) => (
            <li key={p.text} className="flex items-start gap-3 py-3">
              <Icon name={p.icon} size={17} className="mt-0.5 shrink-0 text-primary" />
              <span className="text-[0.97rem] leading-[1.45] text-foreground/90">{p.text}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t-2 border-foreground/35 px-6 py-4 sm:flex-row">
          <button onClick={closeWelcome} className="btn-brut flex-1">
            <Icon name="DoorOpen" size={16} />
            Понял, заселяюсь
          </button>
          <a
            href="#pravila"
            onClick={closeWelcome}
            className="flex flex-1 items-center justify-center gap-2 border-2 border-foreground/35 px-4 py-2 text-[0.95rem] font-semibold transition-colors hover:border-secondary hover:text-secondary"
          >
            Все правила
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;