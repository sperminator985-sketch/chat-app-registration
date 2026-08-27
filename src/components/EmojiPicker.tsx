import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const groups: { title: string; items: string[] }[] = [
  {
    title: 'Настроение',
    items: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😐', '😴', '😭', '😡', '🥴', '🤢', '🤯', '🥳', '😇'],
  },
  {
    title: 'Жесты',
    items: ['👍', '👎', '👌', '✌️', '🤝', '👏', '🙏', '💪', '🖐️', '🤙', '👀', '🫡'],
  },
  {
    title: 'Общага',
    items: ['🚪', '🔑', '🛏️', '🍜', '☕', '🍺', '🚬', '🧦', '🧹', '💡', '📻', '🎸', '📚', '💻', '🧊', '❄️'],
  },
  {
    title: 'Разное',
    items: ['❤️', '💔', '🔥', '⭐', '✨', '🎉', '💩', '👻', '🐈', '🐕', '🌙', '☀️', '⚡', '💤', '🆗', '🚀'],
  },
];

type EmojiPickerProps = {
  onPick: (emoji: string) => void;
  className?: string;
};

const EmojiPicker = ({ onPick, className }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Смайлики"
        aria-label="Смайлики"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center border-2 transition-colors',
          open
            ? 'border-secondary bg-secondary text-secondary-foreground'
            : 'border-foreground/35 text-muted-foreground hover:border-secondary hover:text-secondary',
        )}
      >
        <Icon name="Smile" size={18} />
      </button>

      {open && (
        <div className="animate-fade-in absolute bottom-[calc(100%+8px)] right-0 z-50 w-[280px] border-2 border-foreground/40 bg-card p-3 shadow-lg sm:w-[320px]">
          <div className="scrollbar-brut max-h-[240px] space-y-3 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="mb-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                  {g.title}
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {g.items.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => onPick(e)}
                      className="flex h-8 w-8 items-center justify-center text-[1.15rem] transition-colors hover:bg-muted"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
