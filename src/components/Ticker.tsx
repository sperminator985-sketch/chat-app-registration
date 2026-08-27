import { useWeather, formatTemp } from '@/hooks/use-weather';

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

  const weatherLine =
    temp === null
      ? 'МИНУС 28, ОДЕНЬТЕСЬ'
      : temp <= 0
        ? `ЗА ОКНОМ ${formatTemp(temp)}, ОДЕНЬТЕСЬ КАК ЛЮДИ`
        : `ЗА ОКНОМ ${formatTemp(temp)} ГРАДУСОВ`;

  const items = [base[0], base[1], weatherLine, base[2], base[3], base[4], base[5]];

  return (
    <div className="overflow-hidden border-y-2 border-foreground/35 bg-card py-3">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((pass) => (
          <div key={pass} className="flex shrink-0">
            {items.map((t) => (
              <span
                key={`${pass}-${t}`}
                className="flex items-center gap-6 px-6 font-display text-sm font-extrabold uppercase tracking-[0.08em] text-foreground"
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
