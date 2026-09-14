import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TOPICS = ['Вопрос', 'Проблема в чате', 'Жалоба', 'Реклама', 'Другое'];

const SupportDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

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
      toast({ title: 'Письмо ушло', description: 'Ответим на указанную почту' });
      setOpen(false);
      setName('');
      setEmail('');
      setTopic(TOPICS[0]);
      setMessage('');
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
    'w-full border-2 border-foreground/35 bg-input px-3 py-2 text-[0.86rem] font-medium normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-secondary';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 border-2 border-foreground/35 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
      >
        <Icon name="Mail" size={14} />
        Письмо в поддержку
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[5vh] max-h-[90vh] max-w-[520px] translate-y-0 overflow-y-auto border-2 border-foreground/40 bg-card p-0 text-card-foreground">
          <DialogTitle className="border-b-2 border-foreground/35 px-5 py-4 font-display text-sm font-extrabold uppercase tracking-[0.08em]">
            Письмо в поддержку
          </DialogTitle>

          <form onSubmit={submit} className="space-y-3 px-5 pb-5">
            <p className="font-mono text-[0.72rem] normal-case tracking-normal text-muted-foreground">
              Напиши нам — ответим на указанный e-mail.
            </p>

            <label className="block space-y-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Имя
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Как тебя зовут"
                className={field}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Обратный e-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                placeholder="you@mail.ru"
                className={field}
              />
            </label>

            <div className="space-y-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Тема
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={cn(
                      'border-2 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] transition-colors',
                      topic === t
                        ? 'border-secondary bg-secondary text-secondary-foreground'
                        : 'border-foreground/35 text-muted-foreground hover:border-secondary hover:text-secondary',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Сообщение
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={3000}
                rows={5}
                placeholder="Опиши вопрос подробно"
                className={cn(field, 'resize-none')}
              />
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={sending} className="btn-brut !py-2 !text-xs disabled:opacity-60">
                <Icon name="Send" size={14} />
                {sending ? 'Отправляем…' : 'Отправить'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-2 border-foreground/35 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Отмена
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupportDialog;
