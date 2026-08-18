const items = [
  'КТО ИДЁТ ЗА ХЛЕБОМ',
  'ЧАЙНИК СВОБОДЕН',
  'ПОСЛЕ 23:00 ТИШИНА',
  'ОТДАМ СТУЛ ДАРОМ',
  'МИНУС 28, ОДЕНЬТЕСЬ',
  'СЕССИЯ БЛИЗКО',
  'СВЕТ НА ВСЕХ ЭТАЖАХ',
];

const Ticker = () => (
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

export default Ticker;
