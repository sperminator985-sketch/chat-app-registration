import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { NickColor } from '@/data/chat';

export type Account = {
  nick: string;
  color: NickColor;
  status: string;
  room: string;
  since: string;
};

type AuthState = {
  user: Account | null;
  authOpen: boolean;
  authTab: 'register' | 'login';
  openAuth: (tab?: 'register' | 'login') => void;
  closeAuth: () => void;
  signIn: (user: Account) => void;
  signOut: () => void;
  updateUser: (patch: Partial<Account>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Account | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');

  const openAuth = useCallback((tab: 'register' | 'login' = 'register') => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const signIn = useCallback((next: Account) => {
    setUser(next);
    setAuthOpen(false);
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const updateUser = useCallback((patch: Partial<Account>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, authOpen, authTab, openAuth, closeAuth, signIn, signOut, updateUser }),
    [user, authOpen, authTab, openAuth, closeAuth, signIn, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
};
