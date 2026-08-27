import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { playKnock } from '@/lib/notify-sound';
import { plural } from '@/lib/plural';
import type { NickColor } from '@/data/chat';

export type Dialog = { nick: string; color: NickColor; unread: number; avatar?: number; avatarUrl?: string | null; online?: boolean; seenAgo?: number | null };

type DmState = {
  dialogs: Dialog[];
  unread: number;
  unreadBy: Record<string, number>;
  dmNick: string | null;
  listOpen: boolean;
  openDm: (nick: string) => void;
  closeDm: () => void;
  openList: () => void;
  closeList: () => void;
  refresh: () => void;
  soundOn: boolean;
  toggleSound: () => void;
};

const DmContext = createContext<DmState | null>(null);

export const DmProvider = ({ children }: { children: ReactNode }) => {
  const { user, openAuth } = useAuth();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [dmNick, setDmNick] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('obshaga_sound') !== 'off');
  const seenRef = useRef<Record<string, number> | null>(null);
  const soundRef = useRef(soundOn);
  const openNickRef = useRef<string | null>(null);
  const openDmRef = useRef<(nick: string) => void>(() => undefined);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    openNickRef.current = dmNick;
  }, [dmNick]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      localStorage.setItem('obshaga_sound', prev ? 'off' : 'on');
      return !prev;
    });
  }, []);

  const refresh = useCallback(() => {
    if (!user) {
      setDialogs([]);
      seenRef.current = null;
      return;
    }
    api
      .dialogs()
      .then((res) => {
        const current: Record<string, number> = {};
        res.dialogs.forEach((d) => {
          current[d.nick] = d.unread;
        });

        const prev = seenRef.current;
        if (prev) {
          const fresh = res.dialogs.filter(
            (d) => d.unread > (prev[d.nick] ?? 0) && d.nick !== openNickRef.current,
          );
          if (fresh.length > 0) {
            if (soundRef.current) playKnock();
            const first = fresh[0];
            toast({
              title: `Стук в дверь: ${first.nick}`,
              description:
                fresh.length > 1
                  ? `Новые записки ещё от ${fresh.length - 1} ${plural(fresh.length - 1, 'соседа', 'соседей', 'соседей')}`
                  : 'Новая записка в личке',
              action: (
                <ToastAction altText="Открыть переписку" onClick={() => openDmRef.current(first.nick)}>
                  Открыть
                </ToastAction>
              ),
            });
          }
        }
        seenRef.current = current;
        setDialogs(res.dialogs);
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const timer = window.setInterval(refresh, 6000);
    return () => window.clearInterval(timer);
  }, [user, refresh, dmNick]);

  const openDm = useCallback(
    (nick: string) => {
      if (!user) {
        openAuth('register');
        return;
      }
      if (nick === user.nick) return;
      setDialogs((prev) => prev.map((d) => (d.nick === nick ? { ...d, unread: 0 } : d)));
      setListOpen(false);
      setDmNick(nick);
    },
    [user, openAuth],
  );

  useEffect(() => {
    openDmRef.current = openDm;
  }, [openDm]);

  const closeDm = useCallback(() => setDmNick(null), []);
  const openList = useCallback(() => {
    if (!user) {
      openAuth('login');
      return;
    }
    refresh();
    setListOpen(true);
  }, [user, openAuth, refresh]);
  const closeList = useCallback(() => setListOpen(false), []);

  const unreadBy = useMemo(() => {
    const map: Record<string, number> = {};
    dialogs.forEach((d) => {
      if (d.unread > 0) map[d.nick] = d.unread;
    });
    return map;
  }, [dialogs]);

  const unread = useMemo(() => dialogs.reduce((sum, d) => sum + d.unread, 0), [dialogs]);

  const value = useMemo(
    () => ({
      dialogs, unread, unreadBy, dmNick, listOpen,
      openDm, closeDm, openList, closeList, refresh, soundOn, toggleSound,
    }),
    [dialogs, unread, unreadBy, dmNick, listOpen, openDm, closeDm, openList, closeList, refresh, soundOn, toggleSound],
  );

  return <DmContext.Provider value={value}>{children}</DmContext.Provider>;
};

export const useDm = () => {
  const ctx = useContext(DmContext);
  if (!ctx) throw new Error('useDm должен использоваться внутри DmProvider');
  return ctx;
};