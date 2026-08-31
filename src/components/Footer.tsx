import Stats from '@/components/Stats';

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-5 py-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
      <span className="shrink-0">© 2026 Siberia Art Ltd. Все права защищены.</span>
      <Stats />
    </div>
  </footer>
);

export default Footer;