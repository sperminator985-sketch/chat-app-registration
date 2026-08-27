import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { api, ApiMessage } from '@/lib/api';
import { nickColorClass, NickColor } from '@/data/chat';
import { lastSeenText } from '@/lib/last-seen';
import { useDm } from '@/hooks/use-dm';
import { useCall } from '@/hooks/use-call';
import EmojiPicker from '@/components/EmojiPicker';

const DirectMessages = () => {
  const { user } = useAuth();
  const { dmNick: nick, closeDm: onClose, refresh } = useDm();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [peer, setPeer] = useState<{ nick: string; color: NickColor; status: string; avatar?: number; avatarUrl?: string | null; online?: boolean; seenAgo?: number | null } | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!nick) return;
    try {
      const data = await api.dm(nick);
      setPeer(data.peer);
      setMessages(data.messages);
    } catch {
      /* повторим на следующем опросе */
    } finally {
      setLoaded(true);
    }
  }, [nick]);

  useEffect(() => {
    if (!nick) return;
    setLoaded(false);
    setMessages([]);
    load();
    const timer = window.setInterval(load, 8000);
    return () => window.clearInterval(timer);
  }, [nick, load]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !nick || sending) return;
    setSending(true);
    try {
      const res = await api.dmSend({ nick, text });
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      refresh();
    } catch (err) {
      toast({
        title: 'Записка не дошла',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(nick)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px] border-2 border-foreground/40 bg-background p-0">
        <div className="flex items-center gap-3 border-b-2 border-foreground/35 px-5 py-4">
          <Icon name="Mail" size={18} className="shrink-0 text-secondary" />
          <div>
            <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[-0.02em]">
              Личка с{' '}
              <span className={cn(peer ? nickColorClass[peer.color] : 'text-foreground')}>{nick}</span>
            </p>
            {peer && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.85rem] text-muted-foreground">
                {peer.status}
                <span
                  className={cn(
                    'flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.08em]',
                    peer.online ? 'text-secondary' : 'text-muted-foreground/80',
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0', peer.online ? 'bg-secondary' : 'bg-muted-foreground/50')} />
                  {peer.online ? 'в сети' : lastSeenText(peer.seenAgo)}
                </span>
              </p>
            )}
          </div>
          {nick && (
            <button
              type="button"
              onClick={() => startCall(nick)}
              disabled={!peer?.online}
              title={peer?.online ? 'Позвонить по видео' : 'Сосед не в сети — трубку не возьмут'}
              aria-label="Позвонить по видео"
              className="ml-auto mr-8 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground/35 text-foreground transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:border-foreground/20 disabled:text-muted-foreground/40 disabled:hover:border-foreground/20 disabled:hover:text-muted-foreground/40"
            >
              <Icon name="Video" size={18} />
            </button>
          )}
        </div>

        <div ref={feedRef} className="scrollbar-brut h-[240px] space-y-2 overflow-y-auto px-5 py-4 sm:h-[320px]">
          {!loaded && <p className="font-mono text-[0.85rem] text-muted-foreground">открываем переписку…</p>}
          {loaded && messages.length === 0 && (
            <p className="border-l-2 border-secondary bg-muted/60 px-3 py-2 font-mono text-[0.82rem] uppercase tracking-[0.08em] text-muted-foreground">
              записок ещё не было. напиши первым
            </p>
          )}
          {messages.map((m) => {
            const mine = user && m.nick === user.nick;
            if (m.text.startsWith('Видеозвонок')) {
              const missed = m.text.includes('без ответа') || m.text.includes('отклонён');
              return (
                <p
                  key={m.id}
                  className={cn(
                    'flex flex-wrap items-center gap-2 border-l-2 bg-muted/50 px-3 py-2 font-mono text-[0.8rem] uppercase tracking-[0.06em]',
                    missed ? 'border-primary text-primary' : 'border-secondary text-muted-foreground',
                  )}
                >
                  <Icon name={missed ? 'PhoneMissed' : 'Video'} size={14} className="shrink-0" />
                  {m.text}
                  <span className="ml-auto text-[0.72rem] normal-case">{m.time}</span>
                  {nick && (
                    <button
                      type="button"
                      onClick={() => startCall(nick)}
                      disabled={!peer?.online}
                      title={peer?.online ? 'Перезвонить' : 'Сосед не в сети'}
                      className="flex shrink-0 items-center gap-1 border-2 border-current px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] transition-colors hover:bg-current/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Icon name="Video" size={12} />
                      Перезвонить
                    </button>
                  )}
                </p>
              );
            }
            return (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] border-2 px-3 py-2 leading-[1.45]',
                  mine
                    ? 'ml-auto border-secondary bg-secondary/15'
                    : 'border-foreground/25 bg-muted/50',
                )}
              >
                <p className="flex items-center gap-2">
                  <span className={cn('font-semibold', nickColorClass[m.color])}>{m.nick}</span>
                  <span className="font-mono text-[0.72rem] text-muted-foreground">{m.time}</span>
                </p>
                <p className="mt-1 text-[1rem] text-foreground/90">{m.text}</p>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="flex gap-2 border-t-2 border-foreground/35 px-5 py-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={480}
            placeholder="Записка соседу…"
            className="flex-1 border-2 border-foreground/35 bg-input px-3 py-2 text-[1rem] outline-none focus:border-secondary placeholder:text-muted-foreground/70"
          />
          <EmojiPicker onPick={(e) => setDraft((prev) => (prev + e).slice(0, 480))} />
          <button type="submit" disabled={sending} className="btn-brut shrink-0 disabled:opacity-60">
            <Icon name="Send" size={16} />
            {sending ? '…' : 'Послать'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DirectMessages;