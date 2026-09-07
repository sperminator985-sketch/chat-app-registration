import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { onBanned, api, clearToken, getToken, setToken, setTempToken, persistToken, hasPendingVerify, ApiUser } from '@/lib/api';

export type Account = ApiUser;

type AuthState = {
  user: Account | null;
  pendingVerify: boolean;
  loading: boolean;
  authOpen: boolean;
  authTab: 'register' | 'login';
  welcomeOpen: boolean;
  closeWelcome: () => void;
  openAuth: (tab?: 'register' | 'login') => void;
  closeAuth: () => void;
  register: (body: { nick: string; password: string; color: number; room: string; avatar: number; uni?: string; email?: string }) => Promise<boolean>;
  login: (body: { nick: string; password: string }) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  cancelRegister: () => Promise<void>;
  signOut: () => void;
  saveProfile: (body: { status: string; color: number; avatar: number; image?: string; removeImage?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Account | null>(null);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    if (hasPendingVerify()) {
      clearToken();
      setUser(null);
      setLoading(false);
      return;
    }
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => {
        if (res.user.emailVerified === false) {
          api.cancelRegister().catch(() => undefined);
          clearToken();
          setUser(null);
          return;
        }
        setUser(res.user);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const openAuth = useCallback((tab: 'register' | 'login' = 'register') => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const closeWelcome = useCallback(() => setWelcomeOpen(false), []);

  const register = useCallback(async (body: { nick: string; password: string; color: number; room: string; avatar: number; uni?: string; email?: string }) => {
    const res = await api.register(body);
    const needVerify = Boolean(res.needVerify) && !res.user.emailVerified;
    if (needVerify) {
      setTempToken(res.token);
      setPendingVerify(true);
      setUser(null);
    } else {
      setToken(res.token);
      setUser(res.user);
      setAuthOpen(false);
      setWelcomeOpen(true);
    }
    return needVerify;
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    const res = await api.verifyEmail(code);
    persistToken();
    setPendingVerify(false);
    if (res.user) setUser(res.user);
    else await api.me().then((r) => setUser(r.user)).catch(() => undefined);
    setAuthOpen(false);
    setWelcomeOpen(true);
  }, []);

  const cancelRegister = useCallback(async () => {
    await api.cancelRegister().catch(() => undefined);
    clearToken();
    setPendingVerify(false);
    setUser(null);
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

  useEffect(() =>
    onBanned((msg) => {
      if (!msg) return;
      clearToken();
      setUser(null);
    }),
  []);

  const saveProfile = useCallback(async (body: { status: string; color: number; avatar: number; image?: string; removeImage?: boolean }) => {
    const res = await api.profile(body);
    setUser(res.user);
  }, []);

  const value = useMemo(
    () => ({
      user, pendingVerify, loading, authOpen, authTab, welcomeOpen, closeWelcome,
      openAuth, closeAuth, register, login, verifyEmail, cancelRegister, signOut, saveProfile,
    }),
    [user, pendingVerify, loading, authOpen, authTab, welcomeOpen, closeWelcome, openAuth, closeAuth, register, login, verifyEmail, cancelRegister, signOut, saveProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
};