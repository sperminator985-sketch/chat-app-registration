import Facade from '@/components/Facade';
import { useLiveStats } from '@/hooks/use-live-stats';
import { rooms } from '@/data/chat';
import { useTheme } from '@/hooks/use-theme';
import moonImg from '@/assets/moon.png';
import sunImg from '@/assets/sun.png';

const bodies = { moon: moonImg, sun: sunImg };

const windows = [1, 0, 1, 1, 1, 1, 0, 0, 1];

const Hero = () => {
  const live = useLiveStats();
  const { theme } = useTheme();
  const floorCounts = rooms.map((r) => live?.roomCounts?.[r.id] ?? 0);

  return (
    <section id="top" className="mx-auto w-full max-w-[1400px] overflow-x-clip px-5 pb-4 pt-3 md:px-10 md:py-8">
      <div className="flex flex-col justify-center gap-2.5">
        <p className="relative z-10 -mt-1 mb-1 whitespace-nowrap text-center font-display text-[clamp(0.7rem,3.1vw,1.1rem)] font-semibold uppercase tracking-[0.34em] text-secondary md:hidden">
          the rebirth of a legend
        </p>

        <div className="relative z-10 flex animate-rise flex-col items-center gap-6 md:gap-8 xl:flex-row xl:items-start xl:justify-between xl:gap-7">
          <h1 className="mt-0 hidden min-w-0 flex-nowrap items-center justify-center gap-x-2 font-extrabold uppercase tracking-[-0.035em] md:flex md:gap-x-4 xl:mt-[2cm] xl:justify-start">
            <span className="flex shrink-0 flex-col items-center justify-end border-[3px] border-foreground bg-window-off p-[5px] h-[clamp(1.9rem,8.4vw,3.2rem)] w-[clamp(1.9rem,8.4vw,3.2rem)] md:h-[clamp(2rem,6.7vw,6.3rem)] md:w-[clamp(2rem,6.7vw,6.3rem)]">
              <span className="grid w-full flex-1 grid-cols-3 gap-[3px]">
                {windows.map((on, i) => (
                  <span key={i} className={on ? 'w-full bg-window-on' : 'w-full bg-foreground/45'} />
                ))}
              </span>
            </span>
            <span className="whitespace-nowrap text-[clamp(1.5rem,7vw,2.6rem)] leading-[.92] text-foreground md:text-[clamp(1.7rem,5.6vw,5.4rem)]">
              АТ<b className="font-extrabold text-primary"> —</b>
            </span>
            <span className="plate relative inline-block w-fit max-w-full origin-center -rotate-[1.1deg] px-3 pb-3 pt-1.5 md:origin-left md:px-5 md:pb-4 md:pt-2">
              <span className="block whitespace-nowrap text-[clamp(1.35rem,6.4vw,2.4rem)] leading-[.9] tracking-[-0.045em] md:text-[clamp(1.5rem,5vw,4.8rem)]">
                ОБЩАГА
              </span>
              <span className="absolute -bottom-[16px] left-6 h-0 w-0 border-l-[18px] border-t-[18px] border-l-transparent border-t-secondary" />
            </span>
          </h1>
          <p className="-mt-2 hidden whitespace-nowrap text-center font-display text-[clamp(0.95rem,2.6vw,1.6rem)] font-semibold uppercase tracking-[0.34em] text-secondary md:block xl:hidden">
            the rebirth of a legend
          </p>
          <Facade
            className="w-full max-w-[436px] xl:-mt-[1.1cm]"
            rows={9}
            cellAspect="1/0.68"
            floorCounts={floorCounts}
            alarm={live?.adminOnline ?? false}
          />
        </div>

        <p className="hidden whitespace-nowrap font-display font-semibold uppercase tracking-[0.34em] text-secondary xl:-mt-[3.1cm] xl:block xl:text-left xl:text-[clamp(0.95rem,2.42vw,2.1rem)]">
          the rebirth of a legend
        </p>

        <div
          className="animate-rise h-[3px] w-full bg-foreground md:mt-4 xl:mt-[1.85cm]"
          style={{ animationDelay: '.12s' }}
        />

        <div
          className="relative z-10 mt-3 flex animate-rise flex-col items-center gap-6 md:flex-row md:items-start md:justify-center md:gap-9"
          style={{ animationDelay: '.18s' }}
        >
          <h1 className="relative z-10 text-center font-extrabold uppercase tracking-[-0.035em] md:text-left">
            <span className="block whitespace-nowrap text-[clamp(1.5rem,4.3vw,4.2rem)] leading-[.92] tracking-[0.05em] text-foreground text-stroke-plate">
              <span className="sr-only">ТОМСК НА СВЯЗИ</span>
              <span aria-hidden className="inline-flex items-center">
                Т
                <span className="relative -ml-[0.04em] mr-[0.04em] inline-block h-[0.9em] w-[0.9em]">
                  {(['moon', 'sun'] as const).map((body) => {
                    const visible = (body === 'sun') === (theme === 'day');
                    return (
                      <img
                        key={body}
                        src={bodies[body]}
                        alt=""
                        className={`absolute inset-0 h-full w-full select-none rounded-full object-contain transition-all duration-700 ease-in-out ${
                          visible ? 'rotate-0 scale-100 opacity-100' : `scale-50 opacity-0 ${body === 'sun' ? '-rotate-90' : 'rotate-90'}`
                        }`}
                        style={{ animation: `${body}-glow 7s ease-in-out infinite` }}
                      />
                    );
                  })}
                </span>
                МСК НА СВЯЗИ
              </span>
            </span>
          </h1>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-col items-center gap-2 rule-top pt-3 md:mt-10 text-center text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <span className="hidden text-[1.02rem] font-normal normal-case leading-[1.45] tracking-normal text-foreground sm:inline md:text-[1.15rem]">
          Чат для студентов Томских вузов (и&nbsp;не&nbsp;только).
          <span className="hidden lg:inline">
            {' '}Этажи, курилка, барахолка, «кто идёт за&nbsp;хлебом» — всё в&nbsp;одном чате.
          </span>
        </span>
        <span className="flex items-center gap-2 text-secondary">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-secondary" />
          {live
            ? `Сейчас в чате: ${live.online} · жильцов ${live.totalUsers}`
            : 'Свет горит на всех этажах'}
        </span>
      </div>
    </section>
  );
};

export default Hero;