import type { NickColor } from '@/data/chat';

const API_URL = 'https://functions.poehali.dev/fe6fe52c-45f4-43ff-babc-0bcb6058bd32';
const TOKEN_KEY = 'obshaga_token';

export type ApiUser = {
  id: number;
  nick: string;
  color: NickColor;
  status: string;
  room: string;
  since: string;
};

export type ApiMessage = {
  id: number;
  nick: string;
  color: NickColor;
  text: string;
  time: string;
};

export type FeedResponse = {
  messages: ApiMessage[];
  online: { nick: string; color: NickColor; status: string }[];
  roomCounts: Record<string, number>;
  totalUsers: number;
  dayMessages: number;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? '';
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const request = async <T>(action: string, options: { method?: string; body?: unknown; query?: string } = {}): Promise<T> => {
  const method = options.method ?? 'GET';
  const url = `${API_URL}?action=${action}${options.query ?? ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
    },
    body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Не получилось связаться с общагой');
  return data as T;
};

export const api = {
  feed: (room: string) => request<FeedResponse>('feed', { query: `&room=${room}` }),
  me: () => request<{ user: ApiUser }>('me'),
  register: (body: { nick: string; password: string; color: number; room: string }) =>
    request<{ user: ApiUser; token: string }>('register', { method: 'POST', body }),
  login: (body: { nick: string; password: string }) =>
    request<{ user: ApiUser; token: string }>('login', { method: 'POST', body }),
  send: (body: { text: string; room: string }) =>
    request<{ message: ApiMessage }>('send', { method: 'POST', body }),
  profile: (body: { status: string; color: number }) =>
    request<{ user: ApiUser }>('profile', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('logout', { method: 'POST' }),
  dialogs: () => request<{ dialogs: { nick: string; color: NickColor; unread: number }[]; unread: number }>('dialogs'),
  dm: (nick: string) =>
    request<{ peer: { nick: string; color: NickColor; status: string }; messages: ApiMessage[] }>('dm', {
      query: `&nick=${encodeURIComponent(nick)}`,
    }),
  dmSend: (body: { nick: string; text: string }) =>
    request<{ message: ApiMessage }>('dm_send', { method: 'POST', body }),
};