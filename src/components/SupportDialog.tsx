import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TOPICS = [
  { id: 'Вопрос', icon: 'MessageCircleQuestion' },
  { id: 'Проблема в чате', icon: 'TriangleAlert' },
  { id: 'Жалоба', icon: 'Gavel' },
  { id: 'Реклама', icon: 'Megaphone' },
  { id: 'Другое', icon: 'Sparkles' },
] as const;

const SupportDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<string>(TOPICS[0].id);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setTopic(TOPICS[0].id);
    setMessage('');
    setSent(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (name.trim().length < 2) {
      toast({ title: 'Не хватает имени', description: 'Как к тебе обращаться?', variant: 'destructive' });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast({ title: 'Проверь e-mail', description: 'На него придёт ответ', variant: 'destructive' });
      return;
    }
    if (message.trim().length < 10) {
      toast({ title: 'Слишком коротко', description: 'Опиши вопрос подробнее', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      await api.supportMail({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      toast({
        title: 'Не отправилось',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз позже',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const field =
    'w-full border-2 border-foreground/35 bg-input px-3 py-2.5 text-[0.9rem] font-medium normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-secondary';

  const step = (n: string, label: string) => (
    <span className="mb-1.5 flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center border-2 border-foreground/35 font-mono text-[0.6rem] font-bold text-secondary">
        {n}
      </span>
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </span>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex shrink-0 items-center gap-2 border-2 border-foreground/35 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:border-secondary hover:text-secondary"
      >
        <Icon name="Mail" size={14} className="transition-transform group-hover:-rotate-12" />
        Письмо в поддержку
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTimeout(reset, 200);
        }}
      >
        <DialogContent className="top-[4vh] max-h-[92vh] max-w-[540px] translate-y-0 overflow-y-auto border-2 border-foreground/40 bg-card p-0 text-card-foreground [&>button]:hidden">
          <div className="flex items-stretch border-b-2 border-foreground/35 bg-secondary text-secondary-foreground">
            <div className="flex flex-1 items-center gap-2.5 px-5 py-3.5">
              <Icon name="Mail" size={18} className="shrink-0" />
              <DialogTitle className="font-display text-[0.95rem] font-extrabold uppercase tracking-[0.06em]">
                Письмо в поддержку
              </DialogTitle>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="flex w-12 shrink-0 items-center justify-center border-l-2 border-secondary-foreground text-secondary-foreground outline-none transition-colors duration-150 hover:border-destructive hover:text-destructive"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          {sent ? (
            <div className="animate-fade-in space-y-4 px-6 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-secondary text-secondary">
                <Icon name="Check" size={28} />
              </div>
              <p className="font-display text-lg font-extrabold uppercase tracking-[0.06em]">
                Письмо улетело
              </p>
              <p className="text-[0.92rem] leading-[1.45] text-muted-foreground">
                На <span className="text-secondary">{email.trim()}</span> уже ушло подтверждение,
                что заявка принята. Ответ придёт на этот же адрес.
                <br />
                <span className="mt-2 inline-block text-secondary">
                  Не нашли письмо — загляните в папку «Спам».
                </span>
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-brut w-full justify-center"
              >
                Готово
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
              <p className="border-l-2 border-secondary bg-muted/50 px-3 py-2 font-mono text-[0.74rem] normal-case leading-[1.5] tracking-normal text-muted-foreground">
                Комендант общаги на связи. Опиши вопрос — ответим на указанную почту.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  {step('01', 'Имя')}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    placeholder="Как тебя зовут"
                    className={field}
                  />
                </label>

                <label className="block">
                  {step('02', 'Обратный e-mail')}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                    placeholder="you@mail.ru"
                    className={field}
                  />
                </label>
              </div>

              <div>
                {step('03', 'Тема обращения')}
                <div className="flex flex-wrap gap-1.5">
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTopic(t.id)}
                      className={cn(
                        'flex items-center gap-1.5 border-2 px-2.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.06em] transition-colors',
                        topic === t.id
                          ? 'border-secondary bg-secondary text-secondary-foreground'
                          : 'border-foreground/35 text-muted-foreground hover:border-secondary hover:text-secondary',
                      )}
                    >
                      <Icon name={t.icon} size={13} />
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                {step('04', 'Сообщение')}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={3000}
                  rows={5}
                  placeholder="Опиши вопрос подробно — так мы быстрее поможем"
                  className={cn(field, 'resize-none')}
                />
                <span className="mt-1 block text-right font-mono text-[0.66rem] normal-case tracking-normal text-muted-foreground/70">
                  {message.length} / 3000
                </span>
              </label>

              <div className="flex flex-col gap-2 border-t-2 border-foreground/20 pt-4 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-brut flex-1 justify-center !py-2.5 !text-xs disabled:opacity-60"
                >
                  <Icon name="Send" size={14} />
                  {sending ? 'Отправляем…' : 'Отправить письмо'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-cancel-brut justify-center px-6 py-2.5 text-xs"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupportDialog;