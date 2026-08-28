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
  online: { nick: string; color: NickColor; status: string; avatar?: number; avatarUrl?: string | null }[];
  recent?: {
    nick: string;
    color: NickColor;
    status: string;
    avatar?: number;
    avatarUrl?: string | null;
    seenAgo: number | null;
  }[];
  roomCounts: Record<string, number>;
  totalUsers: number;
  dayMessages: number;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

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
  const url = `${API_URL}?action=${action}${options.query ?? ''}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
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
  me: () => request<{ user: ApiUser }>('me'),
  register: (body: { nick: string; password: string; color: number; room: string; avatar: number }) =>
    request<{ user: ApiUser; token: string }>('register', { method: 'POST', body }),
  login: (body: { nick: string; password: string }) =>
    request<{ user: ApiUser; token: string }>('login', { method: 'POST', body }),
  typing: (room: string) => request<{ ok: boolean }>('typing', { method: 'POST', body: { room } }),
  send: (body: { text: string; room: string }) =>
    request<{ message: ApiMessage }>('send', { method: 'POST', body }),
  profile: (body: { status: string; color: number; avatar: number; image?: string; removeImage?: boolean }) =>
    request<{ user: ApiUser }>('profile', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('logout', { method: 'POST' }),
  adminUsers: () => request<{ users: AdminUser[] }>('admin_users'),
  adminMessages: (room?: string) =>
    request<{ messages: AdminMessage[] }>('admin_messages', { query: room ? `&room=${room}` : '' }),
  adminHide: (id: number) => request<{ ok: boolean }>('admin_hide', { method: 'POST', body: { id } }),
  adminBan: (body: { id: number; ban: boolean; reason?: string }) =>
    request<{ ok: boolean }>('admin_ban', { method: 'POST', body }),
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