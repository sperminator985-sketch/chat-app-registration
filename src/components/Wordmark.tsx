import { cn } from '@/lib/utils';

type WordmarkProps = {
  className?: string;
};

const Wordmark = ({ className }: WordmarkProps) => (
  <span
    className={cn(
      'flex min-w-0 flex-nowrap items-center gap-x-2 font-extrabold uppercase tracking-[-0.035em]',
      className,
    )}
  >
    <span className="whitespace-nowrap text-[clamp(1.05rem,4.6vw,1.6rem)] leading-[.92] text-foreground">
      ЧАТ<b className="font-extrabold text-primary"> —</b>
    </span>
    <span className="plate inline-block w-fit max-w-full origin-center -rotate-[1.1deg] px-2 pb-2 pt-1">
      <span className="block whitespace-nowrap text-[clamp(0.95rem,4.2vw,1.45rem)] leading-[.9] tracking-[-0.045em]">
        ОБЩАГА
      </span>
    </span>
  </span>
);

export default Wordmark;