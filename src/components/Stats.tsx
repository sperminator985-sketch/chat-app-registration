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
    <div className="w-full max-w-[340px]">
      {items.map((s, i) => (
        <div
          key={s.label}
          style={{ animationDelay: `${i * 70}ms` }}
          className="animate-fade-in flex items-baseline justify-between gap-3 border-b border-foreground/15 py-1.5 last:border-b-0"
        >
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {s.label}
          </span>
          <span className="font-mono text-[1.05rem] font-bold leading-none tracking-[0.02em] text-secondary">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Stats;