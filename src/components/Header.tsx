import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import Wordmark from '@/components/Wordmark';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { nickColorClass } from '@/data/chat';
import { useDm } from '@/hooks/use-dm';
import { useWeather, formatTemp, degreeWord } from '@/hooks/use-weather';
import { useLiveStats } from '@/hooks/use-live-stats';

const guestLinks = [
  { href: '#etazhi', label: 'Этажи' },
  { href: '#pravila', label: 'Правила' },
];

type HeaderProps = {
  onProfile: () => void;
};

const Header = ({ onProfile }: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const { user, openAuth, signOut } = useAuth();
  const { unread, openList, soundOn, toggleSound } = useDm();
  const temp = useWeather();
  const live = useLiveStats();
  const links = user ? [] : guestLinks;

  const mailButton = (extra?: string) => (
    <button
      onClick={() => {
        setOpen(false);
        openList();
      }}
      aria-label="Личные сообщения"
      title="Личные сообщения"
      className={cn(
        'relative flex h-10 w-10 items-center justify-center border-2 text-foreground transition-colors hover:border-secondary hover:text-secondary',
        unread > 0 ? 'border-primary text-primary' : 'border-foreground/40',
        extra,
      )}
    >
      <Icon name="Mail" size={18} />
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 min-w-[20px] animate-pulse border-2 border-foreground/40 bg-primary px-1 font-mono text-[0.68rem] font-bold leading-[16px] text-primary-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );

  const soundButton = (extra?: string) => (
    <button
      onClick={toggleSound}
      aria-label={soundOn ? 'Выключить звук' : 'Включить звук'}
      title={soundOn ? 'Выключить звук уведомлений' : 'Включить звук уведомлений'}
      className={cn(
        'flex h-10 w-10 items-center justify-center border-2 transition-colors hover:border-secondary hover:text-secondary',
        soundOn ? 'border-foreground/40 text-foreground' : 'border-foreground/25 text-muted-foreground',
        extra,
      )}
    >
      <Icon name={soundOn ? 'Volume2' : 'VolumeX'} size={18} />
    </button>
  );

  useEffect(() => {
    const base = 'ЧАТ-ОБЩАГА';
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread]);

  useEffect(() => {
    if (user) {
      setActive('');
      return;
    }
    const onScroll = () => {
      const offset =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--top-offset') || '0',
        ) || 0;
      const line = offset + 8;
      let current = '';
      guestLinks.forEach((l) => {
        const el = document.querySelector(l.href);
        if (el && el.getBoundingClientRect().top <= line) current = l.href;
      });
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);

    const targetTop = () => {
      const el = document.querySelector(href);
      if (!el) return null;
      const bar = document.getElementById('topbar');
      const offset = bar
        ? bar.getBoundingClientRect().bottom
        : parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--top-offset') || '0',
          );
      const maxTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const gap = window.innerWidth < 768 ? 2 : 0;
      const wanted = el.getBoundingClientRect().top + window.scrollY - offset + gap;
      return Math.min(Math.max(wanted, 0), maxTop);
    };

    const align = () => {
      if (href === '#top') {
        window.scrollTo(0, 0);
        return;
      }
      const el = document.querySelector(href);
      const bar = document.getElementById('topbar');
      if (!el || !bar) return;
      for (let i = 0; i < 3; i += 1) {
        const delta = el.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
        if (Math.abs(delta) < 0.5) break;
        window.scrollBy(0, delta);
      }
    };

    const animate = () => {
      const from = window.scrollY;
      const first = href === '#top' ? 0 : targetTop();
      if (first === null) return;
      const duration = Math.min(900, Math.max(380, Math.abs(first - from) * 0.55));
      const start = performance.now();
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const target = href === '#top' ? 0 : (targetTop() ?? first);
        window.scrollTo(0, from + (target - from) * ease(t));
        if (t < 1) requestAnimationFrame(step);
        else requestAnimationFrame(align);
      };
      requestAnimationFrame(step);
    };

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        animate();
        [1000, 1500].forEach((delay) => window.setTimeout(align, delay));
      }),
    );
  };

  return (
    <header
      className={cn(
        'transition-colors duration-300',
        scrolled ? 'bg-background' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 rule-bottom py-4 pl-2.5 pr-5 md:gap-4 md:px-10">
        {user ? (
          <>
            <Wordmark className="md:hidden" />
            <Logo size="sm" className="hidden md:flex" />
          </>
        ) : (
          <a href="#top" onClick={go('#top')} className="min-w-0">
            <Wordmark className="md:hidden" />
            <Logo size="sm" className="hidden md:flex" />
          </a>
        )}

        {temp !== null && (
          <span className="hidden items-center gap-2 border-2 border-foreground/30 px-3 py-1.5 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:flex">
            <Icon
              name={temp <= 0 ? 'Snowflake' : 'Sun'}
              size={14}
              className={temp < 0 ? 'text-primary' : 'text-secondary'}
            />
            Сейчас за окном{' '}
            <span className={cn('text-[1.05rem] font-bold', temp < 0 ? 'text-primary' : 'text-secondary')}>
              {formatTemp(temp)}
            </span>{' '}
            {degreeWord(temp)}
          </span>
        )}

        <span className="hidden items-center gap-2 border-2 border-foreground/30 px-3 py-1.5 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:flex">
          <Icon name="Lightbulb" size={14} className="text-secondary" />
          Сейчас в чате{' '}
          <span className="flex items-center gap-1.5 text-[1.05rem] font-bold text-secondary">
            <span className="h-2 w-2 animate-pulse bg-secondary" />
            {live ? live.online : '—'}
          </span>
        </span>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={go(l.href)}
              className={cn('nav-link', active === l.href && 'nav-link-active')}
            >
              {l.label}
            </a>
          ))}
          {user ? (
            <>
              {mailButton()}
              {soundButton()}
              {user.isAdmin && (
                <Link
                  to="/admin"
                  title="Комендантская"
                  className="flex h-10 w-10 items-center justify-center border-2 border-secondary text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Icon name="Shield" size={18} />
                </Link>
              )}
              <button
                onClick={onProfile}
                className="flex items-center gap-2 border-2 border-foreground/40 px-4 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition-colors hover:border-secondary"
              >
                <span className={nickColorClass[user.color]}>{user.nick}</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAuth('login')} className="nav-link">
                Вход
              </button>
              <button onClick={() => openAuth('register')} className="nav-link">
                Регистрация
              </button>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 md:hidden">
          {temp !== null && !user && (
            <span className="flex min-w-0 items-center gap-1 border-2 border-foreground/30 px-2 py-1 text-[0.55rem] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground">
              <Icon
                name={temp <= 0 ? 'Snowflake' : 'Sun'}
                size={13}
                className={cn('shrink-0', temp < 0 ? 'text-primary' : 'text-secondary')}
              />
              <span className="whitespace-nowrap">В Томске</span>
              <span className={cn('text-[0.72rem] font-bold', temp < 0 ? 'text-primary' : 'text-secondary')}>
                {formatTemp(temp)}°
              </span>
            </span>
          )}
          {user && mailButton()}
          {user && soundButton()}
          {user && (
            <button
              onClick={signOut}
              aria-label="Выйти"
              title="Выйти из общаги"
              className="flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name="LogOut" size={18} />
            </button>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <Icon name={open ? 'X' : 'Menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-b-2 border-foreground/35 bg-card px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {temp !== null && (
              <span className="flex items-center gap-2 border-2 border-foreground/30 px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <Icon
                  name={temp <= 0 ? 'Snowflake' : 'Sun'}
                  size={14}
                  className={temp < 0 ? 'text-primary' : 'text-secondary'}
                />
                За окном{' '}
                <span className={cn('text-[1.05rem] font-bold', temp < 0 ? 'text-primary' : 'text-secondary')}>
                  {formatTemp(temp)}
                </span>{' '}
                {degreeWord(temp)}
              </span>
            )}
            <span className="flex items-center gap-2 border-2 border-foreground/30 px-3 py-2 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <Icon name="Lightbulb" size={14} className="text-secondary" />
              Сейчас в чате
              <span className="ml-auto flex items-center gap-1.5 font-mono text-[1.05rem] font-bold leading-none text-secondary">
                <span className="h-2 w-2 animate-pulse bg-secondary" />
                {live ? live.online : '—'}
              </span>
            </span>
            {links.map((l) => (
              <a
              key={l.href}
              href={l.href}
              onClick={go(l.href)}
              className={cn('nav-link', active === l.href && 'nav-link-active')}
            >
                {l.label}
              </a>
            ))}
            {user ? (
              <>
                <button
                  onClick={() => {
                    setOpen(false);
                    openList();
                  }}
                  className="btn-ghost-brut flex items-center justify-center gap-2"
                >
                  Личные сообщения
                  {unread > 0 && (
                    <span className="min-w-[22px] bg-primary px-1 font-mono text-[0.72rem] font-bold leading-[18px] text-primary-foreground">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    onProfile();
                  }}
                  className="btn-ghost-brut"
                >
                  Профиль — {user.nick}
                </button>
                {user.isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="btn-ghost-brut text-center">
                    Комендантская
                  </Link>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                <button
                  onClick={() => {
                    setOpen(false);
                    openAuth('login');
                  }}
                  className="btn-ghost-brut"
                >
                  Вход
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    openAuth('register');
                  }}
                  className="btn-brut"
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;