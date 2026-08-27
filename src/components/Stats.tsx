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
    <section className="mx-auto max-w-[1400px] px-5 py-14 md:px-10">
      <div className="grid gap-px bg-foreground/25 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={s.label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="animate-fade-in bg-background px-5 py-8"
          >
            <p className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.045em] text-secondary">
              {s.value}
            </p>
            <p className="mt-3 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stats;
