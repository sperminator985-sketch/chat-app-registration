import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { NickColor } from '@/data/chat';

export type Dialog = { nick: string; color: NickColor; unread: number };

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
};

const DmContext = createContext<DmState | null>(null);

export const DmProvider = ({ children }: { children: ReactNode }) => {
  const { user, openAuth } = useAuth();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [dmNick, setDmNick] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const refresh = useCallback(() => {
    if (!user) {
      setDialogs([]);
      return;
    }
    api
      .dialogs()
      .then((res) => setDialogs(res.dialogs))
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
    () => ({ dialogs, unread, unreadBy, dmNick, listOpen, openDm, closeDm, openList, closeList, refresh }),
    [dialogs, unread, unreadBy, dmNick, listOpen, openDm, closeDm, openList, closeList, refresh],
  );

  return <DmContext.Provider value={value}>{children}</DmContext.Provider>;
};

export const useDm = () => {
  const ctx = useContext(DmContext);
  if (!ctx) throw new Error('useDm должен использоваться внутри DmProvider');
  return ctx;
};
