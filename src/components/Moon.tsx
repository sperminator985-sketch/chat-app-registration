import { cn } from '@/lib/utils';

const Moon = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn('moon-layer pointer-events-none absolute', className)}>
    <div
      className="absolute -inset-[130%] rounded-full"
      style={{
        background:
          'radial-gradient(circle, hsl(var(--secondary) / 0.3) 0%, hsl(var(--secondary) / 0.12) 32%, transparent 62%)',
      }}
    />
    <img
      src="/moon.png"
      alt=""
      className="relative h-full w-full select-none rounded-full object-contain"
      style={{ animation: 'moon-glow 7s ease-in-out infinite' }}
    />
  </div>
);

export default Moon;
