import { useAuth } from '@/hooks/use-auth';

const CTA = () => {
  const { user, openAuth } = useAuth();

  const scrollToChat = () =>
    document.querySelector('#chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
      <div className="plate origin-left -rotate-[0.8deg] px-6 py-10 md:px-12 md:py-14">
        <h2 className="text-[clamp(2.2rem,7vw,4.4rem)] font-extrabold leading-[0.9] tracking-[-0.045em]">
          Свободных комнат
          <span className="block">хватит на всех</span>
        </h2>
        <p className="mt-5 max-w-[520px] text-[1.06rem] leading-[1.45] opacity-80">
          Ник, пароль, цвет — сорок секунд, и ты уже здороваешься с этажом. Ни анкет, ни паспортов, ни приглашений.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <button onClick={scrollToChat} className="btn-brut">
              Вернуться в чат
            </button>
          ) : (
            <>
              <button onClick={() => openAuth('register')} className="btn-brut">
                Занять комнату
              </button>
              <button
                onClick={() => openAuth('login')}
                className="inline-flex items-center justify-center gap-2 border-2 border-secondary-foreground px-6 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-secondary-foreground transition-transform duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px]"
              >
                У меня уже есть ник
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTA;
