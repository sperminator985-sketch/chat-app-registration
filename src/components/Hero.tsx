import Facade from '@/components/Facade';
import { useAuth } from '@/hooks/use-auth';

const Hero = () => {
  const { openAuth } = useAuth();

  return (
    <section id="top" className="mx-auto w-full max-w-[1400px] overflow-hidden px-5 py-6 md:px-10 md:py-8">
      <div className="flex flex-col justify-center gap-2.5">
        <div className="flex animate-rise flex-col items-center gap-6 md:flex-row md:items-start md:justify-between md:gap-7">
          <h1 className="mt-[38px] flex min-w-0 flex-nowrap items-center justify-center gap-x-2 font-extrabold uppercase tracking-[-0.035em] md:justify-start md:gap-x-4">
            <span className="whitespace-nowrap text-[clamp(1.5rem,7vw,5.8rem)] leading-[.92] text-foreground">
              ЧАТ<b className="font-extrabold text-primary"> —</b>
            </span>
            <span className="plate inline-block w-fit max-w-full origin-center -rotate-[1.1deg] px-3 pb-3 pt-1.5 md:origin-left md:px-5 md:pb-4 md:pt-2">
              <span className="block whitespace-nowrap text-[clamp(1.35rem,6.4vw,5.2rem)] leading-[.9] tracking-[-0.045em]">
                ОБЩАГА
              </span>
            </span>
          </h1>
          <Facade className="w-full max-w-[436px]" />
        </div>

        <div
          className="animate-rise h-[3px] w-full bg-foreground"
          style={{ animationDelay: '.12s' }}
        />

        <div
          className="mt-3 flex animate-rise flex-col items-center gap-6 md:flex-row md:items-start md:justify-between md:gap-9"
          style={{ animationDelay: '.18s' }}
        >
          <h1 className="text-center font-extrabold uppercase tracking-[-0.035em] md:text-left">
            <span className="block whitespace-nowrap text-[clamp(1.6rem,4.6vw,4.4rem)] leading-[.92] tracking-[-0.03em] text-foreground text-stroke-plate">
              ТОМСК НА СВЯЗИ
            </span>
          </h1>

          <div className="w-full max-w-[430px] pb-1.5">
            <p className="text-[1.06rem] font-normal leading-[1.45] text-foreground">
              Ник, пароль — и&nbsp;ты внутри. Этажи, курилка, барахолка, «кто идёт за&nbsp;хлебом» —{' '}
              <em className="not-italic text-secondary">всё в&nbsp;одном чате</em>.
            </p>
            <div className="mt-4 flex justify-center md:justify-start">
              <button className="btn-brut" onClick={() => openAuth('register')}>
                Занять место в чате
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 rule-top pt-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Регистрация — 40 секунд</span>
        <span className="text-secondary">Свет горит на всех этажах</span>
      </div>
    </section>
  );
};

export default Hero;