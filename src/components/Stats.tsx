import { stats } from '@/data/chat';
import { useLiveStats } from '@/hooks/use-live-stats';

const Stats = () => {
  const live = useLiveStats();

  const items = live
    ? [
        { value: String(live.online), label: 'сейчас в чате' },
        { value: String(live.totalUsers), label: 'жильцов зарегистрировано' },
        { value: String(live.dayMessages), label: 'сообщений за сутки' },
        stats[1],
      ]
    : stats;

  return (
    <section className="mx-auto max-w-[520px] px-5 py-12 md:px-10">
      <div className="flex flex-col gap-px bg-foreground/25">
        {items.map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="animate-fade-in flex items-baseline justify-between gap-4 bg-background px-4 py-3"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </p>
            <p className="font-display text-[1.15rem] font-extrabold leading-none tracking-[-0.03em] text-secondary">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stats;