import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { api, ApiMessage } from '@/lib/api';
import { nickColorClass, staffNickClass, isStaffNick } from '@/data/chat';
import { usePrivate } from '@/hooks/use-private';
import { useCrypto } from '@/hooks/use-crypto';
import { useCall } from '@/hooks/use-call';
import EmojiPicker from '@/components/EmojiPicker';

const PrivateRoom = () => {
  const { user } = useAuth();
  const { active, peer, messages, leave, pushMessage } = usePrivate();
  const { enabled: cryptoOn, seal, reveal } = useCrypto();
  const { startCall } = useCall();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [plain, setPlain] = useState<Record<number, string>>({});
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const next: Record<number, string> = {};
      for (const m of messages) {
        if (m.cipher) next[m.id] = await reveal(m.cipher);
      }
      if (alive) setPlain((prev) => ({ ...prev, ...next }));
    };
    if (messages.some((m) => m.cipher)) run();
    return () => {
      alive = false;
    };
  }, [messages, reveal]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const textOf = useCallback(
    (m: ApiMessage) => (m.cipher ? (plain[m.id] ?? '🔒 расшифровываем…') : m.text),
    [plain],
  );

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !peer) return;
    setSending(true);
    try {
      const cipher = cryptoOn ? await seal(peer.nick, text) : null;
      const res = await api.privateSend(cipher ? { cipher } : { text });
      const shown = cipher ? { ...res.message, cipher, text: '' } : res.message;
      if (cipher) setPlain((prev) => ({ ...prev, [shown.id]: text }));
      pushMessage(shown);
      setDraft('');
      inputRef.current?.focus();
    } catch (err) {
      toast({
        title: 'Сообщение не ушло',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (!active || !peer) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-card">
      <div className="mx-auto flex w-full min-h-0 max-w-[1400px] flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-sky-400 bg-background">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-sky-400 bg-sky-400/10 px-4 py-3 md:px-5 md:py-4">
            <Icon name="Lock" size={16} className="shrink-0 text-sky-300 md:h-5 md:w-5" />
            <span className="truncate font-display text-[0.7rem] font-extrabold uppercase tracking-[-0.03em] sm:text-base md:text-lg">
              Приват ·{' '}
              <span className={cn(staffNickClass(peer.nick, nickColorClass[peer.color]))}>{peer.nick}</span>
            </span>
            <span className="hidden items-center gap-1 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-sky-300 sm:flex">
              <Icon name="ShieldCheck" size={13} />
              {cryptoOn ? 'зашифровано' : 'закрытая комната'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => startCall(peer.nick)}
                title="Видеозвонок"
                aria-label="Видеозвонок"
                className="flex h-8 w-8 items-center justify-center border-2 border-foreground/35 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
              >
                <Icon name="Video" size={14} />
              </button>
              <button
                type="button"
                onClick={leave}
                className="flex items-center gap-1.5 border-2 border-primary px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Icon name="LogOut" size={14} />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>

          <div
            ref={feedRef}
            className="scrollbar-brut min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5"
          >
            <p className="border-l-2 border-sky-400 bg-sky-400/15 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-sky-200 sm:text-[0.8rem]">
              закрытая комната на двоих. переписка не видна остальным и стирается при выходе
            </p>
            {messages.map((m) => (
              <div key={m.id} className="animate-fade-in leading-[1.3]">
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-mono text-[0.66rem] text-muted-foreground sm:text-[0.78rem]">[{m.time}]</span>
                  <span
                    className={cn(
                      'text-[0.82rem] font-normal sm:text-[0.92rem]',
                      isStaffNick(m.nick) ? 'font-bold text-red-500 [.day_&]:text-red-600' : nickColorClass[m.color],
                    )}
                  >
                    &lt;{m.nick}&gt;
                  </span>
                  <span className="text-[0.84rem] text-foreground sm:text-[0.94rem]">{textOf(m)}</span>
                </p>
              </div>
            ))}
          </div>

          <form
            onSubmit={send}
            className="flex flex-row items-center gap-2 border-t-2 border-sky-400 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-2.5"
          >
            <div className="flex flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 py-1.5 focus-within:border-sky-400">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={480}
                placeholder={`В привате с ${peer.nick}…`}
                className="w-full min-w-0 bg-transparent text-[0.82rem] text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-[0.92rem]"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              <EmojiPicker onPick={(em) => setDraft((prev) => (prev + em).slice(0, 480))} />
              <button
                type="submit"
                disabled={sending || !user}
                aria-label="Отправить"
                className="btn-brut !gap-1.5 !px-2.5 !py-2 !text-xs disabled:opacity-60 sm:!px-3"
              >
                <Icon name="Send" size={14} />
                <span className="hidden sm:inline">{sending ? 'Шлём…' : 'Отправить'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateRoom;
