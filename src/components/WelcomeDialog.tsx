import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { nickColorClass, rooms, staffNickClass } from '@/data/chat';
import Avatar from '@/components/Avatar';

const points = [
  { icon: 'UserCheck', title: 'Ник закреплён', text: 'Теперь он твой навсегда — по нему узнают на всех этажах.' },
  { icon: 'VolumeX', title: 'Тихий час', text: 'После 23:00 капсом не орут. КРИК вахтёрша Зина мутит на час.' },
  { icon: 'Tag', title: 'Барахолка', text: 'Объявления и продажи — только на этаже 03.' },
  { icon: 'Mail', title: 'Личка', text: 'Кликни по нику соседа — откроется личка. Разборки решают там.' },
  { icon: 'TriangleAlert', title: 'Уважение', text: 'Без травли, чужих фото и личных данных.' },
];

const windows = [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0];

const WelcomeDialog = () => {
  const { welcomeOpen, closeWelcome, user } = useAuth();
  if (!user) return null;

  const room = rooms.find((r) => r.id === user.room) ?? rooms[0];

  return (
    <Dialog open={welcomeOpen} onOpenChange={(open) => !open && closeWelcome()}>
      <DialogContent className="top-[4vh] max-h-[92vh] max-w-[560px] translate-y-0 overflow-y-auto border-2 border-foreground/45 bg-card p-0 text-card-foreground shadow-[10px_10px_0_0_hsl(var(--foreground)/0.25)] [&>button]:hidden">
        <div className="relative overflow-hidden border-b-2 border-foreground/40 bg-secondary px-6 pb-6 pt-5 text-secondary-foreground">
          <div className="pointer-events-none absolute -right-4 -top-3 grid grid-cols-4 gap-[3px] opacity-30">
            {windows.map((on, i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 0.9}s` }}
                className={cn(
                  'h-5 w-5 border border-secondary-foreground/40',
                  on ? 'animate-blink bg-secondary-foreground/70' : 'bg-secondary-foreground/15',
                )}
              />
            ))}
          </div>

          <p className="relative font-mono text-[0.7rem] font-bold uppercase tracking-[0.22em] opacity-70">
            Ордер на заселение №{String(user.id).padStart(4, '0')}
          </p>

          <div className="relative mt-4 flex items-center gap-4">
            <span className="relative shrink-0 border-2 border-secondary-foreground/60 bg-secondary-foreground/10 p-1.5">
              <Avatar avatar={user.avatar} avatarUrl={user.avatarUrl} color={user.color} size={54} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[0.82rem] font-extrabold uppercase tracking-[0.16em] opacity-75">
                Добро пожаловать
              </p>
              <p className="mt-0.5 truncate font-display text-[2rem] font-extrabold leading-none tracking-[-0.04em]">
                <span className={cn(staffNickClass(user.nick, nickColorClass[user.color]), 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]')}>
                  {user.nick}
                </span>
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-stretch gap-2">
            <span className="flex items-center gap-2 border-2 border-secondary-foreground/50 bg-secondary-foreground/10 px-3 py-1.5">
              <Icon name="KeyRound" size={15} />
              <span className="font-mono text-[0.78rem] font-bold uppercase tracking-[0.12em]">
                Комната {room.floor}
              </span>
            </span>
            <span className="flex items-center gap-2 border-2 border-secondary-foreground/50 bg-secondary-foreground/10 px-3 py-1.5">
              <Icon name="Building2" size={15} />
              <span className="font-mono text-[0.78rem] font-bold uppercase tracking-[0.12em]">
                {room.title}
              </span>
            </span>
            {user.uni && (
              <span className="flex items-center gap-2 border-2 border-secondary-foreground/50 bg-secondary-foreground/10 px-3 py-1.5">
                <Icon name="GraduationCap" size={15} />
                <span className="font-mono text-[0.78rem] font-bold uppercase tracking-[0.12em]">
                  {user.uni}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="border-b-2 border-foreground/25 bg-muted px-6 py-2.5">
          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Памятка жильца · 5 пунктов
          </p>
        </div>

        <ul className="px-6 py-1">
          {points.map((p, i) => (
            <li
              key={p.title}
              style={{ animationDelay: `${0.05 + i * 0.06}s` }}
              className="flex animate-fade-in items-start gap-3.5 border-b border-foreground/12 py-3 last:border-b-0"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 border-foreground/30 bg-primary/15 text-primary">
                <Icon name={p.icon} size={16} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[0.86rem] font-extrabold uppercase tracking-[0.1em] text-foreground">
                  {p.title}
                </span>
                <span className="mt-0.5 block text-[0.92rem] leading-[1.4] text-muted-foreground">
                  {p.text}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t-2 border-foreground/40 bg-muted/60 px-6 py-4 sm:flex-row">
          <button onClick={closeWelcome} className="btn-brut flex-1">
            <Icon name="DoorOpen" size={16} />
            Заселяюсь
          </button>
          <a
            href="#pravila"
            onClick={closeWelcome}
            className="btn-ghost-brut flex-1"
          >
            Все правила
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
