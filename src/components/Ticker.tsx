import type { CSSProperties } from 'react';
import { useWeather, formatTemp } from '@/hooks/use-weather';
import { useLiveStats } from '@/hooks/use-live-stats';
import { useNews } from '@/hooks/use-news';
import { useTickerPosts } from '@/hooks/use-ticker-posts';
import { nickColorClass } from '@/data/chat';
import type { NickColor } from '@/data/chat';
import type { TickerLine } from '@/lib/api';
import { cn } from '@/lib/utils';

const base = [
  'КТО ИДЁТ ЗА ХЛЕБОМ',
  'ЧАЙНИК СВОБОДЕН',
  'ПОСЛЕ 23:00 ТИШИНА',
  'ОТДАМ СТУЛ ДАРОМ',
  'СЕССИЯ БЛИЗКО',
  'СВЕТ НА ВСЕХ ЭТАЖАХ',
];

const Ticker = () => {
  const temp = useWeather();
  const live = useLiveStats();
  const news = useNews();
  const { items: posts, mode, speed } = useTickerPosts();

  const plural = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  const weatherLine =
    temp === null
      ? 'ОДЕВАЙТЕСЬ ПО ПОГОДЕ'
      : temp <= 0
        ? `ЗА ОКНОМ ${formatTemp(temp)}, ОДЕНЬТЕСЬ КАК ЛЮДИ`
        : `ЗА ОКНОМ ${formatTemp(temp)} ГРАДУСОВ`;

  const liveLine =
    live && live.online > 0
      ? `СЕЙЧАС В ЧАТЕ ${live.online} ${plural(live.online, 'ЖИЛЕЦ', 'ЖИЛЬЦА', 'ЖИЛЬЦОВ')}`
      : 'ЭТАЖИ ПУСТЫЕ — ЗАХОДИ ПЕРВЫМ';

  const newsLines: TickerLine[] = news
    .slice(0, 8)
    .map((t) => ({ nick: '', color: 0, text: t.toUpperCase() }));
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
    weatherLine,
    base[2],
    base[3],
    base[4],
    base[5],
  ].map(plain);

  const core: TickerLine[] = newsLines.length
    ? [plain(liveLine), newsLines[0], plain(weatherLine), ...newsLines.slice(1), plain(base[2])]
    : fallback;

  const mixed = postLines.length
    ? core.flatMap((t, i) => (postLines[i] ? [t, postLines[i]] : [t])).concat(postLines.slice(core.length))
    : core;

  const items = mode === 'news' ? core : mode === 'posts' ? postLines : mixed;

  if (mode === 'off' || items.length === 0) return null;

  const solo = items.length === 1;
  const chars = items.reduce((sum, t) => sum + t.nick.length + t.text.length + 6, 0);
  const baseDuration = Math.max(18, Math.round((solo ? chars + 90 : chars) / 11));
  const duration = Math.max(6, Math.round((baseDuration * 100) / (speed || 100)));

  return (
    <div className="group my-0 overflow-hidden border-y-2 border-foreground/35 bg-card py-2.5 md:py-3">
      <div
        className={cn('flex w-max', solo ? 'animate-marquee-solo' : 'animate-marquee')}
        style={
          {
            animationDuration: `${duration}s`,
            '--marquee-from': '100vw',
            '--marquee-to': '-100%',
          } as CSSProperties
        }
      >
        {(solo ? [0] : [0, 1]).map((pass) => (
          <div key={pass} className="flex shrink-0">
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
                {t.text}
                {!solo && (
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