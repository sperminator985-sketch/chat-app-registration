import Stats from '@/components/Stats';

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 px-5 py-10 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
      <span className="flex shrink-0 flex-col gap-1">
        © 2026 Siberia Art Ltd.
        <span className="text-[0.68rem] tracking-[0.14em] text-muted-foreground/70">(разработка сайтов)</span>
      </span>
      <Stats />
    </div>
  </footer>
);

export default Footer;