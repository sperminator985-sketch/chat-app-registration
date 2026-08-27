import Facade from '@/components/Facade';
import { useAuth } from '@/hooks/use-auth';

const Hero = () => {
  const { openAuth } = useAuth();

  return (
    <section id="top" className="mx-auto w-full max-w-[1400px] overflow-hidden px-5 py-6 md:px-10 md:py-8">
      <div className="flex flex-col justify-center gap-2.5">
        <div className="flex animate-rise flex-col items-start gap-6 md:flex-row md:items-end md:justify-between md:gap-7">
          <h1 className="font-extrabold uppercase tracking-[-0.035em]">
            <span className="block text-[clamp(2.2rem,7.4vw,6.4rem)] leading-[.92] text-foreground">
              ЧАТ<b className="font-extrabold text-primary">,</b> А НЕ
            </span>
          </h1>
          <Facade className="w-full max-w-[436px]" />
        </div>

        <div
          className="plate inline-block w-fit max-w-full origin-left -rotate-[1.1deg] animate-rise px-5 pb-4 pt-2"
          style={{ animationDelay: '.09s' }}
        >
          <h1 className="font-extrabold uppercase">
            <span className="block whitespace-nowrap text-[clamp(1.6rem,6.1vw,5.4rem)] leading-[.9] tracking-[-0.045em]">
              СОСЕДИ&nbsp;ЗА&nbsp;СТЕНОЙ
            </span>
          </h1>
        </div>

        <div
          className="mt-1.5 flex animate-rise flex-col items-start gap-6 md:flex-row md:items-end md:justify-between md:gap-9"
          style={{ animationDelay: '.18s' }}
        >
          <h1 className="font-extrabold uppercase tracking-[-0.035em]">
            <span className="block text-[clamp(1.9rem,5.4vw,4.6rem)] leading-[.92] tracking-[-0.03em] text-foreground text-stroke-plate">
              ТОМСК НА СВЯЗИ
            </span>
          </h1>

          <div className="max-w-[430px] pb-1.5">
            <p className="text-[1.06rem] font-normal leading-[1.45] text-foreground">
              Ник, пароль — и&nbsp;ты внутри. Этажи, курилка, барахолка, «кто идёт за&nbsp;хлебом» —{' '}
              <em className="not-italic text-secondary">всё в&nbsp;одном чате</em>.
            </p>
            <button className="btn-brut mt-4" onClick={() => openAuth('register')}>
              Занять место в чате
            </button>
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