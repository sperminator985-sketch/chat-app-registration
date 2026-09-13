import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api, ApiMessage, PrivatePeer } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { usePolling } from '@/hooks/use-polling';
import { toast } from '@/hooks/use-toast';
import { playKnock } from '@/lib/notify-sound';

type Invite = { roomId: number; nick: string; color: number };

type PrivateState = {
  active: boolean;
  peer: PrivatePeer | null;
  peerTyping: boolean;
  messages: ApiMessage[];
  invite: Invite | null;
  pendingNick: string | null;
  invitePeer: (nick: string) => Promise<void>;
  answer: (accept: boolean) => Promise<void>;
  leave: () => Promise<void>;
  pushMessage: (m: ApiMessage) => void;
  refresh: () => void;
};

const PrivateContext = createContext<PrivateState | null>(null);

export const PrivateProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [peer, setPeer] = useState<PrivatePeer | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [pendingNick, setPendingNick] = useState<string | null>(null);
  const wasActive = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.privateState();
      setPeer(data.room?.peer ?? null);
      setPeerTyping(Boolean(data.typing));
      setMessages(data.messages ?? []);
      setInvite(data.invite);
      setPendingNick(data.pending?.nick ?? null);

      const nowActive = Boolean(data.room);
      if (!wasActive.current && nowActive) playKnock();
      if (wasActive.current && !nowActive && data.ended) {
        toast({
          title: 'Приват закрыт',
          description:
            data.ended.status === 'declined'
              ? `${data.ended.nick} отказался от привата`
              : data.ended.status === 'missed'
                ? `${data.ended.nick} не ответил`
                : `${data.ended.nick} вышел из привата`,
        });
      }
      if (!wasActive.current && !nowActive && data.ended && data.ended.status !== 'closed') {
        toast({
          title: 'Приват не состоялся',
          description:
            data.ended.status === 'declined'
              ? `${data.ended.nick} отказался`
              : `${data.ended.nick} не ответил`,
        });
      }
      wasActive.current = nowActive;
    } catch {
      /* следующий опрос попробует снова */
    }
  }, [user]);

  usePolling(load, 3000, Boolean(user));

  useEffect(() => {
    if (!user) {
      setPeer(null);
      setPeerTyping(false);
      setMessages([]);
      setInvite(null);
      setPendingNick(null);
      wasActive.current = false;
    }
  }, [user]);

  const invitePeer = useCallback(
    async (nick: string) => {
      try {
        await api.privateInvite(nick);
        setPendingNick(nick);
        toast({ title: 'Зову в приват', description: `Ждём ответа от ${nick}` });
      } catch (err) {
        toast({
          title: 'Приват не открылся',
          description: err instanceof Error ? err.message : 'Попробуй ещё раз',
          variant: 'destructive',
        });
      }
    },
    [],
  );

  const answer = useCallback(
    async (accept: boolean) => {
      if (!invite) return;
      const id = invite.roomId;
      setInvite(null);
      try {
        await api.privateAnswer(id, accept);
        await load();
      } catch (err) {
        toast({
          title: 'Не вышло ответить',
          description: err instanceof Error ? err.message : 'Попробуй ещё раз',
          variant: 'destructive',
        });
      }
    },
    [invite, load],
  );

  const leave = useCallback(async () => {
    setPeer(null);
    setPeerTyping(false);
    setMessages([]);
    setPendingNick(null);
    wasActive.current = false;
    try {
      await api.privateLeave();
    } catch {
      /* всё равно закрываем локально */
    }
    load();
  }, [load]);

  const pushMessage = useCallback((m: ApiMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  const value = useMemo(
    () => ({
      active: Boolean(peer),
      peer,
      peerTyping,
      messages,
      invite,
      pendingNick,
      invitePeer,
      answer,
      leave,
      pushMessage,
      refresh: load,
    }),
    [peer, peerTyping, messages, invite, pendingNick, invitePeer, answer, leave, pushMessage, load],
  );

  return <PrivateContext.Provider value={value}>{children}</PrivateContext.Provider>;
};

export const usePrivate = () => {
  const ctx = useContext(PrivateContext);
  if (!ctx) throw new Error('usePrivate должен использоваться внутри PrivateProvider');
  return ctx;
};

export default usePrivate;