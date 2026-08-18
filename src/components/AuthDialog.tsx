import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { NickColor, nickBgClass, nickColorClass, nickColors, rooms } from '@/data/chat';
import { toast } from '@/hooks/use-toast';

type Errors = { nick?: string; pass?: string; pass2?: string; agree?: string };

const AuthDialog = () => {
  const { authOpen, authTab, closeAuth, openAuth, signIn } = useAuth();

  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [color, setColor] = useState<NickColor>(1);
  const [room, setRoom] = useState(rooms[1].id);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const isRegister = authTab === 'register';

  const validate = () => {
    const next: Errors = {};
    const n = nick.trim();
    if (n.length < 3) next.nick = 'Ник от 3 символов — короче не пускают';
    else if (n.length > 18) next.nick = 'Ник до 18 символов';
    else if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(n)) next.nick = 'Только буквы, цифры и подчёркивание';

    if (pass.length < 5) next.pass = 'Пароль от 5 символов';
    if (isRegister) {
      if (pass2 !== pass) next.pass2 = 'Пароли не совпадают';
      if (!agree) next.agree = 'Правила общаги надо принять';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const chosen = rooms.find((r) => r.id === room) ?? rooms[0];
    signIn({
      nick: nick.trim(),
      color,
      status: isRegister ? 'только заселился' : 'снова в сети',
      room: chosen.id,
      since: isRegister ? 'сегодня' : '2019',
    });
    toast({
      title: isRegister ? 'Комната твоя' : 'С возвращением',
      description: isRegister
        ? `Заселили на этаж ${chosen.floor} — ${chosen.title}. Ник ${nick.trim()} занят навсегда.`
        : `Свет на этаже ${chosen.floor} горит, ${nick.trim()}.`,
    });
    setPass('');
    setPass2('');
  };

  const field = 'w-full border-2 border-foreground/35 bg-input px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary';

  return (
    <Dialog open={authOpen} onOpenChange={(v) => (v ? openAuth(authTab) : closeAuth())}>
      <DialogContent className="max-w-[520px] border-2 border-foreground/40 bg-card p-0 text-card-foreground">
        <div className="flex border-b-2 border-foreground/35">
          {(['register', 'login'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setErrors({});
                openAuth(tab);
              }}
              className={cn(
                'flex-1 px-4 py-4 font-display text-sm font-extrabold uppercase tracking-[0.08em] transition-colors',
                authTab === tab
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'register' ? 'Заселиться' : 'Я тут живу'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 pb-6 pt-5">
          <p className="text-[0.98rem] leading-[1.4] text-muted-foreground">
            {isRegister
              ? 'Ник, пароль, цвет — и комната твоя. Почту не спрашиваем.'
              : 'Ник и пароль. Вахтёрша Зина проверит по журналу.'}
          </p>

          <div>
            <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ник
            </label>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="например, ночной_сторож"
              className={cn(field, errors.nick && 'border-primary')}
            />
            {errors.nick && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[0.85rem] text-primary">
                <Icon name="TriangleAlert" size={14} />
                {errors.nick}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Пароль
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••"
                className={cn(field, errors.pass && 'border-primary')}
              />
              {errors.pass && <p className="mt-1.5 text-[0.85rem] text-primary">{errors.pass}</p>}
            </div>

            {isRegister && (
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Ещё раз
                </label>
                <input
                  type="password"
                  value={pass2}
                  onChange={(e) => setPass2(e.target.value)}
                  placeholder="••••••"
                  className={cn(field, errors.pass2 && 'border-primary')}
                />
                {errors.pass2 && <p className="mt-1.5 text-[0.85rem] text-primary">{errors.pass2}</p>}
              </div>
            )}
          </div>

          {isRegister && (
            <>
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
                <p className="mt-2 text-[0.9rem] text-muted-foreground">
                  Так тебя увидят соседи:{' '}
                  <span className={cn('font-semibold', nickColorClass[color])}>
                    &lt;{nick.trim() || 'твой_ник'}&gt;
                  </span>
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Стартовый этаж
                </label>
                <select value={room} onChange={(e) => setRoom(e.target.value)} className={field}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id} className="bg-card">
                      {r.floor} — {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-[1.4]">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[hsl(var(--secondary))]"
                />
                <span className={cn(errors.agree ? 'text-primary' : 'text-muted-foreground')}>
                  Читал правила общаги: после 23:00 капсом не орут, реклама — только на барахолке.
                </span>
              </label>
            </>
          )}

          <button type="submit" className="btn-brut w-full">
            {isRegister ? 'Занять комнату' : 'Войти'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
