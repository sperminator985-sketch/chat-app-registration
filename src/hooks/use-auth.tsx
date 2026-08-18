import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken, ApiUser } from '@/lib/api';

export type Account = ApiUser;

type AuthState = {
  user: Account | null;
  loading: boolean;
  authOpen: boolean;
  authTab: 'register' | 'login';
  openAuth: (tab?: 'register' | 'login') => void;
  closeAuth: () => void;
  register: (body: { nick: string; password: string; color: number; room: string }) => Promise<void>;
  login: (body: { nick: string; password: string }) => Promise<void>;
  signOut: () => void;
  saveProfile: (body: { status: string; color: number }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const openAuth = useCallback((tab: 'register' | 'login' = 'register') => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const register = useCallback(async (body: { nick: string; password: string; color: number; room: string }) => {
    const res = await api.register(body);
    setToken(res.token);
    setUser(res.user);
    setAuthOpen(false);
  }, []);

  const login = useCallback(async (body: { nick: string; password: string }) => {
    const res = await api.login(body);
    setToken(res.token);
    setUser(res.user);
    setAuthOpen(false);
  }, []);

  const signOut = useCallback(() => {
    api.logout().catch(() => undefined);
    clearToken();
    setUser(null);
  }, []);

  const saveProfile = useCallback(async (body: { status: string; color: number }) => {
    const res = await api.profile(body);
    setUser(res.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, authOpen, authTab, openAuth, closeAuth, register, login, signOut, saveProfile }),
    [user, loading, authOpen, authTab, openAuth, closeAuth, register, login, signOut, saveProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
};
