import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { press } from '@/lib/press';
import Logo from '@/components/Logo';
import FloorSwitcher from '@/components/FloorSwitcher';
import FloorMenu from '@/components/FloorMenu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useWeather, formatTemp, degreeWord, weatherIcon } from '@/hooks/use-weather';
import { useTheme, PALETTES } from '@/hooks/use-theme';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTicker } from '@/hooks/use-ticker';

const guestLinks = [
  { href: '#top', label: 'Главная' },
  { href: '#etazhi', label: 'Этажи' },
  { href: '#pravila', label: 'Правила' },
];

type HeaderProps = {
  onProfile: () => void;
  room?: { id: string; floor: string | number; title: string; icon: string };
  onPickRoom?: (id: string) => void;
};

const Header = ({ onProfile, room, onPickRoom }: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const { user, openAuth, signOut } = useAuth();
  const temp = useWeather();
  const { theme, toggle, palette, setPalette } = useTheme();
  const { openTicker, pending } = useTicker();
  const navigate = useNavigate();
  const links = user ? [] : guestLinks;

  const themeLabel = theme === 'day' ? 'Ночной режим' : 'Дневной режим';

  const themeButton = (extra?: string) => (
    <button
      onClick={toggle}
      aria-label={themeLabel}
      title={themeLabel}
      className={cn(
        'flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground transition-colors hover:border-secondary hover:text-secondary',
        extra,
      )}
    >
      <Icon name={theme === 'day' ? 'Moon' : 'Sun'} size={18} />
    </button>
  );

  const paletteButton = (extra?: string) =>
    theme === 'day' ? (
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Цвет дневной темы"
            title="Цвет дневной темы"
            className={cn(
              'flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground transition-colors hover:border-secondary hover:text-secondary',
              extra,
            )}
          >
            <Icon name="Palette" size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto rounded-none border-2 border-foreground/40 p-3">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Дневная тема
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                className={cn(
                  'flex items-center gap-2 border-2 px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] transition-colors',
                  palette === p.id ? 'border-primary text-primary' : 'border-foreground/25 hover:border-secondary',
                )}
              >
                <span className="h-4 w-4 shrink-0 border border-foreground/40" style={{ background: p.swatch }} />
                {p.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    ) : null;

  const tickerButton = (extra?: string) => {
    if (!user || (!user.isAdmin && !user.uni)) return null;
    const alert = Boolean(user.isAdmin) && pending > 0;
    return (
      <button
        onClick={() => {
          setOpen(false);
          if (user.isAdmin) navigate('/admin');
          else openTicker();
        }}
        aria-label="Бегущая строка"
        title={
          user.isAdmin
            ? alert
              ? `Объявлений на проверку: ${pending}`
              : 'Бегущая строка'
            : 'Объявление в бегущую строку'
        }
        className={cn(
          'relative flex h-10 w-10 items-center justify-center border-2 transition-colors hover:border-secondary hover:text-secondary',
          alert ? 'animate-pulse border-primary text-primary' : 'border-foreground/40 text-foreground',
          extra,
        )}
      >
        <Icon name="Megaphone" size={18} />
        {alert && (
          <span className="absolute -right-2 -top-2 min-w-[20px] border-2 border-foreground/40 bg-primary px-1 font-mono text-[0.68rem] font-bold leading-[16px] text-primary-foreground">
            {pending > 99 ? '99+' : pending}
          </span>
        )}
      </button>
    );
  };

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
      setActive(current || guestLinks[0].href);
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
        'relative transition-colors duration-300',
        scrolled ? 'bg-background' : 'bg-transparent',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-2 gap-y-3 py-4 pl-2.5 pr-5 md:flex-nowrap md:gap-x-3 md:px-6 lg:gap-x-4 lg:px-10',
          user ? 'rule-bottom md:border-b-0' : 'rule-bottom',
        )}
      >
        {user && room && onPickRoom ? (
          <>
            <div className="flex min-w-0 flex-1 md:hidden">
              <FloorMenu room={room} onPick={onPickRoom} />
            </div>
            <div className="hidden min-w-0 shrink items-center gap-2 md:flex md:flex-initial" title={`Этаж ${room.floor} · ${room.title}`}>
            <Icon name={room.icon} size={20} className="shrink-0 text-secondary" />
            <span className="truncate font-display text-[0.95rem] font-extrabold uppercase leading-tight tracking-[-0.03em] md:text-[0.9rem] xl:text-lg">
              Этаж {room.floor} · {room.title}
            </span>
            </div>
          </>
        ) : user ? (
          <>
            <Logo size="xs" iconAsLetter className="min-w-0 shrink overflow-hidden md:hidden" />
            <Logo size="sm" iconAsLetter className="hidden md:flex" />
          </>
        ) : (
          <>
            <a href="#top" onClick={go('#top')} className="shrink-0 md:hidden">
              <Logo size="xs" iconAsLetter />
            </a>
            <Logo size="sm" iconAsLetter className="hidden md:flex" />
          </>
        )}

        {user && room && onPickRoom && (
          <FloorSwitcher
            activeRoom={room.id}
            onPick={onPickRoom}
            className="hidden md:ml-2 md:flex md:w-auto"
          />
        )}

        {user && (
          <div className="hidden items-center gap-1.5 md:ml-auto md:flex lg:ml-2 lg:gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event('chat:residents'))}
              title="Кто зарегистрирован"
              aria-label="Жильцы"
              className="flex h-10 w-10 items-center justify-center gap-2 border-2 border-foreground/40 text-[0.76rem] lg:w-auto lg:px-3 font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-secondary hover:text-secondary"
            >
              <Icon name="BookUser" size={16} />
              <span className="hidden lg:inline">Жильцы</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('chat:clear'))}
              title="Очистить поле сообщений"
              aria-label="Очистить"
              className="flex h-10 w-10 items-center justify-center gap-2 border-2 border-foreground/40 text-[0.76rem] lg:w-auto lg:px-3 font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-secondary hover:text-secondary"
            >
              <Icon name="Eraser" size={16} />
              <span className="hidden lg:inline">Очистить</span>
            </button>
            {tickerButton()}
            {user.isAdmin && (
              <Link
                to="/admin"
                title="Комендантская"
                className="flex h-10 w-10 items-center justify-center border-2 border-secondary text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                <Icon name="Shield" size={18} />
              </Link>
            )}
          </div>
        )}

        {!user && (
        <div className="mx-auto hidden items-center gap-3 md:flex">
          {temp !== null && (
            <a
              href="https://yandex.ru/pogoda/ru/tomsk"
              target="_blank"
              rel="noopener noreferrer"
              title="Погода в Томске"
              className="hidden items-center gap-2 border-2 border-foreground/30 px-3 py-1.5 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-foreground lg:flex"
            >
              <Icon
                name={weatherIcon(temp)}
                size={14}
                className={temp < 0 ? 'text-primary' : 'text-secondary'}
              />
              Сейчас в Томске{' '}
              <span className={cn('text-[1.05rem] font-bold', temp < 0 ? 'text-primary' : 'text-secondary')}>
                {formatTemp(temp)}
              </span>{' '}
              {degreeWord(temp)}
            </a>
          )}
          <div className="relative mr-[52px] lg:mr-0">
            {themeButton()}
            <div className="absolute left-full top-0 ml-3">{paletteButton()}</div>
          </div>
        </div>
        )}

        <nav className={cn('hidden items-center md:flex', user ? 'gap-1.5 lg:ml-auto lg:gap-2 xl:gap-7' : 'gap-7')}>
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
              {paletteButton()}
              <button
                onClick={signOut}
                title="Выйти из общаги"
                aria-label="Выйти"
                className="flex h-10 w-10 items-center justify-center gap-2 border-2 border-foreground/40 text-[0.76rem] lg:w-auto lg:px-3 font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name="LogOut" size={16} />
                <span className="hidden lg:inline">Выйти</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" {...press(() => openAuth('login'))} className="nav-link">
                Вход
              </button>
              <button
                type="button"
                {...press(() => openAuth('register'))}
                className="nav-link"
              >
                Регистрация
              </button>
            </>
          )}
        </nav>

        {temp !== null && !user && (
          <a
            href="https://yandex.ru/pogoda/ru/tomsk"
            target="_blank"
            rel="noopener noreferrer"
            title="Погода в Томске"
            className="mx-auto flex min-w-0 shrink items-center gap-1 border-2 border-foreground/30 px-2 py-1 text-[0.55rem] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground md:hidden"
          >
            <Icon
              name={weatherIcon(temp)}
              size={13}
              className={cn('shrink-0', temp < 0 ? 'text-primary' : 'text-secondary')}
            />
            <span className="whitespace-nowrap">В Томске</span>
            <span className={cn('text-[0.72rem] font-bold', temp < 0 ? 'text-primary' : 'text-secondary')}>
              {formatTemp(temp)}°
            </span>
          </a>
        )}

        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          {user && (
            <>
              <button
                onClick={() => window.dispatchEvent(new Event('chat:residents'))}
                title="Кто зарегистрирован"
                aria-label="Жильцы"
                className="flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground active:border-secondary active:text-secondary"
              >
                <Icon name="BookUser" size={18} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new Event('chat:clear'))}
                title="Очистить поле сообщений"
                aria-label="Очистить"
                className="flex h-10 w-10 items-center justify-center border-2 border-foreground/40 text-foreground active:border-secondary active:text-secondary"
              >
                <Icon name="Eraser" size={18} />
              </button>
            </>
          )}
          <button
            className={cn(
              'flex h-10 w-10 items-center justify-center border-2',
              open ? 'border-destructive text-destructive' : 'border-foreground/40 text-foreground',
            )}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Меню'}
          >
            <Icon name={open ? 'X' : 'Menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-var(--top-offset,4.5rem)-0.75rem)] overflow-y-auto overscroll-contain border-b-2 border-foreground/35 bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_18px_30px_-12px_rgba(0,0,0,0.55)] md:hidden">
          <div className="flex flex-col gap-4">
            {!user && (
              <a
                href="#top"
                onClick={go('#top')}
                className="btn-ghost-brut flex items-center justify-center gap-2"
              >
                <Icon name="Home" size={16} />
                Главная
              </a>
            )}
            {!user && (
              <button onClick={toggle} className="btn-ghost-brut flex items-center justify-center gap-2">
                <Icon name={theme === 'day' ? 'Moon' : 'Sun'} size={16} />
                {themeLabel}
              </button>
            )}
            {theme === 'day' && (
              <div className="grid grid-cols-3 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    aria-label={p.label}
                    className={cn(
                      'flex flex-col items-center gap-1 border-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.06em]',
                      palette === p.id ? 'border-primary text-primary' : 'border-foreground/25 text-foreground',
                    )}
                  >
                    <span className="h-5 w-5 border border-foreground/40" style={{ background: p.swatch }} />
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {links.filter((l) => l.href !== '#top').map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={go(l.href)}
                className="btn-ghost-brut flex items-center justify-center gap-2"
              >
                <Icon name={l.href === '#etazhi' ? 'Building2' : 'ScrollText'} size={16} />
                {l.label}
              </a>
            ))}
            {user ? (
              <>
                {(user.isAdmin || user.uni) && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      if (user.isAdmin) navigate('/admin');
                      else openTicker();
                    }}
                    className="btn-ghost-brut flex items-center justify-center gap-2"
                  >
                    <Icon name="Megaphone" size={16} />
                    Бегущая строка
                    {user.isAdmin && pending > 0 && (
                      <span className="min-w-[22px] bg-primary px-1 font-mono text-[0.72rem] font-bold leading-[18px] text-primary-foreground">
                        {pending > 99 ? '99+' : pending}
                      </span>
                    )}
                  </button>
                )}
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
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="btn-ghost-brut flex items-center justify-center gap-2 border-primary/60 text-primary"
                >
                  <Icon name="LogOut" size={16} />
                  Выйти из общаги
                </button>
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
                  className="btn-ghost-brut"
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