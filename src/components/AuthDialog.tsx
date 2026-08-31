import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { AvatarId, NickColor, nickBgClass, nickColorClass, nickColors, rooms } from '@/data/chat';
import { toast } from '@/hooks/use-toast';

type Errors = { nick?: string; pass?: string; pass2?: string; agree?: string; answer?: string };

const SECRET_QUESTIONS = [
  'Кличка первого питомца?',
  'Девичья фамилия мамы?',
  'Название твоей школы?',
  'Любимое блюдо в детстве?',
  'Город, где ты родился?',
  'Имя лучшего друга детства?',
];

const AuthDialog = () => {
  const { authOpen, authTab, closeAuth, openAuth, register, login } = useAuth();
  const [busy, setBusy] = useState(false);

  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [color, setColor] = useState<NickColor>(1);
  const [avatar, setAvatar] = useState<AvatarId>(1);
  const [room, setRoom] = useState(rooms[1].id);
  const [agree, setAgree] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [question, setQuestion] = useState(SECRET_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');

  const [mode, setMode] = useState<'auth' | 'recover'>('auth');
  const [recNick, setRecNick] = useState('');
  const [recQuestion, setRecQuestion] = useState('');
  const [recAnswer, setRecAnswer] = useState('');
  const [recPass, setRecPass] = useState('');
  const [recShow, setRecShow] = useState(false);
  const [recError, setRecError] = useState('');
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
      if (answer.trim().length < 2) next.answer = 'Ответ от 2 символов — пригодится при восстановлении';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy) return;
    const chosen = rooms.find((r) => r.id === room) ?? rooms[0];
    setBusy(true);
    try {
      if (isRegister) {
        await register({
          nick: nick.trim(),
          password: pass,
          color,
          room: chosen.id,
          avatar,
          question,
          answer: answer.trim(),
        });
      } else {
        await login({ nick: nick.trim(), password: pass });
      }
      setPass('');
      setPass2('');
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Попробуй ещё раз';
      if (text.startsWith('Ты выселен')) {
        closeAuth();
      } else {
        toast({ title: 'Вахтёрша не пустила', description: text, variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  };

  const askQuestion = async () => {
    const n = recNick.trim();
    if (n.length < 3) {
      setRecError('Введи ник');
      return;
    }
    setBusy(true);
    setRecError('');
    try {
      const res = await api.recoverQuestion(n);
      setRecQuestion(res.question);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Не получилось');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (recAnswer.trim().length < 2) {
      setRecError('Введи ответ');
      return;
    }
    if (recPass.length < 5) {
      setRecError('Новый пароль от 5 символов');
      return;
    }
    setBusy(true);
    setRecError('');
    try {
      await api.recoverReset({ nick: recNick.trim(), answer: recAnswer.trim(), password: recPass });
      toast({ title: 'Пароль обновлён', description: 'Теперь войди с новым паролем' });
      setNick(recNick.trim());
      setPass('');
      setMode('auth');
      openAuth('login');
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Не получилось');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full border-2 border-foreground/35 bg-input px-3 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary sm:py-1.5 sm:text-[0.92rem]';

  return (
    <Dialog open={authOpen} onOpenChange={(v) => (v ? openAuth(authTab) : closeAuth())}>
      <DialogContent className="top-[5vh] max-h-[90vh] max-w-[520px] translate-y-0 overflow-y-auto border-2 border-foreground/40 bg-card p-0 text-card-foreground [&>button]:hidden">
        <div className="sticky top-0 z-20 flex border-b-2 border-foreground/35 bg-card">
          {(['register', 'login'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setErrors({});
                setMode('auth');
                openAuth(tab);
              }}
              className={cn(
                'flex-1 px-4 py-4 font-display text-sm font-extrabold sm:py-2.5 uppercase tracking-[0.08em] transition-colors',
                authTab === tab
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'register' ? 'Заселиться' : 'Я тут живу'}
            </button>
          ))}
          <button
            onClick={closeAuth}
            aria-label="Закрыть"
            className="flex w-14 shrink-0 items-center justify-center border-l-2 border-foreground/35 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {mode === 'recover' ? (
          <div className="space-y-5 px-6 pb-6 pt-5 sm:space-y-3 sm:pb-4 sm:pt-4">
            <div>
              <p className="font-display text-lg font-extrabold uppercase tracking-[0.06em]">
                Восстановление доступа
              </p>
              <p className="mt-1 text-[0.95rem] leading-[1.4] text-muted-foreground">
                Введи ник — вахтёрша задаст твой секретный вопрос.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                Ник
              </label>
              <input
                value={recNick}
                onChange={(e) => {
                  setRecNick(e.target.value);
                  setRecQuestion('');
                }}
                placeholder="твой ник"
                className={field}
              />
            </div>

            {recQuestion && (
              <>
                <div>
                  <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                    {recQuestion}
                  </label>
                  <input
                    value={recAnswer}
                    onChange={(e) => setRecAnswer(e.target.value)}
                    placeholder="ответ"
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                    Новый пароль
                  </label>
                  <div className="relative">
                    <input
                      type={recShow ? 'text' : 'password'}
                      value={recPass}
                      onChange={(e) => setRecPass(e.target.value)}
                      placeholder="••••••"
                      className={cn(field, 'pr-11')}
                    />
                    <button
                      type="button"
                      onClick={() => setRecShow((v) => !v)}
                      aria-label={recShow ? 'Скрыть пароль' : 'Показать пароль'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon name={recShow ? 'EyeOff' : 'Eye'} size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {recError && (
              <p className="flex items-center gap-1.5 text-[0.85rem] text-primary">
                <Icon name="TriangleAlert" size={14} />
                {recError}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={recQuestion ? resetPassword : askQuestion}
              className="btn-brut w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Секунду…' : recQuestion ? 'Сменить пароль' : 'Показать вопрос'}
            </button>

            <button
              type="button"
              onClick={() => setMode('auth')}
              className="w-full text-center text-[0.9rem] text-muted-foreground underline underline-offset-4 transition-colors hover:text-secondary"
            >
              Назад ко входу
            </button>
          </div>
        ) : (
        <form onSubmit={submit} className="space-y-5 px-6 pb-6 pt-5 sm:space-y-3 sm:pb-4 sm:pt-4">
          <p className="text-[0.98rem] leading-[1.4] text-muted-foreground sm:text-[0.85rem]">
            {isRegister
              ? 'Ник, пароль, цвет — и комната твоя. Почту не спрашиваем.'
              : 'Ник и пароль. Вахтёрша Зина проверит по журналу.'}
          </p>

          <div>
            <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
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

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••"
                  className={cn(field, 'pr-11', errors.pass && 'border-primary')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon name={showPass ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
              {errors.pass && <p className="mt-1.5 text-[0.85rem] text-primary">{errors.pass}</p>}
            </div>

            {isRegister && (
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                  Ещё раз
                </label>
                <div className="relative">
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    placeholder="••••••"
                    className={cn(field, 'pr-11', errors.pass2 && 'border-primary')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass2((v) => !v)}
                    aria-label={showPass2 ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon name={showPass2 ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                </div>
                {errors.pass2 && <p className="mt-1.5 text-[0.85rem] text-primary">{errors.pass2}</p>}
              </div>
            )}
          </div>

          {isRegister && (
            <>
              <div>
                <span className="mb-2 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
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
                        'h-8 w-8 border-2 transition-transform sm:h-6 sm:w-6',
                        nickBgClass[c],
                        color === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105',
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 flex items-center gap-2 text-[0.9rem] text-muted-foreground sm:mt-1.5 sm:text-[0.8rem]">
                  Так тебя увидят соседи:
                  <span className={cn('font-semibold', nickColorClass[color])}>
                    &lt;{nick.trim() || 'твой_ник'}&gt;
                  </span>
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
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

              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                  Секретный вопрос (для восстановления пароля)
                </label>
                <select
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className={cn(field, 'mb-2')}
                >
                  {SECRET_QUESTIONS.map((q) => (
                    <option key={q} value={q} className="bg-card">
                      {q}
                    </option>
                  ))}
                </select>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="твой ответ"
                  className={cn(field, errors.answer && 'border-primary')}
                />
                {errors.answer && (
                  <p className="mt-1.5 text-[0.85rem] text-primary">{errors.answer}</p>
                )}
              </div>

              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 border-2 px-3 py-2.5 text-[0.95rem] leading-[1.4] transition-colors sm:py-2 sm:text-[0.82rem]',
                  agree
                    ? 'border-secondary bg-secondary/10'
                    : errors.agree
                      ? 'animate-pulse border-primary bg-primary/10'
                      : 'border-foreground/30 hover:border-secondary',
                )}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[hsl(var(--secondary))]"
                />
                <span className={cn(agree ? 'text-foreground' : errors.agree ? 'text-primary' : 'text-muted-foreground')}>
                  Правила общаги прочитал. Обещаю соблюдать их как воинский устав.
                </span>
              </label>

              <p className="text-center text-[0.68rem] leading-[1.35] text-muted-foreground">
                Регистрируясь, ты соглашаешься с{' '}
                <Link
                  to="/privacy"
                  onClick={closeAuth}
                  className="underline underline-offset-4 transition-colors hover:text-secondary"
                >
                  политикой конфиденциальности
                </Link>{' '}
                Siberia Art Ltd.
              </p>
            </>
          )}

          <button
            type="submit"
            disabled={busy || (isRegister && !agree)}
            title={isRegister && !agree ? 'Сначала прими правила общаги' : undefined}
            className="btn-brut w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Секунду…' : isRegister ? 'Занять комнату' : 'Войти'}
          </button>

          {!isRegister && (
            <button
              type="button"
              onClick={() => {
                setRecNick(nick.trim());
                setRecQuestion('');
                setRecAnswer('');
                setRecPass('');
                setRecError('');
                setMode('recover');
              }}
              className="w-full text-center text-[0.9rem] text-muted-foreground underline underline-offset-4 transition-colors hover:text-secondary"
            >
              Забыл пароль
            </button>
          )}
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;