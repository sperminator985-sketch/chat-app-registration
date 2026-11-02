import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useWeather, formatTemp, dayForecastText, tomorrowForecastText, degreeWord } from '@/hooks/use-weather';
import { useLiveStats } from '@/hooks/use-live-stats';
import { useNews } from '@/hooks/use-news';
import { useTickerPosts } from '@/hooks/use-ticker-posts';
import { useHoroscope } from '@/hooks/use-horoscope';
import { useRates, formatRate } from '@/hooks/use-rates';
import { nickColorClass } from '@/data/chat';
import type { NickColor } from '@/data/chat';
import type { TickerLine } from '@/lib/api';
import { cn } from '@/lib/utils';
import { isWeakGpu } from '@/lib/gpu';

const base = [
  'КТО ИДЁТ ЗА ХЛЕБОМ',
  'ЧАЙНИК СВОБОДЕН',
  'ПОСЛЕ 23:00 ТИШИНА',
  'ОТДАМ СТУЛ ДАРОМ',
  'СЕССИЯ БЛИЗКО',
  'СВЕТ НА ВСЕХ ЭТАЖАХ',
];

type Line = TickerLine & { joined?: boolean };

const tomskHour = () => (new Date().getUTCHours() + 7) % 24;
const isEvening = () => tomskHour() >= 18;

const Ticker = () => {
  const [evening, setEvening] = useState(isEvening);
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef({ solo: false, duration: 30 });
  const [cpuOnly] = useState(isWeakGpu);

  useEffect(() => {
    const timer = window.setInterval(() => setEvening(isEvening()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const temp = useWeather();
  const live = useLiveStats();
  const news = useNews();
  const horoscope = useHoroscope();
  const rates = useRates();
  const { items: posts, mode, speed } = useTickerPosts();

  const plural = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  const liveLine =
    live && live.online > 0
      ? `СЕЙЧАС В ЧАТЕ ${live.online} ${plural(live.online, 'ЖИЛЕЦ', 'ЖИЛЬЦА', 'ЖИЛЬЦОВ')}`
      : 'ЭТАЖИ ПУСТЫЕ — ЗАХОДИ ПЕРВЫМ';

  const tidyNews = (raw: string) => {
    let t = raw.replace(/\s+/g, ' ').trim();
    if (t.length > 140) {
      let cut = t.slice(0, 140);
      const space = cut.lastIndexOf(' ');
      if (space > 60) cut = cut.slice(0, space);
      t = cut.replace(/[\s.,;:!?—–-]+$/, '');
    }
    if (!/[.!?»)]$/.test(t)) t += '.';
    return t;
  };

  const newsLines: TickerLine[] = news
    .filter((t) => t.trim().length >= 12)
    .slice(0, 24)
    .map((t) => ({ nick: '', color: 0, text: tidyNews(t).toUpperCase() }));
  const postLines: TickerLine[] = posts.slice(0, 10).map((p) => ({
    nick: p.nick.toUpperCase(),
    color: p.color,
    text: p.text.toUpperCase(),
  }));
  const plain = (t: string): TickerLine => ({ nick: '', color: 0, text: t });

  const fallback: TickerLine[] = [
    liveLine,
    base[0],
    base[1],
    base[2],
    base[3],
    base[4],
    base[5],
  ].map(plain);

  const todayLines = [
    temp === null
      ? 'ОДЕВАЙТЕСЬ ПО ПОГОДЕ'
      : temp <= 0
        ? `ЗА ОКНОМ ${formatTemp(temp)} ${degreeWord(temp).toUpperCase()}, ОДЕНЬТЕСЬ КАК ЛЮДИ`
        : `ЗА ОКНОМ ${formatTemp(temp)} ${degreeWord(temp).toUpperCase()}`,
    dayForecastText(),
  ];
  const tomorrow = tomorrowForecastText();
  const forecastLine = (evening ? [tomorrow] : todayLines)
    .filter((t): t is string => Boolean(t))
    .map((t) => plain(t.toUpperCase()));

  const horoLines: Line[] = horoscope
    ? [
        { nick: '', color: 0, text: horoscope.heading.toUpperCase(), joined: true },
        ...horoscope.signs.map((h) => ({ nick: h.sign.toUpperCase(), color: 0, text: h.text.toUpperCase() })),
      ]
    : [];

  const ratesLine: Line[] = rates
    ? [plain(`КУРС ЦБ НА СЕГОДНЯ: ДОЛЛАР ${formatRate(rates.usd)} ₽, ЕВРО ${formatRate(rates.eur)} ₽`)]
    : [];

  const one = (t: Line): Line[] => [t];
  const horoBlock: Line[][] = horoLines.length ? [horoLines] : [];
  const coreGroups: Line[][] = newsLines.length
    ? [
        one(plain(liveLine)),
        one(newsLines[0]),
        ...forecastLine.map(one),
        ...ratesLine.map(one),
        ...horoBlock,
        ...newsLines.slice(1).map(one),
        one(plain(base[2])),
      ]
    : [...fallback.map(one), ...forecastLine.map(one), ...ratesLine.map(one), ...horoBlock];

  const core: Line[] = coreGroups.flat();
  const mixed: Line[] = postLines.length
    ? coreGroups
        .flatMap((g, i) => (postLines[i] ? [...g, postLines[i]] : g))
        .concat(postLines.slice(coreGroups.length))
    : core;

  const items: Line[] = mode === 'news' ? core : mode === 'posts' ? postLines : mixed;

  const hidden = mode === 'off' || items.length === 0;

  useEffect(() => {
    if (hidden) return;
    const box = boxRef.current;
    const track = trackRef.current;
    const pass = passRef.current;
    if (!box || !track || !pass) return;

    let boxW = box.offsetWidth;
    let passW = pass.offsetWidth;
    const ro = new ResizeObserver(() => {
      boxW = box.offsetWidth;
      passW = pass.offsetWidth;
    });
    ro.observe(box);
    ro.observe(pass);

    let onScreen = false;
    let raf = 0;
    let last = 0;
    let progress = 0;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (last && now - last < 32) return;
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      const { solo: one, duration: dur } = loopRef.current;
      progress = (progress + dt / (dur * 1000)) % 1;
      const x = one ? boxW - progress * (boxW + passW) : -progress * passW;
      track.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
    };

    const sync = () => {
      const run = onScreen && !document.hidden;
      if (!cpuOnly) {
        track.style.animationPlayState = run ? 'running' : 'paused';
        return;
      }
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(step);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(box);
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      track.style.transform = '';
      track.style.animationPlayState = '';
    };
  }, [hidden, cpuOnly]);

  if (hidden) return null;

  const solo = mode === 'posts';
  const chars = items.reduce((sum, t) => sum + t.nick.length + t.text.length + 6, 0);
  const baseDuration = Math.max(18, Math.round((solo ? chars + 90 : chars) / 11));
  const duration = Math.max(6, Math.round((baseDuration * 100) / (speed || 100)));
  loopRef.current = { solo, duration };

  return (
    <div
      ref={boxRef}
      className="group relative my-0 overflow-hidden border-y-2 border-foreground/35 bg-card py-2.5 md:py-3"
    >
      <div
        ref={trackRef}
        className={cn('relative flex w-max', !cpuOnly && (solo ? 'animate-marquee-solo' : 'animate-marquee'))}
        style={
          cpuOnly
            ? undefined
            : ({
                animationDuration: `${duration}s`,
                '--marquee-from': '100vw',
                '--marquee-to': '-100%',
              } as CSSProperties)
        }
      >
        {(solo ? [0] : [0, 1]).map((pass) => (
          <div key={pass} ref={pass === 0 ? passRef : undefined} className="flex shrink-0">
            {items.map((t, idx) => (
              <span
                key={`${pass}-${idx}-${t.text}`}
                className="flex shrink-0 items-center whitespace-nowrap font-display text-[0.72rem] font-extrabold uppercase tracking-[0.06em] text-foreground md:text-sm md:tracking-[0.08em]"
              >
                {t.nick && (
                  <>
                    <span className={cn(nickColorClass[t.color as NickColor] ?? 'text-secondary')}>
                      {t.nick}
                    </span>
                    <span className="mx-1.5 text-foreground/50">—</span>
                  </>
                )}
                <span className={t.joined ? 'text-secondary' : undefined}>{t.text}</span>
                {t.joined ? (
                  <span className="w-3 shrink-0 md:w-4" />
                ) : (!solo || idx < items.length - 1) && (
                  <span className="mx-5 h-[5px] w-[5px] shrink-0 rounded-full bg-primary md:mx-7 md:h-1.5 md:w-1.5" />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;