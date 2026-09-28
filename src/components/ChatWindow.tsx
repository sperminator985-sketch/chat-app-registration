import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePolling } from '@/hooks/use-polling';
import { useAuth } from '@/hooks/use-auth';
import { getToken, api, ApiMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { rooms } from '@/data/chat';
import { useDm } from '@/hooks/use-dm';
import { useCrypto } from '@/hooks/use-crypto';
import { useCall } from '@/hooks/use-call';
import { usePrivate } from '@/hooks/use-private';
import { useTicker } from '@/hooks/use-ticker';
import UserCardDialog, { CardPerson } from '@/components/UserCardDialog';
import ResidentsDialog from '@/components/ResidentsDialog';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatFeed from '@/components/chat/ChatFeed';
import ChatComposer from '@/components/chat/ChatComposer';
import ChatOnlineList, { type OnlineItem } from '@/components/chat/ChatOnlineList';

type ChatWindowProps = {
  activeRoom: string;
  onPick: (id: string) => void;
};

const ChatWindow = ({ activeRoom, onPick }: ChatWindowProps) => {
  const { user, openAuth, signOut } = useAuth();
  const room = useMemo(() => rooms.find((r) => r.id === activeRoom) ?? rooms[0], [activeRoom]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [online, setOnline] = useState<OnlineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [residentsOpen, setResidentsOpen] = useState(false);
  const [cardPerson, setCardPerson] = useState<CardPerson | null>(null);

  const [clearedAt, setClearedAt] = useState(0);
  const [clearedDm, setClearedDm] = useState(0);
  const [typingUsers, setTypingUsers] = useState<{ nick: string; color: number }[]>([]);
  const [privateTo, setPrivateTo] = useState<string | null>(null);
  const [onlyPrivate, setOnlyPrivate] = useState(false);
  const [privateMsgs, setPrivateMsgs] = useState<(ApiMessage & { peer: string; outgoing: boolean })[]>([]);
  const [dmPlain, setDmPlain] = useState<Record<number, string>>({});
  const typingSentAt = useRef(0);
  const { unreadBy: unread } = useDm();
  const { startCall } = useCall();
  const { invitePeer, pendingNick } = usePrivate();
  const { setPending: setTickerPending } = useTicker();
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.feed(room.id, true);
      setMessages(data.messages);
      setOnline(data.online);
      setTypingUsers(data.typing ?? []);
      setTickerPending(data.tickerPending ?? 0);
      const dm = await api.dmAll();
      setPrivateMsgs(dm.messages);
    } catch {
      /* тихо: следующий опрос попробует снова */
    } finally {
      setLoaded(true);
    }
  }, [room.id]);

  useEffect(() => {
    setLoaded(false);
    const saved = Number(localStorage.getItem(`chat-cleared-${room.id}`) || 0);
    setClearedAt(saved);
    setClearedDm(Number(localStorage.getItem('chat-cleared-dm') || 0));
  }, [room.id]);

  const clearFeed = useCallback(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : 0;
    localStorage.setItem(`chat-cleared-${room.id}`, String(lastId));
    setClearedAt(lastId);

    const lastDm = privateMsgs.reduce((max, m) => (m.id > max ? m.id : max), 0);
    localStorage.setItem('chat-cleared-dm', String(lastDm));
    setClearedDm(lastDm);
  }, [messages, privateMsgs, room.id]);

  const { reveal } = useCrypto();

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const next: Record<number, string> = {};
      for (const m of privateMsgs) {
        if (m.cipher) next[m.id] = await reveal(m.cipher);
      }
      if (alive) setDmPlain((prev) => ({ ...prev, ...next }));
    };
    if (privateMsgs.some((m) => m.cipher)) run();
    return () => {
      alive = false;
    };
  }, [privateMsgs, reveal]);

  usePolling(load, 5000);

  useEffect(() => {
    const onLeave = () => {
      if (getToken()) api.away().catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
    };
  }, [load]);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!user) {
      openAuth('register');
      return;
    }
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const afterSend = () => {
      setDraft('');
      if (isTouch) inputRef.current?.blur();
      else inputRef.current?.focus();
    };
    setSending(true);
    try {
      if (privateTo) {
        const res = await api.dmSend({ nick: privateTo, text });
        setPrivateMsgs((prev) => [...prev, { ...res.message, peer: privateTo, outgoing: true }]);
        afterSend();
        return;
      }
      const res = await api.send({ text, room: room.id });
      setMessages((prev) => [...prev, res.message]);
      afterSend();
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

  const onDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (user && value && now - typingSentAt.current > 4000) {
      typingSentAt.current = now;
      api.typing(room.id).catch(() => undefined);
    }
  };

  const visibleMessages = useMemo(() => {
    const openList = messages
      .filter((m) => m.id > clearedAt)
      .map((m) => ({ ...m, key: `p-${m.id}`, private: false, peer: '', outgoing: false }));
    const privList = privateMsgs
      .filter((m) => m.id > clearedDm)
      .map((m) => ({
        ...m,
        text: m.cipher ? (dmPlain[m.id] ?? '🔒 расшифровываем…') : m.text,
        key: `d-${m.id}`,
        private: true,
      }));
    const rank = (t: string) => {
      const match = /(\d{2}):(\d{2})$/.exec(t || '');
      if (!match) return 0;
      const day = t.includes('вчера') ? -1 : 0;
      return day * 10000 + Number(match[1]) * 60 + Number(match[2]);
    };
    const all = onlyPrivate ? privList : [...openList, ...privList];
    return all.sort((a, b) => rank(a.time) - rank(b.time));
  }, [messages, clearedAt, privateMsgs, clearedDm, onlyPrivate, dmPlain]);
  const isEmpty = loaded && visibleMessages.length === 0;
  const othersTyping = useMemo(
    () => typingUsers.filter((t) => !user || t.nick !== user.nick),
    [typingUsers, user],
  );

  const onlineList: OnlineItem[] = useMemo(
    () =>
      [...online].sort((a, b) => {
        if (user) {
          if (a.nick === user.nick) return -1;
          if (b.nick === user.nick) return 1;
        }
        return a.nick.localeCompare(b.nick, 'ru', { sensitivity: 'base' });
      }),
    [online, user],
  );
  const busyNicks = useMemo(
    () => new Set(online.filter((u) => u.inPrivate).map((u) => u.nick)),
    [online],
  );

  if (!user) return null;

  return (
    <section
      id="chat"
      style={{ height: 'calc(var(--app-h, 100svh) - var(--top-offset, 4.5rem))' }}
      className="flex min-h-0 flex-col overflow-hidden bg-card"
    >
      <div className="flex w-full min-h-0 flex-1 flex-col px-0 pb-0 pt-0 md:px-0 md:py-0">
        <div className="relative grid min-h-0 w-full flex-1 gap-[2px] overflow-hidden border-b-2 border-foreground/35 bg-foreground/35 md:border-2 lg:grid-cols-[1fr_280px]">
          <div className="flex min-h-0 min-w-0 flex-col bg-background">
            <ChatHeader
              room={room}
              user={user}
              onPick={onPick}
              whoOpen={whoOpen}
              onToggleWho={() => setWhoOpen((v) => !v)}
              onlineCount={onlineList.length}
              onOpenResidents={() => setResidentsOpen(true)}
              onlyPrivate={onlyPrivate}
              onTogglePrivate={() => setOnlyPrivate((v) => !v)}
              onClearFeed={clearFeed}
              onSignOut={signOut}
            />

            <ChatFeed
              feedRef={feedRef}
              loaded={loaded}
              isEmpty={isEmpty}
              onlyPrivate={onlyPrivate}
              visibleMessages={visibleMessages}
              user={user}
              busyNicks={busyNicks}
              onPrivateTo={setPrivateTo}
            />

            <ChatComposer
              privateTo={privateTo}
              onCancelPrivate={() => setPrivateTo(null)}
              othersTyping={othersTyping}
              onSubmit={send}
              inputRef={inputRef}
              draft={draft}
              onDraftChange={onDraftChange}
              onEmoji={(e) => setDraft((prev) => (prev + e).slice(0, 480))}
              user={user}
              sending={sending}
            />
          </div>

          <ChatOnlineList
            whoOpen={whoOpen}
            onClose={() => setWhoOpen(false)}
            onlineList={onlineList}
            user={user}
            pendingNick={pendingNick}
            unread={unread}
            onCard={setCardPerson}
            onInvite={invitePeer}
            onCall={startCall}
            onPrivateTo={setPrivateTo}
          />
        </div>
      </div>

      <ResidentsDialog
        open={residentsOpen}
        onOpenChange={setResidentsOpen}
        onCard={setCardPerson}
        onWrite={(nick) => setPrivateTo(nick)}
        myNick={user?.nick}
      />

      <UserCardDialog person={cardPerson} onOpenChange={(v) => !v && setCardPerson(null)} />
    </section>
  );
};

export default ChatWindow;
