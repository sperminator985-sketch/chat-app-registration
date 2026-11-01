import { useEffect } from 'react';

const fonts: { name: string; family: string; weight: number; query: string }[] = [
  { name: 'Unbounded', family: 'Unbounded', weight: 800, query: 'Unbounded:wght@800' },
  { name: 'Montserrat Black', family: 'Montserrat', weight: 900, query: 'Montserrat:wght@900' },
  { name: 'Dela Gothic One', family: 'Dela Gothic One', weight: 400, query: 'Dela+Gothic+One' },
  { name: 'Russo One', family: 'Russo One', weight: 400, query: 'Russo+One' },
  { name: 'Rubik Black', family: 'Rubik', weight: 900, query: 'Rubik:wght@900' },
  { name: 'Rubik Mono One', family: 'Rubik Mono One', weight: 400, query: 'Rubik+Mono+One' },
  { name: 'Days One', family: 'Days One', weight: 400, query: 'Days+One' },
  { name: 'Exo 2 Black', family: 'Exo 2', weight: 900, query: 'Exo+2:wght@900' },
  { name: 'Inter Black', family: 'Inter', weight: 900, query: 'Inter:wght@900' },
  { name: 'Jost Black', family: 'Jost', weight: 900, query: 'Jost:wght@900' },
  { name: 'Tektur Black', family: 'Tektur', weight: 900, query: 'Tektur:wght@900' },
  { name: 'Nunito Black', family: 'Nunito', weight: 900, query: 'Nunito:wght@900' },
  { name: 'Onest Black', family: 'Onest', weight: 900, query: 'Onest:wght@900' },
  { name: 'Prosto One', family: 'Prosto One', weight: 400, query: 'Prosto+One' },
];

const FontSamples = ({ moon }: { moon: string }) => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.query}`).join('&')}&display=swap`;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  return (
    <div className="relative z-10 mt-8 flex flex-col items-center gap-5">
      {fonts.map((f, i) => (
        <div key={f.name} className="flex w-full flex-col items-center gap-1 border-t border-foreground/20 pt-4">
          <span className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-secondary">
            {i + 1}. {f.name}
          </span>
          <span
            className="inline-flex items-center whitespace-nowrap text-[clamp(1.5rem,4.3vw,4.2rem)] uppercase leading-[.92] tracking-[0.05em] text-foreground text-stroke-plate"
            style={{ fontFamily: `'${f.family}', sans-serif`, fontWeight: f.weight }}
          >
            Т
            <img src={moon} alt="" className="-ml-[0.04em] mr-[0.04em] inline-block h-[0.9em] w-[0.9em] rounded-full" />
            МСК&nbsp;НА&nbsp;СВЯЗИ
          </span>
        </div>
      ))}
    </div>
  );
};

export default FontSamples;
