import type { NickColor } from '@/data/chat';

// Адрес сервера чата.
// Чтобы переехать на свой хостинг, впишите сюда ссылку на api.php,
// например: 'https://ваш-домен.ru/chat/api.php'
const API_URL = 'https://chat-tom.ru/chat/api.php';
const TOKEN_KEY = 'obshaga_token';

export type ApiUser = {
  id: number;
  nick: string;
  color: NickColor;
  status: string;
  room: string;
  since: string;
  avatar: number;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  uni?: string | null;
  email?: string | null;
  emailVerified?: boolean;
};

export type AdminUser = {
  id: number;
  nick: string;
  color: NickColor;
  status: string;
  room: string;
  since: string;
  avatar: number;
  avatarUrl?: string | null;
  isAdmin: boolean;
  banned: boolean;
  banReason?: string | null;
  seenAgo?: number | null;
  online: boolean;
  messages: number;
};

export type AdminMessage = {
  id: number;
  room: string;
  nick: string;
  color: NickColor;
  text: string;
  time: string;
  userId: number;
};

export type TickerLine = {
  nick: string;
  color: number;
  text: string;
};

export type TickerPost = {
  id: number;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  time: string;
};

export type AdminTickerPost = TickerPost & {
  userId: number;
  nick: string;
  uni?: string | null;
  byAdmin?: boolean;
  liveDays?: number;
  expires?: string | null;
  expired?: boolean;
};

export type SecurityEvent = {
  id: number;
  event: 'login_fail' | 'login_blocked' | 'flood' | 'spam' | string;
  nick?: string | null;
  ip: string;
  note: string;
  time: string;
};

export type ApiMessage = {
  id: number;
  nick: string;
  color: NickColor;
  text: string;
  time: string;
  avatar?: number;
  avatarUrl?: string | null;
};

export type FeedResponse = {
  messages: ApiMessage[];
  typing?: { nick: string; color: NickColor }[];
  online: { nick: string; color: NickColor; status: string; avatar?: number; avatarUrl?: string | null; isAdmin?: boolean }[];
  onlineTotal?: number;
  adminOnline?: boolean;
  tickerPending?: number;
  roomCounts: Record<string, number>;
  totalUsers: number;
  dayMessages: number;
};

const PENDING_KEY = 'obshaga_pending_verify';

let memToken = '';

export const getToken = () => memToken || localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token: string) => {
  memToken = '';
  localStorage.removeItem(PENDING_KEY);
  localStorage.setItem(TOKEN_KEY, token);
};
export const setTempToken = (token: string) => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(PENDING_KEY, '1');
  memToken = token;
};
export const persistToken = () => {
  localStorage.removeItem(PENDING_KEY);
  if (memToken) {
    localStorage.setItem(TOKEN_KEY, memToken);
    memToken = '';
  }
};
export const hasPendingVerify = () => localStorage.getItem(PENDING_KEY) === '1';
export const clearToken = () => {
  memToken = '';
  localStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

let banned: string | null = null;
const banListeners = new Set<(v: string | null) => void>();

export const getBanned = () => banned;
export const onBanned = (fn: (v: string | null) => void) => {
  banListeners.add(fn);
  return () => banListeners.delete(fn);
};
export const clearBanned = () => {
  banned = null;
  banListeners.forEach((fn) => fn(null));
};

let serverDown = false;
const downListeners = new Set<(v: boolean) => void>();

export const isServerDown = () => serverDown;
export const onServerStatus = (fn: (v: boolean) => void) => {
  downListeners.add(fn);
  return () => downListeners.delete(fn);
};
const setServerDown = (v: boolean) => {
  if (serverDown === v) return;
  serverDown = v;
  downListeners.forEach((fn) => fn(v));
};

const request = async <T>(action: string, options: { method?: string; body?: unknown; query?: string } = {}): Promise<T> => {
  const method = options.method ?? 'GET';
  const url = `${API_URL}?action=${action}${options.query ?? ''}&_=${Date.now()}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': getToken(),
      },
      body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
    });
  } catch {
    setServerDown(true);
    throw new Error('Общага не отвечает — сервер временно недоступен');
  }

  const raw = await res.text();
  let data: { error?: string } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    const start = raw.search(/[[{]/);
    const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (start !== -1 && end > start) {
      try {
        data = JSON.parse(raw.slice(start, end + 1));
      } catch {
        data = null;
      }
    }
  }

  if (!data) {
    setServerDown(true);
    throw new Error('Общага не отвечает — сервер временно недоступен');
  }

  if (res.status >= 500 || res.status === 402 || res.status === 429) {
    setServerDown(true);
    throw new Error(data?.error || 'Общага не отвечает — сервер временно недоступен');
  }

  setServerDown(false);
  if (res.status === 403 && data?.error && data.error.startsWith('Ты выселен')) {
    banned = data.error;
    banListeners.forEach((fn) => fn(banned));
  }
  if (!res.ok) throw new Error(data?.error || 'Не получилось связаться с общагой');
  return data as T;
};

export const api = {
  feed: (room: string, here = false) =>
    request<FeedResponse>('feed', { query: `&room=${room}${here ? '&here=1' : ''}` }),
  away: () => request<{ ok: boolean }>('away', { method: 'POST' }),
  news: () => request<{ news: string[] }>('news'),
  me: () => request<{ user: ApiUser }>('me'),
  recoverMailCode: (nick: string) =>
    request<{ ok: boolean; email: string }>('recover_mail_code', { method: 'POST', body: { nick } }),
  recoverMailReset: (body: { nick: string; code: string; password: string }) =>
    request<{ ok: boolean }>('recover_mail_reset', { method: 'POST', body }),
  register: (body: { nick: string; password: string; color: number; room: string; avatar: number; uni?: string; email?: string }) =>
    request<{ user: ApiUser; token: string; needVerify?: boolean; mailSent?: boolean }>('register', { method: 'POST', body }),
  checkNick: (nick: string) =>
    request<{ free: boolean; error?: string }>('check_nick', { query: `&nick=${encodeURIComponent(nick)}` }),
  checkEmail: (email: string) =>
    request<{ free: boolean; error?: string }>('check_email', { query: `&email=${encodeURIComponent(email)}` }),
  verifyEmail: (code: string) =>
    request<{ ok: boolean; user?: ApiUser }>('verify_email', { method: 'POST', body: { code } }),
  resendCode: () => request<{ ok: boolean; mailSent?: boolean }>('resend_code', { method: 'POST' }),
  cancelRegister: () => request<{ ok: boolean; deleted: boolean }>('cancel_register', { method: 'POST' }),
  login: (body: { nick: string; password: string }) =>
    request<{ user: ApiUser; token: string }>('login', { method: 'POST', body }),
  typing: (room: string) => request<{ ok: boolean }>('typing', { method: 'POST', body: { room } }),
  send: (body: { text: string; room: string }) =>
    request<{ message: ApiMessage }>('send', { method: 'POST', body }),
  profile: (body: { status: string; color: number; avatar: number; image?: string; removeImage?: boolean }) =>
    request<{ user: ApiUser }>('profile', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('logout', { method: 'POST' }),
  ticker: () => request<{ ticker: (string | TickerLine)[] }>('ticker'),
  tickerMy: () => request<{ posts: TickerPost[] }>('ticker_my'),
  tickerSend: (text: string) =>
    request<{ ok: boolean }>('ticker_send', { method: 'POST', body: { text } }),
  adminTicker: () => request<{ posts: AdminTickerPost[] }>('admin_ticker'),
  adminTickerAdd: (text: string, days: number) =>
    request<{ ok: boolean; id: number }>('admin_ticker_add', { method: 'POST', body: { text, days } }),
  adminTickerDays: (id: number, days: number) =>
    request<{ ok: boolean; liveDays: number; expires: string | null; expired: boolean }>(
      'admin_ticker_days',
      { method: 'POST', body: { id, days } },
    ),
  adminTickerEdit: (id: number, text: string) =>
    request<{ ok: boolean; text: string }>('admin_ticker_edit', { method: 'POST', body: { id, text } }),
  adminTickerDecide: (
    id: number,
    decision: 'approved' | 'rejected' | 'pending' | 'delete',
    days?: number,
    reason?: string,
  ) =>
    request<{ ok: boolean }>('admin_ticker_decide', {
      method: 'POST',
      body: { id, decision, days, reason },
    }),
  adminSecurity: () => request<{ events: SecurityEvent[] }>('admin_security'),
  adminSecurityClear: () => request<{ ok: boolean }>('admin_security_clear', { method: 'POST' }),
  adminUsers: () => request<{ users: AdminUser[] }>('admin_users'),
  adminMessages: (room?: string) =>
    request<{ messages: AdminMessage[] }>('admin_messages', { query: room ? `&room=${room}` : '' }),
  adminHide: (id: number) => request<{ ok: boolean }>('admin_hide', { method: 'POST', body: { id } }),
  adminBan: (body: { id: number; ban: boolean; reason?: string }) =>
    request<{ ok: boolean }>('admin_ban', { method: 'POST', body }),
  adminDelete: (id: number) =>
    request<{ ok: boolean }>('admin_delete', { method: 'POST', body: { id } }),
  dialogs: () =>
    request<{
      dialogs: { nick: string; color: NickColor; unread: number; avatar?: number; avatarUrl?: string | null; online?: boolean; seenAgo?: number | null }[];
      unread: number;
    }>('dialogs'),
  dm: (nick: string) =>
    request<{
      peer: { nick: string; color: NickColor; status: string; avatar?: number; avatarUrl?: string | null; online?: boolean; seenAgo?: number | null };
      messages: ApiMessage[];
    }>('dm', {
      query: `&nick=${encodeURIComponent(nick)}`,
    }),
  dmAll: () =>
    request<{ messages: (ApiMessage & { peer: string; outgoing: boolean })[] }>('dm_all'),
  dmSend: (body: { nick: string; text: string }) =>
    request<{ message: ApiMessage }>('dm_send', { method: 'POST', body }),
  callSignal: (body: { nick: string; callId: string; kind: CallKind; payload?: unknown }) =>
    request<{ ok: boolean }>('call_signal', { method: 'POST', body }),
  callPoll: () => request<{ signals: CallSignal[] }>('call_poll'),
};

export type CallKind = 'offer' | 'answer' | 'ice' | 'hangup' | 'decline';

export type CallSignal = {
  id: number;
  callId: string;
  kind: CallKind;
  payload: unknown;
  from: { nick: string; color: NickColor; avatar?: number; avatarUrl?: string | null };
};