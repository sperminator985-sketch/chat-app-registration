import { useWeather, formatTemp } from '@/hooks/use-weather';
import { useLiveStats } from '@/hooks/use-live-stats';
import { useNews } from '@/hooks/use-news';

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

  const newsLines = news.slice(0, 6).map((t) => t.toUpperCase());

  const items = newsLines.length
    ? [liveLine, newsLines[0], weatherLine, ...newsLines.slice(1), base[2]].filter(Boolean)
    : [liveLine, base[0], base[1], weatherLine, base[2], base[3], base[4], base[5]];

  return (
    <div className="mb-0 mt-1 overflow-hidden border-y-2 border-foreground/35 bg-card py-2.5 md:mb-[1cm] md:mt-[1cm] md:py-3">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((pass) => (
          <div key={pass} className="flex shrink-0">
            {items.map((t) => (
              <span
                key={`${pass}-${t}`}
                className="flex items-center gap-4 px-4 font-display text-[0.72rem] font-extrabold uppercase tracking-[0.06em] text-foreground md:gap-6 md:px-6 md:text-sm md:tracking-[0.08em]"
              >
                {t}
                <span className="h-2 w-2 bg-primary" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;