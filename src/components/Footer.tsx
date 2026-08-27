const cols = [
  {
    title: 'Этажи',
    items: ['Кухня', 'Курилка', 'Барахолка', 'Учёба', 'Томск', 'Знакомства', 'Флирт', 'Секс 18+', 'Ночная'],
  },
  {
    title: 'Общага',
    items: ['Правила', 'Вахта', 'Помощь', 'Написать админу'],
  },
  {
    title: 'Город',
    items: ['Томск', 'ТГУ · ТПУ · ТУСУР', 'Ленина, 40', 'минус 28 за окном'],
  },
];

const Footer = () => (
  <footer className="border-t-2 border-foreground/35 bg-card">
    <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-10">
      <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <p className="font-display text-xl font-extrabold tracking-[0.04em]">
            ОБЩАГА<span className="text-secondary">.</span>ТОМСК
          </p>
          <p className="mt-3 max-w-[280px] text-[0.98rem] leading-[1.45] text-muted-foreground">
            Чат, а не соседи за стеной. Работает с 2003 года, свет не выключаем.
          </p>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-secondary">{c.title}</p>
            <ul className="mt-4 space-y-2">
              {c.items.map((it) => (
                <li key={it}>
                  <span className="cursor-default text-[0.98rem] text-muted-foreground transition-colors hover:text-foreground">
                    {it}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-2 rule-top pt-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Общага · Томск</span>
        <span className="text-secondary">Свет горит на всех этажах</span>
      </div>
    </div>
  </footer>
);

export default Footer;