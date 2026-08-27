import Stats from '@/components/Stats';

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto max-w-[1400px] px-5 py-10 md:px-10">
      <Stats />

      <div className="mt-8 flex flex-col gap-2 border-t-2 border-foreground/20 pt-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Общага · Томск</span>
        <span className="text-secondary">Свет горит на всех этажах</span>
      </div>
    </div>
  </footer>
);

export default Footer;
