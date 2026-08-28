import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
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
  const { user, openAuth } = useAuth();
  const { unread, openList } = useDm();
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

  useEffect(() => {
    const base = 'Общага.Томск';
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
      const offset = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--top-offset') || '0',
      );
      const maxTop = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      );
      const gap = window.innerWidth < 768 ? 20 : 0;
      const wanted = el.getBoundingClientRect().top + window.scrollY - (offset || 0) + gap;
      return Math.min(Math.max(wanted, 0), maxTop);
    };

    const scroll = (behavior: ScrollBehavior) => {
      if (href === '#top') {
        window.scrollTo({ top: 0, behavior });
        return;
      }
      const top = targetTop();
      if (top !== null) window.scrollTo({ top, behavior });
    };

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        scroll('smooth');
        [350, 650, 950].forEach((delay) =>
          window.setTimeout(() => {
            const top = href === '#top' ? 0 : targetTop();
            if (top !== null && Math.abs(window.scrollY - top) > 4) {
              window.scrollTo({ top, behavior: 'auto' });
            }
          }, delay),
        );
      }),
    );
  };

  return (
    <header
      className={cn(
        'transition-colors duration-300',
        scrolled ? 'bg-background/95 backdrop-blur-sm' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 rule-bottom px-5 py-4 md:px-10">
        {user ? (
          <span className="font-display text-base font-extrabold tracking-[0.06em] text-foreground md:text-lg">
            ОБЩАГА<span className="text-secondary">.</span>ТОМСК
          </span>
        ) : (
          <a
            href="#top"
            onClick={go('#top')}
            className="font-display text-base font-extrabold tracking-[0.06em] text-foreground md:text-lg"
          >
            ОБЩАГА<span className="text-secondary">.</span>ТОМСК
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
              <button onClick={() => openAuth('register')} className="btn-brut !px-5 !py-2 text-xs">
                Регистрация
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          {user && mailButton()}
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