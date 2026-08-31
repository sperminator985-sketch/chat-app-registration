import { Link } from 'react-router-dom';
import Stats from '@/components/Stats';

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-5 py-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-10">
      <span className="order-2 inline-block shrink-0 text-center sm:order-none sm:text-right">
        © 2026 Siberia Art Ltd.
        <br />
        Все права защищены.
      </span>

      <div className="order-3 flex shrink-0 flex-col items-center gap-1 text-center sm:order-none">
        <Link
          to="/privacy"
          className="underline underline-offset-4 transition-colors hover:text-secondary"
        >
          Политика конфиденциальности
        </Link>
        <Link
          to="/terms"
          className="underline underline-offset-4 transition-colors hover:text-secondary"
        >
          Пользовательское соглашение
        </Link>
      </div>

      <div className="order-1 sm:order-none">
        <Stats />
      </div>

      <div
        aria-hidden
        className="order-1 h-[2px] w-full bg-foreground/25 sm:order-none sm:hidden"
      />
    </div>
  </footer>
);

export default Footer;