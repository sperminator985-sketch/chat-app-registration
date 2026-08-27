import Stats from '@/components/Stats';

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 px-5 py-10 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:px-10">
      <span>© 2026 Siberia Art Ltd.</span>
      <Stats />
      <span className="text-secondary">Свет горит на всех этажах</span>
    </div>
  </footer>
);

export default Footer;