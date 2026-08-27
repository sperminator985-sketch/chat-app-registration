import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Facade from '@/components/Facade';
import { rules } from '@/data/chat';

const Rules = () => (
  <section id="pravila" className="flex min-h-screen flex-col justify-center bg-card">
    <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-5 py-16 md:px-10 md:py-20 lg:grid-cols-[1fr_420px]">
      <div>
        <h2 className="text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          Правила <span className="text-primary">общаги</span>
        </h2>
        <p className="mt-4 whitespace-nowrap text-[clamp(0.7rem,1.35vw,1.02rem)] leading-[1.45] text-muted-foreground">
          Их немного, и они простые. Нарушишь — вахтёрша Зина напомнит, второй раз напоминать не будет.
        </p>

        <Accordion type="single" collapsible className="mt-8 border-t-2 border-foreground/25">
          {rules.map((r, i) => (
            <AccordionItem key={r.q} value={`r-${i}`} className="border-b-2 border-foreground/25">
              <AccordionTrigger className="gap-4 py-5 text-left font-display text-base font-extrabold uppercase tracking-[-0.01em] hover:no-underline">
                <span className="flex items-start gap-4">
                  <span className="font-mono text-sm text-secondary">{String(i + 1).padStart(2, '0')}</span>
                  {r.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pl-10 text-[1rem] leading-[1.5] text-muted-foreground">
                {r.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="hidden flex-col justify-end gap-4 lg:flex">
        <Facade cols={8} rows={7} seed={5} />
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Каждое окно — чей-то ник в сети
        </p>
      </div>
    </div>
  </section>
);

export default Rules;