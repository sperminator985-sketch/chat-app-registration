import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { AvatarId, NickColor, nickBgClass, nickColorClass, nickColors, rooms, canEnterRoom } from '@/data/chat';
import { toast } from '@/hooks/use-toast';

type Errors = { nick?: string; pass?: string; pass2?: string; agree?: string; answer?: string; email?: string };

const SECRET_QUESTIONS = [
  'Кличка первого питомца?',
  'Девичья фамилия мамы?',
  'Название твоей школы?',
  'Любимое блюдо в детстве?',
  'Город, где ты родился?',
  'Имя лучшего друга детства?',
];

const UNI_LIST = ['ТГУ', 'ТУСУР', 'СибГМУ', 'ТПУ', 'ТГАСУ', 'ТГПУ'];

const checkEmail = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return 'Без почты не заселим — на неё придёт код';
  if (/\s/.test(value)) return 'В адресе не должно быть пробелов';
  if (/[а-яА-ЯёЁ]/.test(value)) return 'Только латинские буквы — переключи раскладку';
  if (!value.includes('@')) return 'В адресе не хватает знака @';
  if ((value.match(/@/g) || []).length > 1) return 'В адресе только один знак @';

  const [name, domain] = value.split('@');
  if (!name) return 'Перед @ должно быть имя ящика';
  if (!domain) return 'После @ нужен адрес почты, например mail.ru';
  if (!domain.includes('.')) return 'В домене не хватает точки, например mail.ru';
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return 'Домен указан с ошибкой';
  }
  if (!/^[a-zA-Z0-9._%+-]+$/.test(name)) return 'В имени ящика есть недопустимые символы';
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) return 'Домен указан с ошибкой, например mail.ru';
  if (value.length > 120) return 'Слишком длинный адрес';
  return null;
};

const AuthDialog = () => {
  const { authOpen, authTab, closeAuth, openAuth, register, login, verifyEmail } = useAuth();
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [emailFree, setEmailFree] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [color, setColor] = useState<NickColor>(1);
  const [avatar, setAvatar] = useState<AvatarId>(1);
  const [room, setRoom] = useState(rooms[0].id);
  const [agree, setAgree] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [uni, setUni] = useState('');
  const [question, setQuestion] = useState(SECRET_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');

  const [mode, setMode] = useState<'auth' | 'recover' | 'verify'>('auth');
  const [recWay, setRecWay] = useState<'mail' | 'question'>('mail');
  const [recCode, setRecCode] = useState('');
  const [recMail, setRecMail] = useState('');
  const [recNick, setRecNick] = useState('');
  const [recQuestion, setRecQuestion] = useState('');
  const [recAnswer, setRecAnswer] = useState('');
  const [recPass, setRecPass] = useState('');
  const [recShow, setRecShow] = useState(false);
  const [recError, setRecError] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const isRegister = authTab === 'register';

  useEffect(() => {
    if (!isRegister || checkEmail(email)) {
      setEmailFree('idle');
      return;
    }
    setEmailFree('checking');
    const value = email.trim().toLowerCase();
    const t = window.setTimeout(() => {
      api
        .checkEmail(value)
        .then((res) => setEmailFree(res.free ? 'free' : 'taken'))
        .catch(() => setEmailFree('idle'));
    }, 500);
    return () => window.clearTimeout(t);
  }, [email, isRegister]);

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
      const emailError = checkEmail(email);
      if (emailError) next.email = emailError;
      else if (emailFree === 'taken') next.email = 'На эту почту уже кто-то заселился';
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
        const needVerify = await register({
          nick: nick.trim(),
          password: pass,
          color,
          room: chosen.id,
          avatar,
          question,
          answer: answer.trim(),
          uni: uni || undefined,
          email: email.trim(),
        });
        if (needVerify) {
          setCode('');
          setCodeError('');
          setMode('verify');
          toast({ title: 'Письмо ушло', description: `Код отправлен на ${email.trim()}` });
        }
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

  const confirmCode = async () => {
    if (code.trim().length < 4) {
      setCodeError('Введи код из письма');
      return;
    }
    setBusy(true);
    setCodeError('');
    try {
      await verifyEmail(code.trim());
      toast({ title: 'Почта подтверждена', description: 'Добро пожаловать в общагу' });
      setMode('auth');
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Код не подошёл');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    setCodeError('');
    try {
      await api.resendCode();
      toast({ title: 'Отправили ещё раз', description: 'Проверь почту и папку «Спам»' });
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Не получилось отправить');
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

  const sendRecoverCode = async () => {
    const n = recNick.trim();
    if (n.length < 3) {
      setRecError('Введи ник');
      return;
    }
    setBusy(true);
    setRecError('');
    try {
      const res = await api.recoverMailCode(n);
      setRecMail(res.email);
      toast({ title: 'Письмо ушло', description: `Код отправлен на ${res.email}` });
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Не получилось');
    } finally {
      setBusy(false);
    }
  };

  const resetByMail = async () => {
    if (recCode.trim().length < 4) {
      setRecError('Введи код из письма');
      return;
    }
    if (recPass.length < 5) {
      setRecError('Новый пароль от 5 символов');
      return;
    }
    setBusy(true);
    setRecError('');
    try {
      await api.recoverMailReset({ nick: recNick.trim(), code: recCode.trim(), password: recPass });
      toast({ title: 'Пароль обновлён', description: 'Теперь войди с новым паролем' });
      setNick(recNick.trim());
      setPass('');
      setRecCode('');
      setRecMail('');
      setMode('auth');
      openAuth('login');
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

        {mode === 'verify' ? (
          <div className="space-y-5 px-6 pb-6 pt-5 sm:space-y-3 sm:pb-4 sm:pt-4">
            <div>
              <p className="font-display text-lg font-extrabold uppercase tracking-[0.06em]">
                Подтверди почту
              </p>
              <p className="mt-1 text-[0.95rem] leading-[1.4] text-muted-foreground">
                Мы отправили код на {email.trim()}. Загляни в письмо — и в папку «Спам» тоже.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                Код из письма
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="Введите код"
                className={cn(
                  field,
                  'text-center font-mono text-xl',
                  code ? 'tracking-[0.4em]' : 'tracking-normal',
                  codeError && 'border-primary',
                )}
              />
              {codeError && <p className="mt-1.5 text-[0.85rem] text-primary">{codeError}</p>}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={confirmCode}
              className="btn-brut w-full justify-center disabled:opacity-60"
            >
              {busy ? 'Секунду…' : 'Подтвердить'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={resendCode}
              className="w-full text-center text-[0.9rem] text-muted-foreground underline underline-offset-4 transition-colors hover:text-secondary"
            >
              Отправить код ещё раз
            </button>
          </div>
        ) : mode === 'recover' ? (
          <div className="space-y-5 px-6 pb-6 pt-5 sm:space-y-3 sm:pb-4 sm:pt-4">
            <div>
              <p className="font-display text-lg font-extrabold uppercase tracking-[0.06em]">
                Восстановление доступа
              </p>
              <p className="mt-1 text-[0.95rem] leading-[1.4] text-muted-foreground">
                {recWay === 'mail'
                  ? 'Введи ник — вышлем код на почту, указанную при заселении.'
                  : 'Введи ник — вахтёрша задаст твой секретный вопрос.'}
              </p>
            </div>

            <div className="flex border-2 border-foreground/35">
              {(['mail', 'question'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setRecWay(w);
                    setRecError('');
                    setRecQuestion('');
                    setRecMail('');
                    setRecCode('');
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.1em] transition-colors',
                    recWay === w
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {w === 'mail' ? 'По почте' : 'По вопросу'}
                </button>
              ))}
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
                  setRecMail('');
                }}
                placeholder="твой ник"
                className={field}
              />
            </div>

            {recWay === 'mail' && recMail && (
              <>
                <div>
                  <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                    Код из письма на {recMail}
                  </label>
                  <input
                    value={recCode}
                    onChange={(e) => setRecCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="Введите код"
                    className={cn(
                      field,
                      'text-center font-mono text-xl',
                      recCode ? 'tracking-[0.4em]' : 'tracking-normal',
                    )}
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

            {recWay === 'question' && recQuestion && (
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
              onClick={
                recWay === 'mail'
                  ? recMail
                    ? resetByMail
                    : sendRecoverCode
                  : recQuestion
                    ? resetPassword
                    : askQuestion
              }
              className="btn-brut w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? 'Секунду…'
                : recWay === 'mail'
                  ? recMail
                    ? 'Сменить пароль'
                    : 'Выслать код на почту'
                  : recQuestion
                    ? 'Сменить пароль'
                    : 'Показать вопрос'}
            </button>

            {recWay === 'mail' && recMail && (
              <button
                type="button"
                disabled={busy}
                onClick={sendRecoverCode}
                className="w-full text-center text-[0.9rem] text-muted-foreground underline underline-offset-4 transition-colors hover:text-secondary"
              >
                Отправить код ещё раз
              </button>
            )}

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
              ? 'Ник, пароль, почта — и комната твоя. На почту придёт код подтверждения.'
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

          {isRegister && (
            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                Почта
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@mail.ru"
                autoComplete="email"
                spellCheck={false}
                className={cn(
                  field,
                  (errors.email || emailFree === 'taken') && 'border-primary',
                  !errors.email && emailFree === 'free' && 'border-secondary',
                )}
              />
              {errors.email || emailFree === 'taken' ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[0.85rem] text-primary">
                  <Icon name="TriangleAlert" size={14} />
                  {errors.email || 'На эту почту уже кто-то заселился'}
                </p>
              ) : emailFree === 'checking' ? (
                <p className="mt-1.5 text-[0.82rem] text-muted-foreground">Проверяем почту…</p>
              ) : emailFree === 'free' ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[0.85rem] text-secondary">
                  <Icon name="Check" size={14} />
                  Почта свободна
                </p>
              ) : (
                <p className="mt-1.5 text-[0.82rem] text-muted-foreground">
                  На неё придёт код подтверждения. Никакого спама.
                </p>
              )}
            </div>
          )}

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
                  {rooms
                    .filter((r) => canEnterRoom(r.id, uni))
                    .map((r) => (
                      <option key={r.id} value={r.id} className="bg-card">
                        {r.floor} — {r.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:mb-1 sm:text-[0.7rem]">
                  В каком Вузе Томска вы учитесь?
                </label>
                <select
                  value={uni}
                  onChange={(e) => {
                    const next = e.target.value;
                    setUni(next);
                    if (!canEnterRoom(room, next)) {
                      const first = rooms.find((r) => canEnterRoom(r.id, next));
                      if (first) setRoom(first.id);
                    }
                  }}
                  className={field}
                >
                  <option value="" className="bg-card">
                    Ни в каком! Я тупой.
                  </option>
                  {UNI_LIST.map((u) => (
                    <option key={u} value={u} className="bg-card">
                      {u}
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
            className="btn-brut w-full disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
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